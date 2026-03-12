---
id: z7-indexing
sidebar_position: 5
title: Z7 Indexing
---

# Z7 Indexing

The **Z7 index** is the core data structure of IGEO7. A single 64-bit integer encodes everything needed to identify a cell: which base cell it belongs to, its resolution, and its exact position within the hierarchy.

## Why a Hierarchical Index?

Traditional geographic coordinate systems (lat/lng, UTM) identify a *point* on the Earth's surface. For spatial analysis at scale, you often need:

- **Aggregation:** group fine-resolution observations into coarser cells
- **Neighbourhood queries:** find all cells adjacent to a given cell
- **Spatial joins:** map observations to a uniform grid

A hierarchical index like Z7 enables all of these in O(1) or O(r) time (where r is the resolution), without any geometry computation.

## Structure

A Z7 index is a 64-bit unsigned integer with this layout:

```
Bits 63–60  │  Bits 59–57  │  Bits 56–54  │  ...  │  Bits 2–0
────────────┼──────────────┼──────────────┼───────┼──────────
 Base cell  │   Digit 1    │   Digit 2    │  ...  │  Digit 20
  (4 bits)  │   (3 bits)   │   (3 bits)   │       │  (3 bits)
```

- **Base cell (4 bits):** which of the 12 icosahedral pentagonal base cells (0–11) the cell belongs to
- **Resolution digits (20 × 3 bits):** one digit per resolution level, value 0–6 for valid digits, 7 as an "end-of-resolution" sentinel

## The 12 Base Cells

IGEO7 starts from the **12 vertices of the icosahedron**, which become the 12 pentagonal cells at resolution 0. All other cells at all resolutions are hexagons that subdivide the faces around these vertices.

This is fundamentally different from H3, which has 122 resolution-0 cells formed by a mixed aperture 4→3 pre-subdivision. IGEO7's simpler base gives it 5 additional resolution levels.

![The 12 pentagonal base cells on the icosahedron](/images/plot3_pentagon_noquad.png)

## Aperture 7 Subdivision

At each resolution step, every hexagonal cell is subdivided into **7 children**:

![ISEA7H aperture-7 refinement showing parent cell subdivided into 7 children](/images/isea7h_refinement.png)

- **Digit 0:** centre child — directly below the parent centroid
- **Digits 1–6:** six surrounding children, numbered in space-filling curve order

Pentagons are an exception: they have 6 children (1 centre + 5 surrounding), since pentagons have only 5 edges.

## Reading a Z7 Index

The Z7 string format `"0800433"` decodes as:

| Part | Value | Meaning |
|---|---|---|
| `08` | base cell 8 | one of the 12 icosahedron vertices |
| `0` | digit 1 = 0 | centre child at resolution 1 |
| `0` | digit 2 = 0 | centre child at resolution 2 |
| `4` | digit 3 = 4 | child 4 at resolution 3 |
| `3` | digit 4 = 3 | child 3 at resolution 4 |
| `3` | digit 5 = 3 | child 3 at resolution 5 |

This cell is at **resolution 5** (5 valid digits after the base cell).

## Parent–Child Relationships

**Parent:** remove the last digit.

```python
z7_str = "0800433"
parent  = z7_str[:-1]   # "080043"  (resolution 4)
```

**Children:** append digits 0–6.

```python
children = [z7_str + str(d) for d in range(7)]
# ["08004330", "08004331", ..., "08004336"]
```

This works identically on the integer representation via bit operations:

```python
# Get parent (set last valid digit group to 0b111)
def get_parent(z7_int: int, resolution: int) -> int:
    shift = 57 - 3 * (resolution - 1)
    mask = ~(0x7 << shift)
    return (z7_int & mask) | (0x7 << shift)
```

## The Space-Filling Curve

The Z7 index order is not arbitrary — it defines a **space-filling curve** over the sphere. Cells that are adjacent in Z7 integer order tend to be spatially close. This property:

![Z7 space-filling curve index order](/images/plot_index_order.png)

- Improves cache locality when processing large datasets in index order
- Makes range scans on indexed database columns spatially coherent
- Is analogous to the Hilbert curve used in many raster spatial indexing schemes

## Digit 0: The Centre Cell

The digit `0` always means "the child that contains the parent's centroid". This is a consistent orientation anchor: no matter which base cell or resolution you're at, digit `0` is always the spatial centre.

This means the **path of all-zero digits** (e.g., `"080000...0"`) traces a straight line from the icosahedron vertex down to the finest resolution, always staying at the centre of each parent cell.

## Comparison with H3 Indexing

| Property | Z7 (IGEO7) | H3 |
|---|---|---|
| Index size | 64-bit integer | 64-bit integer |
| Base cell bits | 4 (values 0–11) | 7 (values 0–121) |
| Digit size | 3 bits (values 0–6, 7=sentinel) | 3 bits (values 0–6, 7=sentinel) |
| Max resolution | 20 | 15 |
| Digit encoding | 0=centre, 1–6=surrounding | 0=centre, 1–6=surrounding |
| String format | `BB` + up to 20 octal digits | 15-hex-char string |

The indexing philosophy is nearly identical — both use 64-bit integers with 3-bit resolution digits and a sentinel value. The key differences are at the base cell level: Z7 has 12 pure-aperture-7 base cells; H3 has 122 mixed-aperture base cells.

## Neighbourhood Traversal

Finding neighbours requires Z7 arithmetic — specifically, Central Place Indexing (CPI) addition with carry propagation across base cell boundaries. This is implemented in [IGEO7.jl](https://github.com/allixender/IGEO7.jl) and the [C++ work](https://github.com/wrenoud/Z7/) by W.Renoud J.Shaw.



## See Also

- [Z7 Bit Layout](../reference/z7-bit-layout) — detailed binary encoding
- [Z7 String Format](../reference/z7-string-format) — the two external string representations
- [Aperture 7 Hierarchy](./aperture7) — the subdivision geometry
- [Pentagons](./pentagons) — the 12 special cells
