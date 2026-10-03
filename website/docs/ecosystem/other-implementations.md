---
id: other-implementations
sidebar_position: 6
title: Other Implementations
---

# Other Implementations

Besides DGGRID and dggrid4py, these libraries support IGEO7.

| Tool | Language | Role |
|---|---|---|
| [DGGAL](#dggal) | C, with bindings | Native DGGS library; IGEO7 as `ISEA7H_Z7` |
| [DggridRunners.jl](#dggridrunnersjl) | Julia | Runs DGGRID, the Julia equivalent of dggrid4py |
| [IGEO7.jl](#igeo7jl) | Julia | Z7 index arithmetic and neighbour traversal |
| [DiscreteGlobalGrids.jl](#discreteglobalgridsjl) | Julia | Several grid systems, IGEO7 among them, behind one interface |

## DGGAL

**[DGGAL](https://dggal.org/)**, the Discrete Global Grid Abstraction Library, provides a common interface for operations on many discrete global grid reference systems. It supports IGEO7 through its **`ISEA7H_Z7`** grid, which uses Z7 indexing for interoperability with DGGRID. `ISEA7H_Z7` uses the 11.2 orientation and applies the authalic latitude conversion itself.

- **Website:** https://dggal.org/
- **Repository:** https://github.com/ecere/dggal
- **Bindings:** C, C++, Python (`pip install dggal`), Rust, Java, JavaScript (WebAssembly)
- **License:** BSD-3-Clause

## DggridRunners.jl

**[DggridRunners.jl](https://github.com/allixender/DggridRunners.jl)** is the Julia equivalent of dggrid4py: an executor for the DGGRID command-line tool that exposes its high-level operations (grid generation, coordinate and address conversion) as Julia functions. Like dggrid4py it needs a DGGRID binary.

- **Repository:** https://github.com/allixender/DggridRunners.jl
- **Documentation:** https://allixender.github.io/DggridRunners.jl/
- **Language:** Julia
- **License:** AGPL-3.0

## IGEO7.jl

**[IGEO7.jl](https://github.com/allixender/IGEO7.jl)** implements the Z7 index itself in Julia: encoding and decoding, hierarchy, and neighbour traversal with Generalized Balanced Ternary (GBT) and Central Place Indexing (CPI) arithmetic. It works on the integer index only and needs no DGGRID. Its Python counterpart is [z7py](https://github.com/allixender/z7py).

- **Repository:** https://github.com/allixender/IGEO7.jl
- **Documentation:** https://allixender.github.io/IGEO7.jl/dev/
- **Language:** Julia
- **License:** AGPL-3.0

## DiscreteGlobalGrids.jl

**[DiscreteGlobalGrids.jl](https://github.com/JuliaGeo/DiscreteGlobalGrids.jl/)** is a JuliaGeo package that brings several grid systems into the Julia geo ecosystem behind one interface, IGEO7 among them (`IGeo7System()`), next to H3, HEALPix, A5, S2 and ISEA4R. It locates cells, follows neighbours and parent–child relationships, regrids rasters, and works with DimensionalData arrays and Zarr stores.

- **Repository:** https://github.com/JuliaGeo/DiscreteGlobalGrids.jl/
- **Documentation:** https://juliageo.org/DiscreteGlobalGrids.jl/
- **Language:** Julia (1.11 or later)
- **License:** MIT
