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
 * This is the IGEO7 setting. In the DGGRID v8 series the IGEO7 type still uses
 * ISEA7H's preset of 11.25, so 11.2 has to be set explicitly.
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
