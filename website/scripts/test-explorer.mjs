#!/usr/bin/env node
/**
 * Regression tests for the /explore explorer's pure helpers
 * (src/components/Z7Explorer/geometry.mjs).
 *
 *   node scripts/test-explorer.mjs
 *
 * Complements scripts/verify-igeo7.mjs, which pins IGEO7 *conformance* (the
 * right cell for a given lat/lon). This file pins the things conformance cannot
 * see: input validation, child enumeration, viewport bounds and ring geometry.
 *
 * Exit code is non-zero on any failure.
 */
import { Webdggrid } from "webdggrid";
import {
  MAX_RES,
  MAX_MAP_ZOOM,
  zoomForCell,
  viewportAreaKm2,
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
} from "../src/components/Z7Explorer/geometry.mjs";
// Same config object the explorer runs on. The expectations below are pinned to
// it -- the Lisbon indices, the base-cell range 00..11 and the named pole cells
// all assume orientation 11.2 -- so if the grid is changed these SHOULD fail.
import { IGEO7 } from "../src/components/Z7Explorer/igeo7-config.mjs";

const dggs = await Webdggrid.load();
dggs.setDggs(IGEO7, 0);

// ---- tiny assert harness -------------------------------------------------
let passed = 0;
const failures = [];
let group = "";
const describe = (g) => {
  group = g;
  console.log(`\n${g}`);
};
function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(`${group} :: ${name}${detail ? ` -- ${detail}` : ""}`);
    console.log(`  FAIL  ${name}${detail ? `  (${detail})` : ""}`);
  }
}

// ---- shared helpers ------------------------------------------------------
const idOf = (seq, r) => dggs.igeo7ToString(dggs.sequenceNumToZ7(seq, r));
const seqOfId = (id) => {
  const z7 = dggs.igeo7FromString(id);
  const r = dggs.igeo7GetResolution(z7);
  return [dggs.z7ToSequenceNum(z7, r), r];
};
const rawRing = (seq, r) =>
  dggs.sequenceNumToGridFeatureCollection([seq], r, false).features[0].geometry.coordinates[0];
const nbrsOf = (seq, r) => dggs.sequenceNumNeighbors([seq], r)[0] || [];
const isPentagon = (seq, r) => nbrsOf(seq, r).length < 6;
const lonExtent = (ring) => {
  const lons = ring.map((p) => p[0]);
  return Math.max(...lons) - Math.min(...lons);
};

// =========================================================================
describe("Bug 1 - Z7 lookup input validation");

// The engine's igeo7FromString maps arbitrary characters onto a cell rather
// than rejecting them (base cell is taken mod 16, digits mod 8), and
// igeo7IsValid only ever rejects the UINT64_MAX sentinel. Validation has to
// happen before the engine sees the string.
const REJECT = [
  ["hello", "letters -> resolved to cell 0544"],
  ["0064156xyz", "trailing junk -> resolved to a res-8 cell"],
  ["!!!", "punctuation -> resolved to cell 111"],
  ["999999", "base cell 99 does not exist (only 00..11)"],
  ["12", "base cell 12 does not exist"],
  ["19", "base cell 19 wraps to 03"],
  ["007", "digit 7 is the terminator, not a direction"],
  ["008", "digit 8 wraps to 0"],
  ["0", "incomplete base cell"],
  ["  ", "whitespace only"],
  ["006415654630111111", "resolution 16 is above the explorer ceiling"],
  ["0xFFFFFFFFFFFFFFFF", "the invalid sentinel"],
  ["0xZZ", "malformed hex"],
  ["-1", "negative"],
];
for (const [input, why] of REJECT) {
  const got = parseZ7Input(dggs, input);
  check(`rejects ${JSON.stringify(input)} (${why})`, got === null, got && `got res ${got.res} id ${dggs.igeo7ToString(got.z7)}`);
}

const ACCEPT = [
  ["00", 0, "00"],
  ["0064156", 5, "0064156"],
  [" 0064156 ", 5, "0064156"],
  // Pinned to a LITERAL 10, not to MAX_RES. Pairing a fixed index with the
  // symbolic ceiling made this fixture silently follow the constant while its
  // input did not, so it broke the moment the ceiling moved.
  ["006415654630", 10, "006415654630"],
  ["00641565463065523", MAX_RES, "00641565463065523"],
  ["11454545454", 9, "11454545454"],
  ["0x0D0DDFFFFFFFFFFF", 5, "0064156"],
  ["0x0d0ddfffffffffff", 5, "0064156"],
];
for (const [input, wantRes, wantId] of ACCEPT) {
  const got = parseZ7Input(dggs, input);
  const ok = got !== null && got.res === wantRes && dggs.igeo7ToString(got.z7) === wantId;
  check(
    `accepts ${JSON.stringify(input)} -> ${wantId} (res ${wantRes})`,
    ok,
    got === null ? "rejected" : `got ${dggs.igeo7ToString(got.z7)} res ${got.res}`
  );
}

// =========================================================================
describe("Bug 2 - pentagon children");

// Appending digits 0..6 blindly gives 7 children for every cell. Pentagons
// have 6; the surplus digit is not fixed (it varies by base cell) and can
// resolve into an entirely different base cell.
for (const id of ["00", "000", "0000", "11", "114", "08"]) {
  const [seq, r] = seqOfId(id);
  const pent = isPentagon(seq, r);
  const kids = childSeqs(dggs, seq, r);
  const want = pent ? 6 : 7;
  check(
    `${id} (res ${r}, ${pent ? "pentagon" : "hexagon"}) has ${want} children`,
    kids.length === want,
    `got ${kids.length}`
  );

  const kidIds = kids.map((k) => idOf(k, r + 1));
  check(`${id} children are distinct`, new Set(kidIds).size === kids.length, kidIds.join(" "));

  const baseOk = kidIds.every((k) => k.slice(0, 2) === id.slice(0, 2));
  check(`${id} children stay in base cell ${id.slice(0, 2)}`, baseOk, kidIds.join(" "));

  const prefixOk = kidIds.every((k) => k.startsWith(id));
  check(`${id} children are prefixed by the parent index`, prefixOk, kidIds.join(" "));

  const parentOk = kids.every((k) => dggs.sequenceNumParent([k], r + 1)[0] === seq);
  check(`${id} children all report ${id} as parent`, parentOk);
}

// Sweep: every cell's child count must match its topology.
{
  let bad = 0, n = 0;
  for (let r = 0; r <= 4; r++) {
    for (const [lat, lon] of [[38.7, -9.1], [0, 0], [58.4, 26.7], [-36.8, 174.8], [89.9, 0], [-89.9, 0], [-18.1, 178.4]]) {
      const seq = dggs.geoToSequenceNum([[lon, dggs.igeo7GeoToAuthalic(lat)]], r)[0];
      const want = isPentagon(seq, r) ? 6 : 7;
      const got = childSeqs(dggs, seq, r).length;
      n++;
      if (got !== want) {
        bad++;
        console.log(`        ${idOf(seq, r)} res ${r}: want ${want} got ${got}`);
      }
    }
  }
  check(`sweep of ${n} cells: child count matches topology`, bad === 0, `${bad} mismatched`);
}

// Children at the resolution ceiling are suppressed on purpose.
{
  const [seqCeil] = seqOfId("00641565463065523"); // a real res-15 cell
  check("no children offered at the resolution ceiling", childSeqs(dggs, seqCeil, MAX_RES).length === 0);
  const [seqBelow] = seqOfId("0064156546306552"); // res 14, one below
  check("children are still offered one below the ceiling", childSeqs(dggs, seqBelow, MAX_RES - 1).length === 7);
}

// MAX_RES is this page's scope, not an engine limit. Record where the real
// ceiling is, so nobody has to rediscover it before raising the slider: a Z7
// index spends 4 bits on the base cell and 3 per digit, so resolution 20 fills
// a 64-bit word exactly and 21 cannot exist.
{
  check("Z7 bit budget puts the true ceiling at resolution 20", 4 + 3 * 20 === 64 && 4 + 3 * 21 > 64);
  let deepest = 0;
  let prev = null;
  let chainOk = true;
  for (let r = 0; r <= 20; r++) {
    const seq = dggs.geoToSequenceNum([[-9.1393, dggs.igeo7GeoToAuthalic(38.7223)]], r)[0];
    const id = idOf(seq, r);
    const [clon, alat] = dggs.sequenceNumToGeo([seq], r)[0];
    const clat = dggs.igeo7AuthalicToGeo(alat);
    const roundTrips = dggs.geoToSequenceNum([[clon, dggs.igeo7GeoToAuthalic(clat)]], r)[0] === seq;
    // 5 or 6: at resolution 0 every cell is a pentagon.
    const n = (dggs.sequenceNumNeighbors([seq], r)[0] || []).length;
    const nbrsOk = n === 6 || n === 5;
    if (id.length !== r + 2 || !roundTrips || !nbrsOk) break;
    if (prev !== null && !id.startsWith(prev)) chainOk = false;
    prev = id;
    deepest = r;
  }
  check(`engine stays correct all the way to resolution 20 (reached ${deepest})`, deepest === 20);
  check("...and the parent prefix chain holds at every level", chainOk);
}

// =========================================================================
describe("Bug 3 - antimeridian viewport bounds");

// MapLibre's globe getBounds() returns UNWRAPPED bounds, so a viewport over
// Fiji reads west=171.9 east=187.1. Cell centroids come back normalised to
// [-180, 180], so every cell east of the antimeridian failed the >= west test
// and the BFS flood fill hit a hard wall there.
{
  const fiji = { west: 171.9, east: 187.1, south: -25, north: -8 };
  const pad = 0.25 * (fiji.north - fiji.south);
  check("cell just east of the antimeridian is in bounds", inBounds(-179.719, -18.163, fiji, pad), "lng -179.719 == 180.281 unwrapped");
  check("cell just west of the antimeridian is in bounds", inBounds(178.767, -18.106, fiji, pad));
  check("cell at 179.796 is in bounds", inBounds(179.796, -16.953, fiji, pad));
  check("cell at -175 (i.e. 185) is in bounds", inBounds(-175, -18, fiji, pad));
  check("cell far west (100) is out of bounds", !inBounds(100, -18, fiji, pad));
  check("cell far east (-100 i.e. 260) is out of bounds", !inBounds(-100, -18, fiji, pad));
  check("out-of-range latitude is rejected", !inBounds(178.767, 40, fiji, pad));

  const normal = { west: -10, east: 10, south: -10, north: 10 };
  check("ordinary bounds still accept an inside point", inBounds(0, 0, normal, 1));
  check("ordinary bounds still reject an outside point", !inBounds(170, 0, normal, 1));
  check("ordinary bounds reject the antipode", !inBounds(-170, 0, normal, 1));

  const whole = { west: -190, east: 190, south: -85, north: 85 };
  check("a viewport wider than 360 deg accepts every longitude", [-179, -90, 0, 90, 179].every((l) => inBounds(l, 0, whole, 1)));
}

// =========================================================================
describe("Bug 4 - polar ring geometry");

// In this orientation no cell encloses a pole: both poles lie exactly on a
// cell EDGE. densifyRing inferred a pole from a full turn in longitude, which
// misfires on that edge and drew pole-adjacent cells across 325-359 deg of
// longitude instead of their true 180.
const POLE_CELLS = ["00", "01", "08", "11", "005", "084", "0051", "0845", "0051515", "005151515151"];
for (const id of POLE_CELLS) {
  const [seq, r] = seqOfId(id);
  const ring = densifyRing(rawRing(seq, r));
  const ext = lonExtent(ring);
  check(`${id} (res ${r}) spans <= 181 deg of longitude`, ext <= 181, `spans ${ext.toFixed(1)}`);
  const closed = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  check(`${id} ring is closed`, closed);
  const latOk = ring.every((p) => Math.abs(p[1]) <= 90.0000001);
  check(`${id} every vertex latitude is within +/-90`, latOk);
}

// Every cell around each pole, two rings out, must be sane.
for (const [poleName, lat] of [["north", 89.9999], ["south", -89.9999]]) {
  for (const r of [0, 1, 2, 5, 8]) {
    const seed = dggs.geoToSequenceNum([[0, dggs.igeo7GeoToAuthalic(lat)]], r)[0];
    const set = new Set([seed.toString()]);
    let front = [seed];
    for (let hop = 0; hop < 2; hop++) {
      const next = [];
      for (const s of front)
        for (const n of nbrsOf(s, r)) {
          if (!set.has(n.toString())) {
            set.add(n.toString());
            next.push(n);
          }
        }
      front = next;
    }
    const all = [...set].map((s) => BigInt(s));
    let worst = 0, worstId = "";
    for (const s of all) {
      const ext = lonExtent(densifyRing(rawRing(s, r)));
      if (ext > worst) {
        worst = ext;
        worstId = idOf(s, r);
      }
    }
    check(
      `${poleName} pole res ${r}: all ${all.length} cells within 2 rings span <= 181 deg`,
      worst <= 181,
      `worst ${worstId} spans ${worst.toFixed(1)}`
    );
  }
}

// Non-polar cells must be untouched by the fix: no pole vertices, small extent.
// Resolution 0 is deliberately excluded for Lisbon and Tartu: both fall in cell
// 00, which is itself one of the four resolution-0 cells that meet at a pole
// (sampling either pole splits evenly between 00/01 north and 08/11 south), so
// a pole vertex is correct there.
for (const [name, lat, lon] of [["Lisbon", 38.7223, -9.1393], ["Null Island", 0, 0], ["Tartu", 58.3776, 26.729]]) {
  for (const r of [3, 6, 8]) {
    const seq = dggs.geoToSequenceNum([[lon, dggs.igeo7GeoToAuthalic(lat)]], r)[0];
    const ring = densifyRing(rawRing(seq, r));
    const capped = ring.some((p) => Math.abs(Math.abs(p[1]) - 90) < 1e-9);
    check(`${name} res ${r} (${idOf(seq, r)}) has no pole vertex`, !capped);
  }
}

// The cells that DO meet at a pole must be capped there, so the two sharing an
// edge through the pole close against each other instead of leaving a wedge.
for (const [id, wantLat] of [["00", 90], ["01", 90], ["005", 90], ["013", 90], ["08", -90], ["11", -90], ["084", -90], ["114", -90]]) {
  const [seq, r] = seqOfId(id);
  const ring = densifyRing(rawRing(seq, r));
  const capped = ring.some((p) => Math.abs(p[1] - wantLat) < 1e-9);
  check(`pole cell ${id} (res ${r}) is capped at ${wantLat}`, capped);
}

// The antimeridian unwrap must still work: a cell straddling 180 stays
// continuous rather than snapping back across the whole globe.
{
  const r = 4;
  const seq = dggs.geoToSequenceNum([[178.4419, dggs.igeo7GeoToAuthalic(-18.1416)]], r)[0];
  for (const s of [seq, ...nbrsOf(seq, r)]) {
    const ring = densifyRing(rawRing(s, r));
    const ext = lonExtent(ring);
    check(`antimeridian cell ${idOf(s, r)} stays continuous (extent ${ext.toFixed(2)} deg)`, ext < 20, `spans ${ext.toFixed(1)}`);
  }
}

// =========================================================================
describe("Cell area");

// Against a closed-form spherical rectangle: R^2 * dlon * (sin lat2 - sin lat1).
{
  const R = 6371.0072, T = Math.PI / 180;
  for (const [name, box, exact] of [
    ["10x10 deg box at the equator", [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], R * R * (10 * T) * Math.sin(10 * T)],
    ["a whole hemisphere", [[-180, 0], [-90, 0], [0, 0], [90, 0], [180, 0], [180, 90], [-180, 90], [-180, 0]], 2 * Math.PI * R * R],
  ]) {
    const got = sphericalAreaKm2(box);
    const err = Math.abs(got - exact) / exact;
    check(`${name}: ${got.toFixed(0)} km² vs exact ${exact.toFixed(0)}`, err < 1e-9, `relative error ${err.toExponential(2)}`);
  }
}

// cellAreaKM(r) is exactly Earth / (10 * 7^r). That is the hexagon area, which
// is why the explorer uses it for hexagons and only measures the pentagons.
{
  const EARTH_KM2 = 510065621.7;
  for (const r of [0, 1, 3, 5, 8]) {
    const expect = EARTH_KM2 / (10 * 7 ** r);
    check(
      `cellAreaKM(${r}) = Earth / (10 * 7^${r})`,
      Math.abs(dggs.cellAreaKM(r) / expect - 1) < 1e-6,
      `got ${dggs.cellAreaKM(r)} want ${expect}`
    );
  }
}

// A cell edge under ISEA is not a great-circle arc, so measuring the drawn
// polygon only approximates the true area. It converges as cells shrink: pin
// that, because it is the reason hexagons take the published figure instead.
{
  const measured = (id) => {
    const [seq, r] = seqOfId(id);
    return sphericalAreaKm2(densifyRing(rawRing(seq, r)));
  };
  for (const [id, r, tol] of [["006", 1, 2e-2], ["00641", 3, 1e-3], ["0064156", 5, 1e-4], ["0064156546", 8, 1e-4]]) {
    const ratio = measured(id) / dggs.cellAreaKM(r);
    check(
      `hexagon ${id} (res ${r}) measures within ${(tol * 100).toFixed(1)}% of the published area`,
      Math.abs(ratio - 1) < tol,
      `ratio ${ratio.toFixed(5)}`
    );
  }
  // The twelve pentagons are genuinely smaller, which is the whole reason they
  // are not given the hexagon figure.
  for (const [pentId, r] of [["000", 1], ["00000", 3], ["0000000", 5]]) {
    const p = measured(pentId);
    const [seq] = seqOfId(pentId);
    check(`pentagon ${pentId} is smaller than the res-${r} hexagon area`, p < dggs.cellAreaKM(r), `pent ${p.toFixed(0)} vs hex ${dggs.cellAreaKM(r).toFixed(0)}`);
    check(`pentagon ${pentId} really is a pentagon`, isPentagon(seq, r));
  }
}

for (const [km2, want] of [[42498941, "42,498,941 km²"], [3034.84, "3,035 km²"], [8.848, "8.85 km²"], [0.18057, "180,570 m²"], [0, "-"]]) {
  check(`formatArea(${km2}) -> ${want}`, formatArea(km2) === want, `got ${formatArea(km2)}`);
}

// =========================================================================
describe("Camera - zoomForCell");

// MapLibre's zoom is 512px based (transform_helper.ts:159 sets _tileSize = 512),
// so ground resolution is HALF the familiar 256px OSM figure at the same zoom
// number. Getting this wrong understates every on-screen cell size by 2x.
const mPerPx = (z, lat) => (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** z / 2;

check("MAX_MAP_ZOOM matches MapLibre's default maxZoom", MAX_MAP_ZOOM === 22);
check("zoomForCell never exceeds MAX_MAP_ZOOM", zoomForCell(20) <= MAX_MAP_ZOOM);
{
  let mono = true;
  for (let r = 1; r <= MAX_RES; r++) if (zoomForCell(r) < zoomForCell(r - 1)) mono = false;
  check("zoomForCell is monotonic in resolution", mono);
  // The shipped formula was Math.min(16, 1.4*res + 2). Resolutions 0..10 must
  // be bit-identical, or this silently moves the camera on what already works.
  let same = true;
  for (let r = 0; r <= 10; r++) if (zoomForCell(r) !== Math.min(16, 1.4 * r + 2)) same = false;
  check("zoomForCell matches the shipped formula at res 0..10", same);
}
// The point of the change: res 13 and 15 were pinned at zoom 16, drawing cells
// 28px and 4px across.
for (const [r, minPx] of [[13, 200], [14, 200], [15, 100]]) {
  const cls = 2 * Math.sqrt((dggs.cellAreaKM(r) * 1e6) / Math.PI);
  const px = cls / mPerPx(zoomForCell(r), 38.7223);
  check(`res ${r} cell is at least ${minPx}px at zoomForCell`, px >= minPx, `got ${Math.round(px)}px`);
}

// =========================================================================
describe("Grid mode - viewport area and mode selection");
{
  const EARTH_KM2 = 4 * Math.PI * 6371.0072 ** 2;
  const T = Math.PI / 180;
  const want = 6371.0072 ** 2 * (10 * T) * (Math.sin(10 * T) - Math.sin(0));
  const got = viewportAreaKm2({ south: 0, north: 10, west: 0, east: 10 });
  check("viewportAreaKm2 matches the closed form for a 10x10 box", Math.abs(got / want - 1) < 1e-9, `got ${got}`);

  const globe = { south: -90, north: 90, west: -180, east: 180 };
  check("whole globe is the Earth's area", Math.abs(viewportAreaKm2(globe) / EARTH_KM2 - 1) < 1e-9);
  check("longitude span above 360 clamps",
    Math.abs(viewportAreaKm2({ south: -90, north: 90, west: -400, east: 400 }) / EARTH_KM2 - 1) < 1e-9);
  check("latitudes past the poles clamp",
    Math.abs(viewportAreaKm2({ south: -120, north: 120, west: -180, east: 180 }) / EARTH_KM2 - 1) < 1e-9);
  check("unwrapped globe longitudes give the same area as wrapped",
    Math.abs(viewportAreaKm2({ south: -10, north: 10, west: 171.9, east: 187.1 }) /
             viewportAreaKm2({ south: -10, north: 10, west: -8.1, east: 7.1 }) - 1) < 1e-9);

  check("res 2 over the whole globe is viewport mode", diskMode(dggs, globe, 2, 1400) === false);
  check("res 8 over the whole globe is disk mode", diskMode(dggs, globe, 8, 1400) === true);
  const tiny = { south: 38.71, north: 38.73, west: -9.15, east: -9.13 };
  check("res 5 over a 2km box is viewport mode", diskMode(dggs, tiny, 5, 1400) === false);
  check("res 15 over a 2km box is disk mode", diskMode(dggs, tiny, 15, 1400) === true);
}

// =========================================================================
describe("Grid mode - the anchored disk");

// A pentagon CANNOT be found by geocoding. geoToSequenceNum(11.2, 58.28252559)
// returns hexagon 0000000631 at res 8, because POLE_LAT is an AUTHALIC latitude
// and, read as geodetic, lands about 12.7 km south of the icosahedron vertex.
// Build the pentagon by index instead: all-zero digits.
function pentagonSeq(r) {
  const base = dggs.igeo7GetBaseCell(dggs.igeo7FromString("00"));
  const arr = new Array(r).fill(0);
  while (arr.length < 20) arr.push(7);
  return dggs.z7ToSequenceNum(dggs.igeo7Encode(base, arr), r);
}

for (const r of [8, 13, 15]) {
  const hex = dggs.geoToSequenceNum([[-9.1393, dggs.igeo7GeoToAuthalic(38.7223)]], r)[0];
  check(`res ${r} hexagon seed really has 6 neighbours`, nbrsOf(hex, r).length === 6);
  const h = diskCells(dggs, hex, r, 1400);
  check(`res ${r} hexagon disk is k=21, 1387 cells`, h.k === 21 && h.list.length === 1387, `k=${h.k} n=${h.list.length}`);
  check(`res ${r} hexagon disk matches 1 + 3k(k+1)`, h.list.length === 1 + 3 * h.k * (h.k + 1));
  check(`res ${r} hexagon disk is within the cap`, h.list.length <= 1400);
  check(`res ${r} hexagon disk k is maximal`, 1 + 3 * (h.k + 1) * (h.k + 2) > 1400);
  check(`res ${r} hexagon disk has no duplicates`, new Set(h.list.map(String)).size === h.list.length);

  const pent = pentagonSeq(r);
  check(`res ${r} pentagon seed really has 5 neighbours`, nbrsOf(pent, r).length === 5, `got ${nbrsOf(pent, r).length}`);
  const p = diskCells(dggs, pent, r, 1400);
  check(`res ${r} pentagon disk is k=23, 1381 cells`, p.k === 23 && p.list.length === 1381, `k=${p.k} n=${p.list.length}`);
  check(`res ${r} pentagon disk matches 1 + 5k(k+1)/2`, p.list.length === 1 + (5 * p.k * (p.k + 1)) / 2);
  check(`res ${r} pentagon disk is within the cap`, p.list.length <= 1400);
}
{
  const s = dggs.geoToSequenceNum([[-9.1393, dggs.igeo7GeoToAuthalic(38.7223)]], 8)[0];
  const d = diskCells(dggs, s, 8, 3);
  check("a cap below the first ring returns the seed alone", d.k === 0 && d.list.length === 1);
}

// =========================================================================
describe("Grid mode - reseed predicate and label");
{
  const fake = (over = {}) => ({
    mode: "disk", res: 8, k: 21, seedId: "0064156546",
    cells: new Set(["100", "200", "300"]), count: 1387, fc: null, ...over,
  });
  check("no patch always reseeds", needsReseed(null, "disk", 8) === true);
  check("a resolution change reseeds", needsReseed(fake(), "disk", 9) === true);
  // THE POINT: panning must never move a disk. The predicate does not take the
  // map centre at all, so there is no way for a pan to reach it. An earlier
  // version reseeded once the centre left the disk, which just made the disk
  // jump to wherever you had panned to -- the same complaint in coarser form.
  check("an unchanged disk is never rebuilt, wherever the camera goes",
    needsReseed(fake(), "disk", 8) === false);
  check("needsReseed takes no camera position", needsReseed.length === 3);
  // The staleness traps. Without these, an implementation that blanks the map
  // on a theme switch passes every other check in this file.
  check("returning to disk after a viewport draw reseeds",
    needsReseed(fake({ mode: "viewport" }), "disk", 8) === true);
  check("viewport mode always redraws, as it does today",
    needsReseed(fake({ mode: "viewport" }), "viewport", 8) === true);

  check("disk label carries mode, seed, rings and count", gridLabel(fake()) === "disk:0064156546:21:1387");
  check("viewport label carries mode and count", gridLabel(fake({ mode: "viewport", count: 577 })) === "viewport:577");
  check("a missing patch labels as none", gridLabel(null) === "none");
}

// =========================================================================
describe("Panel - coordinate echo precision");

// The panel echoes a selected cell's centroid into the Locate inputs. Rounded
// more coarsely than the cell is wide, pressing Locate moves you to a neighbour.
for (const r of [10, 13, 14, 15]) {
  let wrong = 0;
  for (let i = 0; i < 60; i++) {
    const lat = -70 + (140 * i) / 59;
    const lon = -175 + (350 * i) / 59;
    const seq = dggs.geoToSequenceNum([[lon, dggs.igeo7GeoToAuthalic(lat)]], r)[0];
    const [clon, alat] = dggs.sequenceNumToGeo([seq], r)[0];
    const clat = dggs.igeo7AuthalicToGeo(alat);
    const p = coordPrecision(r);
    const back = dggs.geoToSequenceNum(
      [[Number(clon.toFixed(p)), dggs.igeo7GeoToAuthalic(Number(clat.toFixed(p)))]], r
    )[0];
    if (back !== seq) wrong++;
  }
  check(`res ${r}: the echoed centroid still selects its own cell`, wrong === 0, `${wrong}/60 wrong`);
}
check("precision is unchanged for the resolutions that already shipped", coordPrecision(10) === 4);
check("precision increases above the old ceiling", coordPrecision(15) > 4);

// =========================================================================
describe("Selection - the resolution slider must not walk the selection away");

// Dragging the slider re-resolves the selection. Re-resolving the CELL CENTROID
// chases a moving target: a coarse cell's centre can be hundreds of km from the
// point the user actually picked, and every step compounds it. Re-resolving the
// user's ORIGINAL point is stable by construction. Measured before the fix:
// selecting Tartu at resolution 0 and dragging to 9 landed 906 km away on the
// icosahedron vertex, and from resolution 2 it landed 202 km away in the Gulf
// of Finland as cell 00010000000.
{
  const cellAt = (lat, lon, r) => dggs.geoToSequenceNum([[lon, dggs.igeo7GeoToAuthalic(lat)]], r)[0];
  const geoOfSeq = (s, r) => {
    const [lo, a] = dggs.sequenceNumToGeo([s], r)[0];
    return [lo, dggs.igeo7AuthalicToGeo(a)];
  };
  const kmApart = (aLat, aLon, bLat, bLon) =>
    Math.hypot((bLat - aLat) * 111.32, (bLon - aLon) * 111.32 * Math.cos((aLat * Math.PI) / 180));

  for (const [name, LAT, LON] of [["Tartu", 58.3806, 26.7205], ["Lisbon", 38.7223, -9.1393]]) {
    for (const start of [0, 2, 5]) {
      // The FIXED behaviour: always re-resolve the user's own point.
      let seq = cellAt(LAT, LON, start);
      for (let r = start + 1; r <= MAX_RES; r++) seq = cellAt(LAT, LON, r);
      const [lon, lat] = geoOfSeq(seq, MAX_RES);
      const drift = kmApart(LAT, LON, lat, lon);
      // A res-15 cell is 3.7 m across, so the centroid is within metres.
      check(
        `${name}: sliding res ${start} -> ${MAX_RES} stays put (${drift * 1000 < 50 ? "<50 m" : drift.toFixed(1) + " km"})`,
        drift < 0.05,
        `drifted ${drift.toFixed(1)} km`
      );

      // And prove the OLD centroid-chasing approach really was broken, so this
      // test fails loudly if anyone reinstates it.
      let bad = cellAt(LAT, LON, start);
      let br = start;
      for (let r = start + 1; r <= MAX_RES; r++) {
        const [blon, blat] = geoOfSeq(bad, br);
        bad = cellAt(blat, blon, r);
        br = r;
      }
      const [blon2, blat2] = geoOfSeq(bad, MAX_RES);
      const badDrift = kmApart(LAT, LON, blat2, blon2);
      if (start <= 2) {
        check(
          `${name}: centroid-chasing from res ${start} really does drift (${badDrift.toFixed(0)} km)`,
          badDrift > 10,
          `only ${badDrift.toFixed(1)} km`
        );
      }
    }
  }
}

// =========================================================================
console.log(
  `\n${passed}/${passed + failures.length} passed` +
    (failures.length ? ` - ${failures.length} FAILED\n\n` + failures.map((f) => "  " + f).join("\n") : "")
);
process.exit(failures.length ? 1 : 0);
