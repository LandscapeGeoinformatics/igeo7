// @ts-check
import { themes as prismThemes } from "prism-react-renderer";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "IGEO7",
  tagline: "Equal-area hexagonal discrete global grid system",
  favicon: "images/favicon.ico",

  url: "https://igeo7.org",
  baseUrl: "/",

  organizationName: "LandscapeGeoinformatics",
  projectName: "igeo7",
  trailingSlash: false,

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  markdown: {
    mermaid: true,
  },

  themes: ["@docusaurus/theme-mermaid"],

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: "./sidebars.js",
          editUrl:
            "https://github.com/LandscapeGeoinformatics/igeo7/edit/main/website/",
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      }),
    ],
  ],

  stylesheets: [
    {
      href: "https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css",
      type: "text/css",
      integrity:
        "sha384-Xi8rHCmBmhbuyyhbI88391ZKP2dmfnOl4rT9ZfRI7mLTdk1wblIUnrIq35nqwEvC",
      crossorigin: "anonymous",
    },
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: "images/social-card.png",

      colorMode: {
        defaultMode: "light",
        disableSwitch: false,
        respectPrefersColorScheme: false,
      },

      navbar: {
        title: "IGEO7",
        logo: {
          alt: "IGEO7 Logo",
          src: "images/igeo7-logo.svg",
          srcDark: "images/igeo7-logo-dark.svg",
        },
        items: [
          {
            type: "docSidebar",
            sidebarId: "docsSidebar",
            position: "left",
            label: "About",
          },
          {
            to: "/docs/api/overview",
            label: "API Reference",
            position: "left",
          },
          {
            to: "/docs/ecosystem/dggrid",
            label: "Ecosystem",
            position: "left",
          },
          {
            to: "/docs/reference/restable",
            label: "Resolutions",
            position: "left",
          },
          {
            href: "https://github.com/LandscapeGeoinformatics/igeo7",
            label: "GitHub",
            position: "right",
          },
        ],
      },

      footer: {
        style: "dark",
        links: [
          {
            title: "Docs",
            items: [
              { label: "Introduction", to: "/docs/intro" },
              { label: "Quickstart", to: "/docs/quickstart" },
              { label: "Resolution Table", to: "/docs/reference/restable" },
              { label: "Z7 Indexing", to: "/docs/concepts/z7-indexing" },
            ],
          },
          {
            title: "Ecosystem",
            items: [
              {
                label: "DGGRID",
                href: "https://github.com/sahrk/DGGRID",
              },
              {
                label: "dggrid4py",
                href: "https://github.com/allixender/dggrid4py",
              },
              {
                label: "pydggsapi",
                href: "https://github.com/LandscapeGeoinformatics/pydggsapi",
              },
              {
                label: "DGGAL",
                href: "https://dggal.org",
              },
              {
                label: "GeoPlegma",
                href: "https://github.com/geoplegma/geoplegma",
              },
            ],
          },
          {
            title: "Research",
            items: [
              {
                label: "IGEO7 Paper (AGILE 2025)",
                href: "https://doi.org/10.5194/agile-giss-6-32-2025",
              },
              {
                label: "Landscape Geoinformatics Lab",
                href: "https://landscape-geoinformatics.ut.ee/",
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Landscape Geoinformatics Lab, University of Tartu, Estonia. Built with Docusaurus.`,
      },

      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ["python", "julia", "bash", "json"],
      },

      mermaid: {
        theme: { light: "neutral", dark: "dark" },
      },
    }),
};

export default config;
