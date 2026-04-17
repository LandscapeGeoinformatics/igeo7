---
id: intro
sidebar_position: 1
title: Introduction
---

# Introduction to IGEO7

IGEO7 is a **hierarchically indexed hexagonal equal-area Discrete Global Grid System (DGGS)** with the **Z7** indexing system.

It is the **equal-area alternative to H3**, sharing the aperture 7 hexagonal hierarchy and a comparable 64-bit integer indexing of H3, but using the **ISEA (Icosahedral Snyder Equal Area)** projection instead of H3's gnomonic projection. This guarantees all cells have truly equal area (H3 cells vary by up to ±50%).

:::tip Key paper
IGEO7 is described in: Kmoch, A., Sahr, K., Chan, W.T., Uuemaa, E. (2025). *IGEO7: A new hierarchically indexed hexagonal equal-area discrete global grid system.* AGILE: GIScience Series, 6, 32. [https://doi.org/10.5194/agile-giss-6-32-2025](https://doi.org/10.5194/agile-giss-6-32-2025)
:::

## What is a DGGS?

A **Discrete Global Grid System** partitions the entire surface of the Earth into a finite set of non-overlapping cells, providing a framework for spatial indexing, aggregation, and analysis at any resolution.

IGEO7 is implemented in:
- **DGGRID** (C++) — the original reference implementation of ISEA7H and Z7
- **DGGAL** — supports IGEO7 via ISEA7H_Z7
- **dggrid4py** — Python wrapper for DGGRID, can take care of correct definitions
- **pydggsapi** — OGC API DGGS server that supports both dggrid4py and dggal

## Core Properties

| Property | IGEO7 | H3 |
|---|---|---|
| Projection | ISEA (equal area) | Gnomonic |
| Cell shape | Hexagons + 12 pentagons | Hexagons + 12 pentagons |
| Aperture | Pure 7 | Custom toplevel, then 7 |
| Resolutions | 0–20 (21 levels) | 0–15 (16 levels) |
| Base cells | 12 | 122 |
| Index size | 64-bit integer | 64-bit integer |
| Area distortion | 0% | ±50% |

## Next Steps

- [Installation](./installation) — Set up DGGRID and dggrid4py
- [Quickstart](./quickstart) — Your first IGEO7 cells in Python
- [Resolution Table](./reference/restable) — All 21 resolution levels
- [Z7 Indexing Concepts](./concepts/z7-indexing) — How the index works
