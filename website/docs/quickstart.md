---
id: quickstart
sidebar_position: 3
title: Quickstart
---

# Quickstart

From zero to working IGEO7 cells in Python using **dggrid4py**.

## Setup

Use the `DGGRIDv8` class with a recent DGGRID (8.43 or newer). `DGGRIDv7` is not recommended for IGEO7.

```python
import os
import shapely.geometry
import geopandas as gpd
from dggrid4py import DGGRIDv8, igeo7
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

:::caution Three things make it IGEO7
The Z7 index (`HIERNDX`), the orientation `dggs_vert0_lon = 11.20`, and the authalic conversion of coordinates going into and coming out of DGGRID. Leave one out and you get valid-looking cell IDs of a different grid. Details are on the [dggrid4py page](./ecosystem/dggrid4py#setup).
:::

## 1. Generate a grid for an area

All IGEO7 cells at resolution 5 (~62 km cell diameter) covering Estonia:

```python
estonia = shapely.geometry.box(21.5, 57.5, 28.2, 59.7)

# WGS84 → authalic sphere before the extent goes to DGGRID
estonia_authalic = geoseries_to_authalic(gpd.GeoSeries([estonia], crs=4326)).iloc[0]

gdf = dggrid.grid_cell_polygons_for_extent(
    dggs_type="IGEO7",
    resolution=5,
    clip_geom=estonia_authalic,
    **IGEO7_META,
)

# authalic sphere → WGS84 for the cell geometries
gdf["geometry"] = geoseries_to_geodetic(gdf.geometry)
gdf = gdf.set_crs(4326, allow_override=True)

print(gdf.head())
print(f"Cell count: {len(gdf)}")
```

```
      name                                           geometry
0  0001250  POLYGON ((28.18296 57.6701, 27.88282 57.39881,...
1  0001254  POLYGON ((27.45617 58.03055, 27.1587 57.75796,...
...
Cell count: 46
```

The `name` column contains the **Z7 string index** for each cell (see [Z7 String Format](./reference/z7-string-format)).

## 2. Find the cell containing a point

Index a lat/lng coordinate to its Z7 cell at resolution 9 (~1.3 km diameter):

```python
# Tartu, Estonia
points = gpd.GeoDataFrame(
    geometry=gpd.points_from_xy([26.7220], [58.3776]),
    crs=4326,
)

# WGS84 → authalic sphere; despite the parameter name, DGGRID expects authalic latitudes here
points_authalic = gpd.GeoDataFrame(geometry=geoseries_to_authalic(points.geometry), crs=4326)

result = dggrid.cells_for_geo_points(
    geodf_points_wgs84=points_authalic,
    cell_ids_only=True,
    dggs_type="IGEO7",
    resolution=9,
    **IGEO7_META,
)
print(result["name"].iloc[0])   # 00010224545
```

## 3. Work with Z7 indexes

The `igeo7` module provides index arithmetic for hex and string formats:

```python
from dggrid4py import igeo7

z7_hex = "0042aad3ffffffff"

# Convert between formats
z7_str = igeo7.z7hex_to_z7string(z7_hex)
print(f"Z7 string:  {z7_str}")       # "00010252551"

# Inspect
res = igeo7.get_z7hex_resolution(z7_hex)
print(f"Resolution: {res}")           # 9

# Hierarchy: get parent and local position within parent
parent, local_pos, is_center = igeo7.get_z7hex_local_pos(z7_hex)
print(f"Parent:     {parent}")        # one digit shorter
print(f"Local pos:  {local_pos}")     # digit 0–6 within parent
print(f"Is center:  {is_center}")     # True if digit == "0"
```

## 4. Get geometries from a list of indexes

```python
cell_ids = ["0001250", "0001254", "0001240"]

gdf_cells = dggrid.grid_cell_polygons_from_cellids(
    cell_id_list=cell_ids,
    dggs_type="IGEO7",
    resolution=5,
    **IGEO7_META,
)
gdf_cells["geometry"] = geoseries_to_geodetic(gdf_cells.geometry)
print(gdf_cells)
```

## 5. Drill down: get children of a cell

All resolution-9 children of a single resolution-7 parent cell:

```python
parent = "000102245"                 # parent cell at resolution 7

cells = dggrid.grid_cell_polygons_from_cellids(
    cell_id_list=[parent],
    dggs_type="IGEO7",
    resolution=9,                    # target resolution
    clip_subset_type="COARSE_CELLS",
    clip_cell_res=7,                 # resolution of the parent
    **IGEO7_META,
)
cells["geometry"] = geoseries_to_geodetic(cells.geometry)

# COARSE_CELLS is a spatial clip to the parent cell and returns 56 cells here.
# The index children are the ones that share the parent's Z7 prefix.
children = cells[cells["name"].str.startswith(parent)]
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
