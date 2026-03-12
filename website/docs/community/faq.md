---
id: faq
sidebar_position: 3
title: FAQ
---

# FAQ

## General

### What is IGEO7?

IGEO7 is a Discrete Global Grid System (DGGS) that partitions the entire Earth surface into a hierarchy of equal-area hexagonal cells, identified by 64-bit integer indexes called Z7 indexes. It is described in the [AGILE 2025 paper](./publications).

### How is IGEO7 different from H3?

Both use hexagonal cells on an icosahedron with 64-bit hierarchical integer indexes. The key difference is **projection**: IGEO7 uses the ISEA equal-area projection (0% cell area variation); H3 uses the gnomonic projection (up to ±50% variation). IGEO7 also has 21 resolution levels vs H3's 16. See [IGEO7 vs H3](../comparisons/h3) for the full comparison.

### Is IGEO7 a drop-in replacement for H3?

Not directly — the index values are incompatible, and you need DGGRID or DGGAL instead of the H3 C library. However, the programming model is very similar: index points to cells, navigate hierarchy via parent/child, look up neighbours. Migration requires re-indexing your data, but the API concepts map closely.

### What does "Z7" mean?

Z7 refers to the hierarchical indexing system based on aperture-**7** hexagonal refinement (each cell has **7** children). The "Z" reflects the space-filling **Z**-order / space-filling curve property of the index ordering.

---

## Technical

### Why do IGEO7 cells have exactly 12 pentagons?

By Euler's formula for convex polyhedra, any tiling of a sphere using hexagons requires exactly 12 pentagons. IGEO7 places these at the 12 vertices of the icosahedron — as far apart as possible and away from densely populated land. See [DGGS Fundamentals](../concepts/dggs-fundamentals).

### What is CLS and why use it instead of area?

**CLS (Characteristic Length Scale)** is the diameter of a circle with the same area as a cell. It's the most intuitive way to relate IGEO7 resolutions to traditional raster pixel sizes — "resolution 9 has a CLS of ~1.3 km" is more immediately useful than "1,263,990 m²". See [Resolution Table](../reference/restable).

### What are the authalic latitudes and do I need to worry about them?

DGGRID uses authalic latitudes internally to implement the ISEA equal-area projection on the WGS84 ellipsoid. You **do not** need to handle this — dggrid4py passes standard WGS84 lat/lng and DGGRID converts internally. It is only relevant if you are implementing the ISEA projection from scratch. See [ISEA Projection](../concepts/isea-projection).

### Why does my Z7 hex index end in `ffffffff`?

The `f` digits in a Z7 hex string represent `1111₂` = digit value 7, which is the sentinel meaning "beyond resolution". A hex index like `0042aad3ffffffff` has 9 valid digits (resolution 9) followed by 11 sentinel groups. This is normal and expected. See [Z7 Bit Layout](../reference/z7-bit-layout).

### Can I store Z7 indexes in PostgreSQL / DuckDB / BigQuery?

Yes. Store as:
- `BIGINT` (PostgreSQL), `INT8` (DuckDB), `INT64` (BigQuery) for the integer
- `VARCHAR(22)` for the Z7 string
- `CHAR(16)` for the hex string

The Z7 string's prefix property makes hierarchical queries efficient with a standard B-tree index:
```sql
-- All resolution-9 descendants of resolution-5 cell "0800433"
SELECT * FROM observations WHERE cell_id LIKE '0800433%';
```

---

## Tooling

### Do I need DGGRID installed to use IGEO7?

For **coordinate → cell** conversion and **grid generation**, yes — dggrid4py requires the DGGRID binary. For **index arithmetic** (resolution, parent, children, format conversions), the `dggrid4py.igeo7` module is pure Python with no DGGRID dependency.

Alternatively, [DGGAL](https://github.com/ecere/dggal) (`pip install dggal`) implements the full IGEO7 stack natively in C++ with no subprocess overhead.

### Is there a JavaScript / web implementation?

Not yet. A WebGPU/Deck.gl integration is on the roadmap. [GeoPlegma](https://github.com/GeoPlegma/GeoPlegma) is developing JavaScript and native Rust support.

### Can I use IGEO7 with QGIS?

Yes — generate cell polygons with dggrid4py (as GeoPackage or GeoJSON) and load them in QGIS like any vector layer. Native QGIS plugin support is not yet available.

### Is there an R binding?

Not officially. The DGGRID binary can be called from R via `system()`, and there are community packages wrapping DGGRID for R (e.g. `dggridR`), though these target other grid types. Z7 index arithmetic can be ported to R straightforwardly from the Python or Julia implementations.

---

## Licensing

### What licence is IGEO7 / DGGRID under?

DGGRID is licensed under the AGPL-3.0. dggrid4py and pydggsapi are also AGPL-3.0. IGEO7.jl is MIT. The IGEO7 index specification itself is open and unencumbered.
