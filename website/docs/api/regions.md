---
id: regions
sidebar_position: 6
title: Region Functions
---

# Region Functions

Region functions convert between geographic polygons and sets of Z7 cell IDs.

## polygonToCells

Fill a polygon with all Z7 cells at a given resolution.

```
polygonToCells(polygon, resolution) → list[cell_id]
```

| Parameter | Type | Description |
|---|---|---|
| `polygon` | Shapely geometry | The region to fill |
| `resolution` | int | Resolution of output cells |

**Returns:** List of Z7 cell IDs covering the polygon interior.

### Python — dggrid4py

```python
import shapely.geometry
from dggrid4py import DGGRIDv7

dggrid = DGGRIDv7(executable="/usr/local/bin/dggrid", working_dir="/tmp")

# Fill a bounding box
bbox = shapely.geometry.box(20.2, 57.0, 28.4, 60.0)   # Estonia

gdf = dggrid.grid_cellids_for_extent(
    dggs_type="IGEO7",
    resolution=9,
    clip_geom=bbox,
    output_address_type="Z7_STRING",
)
cell_ids = gdf.iloc[:, 0].tolist()
print(f"{len(cell_ids)} cells at resolution 9")
```

For arbitrary polygon shapes (not just bounding boxes):

```python
import geopandas as gpd

estonia = gpd.read_file("estonia.gpkg").geometry.iloc[0]

gdf = dggrid.grid_cellids_for_extent(
    dggs_type="IGEO7",
    resolution=9,
    clip_geom=estonia,
    output_address_type="Z7_STRING",
)
```

:::tip Clip vs cover
DGGRID clips cells to the polygon boundary by default — only cells whose centroid falls inside the polygon are returned. To include all cells that **intersect** the boundary, use a buffered polygon.
:::

---

## cellsToPolygon / cellsToGeometry

Get the geometry (polygon) for a list of Z7 cell IDs.

```
cellsToGeometry(cell_ids, resolution) → GeoDataFrame
```

### Python — dggrid4py

```python
cell_ids = ["0900264", "0900265", "0900266"]

gdf = dggrid.grid_cell_polygons_from_cellids(
    cell_id_list=cell_ids,
    dggs_type="IGEO7",
    resolution=9,
    input_address_type="Z7_STRING",
    output_address_type="Z7_STRING",
)
print(gdf[["global_id", "geometry"]])
```

To get the **union** of all cells as a single polygon (equivalent to H3's `cellsToPolygon`):

```python
union = gdf.geometry.union_all()
```

---

## gridCellsForExtent

Generate cell polygons (with geometries) covering an extent.

```
gridCellsForExtent(extent, resolution) → GeoDataFrame
```

This combines `polygonToCells` and `cellsToGeometry` in one call.

### Python — dggrid4py

```python
extent = shapely.geometry.box(24.5, 59.3, 25.2, 59.6)  # Tallinn

gdf = dggrid.grid_cell_polygons_for_extent(
    dggs_type="IGEO7",
    resolution=11,
    clip_geom=extent,
    output_address_type="Z7_STRING",
)
# Returns GeoDataFrame with columns: global_id, geometry
gdf.to_file("tallinn_igeo7_r11.gpkg")
```

**Split at dateline** (useful for global grids near the antimeridian):

```python
gdf_global = dggrid.grid_cell_polygons_for_extent(
    dggs_type="IGEO7",
    resolution=3,
    clip_geom=None,      # no clip = global
    split_dateline=True,
)
```

---

## addressTransform

Convert cell IDs between address types.

```
addressTransform(cell_ids, resolution, input_type, output_type) → DataFrame
```

Useful for converting between Z7 string, Z7 hex, Q2DI, PROJTRI, and SEQNUM formats.

### Python — dggrid4py

```python
cell_ids = gdf["global_id"].values

# Z7_STRING → Q2DI (quad/diamond index)
df_q2di = dggrid.address_transform(
    cell_ids,
    dggs_type="IGEO7",
    resolution=5,
    input_address_type="Z7_STRING",
    output_address_type="Q2DI",
)

# Z7_STRING → PROJTRI (projected triangle coordinates)
df_tri = dggrid.address_transform(
    cell_ids,
    dggs_type="IGEO7",
    resolution=5,
    input_address_type="Z7_STRING",
    output_address_type="PROJTRI",
)
```
