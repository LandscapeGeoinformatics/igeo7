---
id: dggrid
sidebar_position: 1
title: DGGRID
---

# DGGRID

**DGGRID** is the core C++ library and command-line tool that implements IGEO7. All other IGEO7 tools ultimately call DGGRID for grid generation and coordinate conversion.

- **Repository:** https://github.com/sahrk/DGGRID
- **Author:** Kevin Sahr, Southern Oregon University
- **License:** AGPL-3.0

## What DGGRID Does

DGGRID is a general-purpose DGGS engine supporting dozens of grid types (ISEA3H, ISEA4H, ISEA7H, FULLER7H, and many more). For IGEO7, the relevant type is the preset **`IGEO7`** (`ISEA7H` with Z7 addressing), together with the [IGEO7 orientation](#igeo7-orientation) and the [authalic conversion](#authalic-conversion) described below.

Key operations:
- Generate cell polygons for an extent or global grid
- Convert lat/lng coordinates to cell IDs
- Convert cell IDs to lat/lng centroids or cell polygons
- Generate grid statistics (cell count, area, CLS per resolution)
- Transform between addressing schemes (Z7 via `HIERNDX`, SEQNUM, Q2DI, PROJTRI)

## Installation

See [Installation](../installation) for build instructions.

IGEO7 and Z7 are available since DGGRID 8.41. Use **8.43 or newer** (for example 8.44 from conda-forge); older 8.4x builds have problems with the `IGEO7` preset.

:::note DGGRID 9 is on the horizon
DGGRID 9 is already in beta. It only supports the `HIERNDX` form of Z7 addressing shown on this page. The older `Z7` / `Z7_STRING` address types are marked deprecated in DGGRID 8.44 and are dropped in version 9, so write new metafiles and scripts in the `HIERNDX` form now.
:::

## How It Works

DGGRID is driven by **metafiles** — plain-text configuration files that specify the operation, DGGS type, resolution, and I/O paths. dggrid4py generates these metafiles automatically.

A minimal metafile for generating IGEO7 cells looks like:

```
dggrid_operation       GENERATE_GRID
dggs_type              IGEO7
dggs_vert0_lon         11.20
dggs_vert0_lat         58.28252559
dggs_vert0_azimuth     0.0
dggs_res_spec          2
output_hier_ndx_form   DIGIT_STRING
clip_subset_type       WHOLE_EARTH
cell_output_type       GEOJSON
cell_output_file_name  /tmp/igeo7_res2
```

Run with:

```bash
dggrid igeo7_res2.meta
```

This writes the 492 resolution-2 cells, labelled with Z7 digit strings such as `0000`. The cell coordinates are on DGGRID's authalic sphere, see [Authalic conversion](#authalic-conversion).

## DGGS Type: IGEO7 vs ISEA7H

DGGRID supports two names for the same underlying grid:

| Type string | Addressing | Notes |
|---|---|---|
| `IGEO7` | Z7 (`HIERNDX`) | Recommended; preset that selects Z7 indexing |
| `ISEA7H` | SEQNUM, Q2DI, etc. | Same cells; older addressing schemes |

Always use `IGEO7` with the hierarchical index parameters for new work:

```
output_address_type     HIERNDX
output_hier_ndx_system  Z7
output_hier_ndx_form    DIGIT_STRING
output_cell_label_type  OUTPUT_ADDRESS_TYPE
```

`output_hier_ndx_form` is `DIGIT_STRING` (the Z7 string, e.g. `00010224545`) or `INT64` (written as the 16-character Z7 hex string, e.g. `004252cbffffffff`). The `input_*` counterparts take the same values. The `IGEO7` preset already sets all of these, with `INT64` as the form.

## IGEO7 Orientation

IGEO7 places vertex 0 of the icosahedron at longitude **11.20**:

```
dggs_vert0_lon      11.20
dggs_vert0_lat      58.28252559
dggs_vert0_azimuth  0.0
```

In the DGGRID v8 series, the `IGEO7` type still uses ISEA7H's preset orientation of 11.25. So `dggs_vert0_lon 11.20` has to be written explicitly, in a DGGRID metafile and in dggrid4py alike. This will hopefully be fixed in the near future (DGGRID v9, already in beta). DGGAL's `ISEA7H_Z7` uses 11.2 already.

The 0.05 degree rotation moves the icosahedron vertices to sit better over water. Cell IDs of the two orientations are not interchangeable.

## Authalic conversion

DGGRID builds the grid on an authalic sphere, and the DGGRID tool currently does not apply the authalic latitude conversion itself. That is why it still has to be done explicitly, in both directions:

- convert geodetic latitudes to authalic before coordinates or clip geometries go into DGGRID
- convert the latitudes of DGGRID's output geometries back to geodetic

dggrid4py provides this in `dggrid4py.auxlat` (see [dggrid4py](./dggrid4py)), and Julia's DggridRunners has equivalent functions. DGGRID v9 (already in beta) will have an option to do the conversion in the tool. DGGAL does it automatically for its `ISEA7H_Z7` adaptation of IGEO7.

:::caution Say which configuration you used
Until both points are handled by DGGRID itself, cell IDs generated with the plain v8 `IGEO7` preset (sphere, 11.25) differ from the IGEO7 documented on this site (11.20 plus authalic conversion). When sharing IGEO7 cell IDs, state which configuration produced them.
:::

## Further Reading

- [dggrid4py](./dggrid4py) — Python wrapper
- [Installation](../installation) — build instructions
- DGGRID manual: included in the DGGRID repository as `dggridManual.pdf`
