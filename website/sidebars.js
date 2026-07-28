// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    {
      type: "category",
      label: "Getting Started",
      collapsed: false,
      items: [
        { type: "doc", id: "intro", label: "Introduction" },
        { type: "doc", id: "installation", label: "Installation" },
        { type: "doc", id: "quickstart", label: "Quickstart" },
      ],
    },
    {
      type: "category",
      label: "Highlights",
      items: [
        { type: "doc", id: "highlights/equal-area", label: "Equal Area" },
        { type: "doc", id: "highlights/indexing", label: "Z7 Indexing" },
        { type: "doc", id: "highlights/aggregation", label: "Aggregation" },
        { type: "doc", id: "highlights/use-cases", label: "Use Cases" },
      ],
    },
    {
      type: "category",
      label: "Concepts & Guides",
      items: [
        { type: "doc", id: "concepts/dggs-fundamentals", label: "DGGS Fundamentals" },
        { type: "doc", id: "concepts/icosahedron", label: "The Icosahedron" },
        { type: "doc", id: "concepts/isea-projection", label: "ISEA Projection" },
        { type: "doc", id: "concepts/aperture7", label: "Aperture 7 Hierarchy" },
        { type: "doc", id: "concepts/z7-indexing", label: "Z7 Indexing" },
        { type: "doc", id: "concepts/resolutions", label: "Resolutions" },
        { type: "doc", id: "concepts/pentagons", label: "Pentagons" },
      ],
    },
    {
      type: "category",
      label: "API Reference",
      items: [
        { type: "doc", id: "api/overview", label: "Overview" },
        { type: "doc", id: "api/indexing", label: "Indexing" },
        { type: "doc", id: "api/inspection", label: "Inspection" },
        { type: "doc", id: "api/traversal", label: "Traversal" },
        { type: "doc", id: "api/hierarchy", label: "Hierarchy" },
        { type: "doc", id: "api/regions", label: "Regions" },
        { type: "doc", id: "api/misc", label: "Miscellaneous" },
      ],
    },
    {
      type: "category",
      label: "Reference",
      items: [
        { type: "doc", id: "reference/restable", label: "Resolution Table" },
        { type: "doc", id: "reference/z7-bit-layout", label: "Z7 Bit Layout" },
        { type: "doc", id: "reference/z7-string-format", label: "Z7 String Format" },
      ],
    },
    {
      type: "category",
      label: "Comparisons",
      items: [
        { type: "doc", id: "comparisons/h3", label: "IGEO7 vs H3" },
        { type: "doc", id: "comparisons/s2", label: "IGEO7 vs S2" },
        { type: "doc", id: "comparisons/other-dggs", label: "Other DGGS" },
      ],
    },
    {
      type: "category",
      label: "Ecosystem",
      items: [
        { type: "doc", id: "ecosystem/dggrid", label: "DGGRID" },
        { type: "doc", id: "ecosystem/dggrid4py", label: "dggrid4py" },
        { type: "doc", id: "ecosystem/pydggsapi", label: "pydggsapi" },
        { type: "doc", id: "ecosystem/xarray-xdggs", label: "Xarray-XDGGS" },
        { type: "doc", id: "ecosystem/ogc-api-dggs", label: "OGC API DGGS" },
        { type: "doc", id: "ecosystem/explorer", label: "Interactive Explorer" },
        { type: "doc", id: "ecosystem/explorer-verification", label: "Explorer Verification" },
      ],
    },
    {
      type: "category",
      label: "Community",
      items: [
        { type: "doc", id: "community/publications", label: "Publications" },
        { type: "doc", id: "community/contributing", label: "Contributing" },
        { type: "doc", id: "community/faq", label: "FAQ" },
      ],
    },
  ],
};

export default sidebars;
