---
id: ogc-api-dggs
sidebar_position: 5
title: OGC API DGGS
---

# OGC API DGGS

The **OGC API – Discrete Global Grid Systems** is an open standard from the Open Geospatial Consortium (OGC) for accessing, querying, and sharing data referenced to a DGGS.

- **Standard:** https://ogcapi.ogc.org/dggs/
- **GitHub:** https://github.com/opengeospatial/ogcapi-discrete-global-grid-systems

## What It Defines

The standard defines a family of REST API building blocks:

| Building block | Description |
|---|---|
| **DGGS** | Describe available grid reference systems |
| **Zones** | Access individual cells (zones) and their data |
| **Zone Query** | Spatial and attribute queries over cells |
| **Data Retrieval** | Retrieve data values for a cell or zone list |

Requests identify cells by their native DGGS address (e.g. Z7 string for IGEO7) — no coordinate conversion needed by the client.

## IGEO7 as a DGGS Reference System

Within the OGC API DGGS framework, IGEO7 is identified as:

```
DGGS Reference System: ISEA7H_Z7
Zone address format:   Z7_STRING
```

A request for data at a specific IGEO7 cell looks like:

```
GET /dggs/IGEO7/zones/0900264253
```

## pydggsapi: IGEO7-Native Implementation

[pydggsapi](./pydggsapi) implements OGC API DGGS with IGEO7 as a first-class supported grid system. It is the reference implementation for IGEO7 OGC API DGGS access.

## Further Reading

- [pydggsapi](./pydggsapi) — the server implementation
- [Use Cases](../highlights/use-cases) — OGC API DGGS in practice
