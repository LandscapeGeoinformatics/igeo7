---
id: dggrid4py
sidebar_position: 2
title: dggrid4py
---

# dggrid4py

**dggrid4py** is the primary Python interface to DGGRID, providing high-level functions for IGEO7 grid generation, cell addressing, and Z7 index arithmetic.

- **Repository:** https://github.com/allixender/dggrid4py
- **PyPI:** `pip install dggrid4py`
- **Authors:** Alexander Kmoch, Wai Tik Chan (University of Tartu)
- **License:** AGPL-3.0

## Modules

| Module | Purpose |
|---|---|
| `DGGRIDv7` | Drives DGGRID for grid generation and coordinate conversion |
| `igeo7` | Pure Python Z7 index arithmetic (no subprocess) |
| `igeo7_ext` | Resolution lookup utilities |

## DGGRIDv7: Grid Operations

### Setup

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

### grid_cell_polygons_for_extent

Generate cell polygons covering an area:

```python
import shapely.geometry

bbox = shapely.geometry.box(20.0, 57.0, 28.5, 60.0)

gdf = dggrid.grid_cell_polygons_for_extent(
    dggs_type="IGEO7",
    resolution=9,
    clip_geom=bbox,
    output_address_type="Z7_STRING",
)
# Returns GeoDataFrame with columns: global_id, geometry
```

### grid_cellids_for_extent

Get cell IDs only (no geometries — much faster):

```python
df = dggrid.grid_cellids_for_extent(
    dggs_type="IGEO7",
    resolution=9,
    clip_geom=bbox,
    output_address_type="Z7_STRING",
)
cell_ids = df.iloc[:, 0].tolist()
```

### grid_cell_polygons_from_cellids

Get geometries for a known list of cell IDs:

```python
gdf = dggrid.grid_cell_polygons_from_cellids(
    cell_id_list=["0900264", "0900265"],
    dggs_type="IGEO7",
    resolution=9,
    input_address_type="Z7_STRING",
    output_address_type="Z7_STRING",
)
```

### cells_for_geo_points

Index geographic points to cell IDs:

```python
import geopandas as gpd

points = gpd.GeoDataFrame(
    geometry=gpd.points_from_xy([26.72, 24.75], [58.38, 59.44]),
    crs=4326,
)

result = dggrid.cells_for_geo_points(
    geodf_points_wgs84=points,
    cell_ids_only=True,
    dggs_type="IGEO7",
    resolution=9,
)
```

### grid_stats_table

Get statistics for all resolutions:

```python
df = dggrid.grid_stats_table("IGEO7", 20)
print(df.head(10))
```

### Drill-down: children of a cell

```python
children = dggrid.grid_cell_polygons_from_cellids(
    cell_id_list=["000125023"],
    dggs_type="IGEO7",
    resolution=9,
    clip_subset_type="COARSE_CELLS",
    clip_cell_res=7,
    input_address_type="Z7_STRING",
    output_address_type="Z7_STRING",
)
```

## igeo7: Index Arithmetic

The `igeo7` module works entirely in Python with no DGGRID subprocess:

```python
from dggrid4py import igeo7

# Format conversions
z7_str = igeo7.z7hex_to_z7string("0042aad3ffffffff")   # "090625251"
z7_int = igeo7.z7hex_to_z7int("0042aad3ffffffff")
z7_hex = igeo7.z7int_to_z7hex(z7_int)

# Inspection
res    = igeo7.get_z7hex_resolution("0042aad3ffffffff")   # 9
res    = igeo7.get_z7string_resolution("0800433")          # 5

# Hierarchy
parent, digit, is_center = igeo7.get_z7hex_local_pos("0042aad3ffffffff")
parent, digit, is_center = igeo7.get_z7string_local_pos("0800433")

# Decode full bit structure
base_cell, digits = igeo7.decode_z7hex_index("0042aad3ffffffff")

# Neighbour lookup (requires pre-built GeoDataFrame + spatial index)
neighbours = igeo7.get_neighbours_by_z7(
    z7_idx="0800433",
    gdf=gdf,
    gpd_sindex=sindex,
    z7_col="global_id",
)
```

## Apply to a GeoDataFrame

A convenience function to decode a Z7 hex column in bulk:

```python
gdf[["z7_string", "z7_res", "parent", "local_pos", "is_center"]] = (
    gdf["name"].apply(igeo7.apply_convert_z7hex_to_z7string)
)
```

## igeo7_ext: Resolution Lookup

```python
from dggrid4py.igeo7_ext import (
    find_resolution_by_cls_m,
    find_resolution_by_area_m2,
    get_resolution_stats,
)

find_resolution_by_cls_m(1000)        # 9
find_resolution_by_area_m2(1e6)       # 9
get_resolution_stats(9)               # dict with num_cells, area_m2, cls_m, ...
```

## See Also

- [DGGRID](./dggrid) — the underlying C++ engine
- [API Reference](../api/overview) — language-agnostic function documentation
- [Quickstart](../quickstart) — end-to-end example
