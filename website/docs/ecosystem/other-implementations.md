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
| [py4dggs](#py4dggs) | Python | Pure-Python DGGS reference library, designed after DGGAL |
| [webDggrid](#webdggrid) | JavaScript (WebAssembly) | DGGRID for the browser and Node.js; the engine of the explorer on this site |
| [duck_dggs](#duck_dggs) | SQL (DuckDB) | DuckDB extension with DGGRID functions and Z7 arithmetic |
| [DggridRunners.jl](#dggridrunnersjl) | Julia | Runs DGGRID, the Julia equivalent of dggrid4py |
| [IGEO7.jl](#igeo7jl) | Julia | Z7 index arithmetic and neighbour traversal |
| [DiscreteGlobalGrids.jl](#discreteglobalgridsjl) | Julia | Several grid systems, IGEO7 among them, behind one interface |

## DGGAL

**[DGGAL](https://dggal.org/)**, the Discrete Global Grid Abstraction Library, provides a common interface for operations on many discrete global grid reference systems. It supports IGEO7 through its **`ISEA7H_Z7`** grid, which uses Z7 indexing for interoperability with DGGRID. `ISEA7H_Z7` uses the 11.2 orientation and applies the authalic latitude conversion itself.

- **Website:** https://dggal.org/
- **Repository:** https://github.com/ecere/dggal
- **Bindings:** C, C++, Python (`pip install dggal`), Rust, Java, JavaScript (WebAssembly)
- **License:** BSD-3-Clause

## py4dggs

**[py4dggs](https://github.com/terraops-org/py4dggs)** is a pure-Python, multi-grid DGGS reference library with zero runtime dependencies. It is designed after DGGAL and verified against DGGAL's Python binding. IGEO7 with Z7 digit IDs is one of its grids, next to other aperture-7 and aperture-3 hexagonal grids.

- **Repository:** https://github.com/terraops-org/py4dggs
- **Install:** `pip install py4dggs` (Python 3.12 or later)
- **License:** MIT

## webDggrid

**[webDggrid](https://am2222.github.io/webDggrid/)** is DGGRID compiled to WebAssembly, for the browser and Node.js. It converts coordinates to cells and back, exports grids as GeoJSON, and has bit-level operations on the 64-bit Z7 index (parent, neighbours, encode and decode). It is the engine behind the [Interactive Explorer](./explorer) on this site. As with DGGRID itself, the IGEO7 orientation and the authalic conversion have to be set explicitly, which the explorer page describes.

- **Website:** https://am2222.github.io/webDggrid/
- **Repository:** https://github.com/am2222/webDggrid
- **Install:** `npm install webdggrid`

## duck_dggs

**[duck_dggs](https://duckdb.org/community_extensions/extensions/duck_dggs)** is a DuckDB community extension powered by DGGRID v8. It brings DGGRID's coordinate, cell and hierarchy functions into SQL, together with Z7 arithmetic on the packed index (`igeo7_parent`, `igeo7_get_neighbours`, `igeo7_to_string` and others) and the authalic conversion (`igeo7_geo_to_authalic`, `igeo7_authalic_to_geo`). Its default grid is ISEA4H, so the IGEO7 grid is selected through `dggs_params`.

- **Extension page:** https://duckdb.org/community_extensions/extensions/duck_dggs
- **Repository:** https://github.com/am2222/duckdb-dggs
- **Install:** `INSTALL duck_dggs FROM community; LOAD duck_dggs;`
- **License:** MIT

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
