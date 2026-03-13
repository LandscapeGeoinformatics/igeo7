# IGEO7 Style Experimentation Workflow

This document outlines how to propose and review design experiments for the IGEO7 project, including color palettes, logos, and UI accents.

## 1. The JSON Spec
All experiments should be defined in a JSON format to ensure consistency across review pages.

### Schema
```json
{
  "id": "unique-slug",
  "name": "Human Readable Name",
  "description": "Short explanation of the design goal.",
  "mode": "light" | "dark",
  "palette": {
    "primary": "#hex",
    "primary_dark": "#hex",
    "primary_darker": "#hex",
    "primary_darkest": "#hex",
    "primary_light": "#hex",
    "primary_lighter": "#hex",
    "primary_lightest": "#hex",
    "hero_bg": "#hex",
    "hero_border": "#hex",
    "feature_icon_bg": "#hex"
  },
  "logo": {
    "svg_path": "optional/path/to/logo.svg",
    "fill_color": "#hex",
    "stroke_color": "#hex",
    "inner_stroke": "#hex"
  }
}
```

## 2. Review Process
1. **Propose:** Provide a JSON block following the schema above.
2. **Generate:** A standalone HTML page will be generated at `style_work/exp_[id].html` using the standard `experiment_template.html`.
3. **Compare:** Use the generated pages to compare "vibe", accessibility, and brand alignment.

## 3. Handling Logo Changes
- **Existing SVG Re-coloring:** Specify `fill_color`, `stroke_color`, and `inner_stroke` in the JSON to automatically re-render the standard hexagon logo.
- **New Logo Files:** Place new SVG or PNG files in `style_work/assets/` and reference them via `svg_path`.

## 4. Current Baselines
The file `style_work/themes.json` contains the current "official" specs for both Light and Dark modes.

## Running it

It needs "CORS" to work, otherwise the experiment html page will not be allowes to load the themes.json file. One way to test locally is with Python:

```bash
# be in the repo root folder
python3 -m http.server 8080
```

This should server the current folder as web server, with the styles_test being a subfolder.

Open browser at [http://localhost:8080/styles_test/experiment_template.html?id=current-light](http://localhost:8080/styles_test/experiment_template.html?id=current-light)

