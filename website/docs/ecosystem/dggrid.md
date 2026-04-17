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

DGGRID is a general-purpose DGGS engine supporting dozens of grid types (ISEA3H, ISEA4H, ISEA7H, FULLER7H, and many more). For IGEO7, the relevant type is **`IGEO7`** (or equivalently `ISEA7H` with Z7 addressing).

Key operations:
- Generate cell polygons for an extent or global grid
- Convert lat/lng coordinates to cell IDs
- Convert cell IDs to lat/lng centroids or cell polygons
- Generate grid statistics (cell count, area, CLS per resolution)
- Transform between addressing schemes (Z7, Z7_STRING, SEQNUM, Q2DI, PROJTRI)

## Installation

See [Installation](../installation) for build instructions.

```bash
# Quick check
dggrid --version
```

## How It Works

DGGRID is driven by **metafiles** — plain-text configuration files that specify the operation, DGGS type, resolution, and I/O paths. dggrid4py generates these metafiles automatically.

A minimal metafile for generating IGEO7 cells looks like:

```
dggrid_operation  GENERATE_GRID
dggs_type         IGEO7
dggs_vert0_lon     11.20
dggs_res_spec     9
clip_subset_type  WHOLE_EARTH
cell_output_type  GEOJSON
cell_output_file_name  /tmp/igeo7_res9
```

Run with:

```bash
dggrid igeo7_res9.meta
```

## DGGS Type: IGEO7 vs ISEA7H

DGGRID supports two names for the same underlying grid:

| Type string | Addressing | Notes |
|---|---|---|
| `IGEO7` | Z7 / Z7_STRING | Recommended; uses Z7 indexing natively |
| `ISEA7H` | SEQNUM, Q2DI, etc. | Same grid; older addressing schemes |

Always use `IGEO7` with `output_address_type="Z7_STRING"` for new work (`HIERNDX` required from latest DGRID).

## ISEA Orientation

DGGRID uses the standard ISEA orientation for IGEO7:

```
dggs_vert0_lon     11.25
dggs_vert0_lat     58.2825255885
dggs_vert0_azimuth  0.0
```

This is the default, but `dggs_vert0_lon     11.20` needs to be specified explicitly when using dggrid4py:

```
dggs_vert0_lon     11.20
dggs_vert0_lat     58.2825255885
dggs_vert0_azimuth  0.0
```


## TODO Authalic conversion

dggrid4py (and Julia DggridRunner) has functions to translate/convert between the default spherical coordinates of DGGRID and now widely adopted ellipsoidal DGGS coordinates.

DGGAL does that authomatically for its ISEA7H_Z7 grid adaptation of IGEO7.

## Further Reading

- [dggrid4py](./dggrid4py) — Python wrapper
- [Installation](../installation) — build instructions
- DGGRID manual: included in the DGGRID repository as `dggridManual.pdf`
