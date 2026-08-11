import React, { useEffect, useRef, useState, useCallback } from "react";
import { useColorMode } from "@docusaurus/theme-common";
import maplibregl from "maplibre-gl";
import { Webdggrid } from "webdggrid";
import "maplibre-gl/dist/maplibre-gl.css";
import styles from "./styles.module.css";
import {
  MAX_RES,
  zoomForCell,
  zoomForDisk,
  diskMode,
  diskCells,
  needsReseed,
  gridLabel,
  coordPrecision,
  densifyRing,
  childSeqs,
  parseZ7Input,
  inBounds,
  sphericalAreaKm2,
  formatArea,
} from "./geometry.mjs";
import PageHeader from "./PageHeader";
import Panel from "./Panel";
import HelpBar from "./HelpBar";
// IGEO7 = DGGRID ISEA aperture-7, Snyder vert0 latitude, icosahedron orientation
// longitude 11.2 (NOT the DGGRID default 11.25). To change the grid, edit
// igeo7-config.mjs -- it is the one place, shared with both test harnesses.
// Authalic latitude conversion is separate and mandatory; see geoOf() below.
// Verified against the lab's pydggal golden table: Lisbon (38.7223,-9.1393) res5
// -> 0064156, matching at every resolution for all non-degenerate points.
import { IGEO7 } from "./igeo7-config.mjs";

const CELL_CAP = 1400; // ceiling for both the viewport fill and the anchored disk
// The map opens on Lisbon, which is the lab's golden reference point for the
// grid configuration. The coordinate box defaults to the University of Tartu:
// it is the lab's own home, so it is the jump most readers of this page want.
// NOT the same as the "Tartu" test point in scripts/verify-igeo7.mjs, which is
// the city centre a few hundred metres away.
const LISBON = { lat: 38.7223, lon: -9.1393 };
// 58.3735527,26.7153103
const TARTU_UNIVERSITY = { lat: 58.3735527, lon: 26.7153103 }; 

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

/** "38.6169° N" - rounded before the sign is read, so -0.00001 is not "S". */
function hemisphere(v, pos, neg) {
  const r = Number(v.toFixed(4));
  return `${Math.abs(r).toFixed(4)}° ${r < 0 ? neg : pos}`;
}

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

// Adds the overlay sources + layers. Idempotent - safe to call after a
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

  const ringRef = useRef(true); // k=1 ring currently shown? (on by default)
  const redrawRef = useRef(null); // pending debounced grid redraw
  const patchRef = useRef(null); // what the "cells" source currently holds
  // Where the next disk should be centred. Set by deliberate acts only -- a
  // click, Locate, Find, Parent -- so the sample always sits on the cell the
  // user is actually looking at. Null means "use the map centre".
  const seedRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [res, setRes] = useState(0);
  const [panel, setPanel] = useState(null);
  const [kidsShown, setKidsShown] = useState(false);
  const [ringShown, setRingShown] = useState(true);
  const [latInput, setLatInput] = useState(String(TARTU_UNIVERSITY.lat));
  const [lonInput, setLonInput] = useState(String(TARTU_UNIVERSITY.lon));
  const [idInput, setIdInput] = useState("");
  const [idBad, setIdBad] = useState(false);
  const [gridTag, setGridTag] = useState("none"); // mirrored to data-grid

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
    const mb = map.getBounds();
    const b = {
      south: mb.getSouth(),
      north: mb.getNorth(),
      west: mb.getWest(),
      east: mb.getEast(),
    };
    const pad = 0.25 * (b.north - b.south + 1e-6);
    const inB = (lng, lat) => inBounds(lng, lat, b, pad);
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

  // Draw the grid, in one of two modes.
  //
  // viewport mode: the visible area needs fewer cells than the cap, so tile all
  // of it. Unchanged behaviour, redrawn on every move.
  //
  // disk mode: the visible area needs MORE cells than the cap, so tiling it is
  // not an option and we draw an anchored local disk instead. The disk is
  // anchored to the GROUND: it is rebuilt only when the map centre leaves it.
  // Re-seeding from map.getCenter() on every moveend is what used to make the
  // grid slide along with the camera -- at resolution 8 on a wide view, panning
  // a tenth of the screen width replaced every single drawn cell.
  const drawGrid = useCallback(() => {
    const map = mapRef.current;
    const dggs = dggsRef.current;
    if (!map || !dggs || !map.getSource("cells")) return;
    const r = resRef.current;

    try {
      const c = map.getCenter();
      const mb = map.getBounds();
      const b = { south: mb.getSouth(), north: mb.getNorth(), west: mb.getWest(), east: mb.getEast() };
      // The SAME padding the viewport fill applies, so the mode test and the
      // fill agree about how much area is being asked for. Deciding from raw
      // bounds leaves a band below the boundary where the mode says "viewport"
      // but the cap still binds, which is the sliding grid all over again.
      const pad = 0.25 * (b.north - b.south + 1e-6);
      const padded = {
        south: b.south - pad, north: b.north + pad,
        west: b.west - pad, east: b.east + pad,
      };

      const mode = diskMode(dggs, padded, r, CELL_CAP) ? "disk" : "viewport";

      // A disk shrinks by sqrt(7) per resolution step; the viewport does not.
      // Zoomed far out at a fine resolution the disk is a speck, and because
      // any pan then leaves it, it re-seeds on every move -- which looks
      // exactly like the camera-tracking bug this replaced. Draw nothing and
      // say so instead. zoomForDisk targets 70% of the width, and each zoom
      // level halves, so 3 levels below that is about 9%.
      if (mode === "disk") {
        const zFit = zoomForDisk(dggs, r, 21, map.getContainer().clientWidth, c.lat);
        if (map.getZoom() < zFit - 3) {
          patchRef.current = null;
          setGridTag(`toosmall:${r}:${zFit.toFixed(1)}`);
          map.getSource("cells").setData(EMPTY);
          return;
        }
      }

      const patch = patchRef.current;

      if (!needsReseed(patch, mode, r)) {
        // Still valid. Re-set the same data rather than doing nothing: a theme
        // switch drops and recreates the source EMPTY, so skipping the setData
        // would leave a blank map until the next resolution change.
        map.getSource("cells").setData(patch.fc);
        return;
      }

      let list;
      let k = 0;
      let seedId = "";
      if (mode === "disk") {
        // Seed on the cell the user last chose deliberately, falling back to
        // the map centre. Without this the disk sits wherever it was first
        // built and has nothing to do with the cell you just clicked, which
        // reads as the grid being drawn in the wrong part of the map.
        const seedSeq =
          seedRef.current !== null
            ? seedRef.current
            : dggs.geoToSequenceNum([[c.lng, dggs.igeo7GeoToAuthalic(c.lat)]], r)[0];
        const d = diskCells(dggs, seedSeq, r, CELL_CAP);
        list = d.list;
        k = d.k;
        seedId = dggs.igeo7ToString(dggs.sequenceNumToZ7(seedSeq, r));
      } else {
        list = viewportCells(r);
      }

      const fc = fcOf(list, r);
      const next = { mode, res: r, k, seedId, cells: new Set(list.map(String)), count: list.length, fc };
      patchRef.current = next;
      setGridTag(gridLabel(next));
      map.getSource("cells").setData(fc);
    } catch {
      // Invalidate, or the next redraw would "reuse" a patch that is no longer
      // on screen and the map would stay blank for good.
      patchRef.current = null;
      setGridTag("none");
      map.getSource("cells").setData(EMPTY);
    }
  }, [fcOf, viewportCells]);

  // A full redraw costs roughly a quarter of a second of synchronous work at
  // the cell cap, and a range input fires once per tick while it is dragged, so
  // driving drawGrid directly froze the page for seconds on a 0 -> 15 sweep.
  // The resolution readout still updates instantly; only the redraw waits for
  // the drag to settle.
  const drawGridSoon = useCallback(() => {
    if (redrawRef.current) clearTimeout(redrawRef.current);
    redrawRef.current = setTimeout(() => {
      redrawRef.current = null;
      drawGrid();
    }, 160);
  }, [drawGrid]);

  // Surface area of one cell, in km2.
  //
  // For hexagons this is webDggrid's cellAreaKM(), which is exactly
  // Earth / (10 * 7^res) -- the same series the site's own resolution table
  // publishes, so the two cross-check. Measuring the drawn polygon instead
  // would be worse, not better: a cell edge under ISEA is not a great-circle
  // arc, so a great-circle polygon is only an approximation of it, off by about
  // 1.6% for a resolution-1 hexagon (it does converge, reaching 1.00000 by
  // resolution 5).
  //
  // The twelve pentagons are materially smaller and have no published figure,
  // so they are measured from the cell's own boundary. That is done on the
  // AUTHALIC sphere, before latitudes become geodetic, because that is the
  // sphere the grid is equal-area on.
  const areaOf = useCallback((dggs, seq, r, pentagon) => {
    if (!pentagon) return dggs.cellAreaKM(r);
    const fc = dggs.sequenceNumToGridFeatureCollection([seq], r, false);
    return sphericalAreaKm2(densifyRing(fc.features[0].geometry.coordinates[0]));
  }, []);

  // Render the selection ecosystem (cell + k=1 ring + optional children) and panel.
  const renderSelection = useCallback(
    (seq, r, { fly, anchor } = {}) => {
      const dggs = dggsRef.current;
      const map = mapRef.current;
      // Selecting a cell places the sample. This is what keeps the disk on the
      // cell you clicked instead of wherever the camera happened to be when it
      // was last built.
      seedRef.current = seq;
      patchRef.current = null;

      const z7 = dggs.sequenceNumToZ7(seq, r);
      const id = dggs.igeo7ToString(z7);
      const [lng, lat] = geoOf(dggs, seq, r);

      // Remember the point the USER asked for, not the cell's centroid, so a
      // resolution change can re-resolve the same place. Re-resolving the
      // centroid instead walks the selection away: a coarse cell's centre can
      // be hundreds of km from where you clicked, and each slider step compounds
      // it -- selecting Tartu at resolution 0 and dragging to 9 landed 906 km
      // away, on the icosahedron vertex. When the selection came from a Z7 index
      // there is no user point, and the centroid IS the right anchor.
      selRef.current = { seq, res: r, anchor: anchor || { lat, lon: lng } };
      const nbrs = (dggs.sequenceNumNeighbors([seq], r)[0] || []).filter((n) =>
        dggs.igeo7IsValid(dggs.sequenceNumToZ7(n, r))
      );
      const kids = childSeqs(dggs, seq, r);
      const pentagon = nbrs.length < 6;

      map.getSource("sel").setData(fcOf([seq], r));
      map.getSource("nbr").setData(ringRef.current ? fcOf(nbrs, r) : EMPTY);

      if (kidsRef.current && kids.length) {
        map.getSource("child").setData(fcOf(kids, r + 1));
      } else {
        map.getSource("child").setData(EMPTY);
      }

      let area = "-";
      try {
        area = formatArea(areaOf(dggs, seq, r, pentagon));
      } catch {
        /* leave as "-" rather than losing the whole panel over one field */
      }

      setPanel({
        id,
        hex: hexOf(z7),
        res: r,
        // Round before choosing the hemisphere, or a centroid at -0.00001
        // displays as "0.0000 S".
        latLabel: hemisphere(lat, "N", "S"),
        lonLabel: hemisphere(lng, "E", "W"),
        area,
        type: pentagon ? "Pentagon" : "Hexagon",
        nbr: nbrs.length,
        kids: kids.length,
      });
      // Precision follows resolution: 4 places is ~11 m, which lands in a
      // NEIGHBOURING cell at res 14 (9.8 m) and res 15 (3.7 m), so Locate would
      // walk you off the cell you just selected.
      const prec = coordPrecision(r);
      setLatInput(lat.toFixed(prec));
      setLonInput(lng.toFixed(prec));

      if (fly) map.flyTo({ center: [lng, lat], zoom: zoomForCell(r) });
      // Repaint the sample around the newly placed seed. Debounced, so a click
      // that also triggers a flight does not build the disk twice.
      drawGridSoon();
    },
    [fcOf, areaOf, drawGridSoon]
  );

  const selectGeo = useCallback(
    (lat, lon, r, opts) => {
      const dggs = dggsRef.current;
      const seq = dggs.geoToSequenceNum([[lon, dggs.igeo7GeoToAuthalic(lat)]], r)[0];
      // Carry the caller's own lat/lon through as the anchor: this is a real
      // point the user pointed at, and it must survive a resolution change.
      renderSelection(seq, r, { ...opts, anchor: { lat, lon } });
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

        // On a phone the map area is short and the panel sits below it, so open
        // on the whole globe rather than a continental view -- it reads far
        // better in that space and matches how the grid is meant to be seen.
        const narrow = typeof window !== "undefined" && window.innerWidth <= 700;

        map = new maplibregl.Map({
          container: mapContainer.current,
          style: basemapStyle(dark),
          center: [LISBON.lon, LISBON.lat],
          zoom: narrow ? 0.9 : 3,
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
      patchRef.current = null; // setStyle dropped the sources; nothing is drawn
      drawGrid();
      const sel = selRef.current;
      if (sel) renderSelection(sel.seq, sel.res, {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark]);

  // --- UI handlers ---
  // Changing resolution frames the grid, if it would otherwise be too small to
  // see. Deliberately ONLY here: never on pan, never on zoom, so the camera is
  // never taken away mid-gesture. Without it, choosing resolution 10 from a
  // continental view draws a correct 20 km disk that is a few pixels wide and
  // reads as nothing at all -- and, being smaller than a pan, re-seeds on every
  // move, which looks like the camera-tracking bug it replaced.
  const frameGrid = (r) => {
    const map = mapRef.current;
    const dggs = dggsRef.current;
    if (!map || !dggs) return;
    try {
      const c = map.getCenter();
      const mb = map.getBounds();
      const b = { south: mb.getSouth(), north: mb.getNorth(), west: mb.getWest(), east: mb.getEast() };
      const pad = 0.25 * (b.north - b.south + 1e-6);
      const padded = { south: b.south - pad, north: b.north + pad, west: b.west - pad, east: b.east + pad };
      // Nothing to frame in viewport mode: the grid already covers the whole
      // visible area, at any zoom. This guard is what keeps coarse resolutions
      // alone -- a resolution-1 cell is 3000 km across, so "fit a disk of them"
      // asks for a zoom below 0 and would shrink the globe to a marble.
      if (!diskMode(dggs, padded, r, CELL_CAP)) return;
      const zFit = zoomForDisk(dggs, r, 21, map.getContainer().clientWidth, c.lat);
      // Zoom IN only. Framing exists to make a too-small disk visible; it must
      // never pull the camera back out, which is jarring and, at the coarse end,
      // actively wrong.
      if (map.getZoom() < zFit - 0.75) map.easeTo({ zoom: zFit, duration: 700 });
    } catch {
      /* framing is a convenience; never let it break the redraw */
    }
  };

  const onRes = (r) => {
    setRes(r);
    resRef.current = r;
    frameGrid(r);
    drawGridSoon();
    const sel = selRef.current;
    if (sel) {
      // Re-resolve the point the user asked for, NOT the current cell's
      // centroid. See renderSelection: centroid-chasing drifts hundreds of km.
      try {
        selectGeo(sel.anchor.lat, sel.anchor.lon, r, {});
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
    // parseZ7Input enforces the Z7 grammar before the engine sees the string.
    // igeo7FromString itself accepts anything -- "hello" used to resolve to a
    // real cell -- and a longer index, while perfectly valid, is above this
    // explorer's ceiling and could not be represented on the slider.
    const hit = parseZ7Input(dggs, idInput);
    if (!hit) {
      setIdBad(true);
      setTimeout(() => setIdBad(false), 1200);
      return;
    }
    try {
      setRes(hit.res);
      resRef.current = hit.res;
      // Deferred, not immediate: a synchronous draw here builds a full disk at
      // the PRE-fly camera position that the post-flyTo moveend then throws
      // away. The debounce outlives the flight start, so the moveend redraw
      // wins -- while still firing if flyTo turns out to be a no-op.
      drawGridSoon();
      renderSelection(hit.seq, hit.res, { fly: true });
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
    drawGridSoon(); // see onGoId: avoid a throwaway disk at the pre-fly centre
    // Keep the user's own point as the anchor: stepping to a parent and then
    // moving the slider should still come back to where they were looking.
    renderSelection(par, r, { fly: true, anchor: sel.anchor });
  };

  const onToggleKids = () => {
    const next = !kidsRef.current;
    kidsRef.current = next;
    setKidsShown(next);
    const sel = selRef.current;
    if (sel) renderSelection(sel.seq, sel.res, {});
  };

  const onToggleRing = () => {
    const next = !ringRef.current;
    ringRef.current = next;
    setRingShown(next);
    const sel = selRef.current;
    if (sel) renderSelection(sel.seq, sel.res, {});
  };

  // Keyboard shortcuts, as listed in the help bar and in proposal/mockup.html.
  // "+ / -" and the arrow keys are MapLibre's own bindings and are left alone.
  // Nothing fires while a field has focus, or typing "c" into the Z7 box would
  // toggle the children layer.
  useEffect(() => {
    if (!ready) return;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target;
      const tag = el && el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el && el.isContentEditable)) return;
      switch (e.key) {
        case "[":
          if (resRef.current > 0) onRes(resRef.current - 1);
          break;
        case "]":
          if (resRef.current < MAX_RES) onRes(resRef.current + 1);
          break;
        case "p":
        case "P":
          onParent();
          break;
        case "c":
        case "C":
          onToggleKids();
          break;
        case "r":
        case "R":
          onToggleRing();
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Drop any pending redraw if the component goes away mid-drag.
  useEffect(() => () => redrawRef.current && clearTimeout(redrawRef.current), []);

  return (
    <div className={styles.page}>
      <PageHeader />

      <div className={styles.explorer}>
        <div className={styles.mapArea}>
          {/* data-grid states what is actually drawn. A disk is determined by
              its seed, ring count and resolution, so comparing this one string
              across a pan proves the cells did not move -- which is what makes
              the anchoring testable in a browser without putting the MapLibre
              instance on window. */}
          <div ref={mapContainer} className={styles.map} data-grid={gridTag} />
          <div className={styles.resBadge}>
            <span>res&nbsp;{res}</span>
            {gridTag.startsWith("disk:") && (
              <span className={styles.resBadgeSub}>
                local disk &middot; {gridTag.split(":").pop()} cells
              </span>
            )}
            {gridTag.startsWith("toosmall:") && (
              <span className={styles.resBadgeSub}>zoom in to see this resolution</span>
            )}
          </div>
          {error && <div className={styles.error}>Failed to load the DGGS engine: {error}</div>}
          {!ready && !error && <div className={styles.loading}>Loading IGEO7 engine…</div>}
        </div>

        <Panel
          res={res}
          onRes={onRes}
          latInput={latInput}
          lonInput={lonInput}
          setLatInput={setLatInput}
          setLonInput={setLonInput}
          onLocate={onGoGeo}
          idInput={idInput}
          setIdInput={setIdInput}
          onGoId={onGoId}
          idBad={idBad}
          cell={panel}
          kidsShown={kidsShown}
          ringShown={ringShown}
          onParent={onParent}
          onToggleKids={onToggleKids}
          onToggleRing={onToggleRing}
        />
      </div>

      <HelpBar />
    </div>
  );
}
