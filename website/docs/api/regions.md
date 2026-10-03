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

With `dggrid`, `IGEO7_META` and the `auxlat` functions from the [API Overview](./overview#initialising-dggridv8):

```python
import shapely.geometry

# Fill a bounding box
bbox = shapely.geometry.box(20.2, 57.0, 28.4, 60.0)   # Estonia

# WGS84 → authalic sphere before the polygon goes to DGGRID
bbox_authalic = geoseries_to_authalic(gpd.GeoSeries([bbox], crs=4326)).iloc[0]

gdf = dggrid.grid_cellids_for_extent(
    dggs_type="IGEO7",
    resolution=9,
    clip_geom=bbox_authalic,
    **IGEO7_META,
)
cell_ids = gdf.iloc[:, 0].tolist()
print(f"{len(cell_ids)} cells at resolution 9")
```

For arbitrary polygon shapes (not just bounding boxes):

```python
import geopandas as gpd

estonia = gpd.read_file("estonia.gpkg").to_crs(4326).geometry
estonia_authalic = geoseries_to_authalic(estonia).iloc[0]

gdf = dggrid.grid_cellids_for_extent(
    dggs_type="IGEO7",
    resolution=9,
    clip_geom=estonia_authalic,
    **IGEO7_META,
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
cell_ids = ["00010224545", "00010224540", "00010224541"]   # all resolution 9

gdf = dggrid.grid_cell_polygons_from_cellids(
    cell_id_list=cell_ids,
    dggs_type="IGEO7",
    resolution=9,
    **IGEO7_META,
)
gdf["geometry"] = geoseries_to_geodetic(gdf.geometry)   # authalic sphere → WGS84
print(gdf[["name", "geometry"]])
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
extent_authalic = geoseries_to_authalic(gpd.GeoSeries([extent], crs=4326)).iloc[0]

gdf = dggrid.grid_cell_polygons_for_extent(
    dggs_type="IGEO7",
    resolution=11,
    clip_geom=extent_authalic,
    **IGEO7_META,
)
gdf["geometry"] = geoseries_to_geodetic(gdf.geometry)
gdf = gdf.set_crs(4326, allow_override=True)
# Returns GeoDataFrame with columns: name, geometry
gdf.to_file("tallinn_igeo7_r11.gpkg")
```

**Split at dateline** (useful for global grids near the antimeridian):

```python
gdf_global = dggrid.grid_cell_polygons_for_extent(
    dggs_type="IGEO7",
    resolution=3,
    clip_geom=None,      # no clip = global
    split_dateline=True,
    **IGEO7_META,
)
gdf_global["geometry"] = geoseries_to_geodetic(gdf_global.geometry)
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
cell_ids = ["0001250", "0001254", "0001240"]   # all resolution 5

# keep the Z7 input and orientation settings, replace the output address type
meta_in = {k: v for k, v in IGEO7_META.items() if not k.startswith("output_")}

# Z7 string → Q2DI (quad/diamond index)
df_q2di = dggrid.address_transform(
    cell_ids,
    dggs_type="IGEO7",
    resolution=5,
    output_address_type="Q2DI",
    **meta_in,
)

# Z7 string → PROJTRI (projected triangle coordinates)
df_tri = dggrid.address_transform(
    cell_ids,
    dggs_type="IGEO7",
    resolution=5,
    output_address_type="PROJTRI",
    **meta_in,
)
```
