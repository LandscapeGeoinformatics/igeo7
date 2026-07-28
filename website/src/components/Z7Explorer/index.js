import React, { useEffect, useRef, useState, useCallback } from "react";
import { useColorMode } from "@docusaurus/theme-common";
import maplibregl from "maplibre-gl";
import { Webdggrid } from "webdggrid";
import "maplibre-gl/dist/maplibre-gl.css";
import styles from "./styles.module.css";

// IGEO7 = DGGRID ISEA aperture-7, Snyder vert0 latitude, icosahedron orientation
// longitude 11.2° (NOT the DGGRID default 11.25°). Authalic latitude conversion
// is mandatory and applied to the input latitude before every geo->cell call.
// Verified against the lab's pydggal golden table: Lisbon (38.7223,-9.1393) res5
// -> 0064156, matching at every resolution for all non-degenerate points.
const IGEO7 = {
  poleCoordinates: { lat: 58.28252559, lng: 11.2 },
  azimuth: 0,
  topology: "HEXAGON",
  projection: "ISEA",
  aperture: 7,
};

const MAX_RES = 10;
const CELL_CAP = 1400; // viewport flood-fill ceiling (client-side performance limit)
const LISBON = { lat: 38.7223, lon: -9.1393 };

function basemapStyle(dark) {
  const variant = dark ? "dark_all" : "light_all";
  return {
    version: 8,
    sources: {
      carto: {
        type: "raster",
        tiles: [
          `https://a.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}{r}.png`,
          `https://b.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}{r}.png`,
          `https://c.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}{r}.png`,
        ],
        tileSize: 256,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
      },
    },
    layers: [{ id: "carto", type: "raster", source: "carto" }],
  };
}

const EMPTY = { type: "FeatureCollection", features: [] };
const hexOf = (z7) => "0x" + z7.toString(16).toUpperCase().padStart(16, "0");

// The authalic conversion is a round trip, and both halves are mandatory.
// geoToSequenceNum expects an *authalic* latitude, so every geo->cell call goes
// through igeo7GeoToAuthalic. Symmetrically, sequenceNumToGeo *returns* an
// authalic latitude, so every cell->geo result must come back through
// igeo7AuthalicToGeo before it is displayed, echoed into the lat/lon inputs,
// compared against map bounds, or fed back into a geo->cell call. Skipping the
// inverse offsets the latitude by up to ~0.13° (~14 km at mid-latitudes) and,
// because the raw value re-enters geoToSequenceNum on a resolution change, can
// resolve to a neighbouring cell once the cell is smaller than that error.
function geoOf(dggs, seq, r) {
  const [lng, alat] = dggs.sequenceNumToGeo([seq], r)[0];
  return [lng, dggs.igeo7AuthalicToGeo(alat)];
}

// MapLibre serializes GeoJSON to a web worker via structured clone, which cannot
// carry BigInt. webDggrid puts BigInt sequence numbers in feature ids/properties,
// so stringify them before handing the FeatureCollection to the map.
function cleanFC(fc) {
  for (const f of fc.features) {
    if (typeof f.id === "bigint") f.id = f.id.toString();
    if (f.properties) {
      for (const k in f.properties) {
        if (typeof f.properties[k] === "bigint") f.properties[k] = f.properties[k].toString();
      }
    }
  }
  return fc;
}

// webDggrid returns only the cell corners; the true cell edges are great-circle
// arcs. Drawing straight lon/lat chords between far-apart corners looks
// catastrophic for large (low-resolution / polar) cells. We densify each edge
// with spherical (great-circle) interpolation - webDggrid's own docs recommend
// this with unwrap=false for sphere-aware renderers (incl. the globe projection).
const TO_R = Math.PI / 180;
const TO_D = 180 / Math.PI;
function gcSegment(a, b) {
  const lon1 = a[0] * TO_R, lat1 = a[1] * TO_R, lon2 = b[0] * TO_R, lat2 = b[1] * TO_R;
  const d = 2 * Math.asin(
    Math.min(1, Math.sqrt(Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2))
  );
  if (d < 1e-9) return [a];
  const steps = Math.max(1, Math.ceil((d * TO_D) / 2)); // ≈2° per densified step
  const pts = [];
  const sd = Math.sin(d);
  for (let i = 0; i < steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / sd;
    const B = Math.sin(f * d) / sd;
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    pts.push([Math.atan2(y, x) * TO_D, Math.atan2(z, Math.hypot(x, y)) * TO_D]);
  }
  return pts;
}
// Densify a cell ring with great-circle arcs and make it antimeridian/pole-safe.
// KNOWN DEFECT, see docs/ecosystem/explorer.md. The cap branch below assumes a
// ring that winds a full turn in longitude encloses a pole. In this orientation
// NO cell encloses a pole: both poles lie exactly on a cell edge (the extreme
// corner latitude is 69.09 at res 0 and 89.9987 at res 10, never 90). The
// pole-crossing step therefore has dl = +/-180 to within floating point, which
// the strict > 180 / < -180 tests catch or miss essentially at random. The
// result is a false cap on pole-adjacent cells, drawing them across 325 to 359
// degrees of longitude instead of their true extent. Fixing it properly means
// detecting the pole-crossing edge itself rather than inferring it from winding.
function densifyRing(ring) {
  const pts = [];
  for (let i = 0; i < ring.length - 1; i++) pts.push(...gcSegment(ring[i], ring[i + 1]));
  if (!pts.length) return ring;

  // unwrap longitudes so the ring stays continuous across the antimeridian
  const out = [[pts[0][0], pts[0][1]]];
  let off = 0;
  for (let i = 1; i < pts.length; i++) {
    const dl = pts[i][0] - pts[i - 1][0];
    if (dl > 180) off -= 360;
    else if (dl < -180) off += 360;
    out.push([pts[i][0] + off, pts[i][1]]);
  }

  // a ring that winds a full turn in longitude encircles a pole -> cap it
  const winding = out[out.length - 1][0] - out[0][0];
  if (Math.abs(winding) > 180) {
    const meanLat = out.reduce((s, p) => s + p[1], 0) / out.length;
    const poleLat = meanLat > 0 ? 90 : -90;
    out.push([out[out.length - 1][0], poleLat]);
    out.push([out[0][0], poleLat]);
  }

  out.push([out[0][0], out[0][1]]); // close
  return out;
}

// The 7 children (6 for pentagons) per the Z7 aperture-7 definition: append a
// direction digit 0-6 to the cell's index. (DGGRID's sequenceNumChildren uses a
// different, non-Z7 child notion and returns the wrong count.)
function childSeqs(dggs, seq, r) {
  // Stop at the explorer's resolution ceiling. The Z7 index itself goes deeper,
  // but the slider cannot represent a finer resolution, so rendering children
  // one level below the ceiling would put cells on the map that the resolution
  // control cannot then return to.
  if (r >= MAX_RES) return [];
  const z7 = dggs.sequenceNumToZ7(seq, r);
  const base = dggs.igeo7GetBaseCell(z7);
  const digits = [];
  for (let i = 1; i <= r; i++) digits.push(dggs.igeo7GetDigit(z7, i));
  const seqs = [];
  for (let d = 0; d <= 6; d++) {
    const arr = digits.concat(d);
    while (arr.length < 20) arr.push(7);
    const cz = dggs.igeo7Encode(base, arr);
    if (dggs.igeo7IsValid(cz)) seqs.push(dggs.z7ToSequenceNum(cz, r + 1));
  }
  return seqs;
}

// Adds the overlay sources + layers. Fill layers read the pole-capped sources;
// line layers read the uncapped *L sources. Idempotent - safe to call after a
// theme-driven setStyle (which drops sources/layers).
function addOverlay(map) {
  for (const s of ["cells", "nbr", "child", "sel"]) {
    if (!map.getSource(s)) map.addSource(s, { type: "geojson", data: EMPTY });
  }
  const addL = (def) => {
    if (!map.getLayer(def.id)) map.addLayer(def);
  };
  addL({ id: "cells-fill", type: "fill", source: "cells", paint: { "fill-color": "#3b82f6", "fill-opacity": 0.08 } });
  addL({ id: "cells-line", type: "line", source: "cells", paint: { "line-color": "#60a5fa", "line-width": 0.8 } });
  addL({ id: "nbr-fill", type: "fill", source: "nbr", paint: { "fill-color": "#facc15", "fill-opacity": 0.3 } });
  addL({ id: "child-fill", type: "fill", source: "child", paint: { "fill-color": "#22c55e", "fill-opacity": 0.4 } });
  addL({ id: "child-line", type: "line", source: "child", paint: { "line-color": "#86efac", "line-width": 1.5 } });
  addL({ id: "sel-fill", type: "fill", source: "sel", paint: { "fill-color": "#f97316", "fill-opacity": 0.55 } });
  addL({ id: "sel-line", type: "line", source: "sel", paint: { "line-color": "#fb923c", "line-width": 2.5 } });
}

export default function Z7Explorer() {
  const { colorMode } = useColorMode();
  const dark = colorMode === "dark";

  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const dggsRef = useRef(null);
  const resRef = useRef(0); // current resolution, read inside map callbacks
  const selRef = useRef(null); // { seq (bigint), res } of the selected cell
  const kidsRef = useRef(false); // children currently shown?

  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [res, setRes] = useState(0);
  const [panel, setPanel] = useState(null); // { id, hex, res, lat, lon, type, nbr, kids }
  const [kidsShown, setKidsShown] = useState(false);
  const [latInput, setLatInput] = useState(String(LISBON.lat));
  const [lonInput, setLonInput] = useState(String(LISBON.lon));
  const [idInput, setIdInput] = useState("");
  const [idBad, setIdBad] = useState(false);

  // --- engine helpers (operate on the loaded webDggrid instance) ---
  const fcOf = useCallback((seqs, r) => {
    const dggs = dggsRef.current;
    if (!seqs.length) return EMPTY;
    // unwrap=false -> raw corners; we densify edges as great-circle arcs ourselves.
    const fc = cleanFC(dggs.sequenceNumToGridFeatureCollection(seqs, r, false));
    for (const f of fc.features) {
      if (f.geometry && f.geometry.type === "Polygon") {
        // Cell corners come back in authalic latitude, like sequenceNumToGeo.
        // Densify FIRST, in authalic space, because that is where a cell edge is
        // a true great circle; converting the corners and then densifying would
        // trace a subtly different curve. Then convert each vertex latitude to
        // geodetic so the polygons sit in the same space as the basemap, the
        // reported centroid and the flyTo target. Longitude is untouched by the
        // conversion, which preserves densifyRing's antimeridian unwrapping and
        // its +/-90 pole cap (authalic and geodetic agree at the poles).
        f.geometry.coordinates = f.geometry.coordinates.map((ring) =>
          densifyRing(ring).map(([lng, alat]) => [lng, dggs.igeo7AuthalicToGeo(alat)])
        );
      }
    }
    return fc;
  }, []);

  // BFS flood-fill of the viewport at the current resolution, bounded by CELL_CAP.
  const viewportCells = useCallback((r) => {
    const dggs = dggsRef.current;
    const map = mapRef.current;
    const c = map.getCenter();
    const b = map.getBounds();
    const pad = 0.25 * (b.getNorth() - b.getSouth() + 1e-6);
    const inB = (lng, lat) =>
      lat >= b.getSouth() - pad &&
      lat <= b.getNorth() + pad &&
      lng >= b.getWest() - pad &&
      lng <= b.getEast() + pad;
    let seed;
    try {
      seed = dggs.geoToSequenceNum([[c.lng, dggs.igeo7GeoToAuthalic(c.lat)]], r)[0];
    } catch {
      return [];
    }
    const seen = new Set([seed.toString()]);
    const out = [seed];
    const queue = [seed];
    while (queue.length && out.length < CELL_CAP) {
      const cur = queue.shift();
      let nbrs;
      try {
        nbrs = dggs.sequenceNumNeighbors([cur], r)[0];
      } catch {
        continue;
      }
      for (const n of nbrs) {
        const key = n.toString();
        if (seen.has(key)) continue;
        seen.add(key);
        let g;
        try {
          g = geoOf(dggs, n, r); // [lng, lat], geodetic - comparable to map bounds
        } catch {
          continue;
        }
        if (inB(g[0], g[1])) {
          out.push(n);
          queue.push(n);
        }
      }
    }
    return out;
  }, []);

  const drawGrid = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.getSource("cells")) return;
    const r = resRef.current;
    try {
      const ids = viewportCells(r);
      map.getSource("cells").setData(fcOf(ids, r));
    } catch {
      map.getSource("cells").setData(EMPTY);
    }
  }, [fcOf, viewportCells]);

  // Render the selection ecosystem (cell + k=1 ring + optional children) and panel.
  const renderSelection = useCallback(
    (seq, r, { fly } = {}) => {
      const dggs = dggsRef.current;
      const map = mapRef.current;
      selRef.current = { seq, res: r };

      const z7 = dggs.sequenceNumToZ7(seq, r);
      const id = dggs.igeo7ToString(z7);
      const [lng, lat] = geoOf(dggs, seq, r);
      const nbrs = (dggs.sequenceNumNeighbors([seq], r)[0] || []).filter((n) =>
        dggs.igeo7IsValid(dggs.sequenceNumToZ7(n, r))
      );
      const kids = childSeqs(dggs, seq, r);
      const pentagon = nbrs.length < 6;

      map.getSource("sel").setData(fcOf([seq], r));
      map.getSource("nbr").setData(fcOf(nbrs, r));

      if (kidsRef.current && kids.length) {
        map.getSource("child").setData(fcOf(kids, r + 1));
      } else {
        map.getSource("child").setData(EMPTY);
      }

      setPanel({
        id,
        hex: hexOf(z7),
        res: r,
        lat: lat.toFixed(4),
        lon: lng.toFixed(4),
        type: pentagon ? "Pentagon" : "Hexagon",
        nbr: nbrs.length,
        kids: kids.length,
      });
      setLatInput(lat.toFixed(4));
      setLonInput(lng.toFixed(4));

      if (fly) map.flyTo({ center: [lng, lat], zoom: Math.min(16, 1.4 * r + 2) });
    },
    [fcOf]
  );

  const selectGeo = useCallback(
    (lat, lon, r, opts) => {
      const dggs = dggsRef.current;
      const seq = dggs.geoToSequenceNum([[lon, dggs.igeo7GeoToAuthalic(lat)]], r)[0];
      renderSelection(seq, r, opts);
    },
    [renderSelection]
  );

  // --- one-time init: load engine, build map ---
  useEffect(() => {
    let disposed = false;
    let map;
    (async () => {
      try {
        const dggs = await Webdggrid.load();
        if (disposed) return;
        dggs.setDggs(IGEO7, 0);
        dggsRef.current = dggs;

        map = new maplibregl.Map({
          container: mapContainer.current,
          style: basemapStyle(dark),
          center: [LISBON.lon, LISBON.lat],
          zoom: 3,
          attributionControl: { compact: true },
        });
        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

        map.on("load", () => {
          // Globe projection - an equal-area DGGS must not be shown on Web
          // Mercator (it inflates the poles); the globe renders cells true to
          // shape and area. (MapLibre cannot render EPSG:4326 flat.)
          map.setProjection({ type: "globe" });
          addOverlay(map);

          map.on("moveend", drawGrid);
          map.on("click", (e) => {
            selectGeo(e.lngLat.lat, e.lngLat.lng, resRef.current, {});
          });
          drawGrid();
          setReady(true);
        });
      } catch (e) {
        setError(String(e && e.message ? e.message : e));
      }
    })();
    return () => {
      disposed = true;
      if (map) map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme switch -> swap basemap tiles, keep overlays.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setStyle(basemapStyle(dark));
    map.once("styledata", () => {
      map.setProjection({ type: "globe" });
      addOverlay(map); // re-add sources/layers the style swap dropped
      drawGrid();
      const sel = selRef.current;
      if (sel) renderSelection(sel.seq, sel.res, {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark]);

  // --- UI handlers ---
  const onRes = (e) => {
    const r = Number(e.target.value);
    setRes(r);
    resRef.current = r;
    drawGrid();
    const sel = selRef.current;
    if (sel) {
      // re-resolve the selected centroid at the new resolution
      const dggs = dggsRef.current;
      const [lng, lat] = geoOf(dggs, sel.seq, sel.res);
      try {
        selectGeo(lat, lng, r, {});
      } catch {
        /* singularity at this res - leave selection */
      }
    }
  };

  const onGoGeo = () => {
    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return;
    try {
      selectGeo(lat, lon, resRef.current, { fly: true });
    } catch {
      /* ignore */
    }
  };

  const onGoId = () => {
    const dggs = dggsRef.current;
    const raw = idInput.trim();
    if (!raw) return;
    try {
      const z7 = /^0x/i.test(raw) ? BigInt(raw) : dggs.igeo7FromString(raw);
      if (!dggs.igeo7IsValid(z7)) throw new Error("invalid");
      const r = dggs.igeo7GetResolution(z7);
      // A longer Z7 string is a perfectly valid index, but this explorer only
      // goes to MAX_RES and the slider could not represent it. Reject it rather
      // than silently driving the resolution control out of range.
      if (r > MAX_RES) throw new Error("resolution above the explorer's ceiling");
      const seq = dggs.z7ToSequenceNum(z7, r);
      setRes(r);
      resRef.current = r;
      drawGrid();
      renderSelection(seq, r, { fly: true });
    } catch {
      setIdBad(true);
      setTimeout(() => setIdBad(false), 1200);
    }
  };

  const onParent = () => {
    const dggs = dggsRef.current;
    const sel = selRef.current;
    if (!sel || sel.res <= 0) return;
    const par = dggs.sequenceNumParent([sel.seq], sel.res)[0];
    const r = sel.res - 1;
    setRes(r);
    resRef.current = r;
    drawGrid();
    renderSelection(par, r, { fly: true });
  };

  const onToggleKids = () => {
    const next = !kidsRef.current;
    kidsRef.current = next;
    setKidsShown(next);
    const sel = selRef.current;
    if (sel) renderSelection(sel.seq, sel.res, {});
  };

  return (
    <div className={styles.wrap}>
      <div ref={mapContainer} className={styles.map} />

      {error && <div className={styles.error}>Failed to load the DGGS engine: {error}</div>}
      {!ready && !error && <div className={styles.loading}>Loading IGEO7 engine…</div>}

      <div className={styles.controls}>
        <div className={styles.title}>IGEO7 / Z7 Explorer</div>

        <label className={styles.resRow}>
          <span>Resolution</span>
          <input type="range" min={0} max={MAX_RES} value={res} onChange={onRes} />
          <b>{res}</b>
        </label>

        <div className={styles.row}>
          <input className={styles.in} value={latInput} onChange={(e) => setLatInput(e.target.value)} placeholder="lat" aria-label="latitude" />
          <input className={styles.in} value={lonInput} onChange={(e) => setLonInput(e.target.value)} placeholder="lon" aria-label="longitude" />
          <button className={styles.btn} onClick={onGoGeo}>Go</button>
        </div>

        <div className={styles.row}>
          <input
            className={idBad ? `${styles.in} ${styles.bad}` : styles.in}
            value={idInput}
            onChange={(e) => setIdInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onGoId()}
            placeholder="Z7 id e.g. 0064156 or 0x…"
            aria-label="Z7 index"
          />
          <button className={styles.btn} onClick={onGoId}>Find</button>
        </div>

        <details className={styles.help}>
          <summary>How to use</summary>
          <p>Click the map to resolve the containing IGEO7 cell at the chosen resolution, or look one up by latitude/longitude or by Z7 index. Use <b>Parent</b> and <b>Children</b> to walk the hierarchy; the yellow ring shows the cell's neighbours.</p>
          <p>
            Learn more: <a href="/docs/concepts/z7-indexing">Z7 indexing</a> · <a href="/docs/reference/restable">Resolution table</a> · <a href="/docs/ecosystem/explorer">How this explorer works</a>
          </p>
        </details>
      </div>

      {panel && (
        <div className={styles.panel}>
          <div className={styles.pid}>{panel.id}</div>
          <Row k="Type" v={panel.type} />
          <Row k="Resolution" v={panel.res} />
          <Row k="Z7 hex" v={panel.hex} />
          <Row k="Centroid" v={`${panel.lat}, ${panel.lon}`} />
          <Row k="Neighbours" v={panel.nbr} />
          <div className={styles.btnRow}>
            <button className={styles.btn} onClick={onParent} disabled={panel.res <= 0}>↑ Parent</button>
            <button className={styles.btn} onClick={onToggleKids} disabled={panel.kids === 0}>{kidsShown ? `Hide ${panel.kids}` : `Show ${panel.kids}`} children</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className={styles.prow}>
      <span className={styles.pk}>{k}</span>
      <span className={styles.pv}>{v}</span>
    </div>
  );
}
