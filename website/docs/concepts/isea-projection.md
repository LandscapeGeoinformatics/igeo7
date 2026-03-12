---
id: isea-projection
sidebar_position: 4
title: ISEA Projection
---

# ISEA Projection

The **Icosahedral Snyder Equal Area (ISEA)** projection is what makes IGEO7 cells truly equal area. It maps the sphere onto the faces of an icosahedron such that area is perfectly preserved — no cell is larger or smaller than any other at the same resolution.

## The Problem with Other Projections

Most map projections distort either area, shape, or both. For a DGGS, area distortion is the critical problem: if cells vary in size, then cell-count-based statistics are biased.

**H3** uses the gnomonic projection (great circles become straight lines on each icosahedral face). This is fast and preserves straight-line paths, but cells near face edges are up to 50% smaller than cells near face centres.

**IGEO7** uses ISEA, which eliminates this distortion entirely.

## How ISEA Works

The ISEA projection is a two-step process:

1. **Sphere → Icosahedron face**: Each point on the sphere is mapped to the nearest icosahedral face using an equal-area azimuthal projection centred on that face. The Snyder equal-area projection ensures that the area of any region on the sphere equals the area of its projection on the face.

2. **Face → 2D plane**: The 20 triangular faces can then be unfolded into a flat map. IGEO7 uses a specific orientation (the standard ISEA orientation) that minimises vertices on land.

The result: any two cells at the same resolution have **exactly the same area**.

## Authalic Latitude

DGGRID implements ISEA using **authalic latitudes** internally. The authalic latitude $\beta$ of a point at geodetic latitude $\phi$ on the WGS84 ellipsoid is defined as:

$$
\sin\beta = \frac{q(\phi)}{q_p}
$$

where $q(\phi)$ is the authalic helper function:

$$
q(\phi) = (1 - e^2)\left(\frac{\sin\phi}{1 - e^2\sin^2\phi} - \frac{1}{2e}\ln\frac{1-e\sin\phi}{1+e\sin\phi}\right)
$$

and $q_p = q(\pi/2)$, $e$ is the WGS84 eccentricity ($e \approx 0.0818$).

Authalic latitude preserves area relationships between parallels. DGGRID converts geodetic coordinates to authalic coordinates before applying the ISEA projection, ensuring the equal-area property holds with respect to the real Earth shape, not just a sphere.

:::note Interoperability
When working with WGS84 lat/lng coordinates (GPS, GeoJSON), DGGRID handles the authalic conversion automatically. You pass standard geographic coordinates in and get Z7 cell IDs out. The conversion is internal.
:::

## IGEO7 Icosahedron Orientation

IGEO7 uses the standard ISEA orientation, defined by:

```
dggs_vert0_lon     11.25
dggs_vert0_lat     58.2825255885
dggs_vert0_azimuth  0.0
```

This places one icosahedron vertex near 58°N, 11°E (southern Scandinavia), which:
- Avoids placing vertices on densely populated land
- Maintains north–south symmetry for the grid
- Is the same orientation used by DGGAL and dggrid4py by default

## Area Comparison: IGEO7 vs H3

At resolution 9, both IGEO7 and H3 produce cells of roughly "1 km scale". But their area distributions differ fundamentally:

| Property | IGEO7 res 9 | H3 res 9 |
|---|---|---|
| Cell area | 1.264 km² (all cells) | 0.105 km² avg (varies ±50%) |
| Area variation | **0%** | up to ±50% |
| Equal area guaranteed | **Yes** | No |

The ±50% figure for H3 is not a worst-case outlier — it is the systematic variation across all cells caused by the gnomonic projection distortion increasing toward icosahedral face edges.

For any analysis where cell count is used as a proxy for area — population density, land cover statistics, sampling intensity — this variation introduces bias. IGEO7 eliminates it.

## Practical Implications

**When equal area matters:**
- Density calculations (events per unit area)
- Land cover and habitat area statistics
- Climate model grid cells
- Equal-weight spatial sampling
- Regulatory reporting requiring area-accurate statistics

**When equal area is less critical:**
- Nearest-neighbour lookups
- Route finding / navigation
- Visualisation-only applications

## Further Reading

- Snyder, J.P. (1992). An Equal-Area Map Projection for Polyhedral Globes. *Cartographica*, 29(1), pp. 10–21.
- Kmoch, A., Vasilyev, I., Virro, H., Uuemaa, E. (2022). Area and Shape Distortions in Open-Source Discrete Global Grid Systems. *Big Earth Data*. [doi:10.1080/20964471.2022.2094926](https://doi.org/10.1080/20964471.2022.2094926)
- [Equal Area highlight page](../highlights/equal-area) — practical consequences
- [DGGS Fundamentals](./dggs-fundamentals) — broader context
