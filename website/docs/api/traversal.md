---
id: traversal
sidebar_position: 4
title: Traversal Functions
---

# Traversal Functions

Traversal functions find the neighbours of a given cell — the cells that share an edge with it.

## getNeighbours

Get the immediate neighbours of a cell at the same resolution.

```
getNeighbours(cell_id) → list[cell_id]
```

**Returns:** 6 neighbours for hexagons, 5 for pentagons. Invalid entries (for pentagonal exclusion zones) are marked with a sentinel value.

### Python — geometry-based (dggrid4py)

For practical use, neighbour lookup via spatial index on a pre-generated grid is the most straightforward approach:

```python
from dggrid4py import igeo7

# Pre-generate grid for your area of interest
gdf = dggrid.grid_cell_polygons_for_extent(
    "IGEO7", resolution=9, clip_geom=my_area,
    output_address_type="Z7_STRING",
)
sindex = gdf.sindex.query(gdf.geometry, predicate="intersects")

# Get neighbours of a specific cell
neighbours = igeo7.get_neighbours_by_z7(
    z7_idx="090264253",
    gdf=gdf,
    gpd_sindex=sindex,
    z7_col="global_id",
)
print(neighbours)
```

### Julia — Z7 arithmetic (IGEO7.jl)

[IGEO7.jl](https://github.com/allixender/IGEO7.jl) implements neighbour traversal directly via Z7 index arithmetic without any geometry:

```julia
using IGEO7

idx = z7string_to_index("0800433")
neighbours = get_neighbours(idx)
# Returns Vector{Z7IndexUInt64} with 6 entries
# Entries equal to typemax(UInt64) are invalid (pentagon exclusion)

valid = filter(n -> n.raw != typemax(UInt64), neighbours)
[index_to_z7string(n) for n in valid]
```

---

## The Z7 Neighbour Algorithm

This section describes how Z7 neighbour traversal works. It is based on [Renoud and Shaw's C++ prototype][renoud2025] and the formal treatment in the IGEO7 paper.

Z7 neighbour traversal uses the **Generalized Balanced Ternary (GBT)** numeral system described in [Lucas and Gibson (1982)][lucas1982] and [van Roessel (1988)][vanRoessel1988]. Finding the neighbour in direction $d$ at resolution $r$ is equivalent to adding $d$ to the last digit using a GBT addition table, with carry propagation up through coarser resolutions.

### Rotation Pattern

Lucas and Gibson (1982) gave examples of GBT with exclusively counter-clockwise (CCW) rotation. The disadvantage of this approach is that hexagon orientations at different hierarchy levels diverge from each other. [White et al. (1992)][white1992] proposed alternating rotation direction (CW, CCW, CW, …) to maintain alignment across levels. Kmoch et al. (2025) adopted this alternating pattern for Z7, assigning **CW to odd resolutions** and **CCW to even resolutions**.

<img src="https://raw.githubusercontent.com/wrenoud/Z7/refs/heads/main/images/grid.svg" width="200" alt="3 hierarchies in Z7's alternating GBT pattern" />

### GBT Addition Tables

The neighbour in direction $d$ from digit $v$ is computed by a 7×7 lookup table. Two tables exist — one for CW (odd) resolutions and one for CCW (even) resolutions:

| CCW (even resolutions) | CW (odd resolutions) |
|---|---|
| ![Single digit GBT addition CCW](/images/neighbors-neighbors-ccw.png) | ![Single digit GBT addition CW](/images/neighbors-neighbors-cw.png) |

The full implementation, including carry propagation and cross-base-cell rotation handling, is in [IGEO7.jl](https://github.com/allixender/IGEO7.jl) and the [C++ prototype by Renoud and Shaw][renoud2025].

---

## References

1. Renoud, W. and Shaw, J. (2025). [Z7][renoud2025]. GitHub.
2. Lucas, D., & Gibson, L. (1982). [Automated Analysis of Imagery][lucas1982]. Air Force Office of Scientific Research. (No. AFOSR-TR-83-0055).
3. Sahr, K. (2011). [Hexagonal discrete global grid systems for geospatial computing][sahr2011]. *Archives of Photogrammetry Cartography and Remote Sensing*, 22, 363–376.
4. van Roessel, J. W. (1988). [Conversion of Cartesian coordinates from and to Generalized Balanced Ternary addresses][vanRoessel1988]. *Photogrammetric Engineering & Remote Sensing*, 54(11), 1565–1570.
5. White, D., Kimerling, J. A., & Overton, S. W. (1992). [Cartographic and Geometric Components of a Global Sampling Design for Environmental Monitoring][white1992]. *Cartography and Geographic Information Systems*, 19(1), 5–22.

[renoud2025]: https://github.com/wrenoud/Z7/
[lucas1982]: https://apps.dtic.mil/sti/tr/pdf/ADA125710.pdf
[vanRoessel1988]: https://www.asprs.org/wp-content/uploads/pers/1988journal/nov/1988_nov_1565-1570.pdf
[sahr2011]: https://www.researchgate.net/publication/266415994_Hexagonal_discrete_global_grid_systems_for_geospatial_computing
[white1992]: https://doi.org/10.1559/152304092783786636
[wikipedia2025]: https://en.wikipedia.org/wiki/Generalized_balanced_ternary
