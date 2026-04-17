---
id: use-cases
sidebar_position: 4
title: Use Cases
---

# Use Cases

IGEO7 is particularly well suited to applications where **equal area matters** and where **hierarchical aggregation** is part of the workflow.

## Environmental Monitoring

**Biodiversity and species distribution modelling** requires area-accurate grid cells so that species richness per unit area is comparable across regions. IGEO7's equal-area guarantee means a cell at resolution 9 in Estonia covers the same 1.264 km² as a cell in Brazil.

**Land cover and habitat area** — aggregate raster data (Sentinel-2, Copernicus Land Cover) into IGEO7 cells for consistent area-weighted statistics. Resolution 14 (~9.8 m) matches Sentinel-2's 10 m native resolution.

## Earth Observation Data Cubes

IGEO7 integrates with **Xarray-XDGGS** for cloud-native analysis of gridded data:

```python
import xarray as xr
import xdggs

ds = xr.open_zarr("s3://my-bucket/sentinel2.zarr")
ds_igeo7 = ds.dggs.assign_igeo7(resolution=14)
monthly_ndvi = ds_igeo7.groupby("time.month").mean()
```

The uniform cell size makes spatial aggregation and resampling mathematically correct — no area-weighting corrections needed.

## Hydrology and Water Resources

Stream networks and catchment delineation benefit from IGEO7's multi-resolution hierarchy. Resolutions 8-10 (~3-1.3 km) match typical hydrological modelling scales; resolution 12 (~68 m) suits fine-scale flow routing.

Because cells are equal area, runoff volumes computed per cell are directly summable up the hierarchy without correction factors.

With the Z7 indexing, it is a very fast operation to query the neighbours, and the neighbours are alsway in a predictable order.

## Urban Analytics and Planning

Resolution 11 (~181 m) and 12 (~68 m) provide natural scales for neighbourhood-level urban analysis — matching typical census block sizes and street-grid granularity. The hexagonal topology (all 6 neighbours equidistant) avoids the directional bias of square grids.


## OGC API DGGS Services

**pydggsapi** implements the [OGC API - DGGS](https://ogcapi.ogc.org/dggs/) standard with IGEO7 as a supported reference system. This allows IGEO7-indexed data to be served via standardised REST endpoints, consumable by any OGC-compliant client.

Supported backends: Clickhouse (columnar analytics), Zarr (cloud-native arrays), Parquet (via DuckDB).

See [pydggsapi ecosystem page](../ecosystem/pydggsapi).

## Comparing H3 and IGEO7 for Your Use Case

| Use case | H3 sufficient? | IGEO7 advantage |
|---|:---:|---|
| Nearest-neighbour lookup | ✓ | Marginal |
| Density maps (events/km²) | Biased | Equal area eliminates bias |
| Area statistics (land cover) | Biased | Equal area eliminates bias |
| Scientific reproducibility | Varies by location | Consistent everywhere |
| Very fine resolution (< 1 m) | No (max res 15 ~1 m²) | Res 18-20 reach centimetres |
| Cloud-native data cubes | Limited | Xarray-XDGGS integration |
| OGC API DGGS compliance | Partial | pydggsapi native support |

## Further Reading

- [Equal Area](./equal-area) — why cell area uniformity matters
- [Resolution Table](../reference/restable) — choose the right resolution
- [Ecosystem](../ecosystem/dggrid4py) — tools to build IGEO7 workflows
