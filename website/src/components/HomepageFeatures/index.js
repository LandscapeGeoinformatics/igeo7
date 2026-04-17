import React from "react";
import clsx from "clsx";
import styles from "./styles.module.css";

const FeatureList = [
  {
    title: "Truly Equal Area",
    icon: "⬡",
    description: (
      <>
        Every cell has the same area at each resolution, based on the ISEA
        (Icosahedral Snyder Equal Area) projection. No ±50% distortions like in
        H3, S2, GeoHash, or Mercator-based systems.
      </>
    ),
  },
  {
    title: "Z7 Hierarchical Indexing",
    icon: "🔢",
    description: (
      <>
        A single 64-bit integer encodes resolution, base cell, and full
        hierarchical path. Parent-child relationships are simple bit operations.
        Compatible with H3-style workflows.
      </>
    ),
  },
  {
    title: "21 Resolution Levels",
    icon: "🌍",
    description: (
      <>
        From continental scale (~8,200 km cell diameter) at resolution 0, down
        to centimetre precision (~2.9 cm) at resolution 20. Five more levels
        than H3.
      </>
    ),
  },
];

function Feature({ title, icon, description }) {
  return (
    <div className={clsx("col col--4")}>
      <div className="text--center">
        <div className={styles.featureIconBg}>
          <span className={styles.featureIcon}>{icon}</span>
        </div>
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
