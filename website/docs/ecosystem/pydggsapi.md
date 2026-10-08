---
id: pydggsapi
sidebar_position: 3
title: pydggsapi
---

# pydggsapi

**pydggsapi** is an OGC API – DGGS server implementation built with FastAPI, with IGEO7 as a natively supported Discrete Global Grid Reference System.

- **Repository:** https://github.com/LandscapeGeoinformatics/pydggsapi
- **Authors:** 
   - Alexander Kmoch (University of Tartu)
   - Wai Tik Chan (University of Tartu)
   - Francis Charette-Migneault (Technologies Luqia, CRIM)
- **License:** AGPL-3.0
- **Related Publications**:
  - Chan, W. T., Charette-Migneault, F., Uuemaa, E., & Kmoch, A. (2026). pydggsapi: A query web service for Discrete Global Grid System (DGGS) collections. SoftwareX, 103042. [DOI:10.1016/j.softx.2026.103042](https://doi.org/10.1016/j.softx.2026.103042)
  
  - Kmoch, A., Chan, W.T. (2025). pydggsapi. FOSS4G 2025 Conference Presentation.

## What It Does

pydggsapi implements the [OGC API – DGGS](https://ogcapi.ogc.org/dggs/) candidate standard, exposing DGGS-indexed data over standardised REST endpoints. Any OGC-compliant client can query the server for cell data without knowing the underlying grid system.

Supported DGGS reference systems:
- **IGEO7** (ISEA7H Z7)
- H3
- HEALPix
- rHEALPix

Supported data backends:
- **Clickhouse** — columnar analytics for large vector datasets
- **Zarr** — cloud-native array data (via xdggs)
- **Parquet** — file-based tabular data

## Key Endpoints

| Endpoint | Description |
|---|---|
| `GET /dggs` | List available DGGS reference systems |
| `GET /dggs/{dggs_id}` | Describe a specific DGGS |
| `GET /dggs/{dggs_id}/zones` | List zones (cells) at a resolution |
| `GET /dggs/{dggs_id}/zones/{zone_id}` | Get data for a specific cell |
| `GET /collections` | List data collections |
| `GET /collections/{coll}/dggs/{dggs_id}/zones/{zone_id}` | Get collection data for a cell |

## Quick Start

```bash
pip install pydggsapi
uvicorn pydggsapi.main:app --reload
```

The server starts at `http://localhost:8000`. The interactive API docs are at `http://localhost:8000/docs`.

## Configuration

Configure data sources and DGGS settings via environment variables or a config file. Example for IGEO7 + Zarr backend:

```yaml
dggs:
  - id: IGEO7
    type: ISEA7H_Z7
    resolutions: [5, 7, 9, 11]

collections:
  - id: sentinel2_ndvi
    backend: zarr
    path: s3://my-bucket/sentinel2_ndvi.zarr
    dggs: IGEO7
    resolution: 9
```

## See Also

- [OGC API DGGS](./ogc-api-dggs) — the underlying standard
- [Xarray-XDGGS](./xarray-xdggs) — the Zarr backend integration
