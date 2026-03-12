---
id: z7-bit-layout
sidebar_position: 2
title: Z7 Bit Layout
---

# Z7 Bit Layout

A Z7 index is a **64-bit unsigned integer** that encodes a cell's base cell, resolution, and position in a single compact value.

## 64-bit Structure

```
 63        60 59                                                    0
 ┌──────────┬─────────────────────────────────────────────────────┐
 │ Base cell│            Resolution digits (20 × 3 bits)          │
 │  4 bits  │  d₁  │  d₂  │  d₃  │  d₄  │  ...  │  d₂₀         │
 └──────────┴───┬──┴───────┴───────┴───────┴───────┴──────────────┘
                │
                3 bits each (values 0–7)
```

| Field | Bits | Width | Values |
|---|---|---|---|
| Base cell | 63–60 | 4 bits | 0–11 (12 base cells) |
| Digit 1 (res 1) | 59–57 | 3 bits | 0–6 (valid), 7 (unused) |
| Digit 2 (res 2) | 56–54 | 3 bits | 0–6 (valid), 7 (unused) |
| … | … | 3 bits each | … |
| Digit 20 (res 20) | 2–0 | 3 bits | 0–6 (valid), 7 (unused) |

## Digit Encoding

Each 3-bit group is a **resolution digit**:

- Values `0`–`6`: valid cell position at that resolution level
- Value `7` (`0b111`): sentinel meaning "beyond resolution" (unused digit)

The resolution of a cell equals the number of digits with value `0`–`6` before the first `7` sentinel.

**Example:** A resolution-5 cell has digits `d₁`–`d₅` set to values in `0–6`, and digits `d₆`–`d₂₀` all set to `7`.

## Worked Example

Cell `"0042aad3ffffffff"` (hex):

```
Hex:    0042aad3ffffffff
Binary: 0000 000 001 000 010 101 010 101 101 001 111 111 111 111 111 111 111 111 111 111 111
        ──── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───
        BC=0 d1=0 d2=1 d3=0 d4=2 d5=5 d6=2 d7=5 d8=5 d9=1 d10=7...d20=7
```

- **Base cell:** `0000₂` = 0
- **Resolution:** 9 (digits 1–9 are valid, digit 10 onward = 7)
- **Z7 string:** `"090625251"` → base cell `09`, then digits `0`, `1`, `0`, `2`, `5`, `2`, `5`, `5`, `1`

:::note Why 4 bits for base cell?
4 bits can represent 0–15, but only values 0–11 are used (12 icosahedral vertices). Values 12–15 are reserved.
:::

## Bit Manipulation (Python)

```python
def decode_z7int(idx: int):
    """Decode a Z7 integer index into base cell and resolution digits."""
    binary = bin(idx)[2:].zfill(64)
    base_cell = int(binary[:4], 2)
    digits = [int(binary[4 + i*3 : 4 + i*3 + 3], 2) for i in range(20)]
    return base_cell, digits

def get_resolution(idx: int) -> int:
    """Get the resolution of a Z7 integer index."""
    _, digits = decode_z7int(idx)
    for i, d in enumerate(digits):
        if d == 7:
            return i
    return 20

def get_parent(idx: int) -> int:
    """Get the parent cell index (resolution - 1)."""
    res = get_resolution(idx)
    if res == 0:
        return idx
    binary = bin(idx)[2:].zfill(64)
    # Set the last valid digit group to 111 (value 7)
    pos = 4 + (res - 1) * 3
    new_binary = binary[:pos] + "111" + binary[pos+3:]
    return int(new_binary, 2)
```

## Bit Manipulation (Julia)

From the authoritative `IGEO7.jl` implementation:

```julia
# Extract base cell (top 4 bits)
base_cell = (idx >> 60) & 0x0F

# Extract digit at resolution i (1-indexed)
shift = 57 - 3 * (i - 1)
digit = (idx >> shift) & 0x07

# Check if digit is valid (not a sentinel)
is_valid = digit < 7

# Get resolution: count digits before first 7
resolution = findfirst(i -> ((idx >> (57 - 3*(i-1))) & 0x07) == 7, 1:20) - 1
```

## Properties

- **Hierarchical:** The parent of any cell is obtained by setting its last valid digit to `7`.
  - Parent = `idx | (0x7 << shift_of_last_digit)`
- **Space-filling:** The natural sort order of Z7 integers defines a space-filling curve over the sphere.
- **Compact:** 64 bits fit in a single `INT8` / `BIGINT` column in any database.
- **Comparable:** The hex string representation (`z7_int_to_z7hex`) is 16 lowercase characters — the same length as an H3 index.

## See Also

- [Z7 String Format](./z7-string-format) — the human-readable representation
- [Z7 Indexing Concepts](../concepts/z7-indexing) — conceptual explanation
