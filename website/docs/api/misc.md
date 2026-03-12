---
id: misc
sidebar_position: 7
title: Miscellaneous Functions
---

# Miscellaneous Functions

Utility functions for resolution selection and grid statistics.

## findResolutionByCLS

Find the resolution whose Characteristic Length Scale (CLS) is closest to a target diameter in metres.

```
findResolutionByCLS(target_m, prefer?) → int
```

| Parameter | Type | Description |
|---|---|---|
| `target_m` | float | Target cell diameter in metres |
| `prefer` | `"closest"` \| `"finer"` \| `"coarser"` | Strategy when target falls between levels |

### Python — IGEO7.jl port in dggrid4py

The resolution lookup is available in `dggrid4py` via the `igeo7_ext` module, or can be implemented directly from the precomputed stats table:

```python
from dggrid4py.igeo7_ext import find_resolution_by_cls_m

# Find resolution closest to 1 km cell diameter
res = find_resolution_by_cls_m(1000)
print(res)   # 9  (CLS = 1268.6 m)

# Find the finest resolution with CLS >= 10 m (prefer coarser)
res = find_resolution_by_cls_m(10, prefer="coarser")
print(res)   # 14  (CLS = 9.8 m)
```

### Julia — IGEO7.jl

```julia
using IGEO7

find_resolution_by_cls_m(1000)                          # 9
find_resolution_by_cls_m(10.0, prefer=:larger)          # 14
find_resolution_by_cls_m(10.0, prefer=:smaller)         # 15
```

---

## findResolutionByArea

Find the resolution whose cell area is closest to a target area in m².

```
findResolutionByArea(target_m2, prefer?) → int
```

### Python

```python
from dggrid4py.igeo7_ext import find_resolution_by_area_m2

# Resolution closest to 1 km² cell area
res = find_resolution_by_area_m2(1e6)
print(res)   # 9  (area = 1,263,990 m²)
```

### Julia

```julia
find_resolution_by_area_m2(1e6)   # 9
```

---

## getResolutionStats

Get the precomputed statistics for a single resolution level.

```
getResolutionStats(resolution) → {num_cells, area_km2, area_m2, cls_km, cls_m}
```

### Python

```python
from dggrid4py.igeo7_ext import get_resolution_stats

stats = get_resolution_stats(9)
print(stats)
# {'num_cells': 403536072, 'area_km2': 1.2639902,
#  'area_m2': 1263990.2, 'cls_km': 1.2686064, 'cls_m': 1268.6064}
```

### Julia

```julia
using IGEO7

s = get_resolution_stats(9)
s.num_cells   # 403536072
s.area_m2     # 1263990.2
s.cls_m       # 1268.6064
```

---

## gridStatsTable

Generate the full statistics table for all resolutions of a DGGS type.

```
gridStatsTable(dggs_type, max_resolution) → DataFrame
```

### Python — dggrid4py

```python
df = dggrid.grid_stats_table("IGEO7", 20)
print(df.to_string())
```

This calls DGGRID directly and returns the authoritative values for all 21 resolution levels. The [Resolution Table](../reference/restable) in this documentation is derived from this output.

---

## Resolution Stats Reference

The full precomputed table from IGEO7.jl:

| Res | Cells | Area (m²) | CLS (m) |
|:---:|---:|---:|---:|
| 0 | 12 | 51,006,562,172,408.9 | 8,199,500.4 |
| 1 | 72 | 7,286,651,738,915.6 | 3,053,223.2 |
| 2 | 492 | 1,040,950,248,416.5 | 1,151,643.0 |
| 3 | 3,432 | 148,707,178,345.2 | 435,153.1 |
| 4 | 24,012 | 21,243,882,620.7 | 164,465.6 |
| 5 | 168,072 | 3,034,840,374.4 | 62,161.8 |
| 6 | 1,176,492 | 433,548,624.9 | 23,494.9 |
| 7 | 8,235,432 | 61,935,517.8 | 8,880.2 |
| 8 | 57,648,012 | 8,847,931.1 | 3,356.4 |
| 9 | 403,536,072 | 1,263,990.2 | 1,268.6 |
| 10 | 2,824,752,492 | 180,570.0 | 479.5 |
| 11 | 19,773,267,432 | 25,795.7 | 181.2 |
| 12 | 138,412,872,012 | 3,685.1 | 68.5 |
| 13 | 968,890,104,072 | 526.4 | 25.9 |
| 14 | 6,782,230,728,492 | 75.2 | 9.8 |
| 15 | 47,475,615,099,432 | 10.7 | 3.7 |
| 16 | 332,329,305,696,012 | 1.5 | 1.4 |
| 17 | 2,326,305,139,872,072 | 0.2 | 0.528 |

See [Resolution Table](../reference/restable) for the full table including resolutions 18–20.
