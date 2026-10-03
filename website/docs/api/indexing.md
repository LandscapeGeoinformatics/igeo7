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

For a single point or a batch via GeoDataFrame, with `dggrid`, `IGEO7_META` and the `auxlat` functions from the [API Overview](./overview#initialising-dggridv8):

```python
# Single point: Tartu, Estonia
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
print(result["name"].iloc[0])   # Z7 string: 00010224545
```

For Z7 hex output, set `"output_hier_ndx_form": "INT64"` in the configuration (here: `004252cbffffffff`).

**Batch indexing** with a large GeoDataFrame works identically — pass all points at once:

```python
gdf_cities = gpd.read_file("cities.gpkg").to_crs(4326)
cities_authalic = gpd.GeoDataFrame(geometry=geoseries_to_authalic(gdf_cities.geometry), crs=4326)

indexed = dggrid.cells_for_geo_points(
    geodf_points_wgs84=cities_authalic,
    cell_ids_only=True,
    dggs_type="IGEO7",
    resolution=9,
    **IGEO7_META,
)
gdf_cities["name"] = indexed["name"].values
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
# Get centroids for a list of cell IDs (all of the same resolution)
cell_ids = ["0001250", "0001254", "0001240"]

gdf_centroids = dggrid.grid_cell_centroids_from_cellids(
    cell_id_list=cell_ids,
    dggs_type="IGEO7",
    resolution=5,
    **IGEO7_META,
)
# authalic sphere → WGS84
gdf_centroids["geometry"] = geoseries_to_geodetic(gdf_centroids.geometry)
gdf_centroids["lat"] = gdf_centroids.geometry.y
gdf_centroids["lng"] = gdf_centroids.geometry.x
print(gdf_centroids[["name", "lat", "lng"]])
```

To get the full cell polygons instead:

```python
gdf_cells = dggrid.grid_cell_polygons_from_cellids(
    cell_id_list=cell_ids,
    dggs_type="IGEO7",
    resolution=5,
    **IGEO7_META,
)
gdf_cells["geometry"] = geoseries_to_geodetic(gdf_cells.geometry)
print(gdf_cells[["name", "geometry"]])
```

---

## Format Conversions

These functions convert between the three Z7 representations without any DGGRID call.

### Python — dggrid4py `igeo7` module

```python
from dggrid4py import igeo7

# Hex ↔ Z7 string
z7_str = igeo7.z7hex_to_z7string("0042aad3ffffffff")   # "00010252551"
z7_int = igeo7.z7hex_to_z7int("0042aad3ffffffff")      # integer
z7_hex = igeo7.z7int_to_z7hex(z7_int)                  # back to hex string
```

### Julia — IGEO7.jl

```julia
using IGEO7

idx    = z7string_to_index("0001022")         # Z7IndexUInt64
str    = index_to_z7string(idx)               # "0001022"
hex    = z7int_to_z7hex(idx.raw)              # hex string
int_val = z7hex_to_z7int("0042aad3ffffffff")  # UInt64
```
