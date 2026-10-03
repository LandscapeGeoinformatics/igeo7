---
id: installation
sidebar_position: 2
title: Installation
---

# Installation

IGEO7 is implemented in **DGGRID** (the core C++ engine) and accessed via the **dggrid4py** Python wrapper.

## 1. Install DGGRID

DGGRID is a C++ command-line tool. You need a compiled binary on your system.

### Pre-built binaries

Download a pre-built binary from the [DGGRID releases page](https://github.com/sahrk/DGGRID/releases).

### With conda / mamba (or even Julia)

or install from conda-forge (via Pixi or micomamba)

```bash
conda install -c conda-forge dggrid
```

```julia
using Pkg; Pkg.add("DggridRunners")
```


### Build from source

```bash
git clone https://github.com/sahrk/DGGRID.git
cd DGGRID
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc)
sudo make install   # installs to /usr/local/bin/dggrid
```

**Requirements:** CMake ≥ 3.12, a C++17 compiler (GCC ≥ 7 or Clang ≥ 5).

Verify the installation:

```bash
dggrid -v     # DGGRID version 8.44 released December 1, 2025
```

:::note DGGRID version
IGEO7 needs a recent DGGRID: **8.43 or newer** (conda-forge currently ships 8.44). DGGRID 9 is already in beta; it only supports the `HIERNDX` form of Z7 addressing, which is what this documentation uses (`Z7` / `Z7_STRING` are marked deprecated in 8.44).
:::

### Setting the path

dggrid4py requires the DGGRID binary via the `DGGRID_PATH` environment variable or an explicit path in the API call:

```bash
export DGGRID_PATH=/usr/local/bin/dggrid
```

## 2. Install dggrid4py

dggrid4py is the Python wrapper that drives DGGRID programmatically.

### With pip (or uv or pixi)

```bash
pip install dggrid4py
```


### Dependencies

| Package | Purpose |
|---|---|
| `geopandas` | Geospatial DataFrames with geometry support |
| `shapely` | Geometry objects (polygons, points) |
| `pandas` | Tabular data |
| `numpy` | Array operations |
| `pygeodesy` | Authalic latitude conversion (`dggrid4py.auxlat`) |

All are installed automatically.

## 3. (Optional) DGGAL / pydggal

For an alternative with no subprocess calls, [DGGAL](https://dggal.org/) implements IGEO7 natively as `ISEA7H_Z7`. Install the Python binding:

```bash
pip install dggal
```

## 4. Verify the setup

```python
import os
from dggrid4py import DGGRIDv8   # use DGGRIDv8 for IGEO7, not DGGRIDv7

dggrid = DGGRIDv8(
    executable=os.environ.get("DGGRID_PATH", "/usr/local/bin/dggrid"),
    working_dir="/tmp",
    capture_logs=True,
    silent=True,
)

# Quick sanity check: generate grid stats for resolution 5
df = dggrid.grid_stats_table("IGEO7", 5)
print(df)
```

Expected output (truncated):

```
   Resolution   Cells   Area (km^2)     CLS (km)
0           0      12  5.100656e+07  8199.500370
1           1      72  7.286652e+06  3053.223243
...
5           5  168072  3.034840e+03    62.161776
```

:::tip Working directory
dggrid4py creates temporary metafiles in `working_dir`. `/tmp` works well on Linux/macOS. The directory is cleaned up automatically after each call.
:::

## Next Steps

- [Quickstart](./quickstart) — generate your first IGEO7 cells
- [dggrid4py ecosystem page](./ecosystem/dggrid4py) — full API reference for the Python wrapper
