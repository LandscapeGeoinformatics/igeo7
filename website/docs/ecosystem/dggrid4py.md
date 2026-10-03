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
| `DGGRIDv8` | Drives DGGRID for grid generation and coordinate conversion |
| `auxlat` | Geodetic ↔ authalic latitude conversion (WGS84 ellipsoid ↔ DGGRID's sphere) |
| `igeo7` | Pure Python Z7 index arithmetic (no subprocess) |
| `igeo7_ext` | Experimental IGEO7 helpers (resolution table, pentagons, neighbours) |

:::caution Use `DGGRIDv8` for IGEO7
`DGGRIDv7` is not recommended for IGEO7. It only knows the old `Z7` / `Z7_STRING` address types and rejects the `HIERNDX` parameters used on this page. Use the `DGGRIDv8` class with a recent DGGRID (8.43 or newer, e.g. 8.44 from conda-forge). DGGRID 9 is already in beta and supports the `HIERNDX` form only; `Z7` / `Z7_STRING` are marked deprecated in DGGRID 8.44.
:::

## DGGRIDv8: Grid Operations

### Setup

```python
import os
import geopandas as gpd
from dggrid4py import DGGRIDv8
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

Three things make a call IGEO7, and all three are needed:

1. **Z7 index** via the `HIERNDX` parameters. `DIGIT_STRING` gives Z7 strings (e.g. `00010224545`), `INT64` gives the 16-character Z7 hex string (e.g. `004252cbffffffff`). With `DGGRIDv8`, the old `output_address_type="Z7_STRING"` is ignored without an error and you get `SEQNUM` numbers back.
2. **Orientation** `dggs_vert0_lon = 11.20`. In the DGGRID v8 series the `IGEO7` type still uses ISEA7H's preset of 11.25, which will hopefully be fixed in DGGRID v9 (already in beta). Pass all three `dggs_vert0_*` values: dggrid4py 0.5.3 writes an invalid metafile if only the longitude is given (fixed for the next release).
3. **Authalic conversion** of everything that crosses between WGS84 and DGGRID: `geoseries_to_authalic` on the way in, `geoseries_to_geodetic` on the way out. The DGGRID tool does not apply this conversion yet, so it is still done explicitly here; DGGRID v9 will have an option for it.

Cell IDs are returned in the `name` column.

### grid_cell_polygons_for_extent

Generate cell polygons covering an area:

```python
import shapely.geometry

bbox = shapely.geometry.box(20.0, 57.0, 28.5, 60.0)

# WGS84 → authalic sphere before the extent goes to DGGRID
bbox_authalic = geoseries_to_authalic(gpd.GeoSeries([bbox], crs=4326)).iloc[0]

gdf = dggrid.grid_cell_polygons_for_extent(
    dggs_type="IGEO7",
    resolution=9,
    clip_geom=bbox_authalic,
    **IGEO7_META,
)
# authalic sphere → WGS84 for the cell geometries
gdf["geometry"] = geoseries_to_geodetic(gdf.geometry)
gdf = gdf.set_crs(4326, allow_override=True)
# Returns GeoDataFrame with columns: name, geometry
```

### grid_cellids_for_extent

Get cell IDs only (no geometries — much faster):

```python
df = dggrid.grid_cellids_for_extent(
    dggs_type="IGEO7",
    resolution=9,
    clip_geom=bbox_authalic,
    **IGEO7_META,
)
cell_ids = df.iloc[:, 0].tolist()
```

### grid_cell_polygons_from_cellids

Get geometries for a known list of cell IDs:

```python
gdf = dggrid.grid_cell_polygons_from_cellids(
    cell_id_list=["00010224545", "00010224540"],
    dggs_type="IGEO7",
    resolution=9,
    **IGEO7_META,
)
gdf["geometry"] = geoseries_to_geodetic(gdf.geometry)
```

All IDs in one call must be of the same resolution, and `resolution` must match it (a Z7 string has `2 + resolution` characters).

### cells_for_geo_points

Index geographic points to cell IDs:

```python
import geopandas as gpd

points = gpd.GeoDataFrame(
    geometry=gpd.points_from_xy([26.72, 24.75], [58.38, 59.44]),
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
points["name"] = result["name"].values   # Z7 strings, joined back to the WGS84 points
```

### grid_stats_table

Get statistics for all resolutions:

```python
df = dggrid.grid_stats_table("IGEO7", 20)
print(df.head(10))
```

Cell counts and areas do not depend on the orientation, so no `IGEO7_META` is needed here. With older DGGRID builds (8.42) this call fails for the `IGEO7` preset; `"ISEA7H"` gives the same table.

### Drill-down: children of a cell

```python
parent = "000102245"   # resolution 7

cells = dggrid.grid_cell_polygons_from_cellids(
    cell_id_list=[parent],
    dggs_type="IGEO7",
    resolution=9,
    clip_subset_type="COARSE_CELLS",
    clip_cell_res=7,
    **IGEO7_META,
)
cells["geometry"] = geoseries_to_geodetic(cells.geometry)

# COARSE_CELLS is a spatial clip to the parent cell, not an index operation.
# The index children are the cells that share the parent's Z7 prefix.
children = cells[cells["name"].str.startswith(parent)]
```

## igeo7: Index Arithmetic

The `igeo7` module works entirely in Python with no DGGRID subprocess:

```python
from dggrid4py import igeo7

# Format conversions
z7_str = igeo7.z7hex_to_z7string("0042aad3ffffffff")   # "00010252551"
z7_int = igeo7.z7hex_to_z7int("0042aad3ffffffff")
z7_hex = igeo7.z7int_to_z7hex(z7_int)

# Inspection
res    = igeo7.get_z7hex_resolution("0042aad3ffffffff")   # 9
res    = igeo7.get_z7string_resolution("0001022")          # 5

# Hierarchy
parent, digit, is_center = igeo7.get_z7hex_local_pos("0042aad3ffffffff")
parent, digit, is_center = igeo7.get_z7string_local_pos("0001022")

# Decode full bit structure
base_cell, digits = igeo7.decode_z7hex_index("0042aad3ffffffff")

# Neighbour lookup (requires pre-built GeoDataFrame + spatial index)
neighbours = igeo7.get_neighbours_by_z7(
    z7_idx="00010224545",
    gdf=gdf,
    gpd_sindex=sindex,
    z7_col="name",
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

`igeo7_ext` is an experimental module. `dggrid_get_res` returns the resolution table indexed by resolution, from which a resolution can be picked:

```python
from dggrid4py import igeo7_ext

stats = igeo7_ext.dggrid_get_res(dggrid, "ISEA7H", 20)   # same cells as IGEO7

(stats["cls_m"] - 1000).abs().idxmin()                   # 9, closest to 1 km cell diameter
(stats["average_hexagon_area_m2"] - 1e6).abs().idxmin()  # 9, closest to 1 km² cell area
stats.loc[9]                                             # cells, average_hexagon_area_m2, cls_m, ...
```

:::note Coming in the next dggrid4py release
The next release adds IGEO7 convenience wrappers to `igeo7_ext` (`dggrid_igeo7_grid_cell_polygons_for_extent`, `dggrid_igeo7_cells_for_geo_points`, `igeo7_meta_config()` and others). They accept a `DGGRIDv8` instance only, and apply the Z7 index, the 11.20 orientation and the authalic conversion for you. See the [dggrid4py IGEO7 documentation](https://dggrid4py.readthedocs.io/en/latest/IGEO7.html). Until then, use `IGEO7_META` and `dggrid4py.auxlat` as shown above.
:::

## See Also

- [DGGRID](./dggrid) — the underlying C++ engine
- [API Reference](../api/overview) — language-agnostic function documentation
- [Quickstart](../quickstart) — end-to-end example
