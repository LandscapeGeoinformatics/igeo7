---
id: z7-string-format
sidebar_position: 3
title: Z7 String Format
---

# Z7 String Format

Z7 indexes have two external string representations: a **hex string** (compact, machine-friendly) and a **Z7 string** (human-readable, self-describing).

## The Two Formats

### 1. Hex String

The raw 64-bit integer printed as a **16-character lowercase hexadecimal string**.

```
0042aad3ffffffff
```

- Always exactly 16 characters
- Digits are `0`–`9`, `a`–`f`
- Trailing `f` characters correspond to the `111₂` sentinel (digit value 7 = beyond resolution)
- Mirrors the H3 hex index format for familiarity

### 2. Z7 String

A **human-readable** representation that directly shows the hierarchy:

```
Format:  BB D₁ D₂ D₃ ... Dᵣ
Example: 08 0 0 4 3 3  →  "0800433"
```

- **2 decimal digits** for the base cell (`00`–`11`)
- **Up to 20 octal digits** (`0`–`6`) for the resolution digits — one per level
- No separators; total length = 2 + resolution

The resolution is immediately readable from the string length: `len(z7_string) - 2`.

## Examples

| Z7 String | Base Cell | Resolution | Digits | Meaning |
|---|:---:|:---:|---|---|
| `"00"` | 0 | 0 | — | Base cell 0 (a pentagon at res 0) |
| `"050"` | 5 | 1 | [0] | Centre child of base cell 5 |
| `"0800433"` | 8 | 5 | [0,0,4,3,3] | Cell at res 5 near base cell 8 |
| `"0042aad3..."` | — | — | — | This is hex format, not Z7 string |

## Conversions

### Python (dggrid4py)

```python
from dggrid4py import igeo7

# Hex → Z7 string
z7_hex = "0042aad3ffffffff"
z7_str = igeo7.z7hex_to_z7string(z7_hex)
print(z7_str)          # "090625251"

# Z7 string → integer
z7_int = igeo7.z7hex_to_z7int(z7_hex)
print(f"{z7_int:016x}")  # "0042aad3ffffffff"

# Resolution from Z7 string
res = igeo7.get_z7string_resolution(z7_str)
print(res)             # 9

# Resolution from hex
res = igeo7.get_z7hex_resolution(z7_hex)
print(res)             # 9

# Parent and local position (from hex)
parent, local_pos, is_center = igeo7.get_z7hex_local_pos(z7_hex)
print(parent)          # "09062525"  (one digit shorter)
print(local_pos)       # "1"
print(is_center)       # False

# Parent and local position (from Z7 string directly)
parent, local_pos, is_center = igeo7.get_z7string_local_pos(z7_str)
```

### Julia (IGEO7.jl)

```julia
using IGEO7

idx = z7string_to_index("0800433")
println(index_to_z7string(idx))   # "0800433"

# Hex ↔ Z7 string
z7_str = z7hex_to_z7string("0042aad3ffffffff")  # "090625251"
hex = z7int_to_z7hex(z7hex_to_z7int("0042aad3ffffffff"))
```

## Hierarchy via String Manipulation

One of the most useful properties of the Z7 string format: **the parent is simply a prefix**.

```python
z7_str = "0800433"

# Parent (resolution 4): truncate last digit
parent_r4 = z7_str[:-1]     # "080043"

# Parent (resolution 3): truncate two digits
parent_r3 = z7_str[:-2]     # "08004"

# All children (resolution 6): append each digit 0–6
children = [z7_str + str(d) for d in range(7)]
# ["08004330", "08004331", ..., "08004336"]
```

:::tip DGGRID address type
When using dggrid4py, pass `output_address_type="Z7_STRING"` to get Z7 string indexes, or `output_address_type="Z7"` to get the hex format.
:::

## Digit Values 0–6: Local Position

Within a parent cell, the 7 children are numbered:

| Digit | Position |
|:---:|---|
| `0` | Centre child (directly below parent centre) |
| `1`–`6` | Six surrounding children, clockwise from a reference direction |

The centre child (`digit=0`) at any resolution is the cell that contains the parent's centroid. This is the basis for the `is_center` flag in the API.

## Storage Tips

- **Database:** Store as `VARCHAR(22)` for Z7 string, or `BIGINT UNSIGNED` / `INT8` for the integer representation.
- **Indexing:** The Z7 string's prefix property makes hierarchical queries efficient with a standard B-tree index (`WHERE z7 LIKE '08004%'` returns all descendants of cell `08004`).
- **Parquet / Arrow:** Use `uint64` for the integer, `utf8` for the string column.

## See Also

- [Z7 Bit Layout](./z7-bit-layout) — internal binary structure
- [Z7 Indexing Concepts](../concepts/z7-indexing) — conceptual explanation
