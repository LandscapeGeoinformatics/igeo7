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
│   │   └── pages/index.js         # Landing page
│   ├── static/                    # Images, CNAME
│   └── docs/                      # All documentation content
└── README.md
```

## Citation

If you use IGEO7 in your research, please cite:

> Kmoch, A., Sahr, K., Chan, W.T., Uuemaa, E. (2025). IGEO7: A new hierarchically indexed hexagonal equal-area discrete global grid system. *AGILE: GIScience Series*, 6, 32. https://doi.org/10.5194/agile-giss-6-32-2025

## Licence

Documentation content: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Website code: [MIT](LICENSE).
