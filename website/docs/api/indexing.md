---
id: indexing
sidebar_position: 2
title: Indexing Functions
---

# Indexing Functions

Indexing functions convert between geographic coordinates and Z7 cell IDs.

## latLngToCell

Convert a geographic coordinate to the Z7 cell ID that contains it.

```
latLngToCell(lat, lng, resolution) → cell_id
```

| Parameter | Type | Description |
|---|---|---|
| `lat` | float | Latitude in decimal degrees (WGS84) |
| `lng` | float | Longitude in decimal degrees (WGS84) |
| `resolution` | int | Target resolution (0–20) |

**Returns:** Z7 cell ID (string or integer depending on binding)

### Python — dggrid4py

For a single point or a batch via GeoDataFrame:

```python
import geopandas as gpd
from dggrid4py import DGGRIDv7

dggrid = DGGRIDv7(executable="/usr/local/bin/dggrid", working_dir="/tmp")

# Single point: Tartu, Estonia
points = gpd.GeoDataFrame(
    geometry=gpd.points_from_xy([26.722], [58.378]),
    crs=4326,
)

result = dggrid.cells_for_geo_points(
    geodf_points_wgs84=points,
    cell_ids_only=True,
    dggs_type="IGEO7",
    resolution=9,
)
print(result["name"].iloc[0])   # Z7 hex string
```

For Z7 string output, transform the result with `igeo7.z7hex_to_z7string`.

**Batch indexing** with a large GeoDataFrame works identically — pass all points at once:

```python
gdf_cities = gpd.read_file("cities.gpkg")
indexed = dggrid.cells_for_geo_points(
    geodf_points_wgs84=gdf_cities,
    cell_ids_only=True,
    dggs_type="IGEO7",
    resolution=9,
)
```

### Julia — IGEO7.jl

IGEO7.jl performs Z7 index arithmetic but does not include coordinate→cell conversion (which requires DGGRID). Use [DggridRunners.jl](https://github.com/allixender/DggridRunners.jl) for Julia-native DGGRID access.

---

## cellToLatLng

Get the geographic coordinates of a cell's centroid.

```
cellToLatLng(cell_id) → (lat, lng)
```

### Python — dggrid4py

```python
# Get centroids for a list of cell IDs
import pandas as pd

cell_ids = ["0800433", "0800434", "0800435"]

gdf_centroids = dggrid.grid_cell_centroids_for_extent(
    dggs_type="IGEO7",
    resolution=5,
    clip_geom=None,   # global
)
# Filter to your cells
mask = gdf_centroids["global_id"].isin(cell_ids)
print(gdf_centroids[mask][["global_id", "geometry"]])
```

Alternatively, generate the full cell polygon and take its centroid:

```python
gdf_cells = dggrid.grid_cell_polygons_from_cellids(
    cell_id_list=cell_ids,
    dggs_type="IGEO7",
    resolution=5,
    input_address_type="Z7_STRING",
)
gdf_cells["centroid"] = gdf_cells.geometry.centroid
gdf_cells["lat"] = gdf_cells["centroid"].y
gdf_cells["lng"] = gdf_cells["centroid"].x
print(gdf_cells[["global_id", "lat", "lng"]])
```

---

## Format Conversions

These functions convert between the three Z7 representations without any DGGRID call.

### Python — dggrid4py `igeo7` module

```python
from dggrid4py import igeo7

# Hex ↔ Z7 string
z7_str = igeo7.z7hex_to_z7string("0042aad3ffffffff")   # "090625251"
z7_int = igeo7.z7hex_to_z7int("0042aad3ffffffff")      # integer
z7_hex = igeo7.z7int_to_z7hex(z7_int)                  # back to hex string
```

### Julia — IGEO7.jl

```julia
using IGEO7

idx    = z7string_to_index("0800433")         # Z7IndexUInt64
str    = index_to_z7string(idx)               # "0800433"
hex    = z7int_to_z7hex(idx.raw)              # hex string
int_val = z7hex_to_z7int("0042aad3ffffffff")  # UInt64
```
