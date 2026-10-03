---
id: hierarchy
sidebar_position: 5
title: Hierarchy Functions
---

# Hierarchy Functions

Hierarchy functions navigate the parent–child relationships encoded directly in the Z7 index.

## cellToParent

Get the ancestor of a cell at a coarser resolution.

```
cellToParent(cell_id, [resolution]) → cell_id
```

| Parameter | Type | Description |
|---|---|---|
| `cell_id` | Z7 string / hex / int | The cell to find the parent of |
| `resolution` | int (optional) | Target resolution; defaults to current resolution − 1 |

**Returns:** Z7 cell ID at the target resolution.

Because resolution is encoded in the Z7 string as its length, the parent is simply the string with its last digit removed.

### Python

```python
from dggrid4py import igeo7

z7_str = "0001022"              # resolution 5

# Parent at resolution 4
parent_r4 = z7_str[:-1]         # "000102"

# Parent at resolution 2
parent_r2 = z7_str[:4]          # "0001"  (2 base chars + 2 digits)

# Helper function for arbitrary target resolution
def cell_to_parent(z7_str: str, resolution: int) -> str:
    return z7_str[:2 + resolution]

print(cell_to_parent("0001022", 3))   # "00010"
```

### Julia

```julia
using IGEO7

idx = z7string_to_index("0001022")

# Default: parent at res - 1
parent = get_parent(idx)
index_to_z7string(parent)          # "000102"

# Explicit target resolution
parent_r2 = get_parent(idx, 2)
index_to_z7string(parent_r2)       # "0001"
```

---

## cellToChildren

Get all direct children of a cell at the next finer resolution.

```
cellToChildren(cell_id, [child_resolution]) → list[cell_id]
```

| Parameter | Type | Description |
|---|---|---|
| `cell_id` | Z7 string | The parent cell |
| `child_resolution` | int (optional) | Target resolution; defaults to current + 1 |

**Returns:** List of 7 cell IDs (6 for pentagons).

Because children are formed by appending digits 0–6, this is pure string manipulation for the Z7 string format.

### Python

```python
z7_str = "0001022"   # resolution 5

# Direct children at resolution 6
children = [z7_str + str(d) for d in range(7)]
# ["00010220", "00010221", "00010222",
#  "00010223", "00010224", "00010225", "00010226"]

# Cells at a deeper resolution inside the parent, with geometry, via dggrid4py
# (dggrid, IGEO7_META and geoseries_to_geodetic as in the API Overview)
cells_gdf = dggrid.grid_cell_polygons_from_cellids(
    cell_id_list=[z7_str],
    dggs_type="IGEO7",
    resolution=6,
    clip_subset_type="COARSE_CELLS",
    clip_cell_res=5,
    **IGEO7_META,
)
cells_gdf["geometry"] = geoseries_to_geodetic(cells_gdf.geometry)

# COARSE_CELLS is a spatial clip to the parent cell, so it also returns
# neighbouring cells that overlap it. Keep the index children by prefix:
children_gdf = cells_gdf[cells_gdf["name"].str.startswith(z7_str)]
print(len(children_gdf))   # 7
```

Over several levels the spatial clip and the index hierarchy drift apart, because the descendants of a cell do not exactly fill its hexagon. For the complete set of index descendants, enumerate the digit strings and request their geometry with `grid_cell_polygons_from_cellids`.

### Julia

```julia
using IGEO7

idx = z7string_to_index("0001022")  # res 5
res = get_resolution(idx)            # 5

# Direct children: append each digit 0–6
children = [index_to_z7string(idx) * string(d) for d in 0:6]
```

---

## cellToChildrenSize

Get the number of children a cell has at a given resolution.

```
cellToChildrenSize(cell_id, child_resolution) → int
```

For cells spanning multiple resolution levels the count is $7^{\Delta r}$ for hexagons, slightly less for paths through pentagons.

### Python

```python
def cell_to_children_size(z7_str: str, child_resolution: int) -> int:
    current_res = len(z7_str) - 2
    delta = child_resolution - current_res
    if delta <= 0:
        return 0
    return 7 ** delta  # exact for hexagons; pentagons slightly fewer

print(cell_to_children_size("0001022", 7))   # 7^2 = 49
print(cell_to_children_size("0001022", 8))   # 7^3 = 343
```

---

## areNeighbourCells

Check whether two cells at the same resolution share an edge.

```
areNeighbourCells(cell_id_a, cell_id_b) → bool
```

Currently implemented via geometry intersection in dggrid4py (load cell polygons and test for shared edges). Native Z7 arithmetic-based neighbour checking is available in [IGEO7.jl](https://github.com/allixender/IGEO7.jl).

### Python — geometry-based

```python
from dggrid4py import igeo7

# Precompute the spatial index once
gdf = dggrid.grid_cell_polygons_for_extent("IGEO7", resolution=9, ..., **IGEO7_META)
sindex = gdf.sindex.query(gdf.geometry, predicate="intersects")

neighbours_of_a = igeo7.get_neighbours_by_z7(
    z7_idx="00010224545",
    gdf=gdf,
    gpd_sindex=sindex,
    z7_col="name",
)
print("00010224540" in neighbours_of_a)   # True
```

### Julia — Z7 arithmetic

```julia
using IGEO7
idx = z7string_to_index("0001022")
neighbours = get_neighbours(idx)   # Vector of Z7IndexUInt64 (6 entries, invalid ones = typemax)
```

---

## compactCells / uncompactCells

Represent a set of cells at mixed resolutions by merging complete groups of 7 siblings into their parent.

This operation is not yet in dggrid4py but is achievable via Z7 string grouping:

```python
from collections import defaultdict

def compact(cell_ids: list[str]) -> list[str]:
    """Merge sibling groups of 7 into their parent, recursively."""
    by_parent = defaultdict(set)
    for c in cell_ids:
        by_parent[c[:-1]].add(c[-1])
    result = []
    for parent, digits in by_parent.items():
        if len(digits) == 7:
            result.append(parent)   # full group — promote to parent
        else:
            result.extend(parent + d for d in digits)
    return result
```

:::note Pentagon exception
Pentagon cells have only 6 children (digits 0–5 for the centre and 5 edge neighbours; digit 6 is absent). A compact operation over pentagonal children should treat a group of 6 as complete.
:::
