---
id: restable
sidebar_position: 1
title: Refinement Level Table
---

# Resolution Table

IGEO7 has **21 resolution levels** (0–20). At every refinement level, the grid contains exactly **12 pentagons** (at icosahedron vertices) and all remaining cells are hexagons. Level 0 is only the 12 base pentagons.

**CLS** (Characteristic Length Scale) is the diameter of a circle with the same area as a cell — the most intuitive way to relate IGEO7 resolutions to traditional raster pixel sizes.

## Full Table

<div className="resolution-table">

| Res | Total Cells | Hexagons | Pentagons | Area (km²) | Area (m²) | CLS (km) | CLS (m) |
|:---:|---:|---:|:---:|---:|---:|---:|---:|
| 0 | 12 | 0 | 12 | 51,006,562.172 | 51,006,562,172,408.9 | 8,199.500 | 8,199,500.4 |
| 1 | 72 | 60 | 12 | 7,286,651.739 | 7,286,651,738,915.6 | 3,053.223 | 3,053,223.2 |
| 2 | 492 | 480 | 12 | 1,040,950.248 | 1,040,950,248,416.5 | 1,151.643 | 1,151,643.0 |
| 3 | 3,432 | 3,420 | 12 | 148,707.178 | 148,707,178,345.2 | 435.153 | 435,153.1 |
| 4 | 24,012 | 24,000 | 12 | 21,243.883 | 21,243,882,620.7 | 164.466 | 164,465.6 |
| 5 | 168,072 | 168,060 | 12 | 3,034.840 | 3,034,840,374.4 | 62.162 | 62,161.8 |
| 6 | 1,176,492 | 1,176,480 | 12 | 433.549 | 433,548,624.9 | 23.495 | 23,494.9 |
| 7 | 8,235,432 | 8,235,420 | 12 | 61.936 | 61,935,517.8 | 8.880 | 8,880.2 |
| 8 | 57,648,012 | 57,648,000 | 12 | 8.848 | 8,847,931.1 | 3.356 | 3,356.4 |
| 9 | 403,536,072 | 403,536,060 | 12 | 1.264 | 1,263,990.2 | 1.269 | 1,268.6 |
| 10 | 2,824,752,492 | 2,824,752,480 | 12 | 0.181 | 180,570.0 | 0.479 | 479.5 |
| 11 | 19,773,267,432 | 19,773,267,420 | 12 | 0.026 | 25,795.7 | 0.181 | 181.2 |
| 12 | 138,412,872,012 | 138,412,872,000 | 12 | 0.004 | 3,685.1 | 0.068 | 68.5 |
| 13 | 968,890,104,072 | 968,890,104,060 | 12 | ~0 | 526.4 | ~0.026 | 25.9 |
| 14 | 6,782,230,728,492 | 6,782,230,728,480 | 12 | ~0 | 75.2 | ~0.010 | 9.8 |
| 15 | 47,475,615,099,432 | 47,475,615,099,420 | 12 | ~0 | 10.7 | ~0.004 | 3.7 |
| 16 | 332,329,305,696,012 | 332,329,305,696,000 | 12 | ~0 | 1.5 | ~0.001 | 1.4 |
| 17 | 2,326,305,139,872,072 | 2,326,305,139,872,060 | 12 | ~0 | 0.2 | ~0 | 0.528 |
| 18 | 16,284,135,979,104,492 | — | 12 | ~0 | ~0.032 | ~0 | 0.200 |
| 19 | 113,988,951,853,731,432 | — | 12 | ~0 | ~0.005 | ~0 | 0.076 |
| 20 | 797,922,662,976,120,012 | — | 12 | ~0 | ~0.001 | ~0 | 0.029 |

</div>

:::note Area values for resolutions 18–20
Cell areas at resolutions 18–20 are below IEEE 754 double precision representation in km². The m² values shown are approximations. CLS values from the authoritative IGEO7.jl implementation.
:::

## Landmark Resolutions

These resolutions are particularly useful reference points:

| Resolution | CLS | Comparable to |
|:---:|---|---|
| **5** | ~62 km | Country-level analysis, climate zones |
| **7** | ~8.9 km | Urban areas, municipalities |
| **8** | ~3.4 km | Neighbourhoods, large parks |
| **9** | ~1.3 km | "Kilometre grid" — comparable to 1 km raster |
| **10** | ~480 m | Streets, large buildings |
| **11** | ~181 m | Individual fields, city blocks |
| **12** | ~68 m | Parcels, small fields |
| **14** | ~9.8 m | Comparable to 10 m Sentinel-2 resolution |
| **15** | ~3.7 m | High-resolution aerial imagery |
| **17** | ~53 cm | Sub-metre precision |
| **18** | ~20 cm | Centimetre-scale (LiDAR point clouds) |
| **20** | ~2.9 cm | Engineering precision |

## Cell Count Formula

The total number of cells at resolution $r$ is:

$$
c(r) = 2 + \frac{(7^{r+1} - 7) \times 10}{7}
$$

Equivalently: start with 12 cells at resolution 0. At each subsequent resolution, every hexagon subdivides into 7 children. Pentagons also subdivide but only into 6 actual new children (they share one child with neighbours).

At every resolution:
- **12 pentagons** (centred on the 12 icosahedron vertices)
- **All other cells are hexagons**

## Comparison with H3

| Property | IGEO7 | H3 |
|---|---|---|
| Resolution levels | 21 (0–20) | 16 (0–15) |
| Finest resolution CLS | ~2.9 cm (res 20) | ~0.9 m² area (res 15) |
| Coarsest resolution cells | 12 (res 0) | 122 (res 0) |
| Cell area variation | 0% (equal area) | ±50% |

IGEO7 has 5 more resolution levels than H3 because it starts from a pure icosahedral base (12 pentagonal base cells) rather than H3's mixed aperture 4→3 pre-subdivision (122 base cells).

## Generate the stats with dggrid4py

```python
from dggrid4py import DGGRIDv7
import os

dggrid = DGGRIDv7(
    executable=os.environ.get("DGGRID_PATH", "/usr/local/bin/dggrid"),
    working_dir="/tmp",
    silent=True,
)

# yes, ISEA7H, IGEO7 is not recognized as a grid for resolutions in itself :-)
df = dggrid.grid_stats_table("ISEA7H", 20)
print(df.to_string())
```
