---
id: xarray-xdggs
sidebar_position: 4
title: Xarray-XDGGS
---

# Xarray-XDGGS

**Xarray-XDGGS** extends [Xarray](https://xarray.dev) with DGGS-aware indexing, enabling cloud-native analysis of raster and gridded data on IGEO7 and other DGGS grids.

- **Repository:** https://github.com/xarray-contrib/xdggs
- **PyPI:** `pip install xdggs`

## What It Does

xdggs adds a `.dggs` accessor to Xarray DataArrays and Datasets. It lets you:

- Assign DGGS cell IDs as a dimension coordinate
- Aggregate data across DGGS resolutions (coarsening)
- Perform DGGS-aware spatial operations on array data
- Serve DGGS-indexed data via pydggsapi's Zarr backend

## Example

```python
import xarray as xr
import xdggs

# Open a Zarr dataset already indexed with IGEO7 cell IDs
ds = xr.open_zarr("s3://my-bucket/sentinel2.zarr")

# Assign IGEO7 indexing (if not already in the dataset)
ds_igeo7 = ds.dggs.assign_igeo7(resolution=9, cell_id_var="cell_id")

# Aggregate from resolution 9 to resolution 7 (2 levels coarser)
ds_coarse = ds_igeo7.dggs.coarsen(resolution=7)

# Compute monthly mean NDVI per cell
monthly = ds_igeo7["ndvi"].groupby("time.month").mean()
```

## Integration with pydggsapi

xdggs is the data layer behind pydggsapi's Zarr backend. Datasets stored as Zarr with IGEO7 cell IDs as a dimension are directly queryable via the OGC API DGGS endpoints.

## See Also

- [pydggsapi](./pydggsapi) — the OGC API DGGS server
- [Use Cases](../highlights/use-cases) — Earth observation data cube workflows
