---
id: explorer
sidebar_position: 6
title: Interactive Explorer
---

# Interactive Explorer

The [Explore](/explore) page is an in-browser IGEO7 / Z7 explorer. It runs
entirely client-side, so there is no server or API behind it: everything is
computed in your browser as you pan, click and type.

## What it does

- Shows IGEO7 cell boundaries as a vector overlay on a basemap, at resolutions
  0 to 10.
- Click anywhere on the map to resolve the containing cell at the current
  resolution, and see its Z7 index, hex form, centroid, cell type and neighbour
  count.
- Look a cell up by latitude and longitude, or by Z7 index. Both the Z7 string
  form (`0064156`) and the hex form (`0x0D0DDFFFFFFFFFFF`) are accepted.
- Walk the hierarchy with the parent button and the show-children button, which
  draws the seven children (six for a pentagon).
- Highlights the k=1 neighbour ring around the selected cell.

## How it is built

The explorer is a React component at
`website/src/components/Z7Explorer/index.js`, mounted on the `/explore` route by
`website/src/pages/explore.js`. The cell maths that needs no browser -- ring
geometry, child enumeration, index parsing and the viewport bounds test -- sits
beside it in `geometry.mjs` so it can be tested directly in Node.

It is wrapped in `@docusaurus/BrowserOnly`. This matters: Docusaurus
pre-renders every page at build time in Node, and the explorer needs both
WebAssembly and a WebGL canvas, neither of which exists during server-side
rendering. Mounting it client-only is what keeps `docusaurus build` working.

There is no separate build step and no WebAssembly artifact committed to this
repository. The engine arrives as an ordinary npm dependency and its WebAssembly
binary is embedded inside the shipped JavaScript, so `npm ci && npm run build`
in CI is all that is needed. Nothing about the existing GitHub Actions workflow
had to change.

### Dependencies

| Library | Version | Role |
|---|---|---|
| [webDggrid](https://github.com/am2222/webDggrid) | 1.9.0 | DGGRID-derived WebAssembly engine: all IGEO7 cell maths |
| [MapLibre GL JS](https://maplibre.org/) | 5.x | Map rendering |

To update the engine, bump `webdggrid` in `website/package.json` and re-run the
verification harness described below. If the engine's IGEO7 helper functions
change name or behaviour, the component and the harness both need updating.

### The IGEO7 configuration

IGEO7 is not DGGRID's default ISEA aperture-7 grid. Two things differ. The first
is set in `website/src/components/Z7Explorer/igeo7-config.mjs`, which the
explorer and both harnesses import, so there is exactly one copy of it:

```js
export const ORIENTATION_LON = 11.2;   // not DGGRID's 11.25
export const POLE_LAT = 58.28252559;

export const IGEO7 = {
  poleCoordinates: { lat: POLE_LAT, lng: ORIENTATION_LON },
  azimuth: 0,
  topology: "HEXAGON",
  projection: "ISEA",
  aperture: 7,
};
```

First, the icosahedron orientation longitude is **11.2 degrees**, not DGGRID's
default of 11.25.

Despite the name, `poleCoordinates` is not a geographic pole. It is where
vertex 0 of the icosahedron is pinned to the Earth, which DGGRID's own
configuration calls `dggs_vert0_lat` / `dggs_vert0_lon`. That vertex is the
centre of base cell `00`, and the twelve icosahedron vertices are exactly the
twelve pentagons of the grid. Changing the longitude spins the whole
icosahedron about the Earth's axis: moving it from 11.2 to 15 shifts every one
of the twelve pentagon centres by exactly 3.8 degrees of longitude and leaves
their latitudes untouched. The latitude is quoted on the authalic sphere the
grid is built on, which is why base cell `00` reports its centroid as 58.3971
in WGS84 rather than 58.2825.

Second, the **authalic latitude conversion** is mandatory, and it is a round
trip. The engine works in authalic latitude, the map works in WGS84 geodetic
latitude, so every crossing between the two has to be converted:

- Going in, every geographic coordinate passes through `igeo7GeoToAuthalic`
  before it reaches `geoToSequenceNum`.
- Coming out, `sequenceNumToGeo` returns an **authalic** latitude, so it passes
  back through `igeo7AuthalicToGeo` before it is displayed, put into the
  latitude and longitude inputs, compared against map bounds, or used as the
  input to another lookup.

Skipping the outbound conversion shifts the latitude by up to 0.128 degrees,
roughly 14 km at mid-latitudes. That is invisible at low resolutions but larger
than a whole cell from about resolution 6 upward.

There are two outbound paths and both need it:

- **Scalar centroids** from `sequenceNumToGeo`, handled by the `geoOf()` helper.
- **Cell geometry** from `sequenceNumToGridFeatureCollection`, whose ring
  coordinates are authalic as well. These are densified into great-circle arcs
  first, because that is the space in which a cell edge is a true great circle,
  and each vertex latitude is converted afterwards.

Both have to be converted or they disagree with each other. Converting only the
centroids leaves the drawn polygons roughly 14 km from the cell they claim to
represent, which at high zoom puts the highlighted cell outside the viewport
entirely.

### Rendering notes

The map uses MapLibre's **globe** projection. An equal-area grid displayed on
Web Mercator would be visibly wrong, since Mercator inflates area towards the
poles; the globe shows cells true to shape and area. MapLibre cannot render a
flat EPSG:4326 view, so the globe is also the only correct option available.

Cell edges are true great-circle arcs, but the engine returns only the corner
points. Drawing straight lines between corners looks badly wrong for large
cells, so each edge is densified with spherical interpolation at roughly two
degree steps. Rings are then unwrapped so they stay continuous across the
antimeridian.

Cells at the poles need one more step. Neither pole is ever inside a cell or at
a corner: each falls on the edge shared by two cells, so that edge has to be
found and the ring closed over the pole itself. Finding it is not a matter of
measuring how near an edge passes, because webDggrid describes that one shared
edge differently for the two cells that meet along it. For one it is exactly 180
degrees of longitude wide, whose wrap direction is then a coin flip in floating
point; for the other it is a small near miss, which instead shows up as a ring
that turns a full circle in longitude. The explorer recognises both signals, and
neither depends on a distance threshold, which matters because cells range from
about 2000 km wide at resolution 1 to a few metres at resolution 10.

Once that edge is identified the ring is rotated so it closes there, the
remaining edges are unwrapped, and the ring is then walked up one meridian to
the pole, across it, and back down the other. Rotating first is what makes the
crossing unambiguous: in latitude and longitude the pole is a whole line rather
than a point, so the traverse could run either way around the globe, and only
one of the two wraps the cell instead of the rest of the planet. After the
rotation both ends have fixed longitudes and the direction is forced.

Cell generation is viewport-bounded. A breadth-first flood fill starts from the
cell at the map centre and expands through neighbours while they fall inside the
padded viewport, stopping at 1400 cells. This is what keeps high resolutions
usable without ever generating a global grid. The bounds test compares
longitudes in the frame the map reports rather than directly: on the globe
projection `getBounds()` returns unwrapped bounds, so a viewport over Fiji reads
west 171.9 and east 187.1, while cell centroids arrive normalised to the range
-180 to 180. Comparing those two directly rejected every cell east of the
antimeridian, and since the flood fill only expands through cells it has
accepted, the grid stopped dead there.

## Known limitations

- **A hairline seam at the poles.** The two cells meeting at a pole are both
  drawn up to it, but webDggrid places that shared edge about 0.05 degrees apart
  for the two of them, so one is capped a sliver short. The gap is a few
  kilometres at the pole itself, where the projection converges, and it does not
  grow with resolution. Indices, centroids and neighbours are unaffected.
- **Hexagons and pentagons only.** IGEO7 is a hexagonal grid with twelve
  pentagons. The other topologies the underlying engine can produce are
  different grids, not display options, and are deliberately not exposed.
- **Resolution ceiling of 10**, matching the scope of this page. The Z7 index
  itself goes considerably deeper, so a longer Z7 string is a valid index but is
  rejected by the lookup box, and the children control is disabled on a
  resolution 10 cell rather than drawing cells the resolution slider could not
  return to.
- **Cell cap.** At high resolutions on a wide viewport the 1400 cell cap will
  fill only part of the visible area. Zoom in to see a complete grid.

## Verification

The explorer's IGEO7 conformance is checked by a re-runnable harness:

```bash
cd website
node scripts/verify-igeo7.mjs            # built-in test points
node scripts/verify-igeo7.mjs pts.csv    # check against expected values
```

See [Explorer Verification](./explorer-verification.md) for the current results
and the CSV format.

A second harness covers what conformance cannot see, since a wrongly drawn cell
can still carry the right index: Z7 input validation, child enumeration,
viewport bounds and ring geometry, including every cell within two rings of
either pole at several resolutions.

```bash
cd website
node scripts/test-explorer.mjs
```

It exercises the pure helpers in
`website/src/components/Z7Explorer/geometry.mjs`, which are kept in their own
module precisely so they can be run outside a browser.

## Attribution and licence

The explorer's own source code is contributed under the **MIT** licence, and
this documentation under **CC BY 4.0**, matching the rest of this repository.

Third-party components:

| Component | Licence | Notice |
|---|---|---|
| [webDggrid](https://github.com/am2222/webDggrid) | ISC | Majid Hojati. WebAssembly wrapper around DGGRID |
| [DGGRID](https://github.com/sahrk/DGGRID) | AGPL-3.0 | Kevin Sahr, Southern Oregon University. Bundled inside webDggrid as `libdggrid.wasm` |
| [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js) | BSD-3-Clause | MapLibre contributors |
| Basemap tiles | Open | Map data (c) [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, tiles by [CARTO](https://carto.com/attributions) |

webDggrid is distributed under the ISC licence, which is fully compatible with
this repository's MIT licence for code and CC BY 4.0 for documentation.

Basemap attribution is displayed in the map's own attribution control, as those
licences require. The explorer exposes no DGGS other than IGEO7.
