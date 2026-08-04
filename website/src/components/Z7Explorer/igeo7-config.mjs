/**
 * The IGEO7 grid definition -- the single source of truth.
 *
 * The explorer, the conformance harness (scripts/verify-igeo7.mjs) and the
 * regression tests (scripts/test-explorer.mjs) all import from here, so the
 * running site and the things that check it can never drift apart. They used to
 * hold three separate copies, which meant a change in one could leave the other
 * two reporting green while validating a different grid.
 *
 * `.mjs` so that plain Node and webpack can both read it.
 */

/**
 * Icosahedron orientation longitude, in degrees. CHANGE THE GRID HERE.
 *
 * This is the IGEO7 setting. DGGRID's default is 11.25, and the two are
 * indistinguishable through resolution 5 -- they first diverge at resolution 6,
 * where 11.25 puts Lisbon in 00641542 instead of 00641565. So a resolution-5
 * test point cannot tell them apart; only resolution 6 or deeper can.
 */
export const ORIENTATION_LON = 11.2;

/** Snyder vert0 latitude for the ISEA icosahedron. */
export const POLE_LAT = 58.28252559;

/**
 * Passed verbatim to webDggrid's setDggs(). Note that the authalic latitude
 * conversion is NOT part of this object and cannot be: webDggrid does not apply
 * it for you. It is done with explicit igeo7GeoToAuthalic / igeo7AuthalicToGeo
 * calls at every crossing between geodetic and grid space -- see geoOf() and
 * fcOf() in index.js.
 */
export const IGEO7 = {
  poleCoordinates: { lat: POLE_LAT, lng: ORIENTATION_LON },
  azimuth: 0,
  topology: "HEXAGON",
  projection: "ISEA",
  aperture: 7,
};
