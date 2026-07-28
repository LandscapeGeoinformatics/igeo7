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
`website/src/pages/explore.js`.

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

IGEO7 is not DGGRID's default ISEA aperture-7 grid. Two things differ, and both
are configured in the component:

```js
const IGEO7 = {
  poleCoordinates: { lat: 58.28252559, lng: 11.2 }, // not DGGRID's 11.25
  azimuth: 0,
  topology: "HEXAGON",
  projection: "ISEA",
  aperture: 7,
};
```

First, the icosahedron orientation longitude is **11.2 degrees**, not DGGRID's
default of 11.25.

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
degree steps. Rings are then unwrapped across the antimeridian, and a ring that
winds a full turn in longitude is closed over the pole so it fills instead of
leaving a hole.

Cell generation is viewport-bounded. A breadth-first flood fill starts from the
cell at the map centre and expands through neighbours while they fall inside the
padded viewport, stopping at 1400 cells. This is what keeps high resolutions
usable without ever generating a global grid.

## Known limitations

- **Cells touching the poles render incorrectly.** In this grid orientation no
  cell encloses a pole: the poles fall exactly on a cell *edge*. The polygon
  builder's pole handling misjudges that case, and at every resolution some of
  the four pole-adjacent cells are drawn spanning most of the globe in longitude
  instead of their true extent. Panning near either pole shows a fill covering
  far more of the map than it should. This is a rendering defect, not an
  indexing one: every computed index, centroid and neighbour relationship at the
  poles remains correct, and the rest of the map is unaffected.
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
