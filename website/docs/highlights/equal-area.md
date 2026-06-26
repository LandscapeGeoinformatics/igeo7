---
id: equal-area
sidebar_position: 1
title: Equal Area
---

# Equal Area

Every IGEO7 cell at a given resolution has **exactly the same area** as every other cell at that resolution. This is the defining property of IGEO7 and the primary reason to choose it over H3 or other hexagonal DGGS.

## The Problem It Solves

When you count events in grid cells, you implicitly assume all cells cover the same amount of space. If they don't, your counts are biased towards larger cells.

With H3's gnomonic projection, cells near icosahedral face edges are up to **50% smaller** than cells near face centres. A cell that appears to have "fewer events" may simply be a smaller cell.

![Area distortion across the globe — IGEO7 has none](/images/eckert.png)

## IGEO7 vs H3 Area Variation

| System | Projection | Cell area variation |
|---|---|:---:|
| **IGEO7** | ISEA (equal area) | **&lt;0.1%** |
| H3 | Gnomonic | up to ±50% |
| S2 | Cube face projection | up to ±50% |

These are not edge-case outliers. H3's ±50% variation is a systematic property of its projection — every cell near an icosahedral face edge is significantly smaller than a face-centre cell at the same resolution.

## When It Matters

**Equal area is essential for:**

- **Density maps** — events per km², species per unit area, population density
- **Land cover statistics** — percentage of forest, urban, agricultural area within cells
- **Equal-weight sampling** — each cell should represent the same "share" of the Earth's surface
- **Scientific reproducibility** — results should not depend on where a study area falls relative to icosahedral face geometry
- **Regulatory reporting** — area-accurate statistics required by environmental and planning law

**Example:** Counting bird observations per cell. With H3, a cell near a face edge might show 30% fewer observations than an adjacent face-centre cell — but this is an artefact of cell size, not bird behaviour. With IGEO7, every cell covers 1.264 km² (at resolution 9), so observation counts are directly comparable.

## The Guarantee

IGEO7 achieves equal area via the **ISEA (Icosahedral Snyder Equal Area)** projection, which maps the sphere to the icosahedron faces while preserving area exactly. The mathematical guarantee is:

$$
\text{Area}(\text{cell}_i) = \text{Area}(\text{cell}_j) \quad \forall\, i, j \text{ at the same resolution}
$$

This holds across the entire globe, including across icosahedral face boundaries and around pentagon cells.

See [ISEA Projection](../concepts/isea-projection) for the mathematical details.

## The Trade-off

Equal area comes with one practical cost: DGGRID uses authalic latitudes internally, requiring a geodetic↔authalic coordinate conversion when converting between WGS84 lat/lng and Z7 cell IDs. This makes DGGRID-based conversion slightly slower than H3's gnomonic approach.

For most use cases this is imperceptible. For very high-throughput point-in-cell lookups, DGGAL (`pip install dggal`) implements IGEO7 natively in C++ and is very fast.

## Further Reading

- [ISEA Projection](../concepts/isea-projection) — how equal area is mathematically achieved
- [IGEO7 vs H3](../comparisons/h3) — full comparison including area distortion data
- Kmoch et al. (2022). Area and Shape Distortions in Open-Source Discrete Global Grid Systems. *Big Earth Data*. [doi:10.1080/20964471.2022.2094926](https://doi.org/10.1080/20964471.2022.2094926)
