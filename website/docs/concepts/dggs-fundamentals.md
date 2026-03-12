---
id: dggs-fundamentals
sidebar_position: 1
title: DGGS Fundamentals
---

# DGGS Fundamentals

A **Discrete Global Grid System (DGGS)** partitions the entire surface of the Earth into a hierarchical set of cells — providing a uniform spatial reference framework for indexing, aggregating, and analysing data at any resolution.

## Why Not Just Use Lat/Lng?

Latitude and longitude identify points, but geospatial analysis often requires **area**. Common problems with raw coordinates:

- **Non-uniform cell sizes**: a 1°×1° grid cell near the equator covers ~12,300 km², near the poles ~1 km²
- **No hierarchy**: there's no natural way to aggregate a 0.01° grid up to a 1° grid
- **No adjacency**: finding all points within 10 km of another requires distance calculations, not index arithmetic

A DGGS solves all three by providing cells of consistent size across the globe, organized in a hierarchy.

## The Three Core Properties

According to the OGC DGGS standard (and Sahr, White & Kimerling 2003), a well-formed DGGS must have:

1. **Equal area** — cells at the same resolution have the same area
2. **Hierarchical** — finer cells nest cleanly inside coarser cells
3. **Global coverage** — the grid covers the entire sphere without gaps or overlaps

Most DGGS in common use trade off (1) for computational simplicity. IGEO7 does not.

## Base Polyhedron: The Icosahedron

All modern hexagonal DGGS start from an **icosahedron** — the Platonic solid with 20 equilateral triangular faces — projected onto the sphere.

![Icosahedron projected onto the sphere](/images/lei2020_icosahedron.png)

The icosahedron is the best approximation of a sphere among Platonic solids: it minimises angular and area distortion when its faces are unfolded and subdivided. IGEO7 uses the standard ISEA orientation, which:

- Minimises the number of vertices (icosahedron corners) falling on land
- Is symmetric across the equator
- Places one vertex near the North Pole and one near the South Pole

The 12 vertices of the icosahedron become the **12 pentagonal base cells** of IGEO7.

## Cell Shapes: Hexagons and Pentagons

Hexagons tile a flat plane perfectly. On a sphere, a pure hexagonal tiling is impossible — by Euler's theorem, any convex polyhedron requires exactly 12 pentagonal faces if all other faces are hexagonal. IGEO7 accepts this constraint and places the 12 required pentagons at the icosahedron vertices, as far from populated areas as possible.

At every resolution:
- **12 pentagons** — at icosahedron vertices, each with 5 neighbours
- **All other cells are hexagons** — each with exactly 6 neighbours

Hexagons have several advantages over squares or triangles for spatial analysis:
- All 6 neighbours are equidistant from the cell centre
- The centre-to-centre distance equals the edge length
- They provide better isotropy for sampling and diffusion models

![Pentagon and hexagon cells](/images/plot3_pentagon_noquad.png)

## Hierarchical Refinement

IGEO7 uses **aperture 7**: each hexagonal cell subdivides into exactly 7 children at the next finer resolution. One child sits at the centre, six surround it.

![Aperture-7 refinement](/images/isea7h_refinement.png)

The refinement ratio between successive levels is always 7× in cell count, and $1/\sqrt{7}$ in linear scale. This gives a refinement sequence much finer than aperture 4 (H3's base) and coarser than aperture 3, striking a practical balance between resolution levels and cell count growth.

| Aperture | Child count | Linear scale factor | Used by |
|:---:|:---:|:---:|---|
| 3 | 3 | 0.577 | ISEA3H, S2 (triangles) |
| 4 | 4 | 0.500 | H3 base levels |
| 7 | 7 | 0.378 | IGEO7, H3 hexagon levels |

## The IGEO7 Design Choices

IGEO7 makes three specific design decisions that together define it:

| Decision | Choice | Consequence |
|---|---|---|
| Projection | ISEA (equal area) | All cells have identical area |
| Base cells | 12 pentagons (pure aperture 7 from icosahedron vertices) | 21 resolution levels vs H3's 16 |
| Index | Z7 (64-bit hierarchical integer) | Fast parent/child arithmetic, compatible tooling |

## Further Reading

- [ISEA Projection](./isea-projection) — how equal area is guaranteed
- [Z7 Indexing](./z7-indexing) — how the 64-bit index encodes hierarchy
- [Resolution Table](../reference/restable) — all 21 resolution levels
- Sahr, K., White, D., Kimerling, A.J. (2003). Geodesic Discrete Global Grid Systems. *Cartography and Geographic Information Science*. [doi:10.1559/152304003100011090](https://doi.org/10.1559/152304003100011090)
