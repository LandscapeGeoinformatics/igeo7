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
dggrid --version
```

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

All are installed automatically.

## 3. (Optional) DGGAL / pydggal

For a pure-Python alternative with no subprocess calls, [DGGAL](https://github.com/ecere/dggal) implements IGEO7 natively as `ISEA7H_Z7`. Install the Python binding:

```bash
pip install dggal
```

## 4. Verify the setup

```python
import os
from dggrid4py import DGGRIDv8

dggrid = DGGRIDv7(
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
   Resolution  # Cells     Area (km^2)
0           0       12  51006562.172409
1           1       72   7286651.738916
...
5           5   168072      3034.840374
```

:::tip Working directory
dggrid4py creates temporary metafiles in `working_dir`. `/tmp` works well on Linux/macOS. The directory is cleaned up automatically after each call.
:::

## Next Steps

- [Quickstart](./quickstart) — generate your first IGEO7 cells
- [dggrid4py ecosystem page](./ecosystem/dggrid4py) — full API reference for the Python wrapper
