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
| **Z7 string** | `"0800433"` | Human-readable; length = 2 + resolution |
| **Z7 hex** | `"0042aad3ffffffff"` | 16 lowercase hex chars; matches H3 string length |
| **Z7 integer** | `0x0042aad3ffffffff` | Raw `uint64`; fastest for arithmetic |

See [Z7 String Format](../reference/z7-string-format) and [Z7 Bit Layout](../reference/z7-bit-layout) for encoding details.

## Python Binding: dggrid4py

The primary Python API is split across two modules:

```python
from dggrid4py import DGGRIDv7   # grid generation and coordinate conversion
from dggrid4py import igeo7       # Z7 index arithmetic (no DGGRID process needed)
```

`DGGRIDv7` calls the DGGRID binary for coordinate-intensive operations (point indexing, polygon filling, geometry generation). `igeo7` is pure Python for index inspection and format conversion.

### Initialising DGGRIDv7

```python
import os
from dggrid4py import DGGRIDv7

dggrid = DGGRIDv7(
    executable=os.environ.get("DGGRID_PATH", "/usr/local/bin/dggrid"),
    working_dir="/tmp",
    capture_logs=False,
    silent=True,
)
```

## Julia Binding: IGEO7.jl

[IGEO7.jl](https://github.com/allixender/IGEO7.jl) implements the full Z7 index arithmetic natively in Julia, including neighbour traversal. It does not wrap DGGRID.

```julia
using IGEO7

idx = z7string_to_index("0800433")
res = get_resolution(idx)          # 5
parent = get_parent(idx)           # Z7IndexUInt64 at resolution 4
```

## Address Type Reference

When calling dggrid4py functions, the `input_address_type` and `output_address_type` parameters accept:

| Value | Format |
|---|---|
| `"Z7_STRING"` | Z7 string (e.g. `"0800433"`) |
| `"Z7"` | Z7 hex string (e.g. `"0042aad3ffffffff"`) |
| `"SEQNUM"` | DGGRID sequential number (internal) |
| `"Q2DI"` | Quad/diamond index (DGGRID internal) |
| `"PROJTRI"` | Projected triangle coordinates |
