---
id: inspection
sidebar_position: 3
title: Inspection Functions
---

# Inspection Functions

Inspection functions query properties of a Z7 cell ID without any geographic computation.

## getResolution

Get the resolution level of a cell ID.

```
getResolution(cell_id) → int  (0–20)
```

### Python

```python
from dggrid4py import igeo7

# From Z7 hex string
res = igeo7.get_z7hex_resolution("0042aad3ffffffff")   # 9

# From Z7 string
res = igeo7.get_z7string_resolution("0800433")          # 5
```

Resolution is the count of valid digits (values 0–6) before the first sentinel (`7`). For the Z7 string format it is simply `len(z7_string) - 2`.

### Julia

```julia
using IGEO7
idx = z7string_to_index("0800433")
get_resolution(idx)   # 5
```

---

## getBaseCellNumber

Get the base cell number (0–11) of a cell ID.

```
getBaseCellNumber(cell_id) → int  (0–11)
```

All 12 base cells are pentagons at icosahedron vertices. The base cell is encoded in the top 4 bits of the 64-bit integer.

### Python

```python
from dggrid4py import igeo7

base_cell, digits = igeo7.decode_z7hex_index("0042aad3ffffffff")
print(base_cell)   # 0

# From Z7 string: first two characters
z7_str = "0800433"
base_cell = int(z7_str[:2])   # 8
```

### Julia

```julia
using IGEO7
idx = z7string_to_index("0800433")
get_base_cell(idx)   # 0x08 (UInt8)
```

---

## getDigits

Get all 20 resolution digits of a cell ID.

```
getDigits(cell_id) → list[int]  (length 20; values 0–6 valid, 7 = sentinel)
```

### Python

```python
base_cell, digits = igeo7.decode_z7hex_index("0042aad3ffffffff")
valid = [d for d in digits if d < 7]
print(valid)   # [0, 1, 0, 2, 5, 2, 5, 5, 1]  (9 digits → resolution 9)
```

### Julia

```julia
using IGEO7
idx = z7string_to_index("0800433")
get_digits(idx)   # (0, 0, 4, 3, 3, 7, 7, 7, ..., 7) — tuple of 20
```

---

## isValid

Check whether a value is a well-formed Z7 cell ID.

```
isValid(cell_id) → bool
```

A valid Z7 cell ID must have:
- Base cell in range 0–11
- All digits in range 0–7
- No valid digit (0–6) after the first sentinel (7)

### Python

```python
def is_valid_z7hex(z7_hex: str) -> bool:
    if len(z7_hex) != 16:
        return False
    try:
        base_cell, digits = igeo7.decode_z7hex_index(z7_hex)
    except Exception:
        return False
    if base_cell > 11:
        return False
    sentinel_seen = False
    for d in digits:
        if sentinel_seen and d != 7:
            return False
        if d == 7:
            sentinel_seen = True
    return True
```

---

## isPentagon

Check whether a cell is one of the 12 pentagons at a given resolution.

```
isPentagon(cell_id) → bool
```

A cell is a pentagon if all of its resolution digits are `0` (it is the all-centre path from a base cell pentagon).

### Python

```python
def is_pentagon(z7_str: str) -> bool:
    # Pentagon cells have only digit '0' after the base cell
    return all(c == '0' for c in z7_str[2:])

print(is_pentagon("0800000"))   # True  — resolution 5 pentagon
print(is_pentagon("0800433"))   # False — regular hexagon
```

### Julia

```julia
using IGEO7
idx = z7string_to_index("0800000")
digits = get_digits(idx)
res = get_resolution(idx)
all(digits[1:res] .== 0x00)   # true → pentagon
```

---

## getLocalPosition

Get a cell's position within its parent cell.

```
getLocalPosition(cell_id) → (parent_id, digit, is_center)
```

| Return | Description |
|---|---|
| `parent_id` | Z7 string of the parent cell (one digit shorter) |
| `digit` | The last valid digit (0–6); `0` = centre child |
| `is_center` | `True` if digit == `0` |

### Python

```python
from dggrid4py import igeo7

# From Z7 hex
parent, digit, is_center = igeo7.get_z7hex_local_pos("0042aad3ffffffff")

# From Z7 string
parent, digit, is_center = igeo7.get_z7string_local_pos("0800433")
print(parent)     # "080043"
print(digit)      # "3"
print(is_center)  # False
```

### Julia

```julia
using IGEO7
z7_str = index_to_z7string(z7string_to_index("0800433"))
parent   = z7_str[1:end-1]          # "080043"
digit    = z7_str[end]              # '3'
is_center = digit == '0'
```
