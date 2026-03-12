---
id: quickstart
sidebar_position: 3
title: Quickstart
---

# Quickstart

From zero to working IGEO7 cells in Python using **dggrid4py**.

## Setup

```python
import os
import shapely.geometry
import geopandas as gpd
from dggrid4py import DGGRIDv7, igeo7

dggrid = DGGRIDv7(
    executable=os.environ.get("DGGRID_PATH", "/usr/local/bin/dggrid"),
    working_dir="/tmp",
    capture_logs=False,
    silent=True,
)
```

## 1. Generate a grid for an area

All IGEO7 cells at resolution 5 (~62 km cell diameter) covering Estonia:

```python
estonia = shapely.geometry.box(21.5, 57.5, 28.2, 59.7)

gdf = dggrid.grid_cell_polygons_for_extent(
    dggs_type="IGEO7",
    resolution=5,
    clip_geom=estonia,
    output_address_type="Z7_STRING",
)

print(gdf.head())
print(f"Cell count: {len(gdf)}")
```

```
  global_id                                           geometry
0   0500253  POLYGON ((21.07 57.94, 21.88 57.49, 22.70 57...
1   0500254  POLYGON ((22.70 57.94, 23.51 57.49, 24.33 57...
...
Cell count: 42
```

The `global_id` column contains the **Z7 string index** for each cell (see [Z7 String Format](./reference/z7-string-format)).

## 2. Find the cell containing a point

Index a lat/lng coordinate to its Z7 cell at resolution 9 (~1.3 km diameter):

```python
# Tartu, Estonia
points = gpd.GeoDataFrame(
    geometry=gpd.points_from_xy([26.7220], [58.3776]),
    crs=4326,
)

result = dggrid.cells_for_geo_points(
    geodf_points_wgs84=points,
    cell_ids_only=True,
    dggs_type="IGEO7",
    resolution=9,
)
print(result)
```

## 3. Work with Z7 indexes

The `igeo7` module provides index arithmetic for hex and string formats:

```python
from dggrid4py import igeo7

z7_hex = "0042aad3ffffffff"

# Convert between formats
z7_str = igeo7.z7hex_to_z7string(z7_hex)
print(f"Z7 string:  {z7_str}")       # e.g. "0500253"

# Inspect
res = igeo7.get_z7hex_resolution(z7_hex)
print(f"Resolution: {res}")           # 5

# Hierarchy: get parent and local position within parent
parent, local_pos, is_center = igeo7.get_z7hex_local_pos(z7_hex)
print(f"Parent:     {parent}")        # one digit shorter
print(f"Local pos:  {local_pos}")     # digit 0–6 within parent
print(f"Is center:  {is_center}")     # True if digit == "0"
```

## 4. Get geometries from a list of indexes

```python
cell_ids = ["0500253", "0500254", "0500255"]

gdf_cells = dggrid.grid_cell_polygons_from_cellids(
    cell_id_list=cell_ids,
    dggs_type="IGEO7",
    resolution=5,
    input_address_type="Z7_STRING",
    output_address_type="Z7_STRING",
)
print(gdf_cells)
```

## 5. Drill down: get children of a cell

All resolution-9 children of a single resolution-7 parent cell:

```python
children = dggrid.grid_cell_polygons_from_cellids(
    cell_id_list=["000125023"],      # parent cell at resolution 7
    dggs_type="IGEO7",
    resolution=9,                    # target resolution
    clip_subset_type="COARSE_CELLS",
    clip_cell_res=7,                 # resolution of the parent
    input_address_type="Z7_STRING",
    output_address_type="Z7_STRING",
)
print(f"Children count: {len(children)}")  # 7² = 49
```

:::note Aperture 7
Each cell has exactly 7 children: one centre cell (digit `0`) and 6 surrounding cells (digits `1`–`6`). Drilling 2 levels gives 7² = 49 descendants, 3 levels gives 7³ = 343.
:::

## 6. Visualise

```python
import matplotlib.pyplot as plt

ax = gdf.plot(edgecolor="white", linewidth=0.5, figsize=(10, 8), color="#2e7d32")
plt.title("IGEO7 Resolution 5 — Estonia")
plt.axis("off")
plt.tight_layout()
plt.savefig("igeo7_estonia_res5.png", dpi=150)
```

## Next Steps

- [Resolution Table](./reference/restable) — choose the right resolution for your use case
- [Z7 Indexing Concepts](./concepts/z7-indexing) — understand the index structure
- [dggrid4py Ecosystem](./ecosystem/dggrid4py) — full API documentation
