import React from "react";
import Layout from "@theme/Layout";
import BrowserOnly from "@docusaurus/BrowserOnly";

// The explorer depends on WebAssembly + WebGL (webdggrid + MapLibre), so it must
// mount client-side only — never during Docusaurus server-side rendering.
export default function Explore() {
  return (
    <Layout
      title="Explore"
      description="Interactive IGEO7 / Z7 explorer — click the map to resolve cells, look them up by index, and walk the hierarchy."
      noFooter
    >
      <BrowserOnly fallback={<div style={{ padding: "2rem" }}>Loading explorer…</div>}>
        {() => {
          const Z7Explorer = require("@site/src/components/Z7Explorer").default;
          return <Z7Explorer />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
