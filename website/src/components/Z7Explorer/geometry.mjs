/**
 * Pure helpers for the IGEO7 / Z7 explorer.
 *
 * These are kept out of the React component so they can be exercised directly
 * in Node by `scripts/test-explorer.mjs`. Nothing here touches the DOM, React
 * or MapLibre; the functions that need the engine take a loaded `webdggrid`
 * instance as their first argument.
 *
 * `.mjs` rather than `.js` on purpose: the package has no `"type": "module"`,
 * so a plain `.js` file here would be CommonJS to Node while still being ESM to
 * webpack. The explicit extension keeps one module readable by both.
 */

/** Explorer resolution ceiling. The Z7 index itself goes deeper. */
export const MAX_RES = 10;

/** IGEO7 has 12 base cells (0..11), each rendered as a two-digit prefix. */
export const BASE_CELL_COUNT = 12;

const TO_R = Math.PI / 180;
const TO_D = 180 / Math.PI;

/**
 * Great-circle interpolation between two [lon, lat] corners, at roughly 2 deg
 * steps. webDggrid returns only cell corners, but the true cell edges are
 * great-circle arcs, and straight lon/lat chords between far-apart corners look
 * badly wrong for large cells. The end point is deliberately omitted so
 * segments can be concatenated without duplicating vertices.
 */
export function gcSegment(a, b) {
  const lon1 = a[0] * TO_R, lat1 = a[1] * TO_R, lon2 = b[0] * TO_R, lat2 = b[1] * TO_R;
  const d = 2 * Math.asin(
    Math.min(1, Math.sqrt(Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2))
  );
  if (d < 1e-9) return [a];
  const steps = Math.max(1, Math.ceil((d * TO_D) / 2));
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

/** Unit vector on the sphere for a [lon, lat] pair, in degrees. */
function unitVec(lon, lat) {
  const lo = lon * TO_R, la = lat * TO_R;
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const angle = (a, b) => Math.acos(Math.min(1, Math.max(-1, dot(a, b))));

// How close an edge's great circle must pass to a pole before we accept that
// the pole lies ON that edge. Only used to sanity-check an edge that already
// measures +/-180 deg wide, where the true distance is ~4e-11 deg.
const POLE_EDGE_TOL_DEG = 0.01;

/**
 * Does the great-circle arc a->b pass through a pole? Returns 90, -90 or null.
 */
function poleOnEdge(a, b) {
  const u = unitVec(a[0], a[1]);
  const v = unitVec(b[0], b[1]);
  // Normal of the plane containing the arc. Its z component vanishes exactly
  // when the poles lie in that plane.
  const n = [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];
  const len = Math.hypot(n[0], n[1], n[2]);
  if (len < 1e-12) return null; // coincident or antipodal corners: no unique arc
  // Angular distance from the pole to the arc's great circle.
  if (Math.abs(Math.asin(n[2] / len)) * TO_D > POLE_EDGE_TOL_DEG) return null;

  // That circle passes through BOTH poles. The short arc crosses the one the
  // two corners lean towards.
  const poleLat = a[1] + b[1] >= 0 ? 90 : -90;
  const p = [0, 0, poleLat > 0 ? 1 : -1];
  // ...and only if the pole actually lies between the corners, not beyond them.
  return Math.abs(angle(u, p) + angle(p, v) - angle(u, v)) < 1e-5 ? poleLat : null;
}

/**
 * Locate the edge a pole sits on. Returns { idx, poleLat } or null.
 *
 * A pole is never inside a cell here and never a corner: it always falls on the
 * edge shared by two cells (sampling either pole at resolution 1 splits exactly
 * evenly between 005 and 013 in the north, 084 and 114 in the south). But
 * webDggrid reports that one shared edge differently for the two cells that
 * meet along it -- exactly +/-180 deg wide for one, a ~0.05 deg near miss for
 * the other -- so the two have to be recognised by different signals.
 *
 * Neither signal is a distance threshold, deliberately: cells are ~2000 km wide
 * at resolution 1 and ~5 m at resolution 10, so no fixed tolerance separates
 * "on the pole" from "merely near it" across that range.
 */
function findPoleEdge(ring, n) {
  const dl = [];
  for (let i = 0; i < n; i++) {
    let d = ring[i + 1][0] - ring[i][0];
    while (d > 180) d -= 360;
    while (d <= -180) d += 360;
    dl.push(d);
  }

  // Signal 1: an edge measuring +/-180 deg. Its great circle runs through both
  // poles, so which way it wraps is a coin flip in floating point -- this is
  // what the old winding test read at random.
  for (let i = 0; i < n; i++) {
    if (Math.abs(Math.abs(dl[i]) - 180) < 1e-3) {
      const poleLat = poleOnEdge(ring[i], ring[i + 1]);
      if (poleLat !== null) return { idx: i, poleLat };
    }
  }

  // Signal 2: no such edge, yet the ring still turns a full circle in
  // longitude. Only a ring drawn around a pole does that, and the edge that
  // carries the turn is the one spanning nearly 180 deg.
  const winding = dl.reduce((s, d) => s + d, 0);
  if (Math.abs(Math.abs(winding) - 360) < 1) {
    let k = 0;
    for (let i = 1; i < n; i++) if (Math.abs(dl[i]) > Math.abs(dl[k])) k = i;
    return { idx: k, poleLat: ring[k][1] + ring[k + 1][1] >= 0 ? 90 : -90 };
  }
  return null;
}

/** Points every ~2 deg along the meridian at `lon`, excluding the start. */
function meridianRun(lon, latFrom, latTo) {
  const steps = Math.max(1, Math.ceil(Math.abs(latTo - latFrom) / 2));
  const pts = [];
  for (let i = 1; i <= steps; i++) pts.push([lon, latFrom + ((latTo - latFrom) * i) / steps]);
  return pts;
}

/** Unwrap longitudes so a ring stays continuous across the antimeridian. */
function unwrap(pts) {
  const out = [[pts[0][0], pts[0][1]]];
  let off = 0;
  for (let i = 1; i < pts.length; i++) {
    const dl = pts[i][0] - pts[i - 1][0];
    if (dl > 180) off -= 360;
    else if (dl < -180) off += 360;
    out.push([pts[i][0] + off, pts[i][1]]);
  }
  return out;
}

/**
 * Densify a cell ring into great-circle arcs and make it antimeridian- and
 * pole-safe. Input is a closed ring of corners (last == first).
 */
export function densifyRing(ring) {
  const n = ring.length - 1;
  if (n < 3) return ring;

  const pole = findPoleEdge(ring, n);

  if (pole === null) {
    const pts = [];
    for (let i = 0; i < n; i++) pts.push(...gcSegment(ring[i], ring[i + 1]));
    if (!pts.length) return ring;
    const out = unwrap(pts);
    out.push([out[0][0], out[0][1]]); // close
    return out;
  }

  // A pole lies on edge pole.idx. Rotate the ring so that edge becomes the
  // CLOSING edge, densify everything else, then walk up the first meridian to
  // the pole, across at +/-90, and back down the second.
  //
  // Rotating first is what removes the ambiguity. In lon/lat the pole is a
  // whole line, so the traverse could run either way round the globe, and only
  // one of the two wraps the cell rather than the rest of the planet. Once the
  // remaining edges are unwrapped, both ends of the traverse have determined
  // longitudes and the direction is forced -- no winding heuristic needed.
  const rot = [];
  for (let i = 0; i < n; i++) rot.push(ring[(pole.idx + 1 + i) % n]);

  const pts = [];
  for (let i = 0; i < n - 1; i++) pts.push(...gcSegment(rot[i], rot[i + 1]));
  pts.push(rot[n - 1]);
  const out = unwrap(pts);

  const first = out[0];
  const last = out[out.length - 1];
  out.push(...meridianRun(last[0], last[1], pole.poleLat)); // up to the pole
  out.push([first[0], pole.poleLat]); // across it
  out.push(...meridianRun(first[0], pole.poleLat, first[1])); // back down
  out[out.length - 1] = [first[0], first[1]]; // close exactly
  return out;
}

/**
 * The children of a cell per the Z7 aperture-7 definition: append a direction
 * digit to the cell's index. Hexagons have seven, pentagons six.
 * (DGGRID's own sequenceNumChildren uses a different, non-Z7 child notion.)
 */
export function childSeqs(dggs, seq, r) {
  // Stop at the explorer's resolution ceiling. The Z7 index goes deeper, but
  // the slider cannot represent a finer resolution, so rendering children one
  // level below the ceiling would put cells on the map that the resolution
  // control could not then return to.
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
    const cs = dggs.z7ToSequenceNum(cz, r + 1);
    // A pentagon has six children, not seven, and the surplus digit is not
    // fixed -- it is 2 under base cell 00 and 5 under 08 and 11. igeo7IsValid
    // cannot tell them apart, because it only ever rejects the UINT64_MAX
    // sentinel, which igeo7Encode never produces; it accepted the surplus
    // digit, which then either duplicated a sibling or (base 00, resolution 1)
    // encoded into a DIFFERENT base cell and drew a hexagon elsewhere on the
    // globe. Round-tripping through the sequence number is the reliable filter:
    // only a real child survives it.
    if (dggs.sequenceNumToZ7(cs, r + 1) === cz) seqs.push(cs);
  }
  return seqs;
}

/**
 * WGS84 authalic radius: the radius of the sphere with the same surface area as
 * the ellipsoid. The right choice here because IGEO7 is an equal-area grid.
 */
const AUTHALIC_RADIUS_KM = 6371.0072;

/**
 * Area of a closed lon/lat ring on the sphere, in square kilometres.
 *
 * webDggrid's cellAreaKM() reports one average figure per resolution, which is
 * right for hexagons but overstates the twelve pentagons. This computes the
 * real thing from the cell's own boundary.
 *
 * Uses the standard spherical-excess-by-longitude formula, which needs the ring
 * to be continuous in longitude rather than wrapped into -180..180 -- exactly
 * what densifyRing() already produces.
 */
export function sphericalAreaKm2(ring) {
  let total = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];
    total += (lon2 - lon1) * TO_R * (2 + Math.sin(lat1 * TO_R) + Math.sin(lat2 * TO_R));
  }
  return Math.abs((total * AUTHALIC_RADIUS_KM * AUTHALIC_RADIUS_KM) / 2);
}

/** Human-readable area: km2, dropping to m2 once cells get small. */
export function formatArea(km2) {
  if (!isFinite(km2) || km2 <= 0) return "-";
  if (km2 < 1) return `${Math.round(km2 * 1e6).toLocaleString("en-US")} m²`;
  const digits = km2 < 10 ? 2 : km2 < 1000 ? 1 : 0;
  return `${km2.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })} km²`;
}

/**
 * The Z7 text grammar: a two-digit base cell 00..11, then one direction digit
 * 0..6 per resolution step. Digit 7 is the unused-slot terminator in the bit
 * layout, not a direction, so it must not appear in a text index.
 */
const Z7_TEXT = /^(0[0-9]|1[01])[0-6]*$/;

/**
 * Parse user input from the Z7 lookup box. Accepts the Z7 text form
 * ("0064156") and the 64-bit hex form ("0x0D0DDFFFFFFFFFFF").
 * Returns { z7, res, seq } or null if the input is not a Z7 index.
 */
export function parseZ7Input(dggs, raw) {
  const s = String(raw).trim();
  if (!s) return null;
  try {
    let z7;
    if (/^0x[0-9a-f]+$/i.test(s)) {
      z7 = BigInt(s);
      if (!dggs.igeo7IsValid(z7)) return null;
      // The hex form addresses the raw 64-bit word directly, so hold it to the
      // same grammar as the text form: serialise it and require an exact round
      // trip. A bit pattern that is not a canonical Z7 index fails here.
      const text = dggs.igeo7ToString(z7);
      if (!Z7_TEXT.test(text) || dggs.igeo7FromString(text) !== z7) return null;
    } else {
      // igeo7FromString does no validation whatsoever: it takes the base cell
      // mod 16 and each direction digit mod 8, so "hello" becomes cell 0544,
      // "999999" becomes 031111 and "0064156xyz" becomes a resolution-8 cell.
      // igeo7IsValid cannot catch any of that. The grammar has to be enforced
      // before the engine ever sees the string.
      if (!Z7_TEXT.test(s) || s.length - 2 > MAX_RES) return null;
      z7 = dggs.igeo7FromString(s);
      if (!dggs.igeo7IsValid(z7)) return null;
    }
    const res = dggs.igeo7GetResolution(z7);
    if (res > MAX_RES) return null;
    return { z7, res, seq: dggs.z7ToSequenceNum(z7, res) };
  } catch {
    return null;
  }
}

/**
 * Is [lng, lat] inside the padded map bounds?
 * `west`/`east` come from MapLibre's getBounds().
 */
export function inBounds(lng, lat, b, pad) {
  if (lat < b.south - pad || lat > b.north + pad) return false;
  const west = b.west - pad;
  const east = b.east + pad;
  // On the globe projection getBounds() returns UNWRAPPED bounds: a viewport
  // over Fiji reads west=171.9, east=187.1. Cell centroids arrive normalised to
  // [-180, 180], so a cell just east of the antimeridian came back as -179.7
  // and failed the >= west test. Because the flood fill only enqueues cells it
  // considers in bounds, that turned into a hard wall: the grid stopped dead at
  // the antimeridian and the eastern half of the viewport stayed empty.
  // Comparing in the bounds' own frame is what fixes it.
  if (east - west >= 360) return true; // viewport wraps the whole globe
  const v = lng - 360 * Math.floor((lng - west) / 360); // into [west, west+360)
  return v <= east;
}
