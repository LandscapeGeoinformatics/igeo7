---
id: overview
sidebar_position: 1
title: API Overview
---

# API Overview

The IGEO7 API is documented here in a **language-agnostic** style — function names and signatures describe the operation, then each section shows the Python (dggrid4py) binding.

## Function Categories

| Category | What it does | Page |
|---|---|---|
| **Indexing** | Convert coordinates ↔ cell IDs | [Indexing](./indexing) |
| **Inspection** | Query properties of a cell ID | [Inspection](./inspection) |
| **Hierarchy** | Parent, children, ancestors | [Hierarchy](./hierarchy) |
| **Traversal** | Neighbours, grid disks | [Traversal](./traversal) |
| **Regions** | Polygon ↔ cell ID sets | [Regions](./regions) |
| **Miscellaneous** | Resolution lookup, stats | [Miscellaneous](./misc) |

## Index Formats

All functions accept and return cell IDs in one of three interchangeable formats:

| Format | Example | Notes |
|---|---|---|
| **Z7 string** | `"0001022"` | Human-readable; length = 2 + resolution |
| **Z7 hex** | `"0042aad3ffffffff"` | 16 lowercase hex chars; matches H3 string length |
| **Z7 integer** | `0x0042aad3ffffffff` | Raw `uint64`; fastest for arithmetic |

See [Z7 String Format](../reference/z7-string-format) and [Z7 Bit Layout](../reference/z7-bit-layout) for encoding details.

## Python Binding: dggrid4py

The primary Python API is split across two modules:

```python
from dggrid4py import DGGRIDv8   # grid generation and coordinate conversion
from dggrid4py import igeo7       # Z7 index arithmetic (no DGGRID process needed)
```

`DGGRIDv8` calls the DGGRID binary for coordinate-intensive operations (point indexing, polygon filling, geometry generation). `igeo7` is pure Python for index inspection and format conversion. `DGGRIDv7` is not recommended for IGEO7; use `DGGRIDv8` with DGGRID 8.43 or newer.

### Initialising DGGRIDv8

```python
import os
import geopandas as gpd
from dggrid4py import DGGRIDv8
from dggrid4py.auxlat import geoseries_to_authalic, geoseries_to_geodetic

dggrid = DGGRIDv8(
    executable=os.environ.get("DGGRID_PATH", "/usr/local/bin/dggrid"),
    working_dir="/tmp",
    capture_logs=False,
    silent=True,
)

# The IGEO7 grid definition, passed to every call as **IGEO7_META
IGEO7_META = {
    # input cell IDs: Z7 hierarchical index as digit string
    "input_address_type": "HIERNDX",
    "input_hier_ndx_system": "Z7",
    "input_hier_ndx_form": "DIGIT_STRING",
    # output cell IDs: the same
    "output_address_type": "HIERNDX",
    "output_cell_label_type": "OUTPUT_ADDRESS_TYPE",
    "output_hier_ndx_system": "Z7",
    "output_hier_ndx_form": "DIGIT_STRING",
    # IGEO7 orientation: 11.20, NOT the DGGRID default of 11.25
    "dggs_vert0_lon": 11.20,
    "dggs_vert0_lat": 58.28252559,
    "dggs_vert0_azimuth": 0.0,
}
```

The Python examples on the following pages assume this `dggrid` instance, `IGEO7_META` and the two `auxlat` functions. DGGRID works on an authalic sphere, so WGS84 input is converted with `geoseries_to_authalic` and output geometries are converted back with `geoseries_to_geodetic`. See [dggrid4py](../ecosystem/dggrid4py#setup) for the background.

## Julia Binding: IGEO7.jl

[IGEO7.jl](https://github.com/allixender/IGEO7.jl) implements the full Z7 index arithmetic natively in Julia, including neighbour traversal. It does not wrap DGGRID.

```julia
using IGEO7

idx = z7string_to_index("0001022")
res = get_resolution(idx)          # 5
parent = get_parent(idx)           # Z7IndexUInt64 at resolution 4
```

## Address Type Reference

When calling dggrid4py functions on `DGGRIDv8`, the `input_address_type` and `output_address_type` parameters accept:

| Value | Format |
|---|---|
| `"HIERNDX"` with `*_hier_ndx_system="Z7"`, `*_hier_ndx_form="DIGIT_STRING"` | Z7 string (e.g. `"0001022"`) |
| `"HIERNDX"` with `*_hier_ndx_system="Z7"`, `*_hier_ndx_form="INT64"` | Z7 hex string (e.g. `"0042aad3ffffffff"`) |
| `"SEQNUM"` | DGGRID sequential number (internal) |
| `"Q2DI"` | Quad/diamond index (DGGRID internal) |
| `"PROJTRI"` | Projected triangle coordinates |

The older `"Z7_STRING"` and `"Z7"` address types belong to `DGGRIDv7`. They are marked deprecated in DGGRID 8.44 and dropped in DGGRID 9. `DGGRIDv8` ignores them and falls back to `SEQNUM`.
