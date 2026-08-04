# igeo7.github.io

Source for the **[IGEO7](https://igeo7.org)** documentation website — a [Docusaurus v3](https://docusaurus.io/) site deployed to GitHub Pages.

IGEO7 is a hierarchically indexed hexagonal equal-area Discrete Global Grid System (DGGS) with the Z7 indexing system — the equal-area alternative to H3.

## Local Development

```bash
cd website
npm install
npm run start     # dev server at http://localhost:3000
```

## Build

```bash
cd website
npm run build     # production build → website/build/
npm run serve     # serve the production build locally
```

## Deployment

Pushing to `main` triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`), which builds the site and deploys it to the `gh-pages` branch. The custom domain `igeo7.org` is configured via `website/static/CNAME`.

## Repository Structure

```
igeo7.github.io/
├── .github/workflows/deploy.yml   # GitHub Actions CI/CD
├── website/
│   ├── docusaurus.config.js       # Site config, navbar, footer
│   ├── sidebars.js                # Sidebar structure
│   ├── src/
│   │   ├── css/custom.css         # Green theme
│   │   ├── components/            # React components (hero features)
│   │   │   └── Z7Explorer/        # The /explore cell explorer
│   │   │       ├── igeo7-config.mjs  # GRID DEFINITION - orientation lives here
│   │   │       ├── geometry.mjs      # Ring/child/index maths (no browser needed)
│   │   │       └── index.js          # Map, panel, controls
│   │   └── pages/
│   │       ├── index.js           # Landing page
│   │       └── explore.js         # /explore route
│   ├── scripts/                   # Verification harnesses (plain Node)
│   ├── static/                    # Images, CNAME
│   └── docs/                      # All documentation content
└── README.md
```

## Interactive Explorer

The [`/explore`](https://igeo7.org/explore) page is a client-side IGEO7 / Z7 cell
explorer built on [webDggrid](https://github.com/am2222/webDggrid) (a
DGGRID-derived WebAssembly engine) and [MapLibre GL JS](https://maplibre.org/).
There is no server and no committed WebAssembly artefact: the engine arrives as
an ordinary npm dependency with its binary embedded in the shipped JavaScript,
so `npm ci && npm run build` is all CI needs.

### Changing the grid

IGEO7 is **not** DGGRID's default ISEA aperture-7 grid. Two things differ, and
both must be right or cell indices are wrong:

**1. Icosahedron orientation longitude = 11.2** (DGGRID's default is 11.25).
Set it in one place:

```
website/src/components/Z7Explorer/igeo7-config.mjs   ->   ORIENTATION_LON
```

The explorer and both harnesses import from that file, so there is no second
copy to keep in step. Be aware that 11.2 and 11.25 give **identical** results
through resolution 5 and first diverge at resolution 6, so a resolution-5 test
point cannot tell them apart.

**2. Authalic latitude conversion**, which is mandatory and is *not* part of the
config object, because webDggrid does not apply it for you. It is a round trip
of explicit calls in `Z7Explorer/index.js`: `igeo7GeoToAuthalic` on every
geographic coordinate going in, `igeo7AuthalicToGeo` on every latitude coming
back out. Skipping the outbound half shifts latitudes by up to 0.13 degrees,
about 14 km at mid-latitudes.

### Verifying a change

Both harnesses run in plain Node and exit non-zero on failure:

```bash
cd website
node scripts/verify-igeo7.mjs      # IGEO7 conformance: the right cell for a lat/lon
node scripts/test-explorer.mjs     # ring geometry, children, bounds, index parsing
```

Their expectations are pinned to orientation 11.2, so if you deliberately change
the grid they are *supposed* to fail. Full detail, including the known
limitations, is in
[docs/ecosystem/explorer.md](website/docs/ecosystem/explorer.md).

## Citation

If you use IGEO7 in your research, please cite:

> Kmoch, A., Sahr, K., Chan, W.T., Uuemaa, E. (2025). IGEO7: A new hierarchically indexed hexagonal equal-area discrete global grid system. *AGILE: GIScience Series*, 6, 32. https://doi.org/10.5194/agile-giss-6-32-2025

## Licence

Documentation content: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Website code: [MIT](LICENSE).
