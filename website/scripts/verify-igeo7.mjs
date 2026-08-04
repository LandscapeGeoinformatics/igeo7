#!/usr/bin/env node
/**
 * IGEO7 conformance harness for the /explore explorer (SoW deliverable D4).
 *
 * Runs the exact engine configuration used by the explorer component
 * (src/components/Z7Explorer/index.js) over a set of test points and reports,
 * per point and resolution, the Z7 index, hex, geodetic centroid and cell type.
 *
 *   node scripts/verify-igeo7.mjs                    # built-in test points
 *   node scripts/verify-igeo7.mjs points.csv         # compare against a CSV
 *   node scripts/verify-igeo7.mjs points.csv --md    # emit a markdown table
 *
 * CSV format (header required), one row per expected result:
 *
 *   lat,lon,resolution,expected_z7
 *   38.7223,-9.1393,5,0064156
 *
 * Exit code is non-zero if any expected value mismatches, so this can be wired
 * into CI if the lab ever wants it gated.
 */
import { Webdggrid } from "webdggrid";
import { readFileSync } from "node:fs";
// The very same object the running explorer hands to setDggs(). Imported rather
// than copied, so this harness cannot report green while checking a different
// grid than the site actually serves.
import { IGEO7 } from "../src/components/Z7Explorer/igeo7-config.mjs";
import { MAX_RES } from "../src/components/Z7Explorer/geometry.mjs";

// Same spread the explorer must stay correct over: the lab's golden anchor, the
// lab's own location, the equator (where authalic == geodetic), the
// antimeridian, both poles, and high/low latitudes in both hemispheres.
const DEFAULT_POINTS = [
  ["Lisbon (golden anchor)", 38.7223, -9.1393],
  ["Tartu", 58.3776, 26.729],
  ["Null Island", 0.0, 0.0],
  ["Quito", -0.1807, -78.4678],
  ["Singapore", 1.3521, 103.8198],
  ["Auckland", -36.8485, 174.7633],
  ["Suva (antimeridian)", -18.1416, 178.4419],
  ["Anchorage", 61.2181, -149.9003],
  ["Ushuaia", -54.8019, -68.303],
  ["North Pole", 90.0, 0.0],
  ["South Pole", -90.0, 0.0],
];

// Expected Z7 indices for the lab's Lisbon reference point at every resolution.
// These are asserted, so the default run pins both mandatory IGEO7 settings
// rather than only checking internal self-consistency.
//
// Two things are worth knowing about what each row can and cannot prove:
//
//   Authalic conversion: pinned from resolution 5. Feeding raw geodetic
//   latitude instead gives 0064154 there, not 0064156.
//
//   Orientation 11.2: resolutions 0 to 5 are IDENTICAL under 11.2 and under
//   DGGRID's default 11.25, so the lab's res-5 anchor alone cannot tell the two
//   apart. The first divergence is at resolution 6, where 11.25 gives 00641542
//   instead of 00641565. The res >= 6 rows are what actually discriminate it.
const LISBON_EXPECTED = {
  0: "00",
  1: "006",
  2: "0064",
  3: "00641",
  4: "006415",
  5: "0064156",
  6: "00641565",
  7: "006415654",
  8: "0064156546",
  9: "00641565463",
  10: "006415654630",
};

const hexOf = (z7) => "0x" + z7.toString(16).toUpperCase().padStart(16, "0");

const dggs = await Webdggrid.load();
dggs.setDggs(IGEO7, 0);

/** geo (WGS84) -> cell. Latitude must be converted to authalic first. */
const cellAt = (lat, lon, r) =>
  dggs.geoToSequenceNum([[lon, dggs.igeo7GeoToAuthalic(lat)]], r)[0];

/** cell -> geo. sequenceNumToGeo returns an authalic latitude; convert back. */
const centroidOf = (seq, r) => {
  const [lng, alat] = dggs.sequenceNumToGeo([seq], r)[0];
  return [lng, dggs.igeo7AuthalicToGeo(alat)];
};

function inspect(lat, lon, r) {
  const seq = cellAt(lat, lon, r);
  const z7 = dggs.sequenceNumToZ7(seq, r);
  const [clon, clat] = centroidOf(seq, r);
  const nbrs = (dggs.sequenceNumNeighbors([seq], r)[0] || []).filter((n) =>
    dggs.igeo7IsValid(dggs.sequenceNumToZ7(n, r))
  );
  // A cell's own centroid must resolve back to that same cell. This is the
  // check that catches a missing or double authalic conversion.
  const roundTrip = cellAt(clat, clon, r) === seq;
  return {
    seq,
    id: dggs.igeo7ToString(z7),
    hex: hexOf(z7),
    clat,
    clon,
    type: nbrs.length < 6 ? "Pentagon" : "Hexagon",
    nbrs: nbrs.length,
    valid: dggs.igeo7IsValid(z7),
    roundTrip,
  };
}

const args = process.argv.slice(2);
const asMarkdown = args.includes("--md");
const csvPath = args.find((a) => !a.startsWith("--"));

let failures = 0;
const rows = [];

if (csvPath) {
  // ---- compare against supplied expected values -------------------------
  // Strip a UTF-8 BOM: spreadsheet exports routinely carry one, and it would
  // otherwise corrupt the first header name and produce a confusing error.
  const text = readFileSync(csvPath, "utf8").replace(/^﻿/, "").trim();
  const lines = text.split(/\r?\n/);
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const col = (n) => header.indexOf(n);
  const [iLat, iLon, iRes, iExp] = [
    col("lat"),
    col("lon"),
    col("resolution"),
    col("expected_z7"),
  ];
  if ([iLat, iLon, iRes, iExp].some((i) => i < 0)) {
    console.error("CSV must have columns: lat,lon,resolution,expected_z7");
    process.exit(2);
  }
  for (const [n, line] of lines.slice(1).entries()) {
    if (!line.trim()) continue;
    const f = line.split(",");
    const lat = parseFloat(f[iLat]);
    const lon = parseFloat(f[iLon]);
    const r = parseInt(f[iRes], 10);
    const expected = (f[iExp] ?? "").trim();
    // Report a bad row by number instead of throwing a stack trace at whoever
    // handed us the file.
    if (!expected || Number.isNaN(lat) || Number.isNaN(lon) || Number.isNaN(r)) {
      console.error(`Row ${n + 2}: malformed or missing field -> ${line}`);
      failures++;
      continue;
    }
    const got = inspect(lat, lon, r);
    const pass = got.id === expected;
    if (!pass) failures++;
    rows.push({
      point: `${lat}, ${lon}`,
      r,
      expected,
      actual: got.id,
      hex: got.hex,
      result: pass ? "PASS" : "FAIL",
    });
  }
} else {
  // ---- sweep over the built-in points ------------------------------------
  for (const [name, lat, lon] of DEFAULT_POINTS) {
    for (let r = 0; r <= MAX_RES; r++) {
      const g = inspect(lat, lon, r);
      const expected = name.startsWith("Lisbon") ? LISBON_EXPECTED[r] : undefined;

      // A cell is correct only if it is a valid index, its own centroid resolves
      // back to it, its neighbour count is one of the two the grid allows, and
      // where we have a known-good index it matches. The neighbour check is
      // asserted, not merely reported: IGEO7 admits 6 (hexagon) or 5 (pentagon)
      // and nothing else.
      const nbrsOk = g.nbrs === 6 || g.nbrs === 5;
      const idOk = expected === undefined || g.id === expected;
      const pass = g.valid && g.roundTrip && nbrsOk && idOk;
      if (!pass) failures++;

      rows.push({
        point: name,
        r,
        id: g.id,
        expected: expected ?? "-",
        hex: g.hex,
        centroid: `${g.clat.toFixed(4)}, ${g.clon.toFixed(4)}`,
        type: g.type,
        nbrs: g.nbrs,
        result: pass ? "PASS" : "FAIL",
      });
    }
  }
}

if (!rows.length) {
  console.error("No test rows were produced. Is the CSV empty apart from its header?");
  process.exit(2);
}

if (asMarkdown) {
  const cols = Object.keys(rows[0]);
  console.log("| " + cols.join(" | ") + " |");
  console.log("|" + cols.map(() => "---").join("|") + "|");
  for (const row of rows) console.log("| " + cols.map((c) => row[c]).join(" | ") + " |");
} else {
  console.table(rows);
}

console.log(
  `\n${rows.length - failures}/${rows.length} passed` +
    (failures ? ` - ${failures} FAILED` : "")
);
process.exit(failures ? 1 : 0);
