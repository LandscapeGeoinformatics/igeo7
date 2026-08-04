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
  ["0064156546301", "resolution 11 is above the explorer ceiling"],
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
  ["006415654630", MAX_RES, "006415654630"],
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
  const [seq] = seqOfId("006415654630");
  check("no children offered at the resolution ceiling", childSeqs(dggs, seq, MAX_RES).length === 0);
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
console.log(
  `\n${passed}/${passed + failures.length} passed` +
    (failures.length ? ` - ${failures.length} FAILED\n\n` + failures.map((f) => "  " + f).join("\n") : "")
);
process.exit(failures.length ? 1 : 0);
