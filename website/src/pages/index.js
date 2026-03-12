import React from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import HomepageFeatures from "@site/src/components/HomepageFeatures";

import styles from "./index.module.css";

function HeroBanner() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--igeo7", styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroLogo}>
          <img
            src="/images/igeo7-logo.svg"
            alt="IGEO7 hexagon logo"
            width={96}
            height={96}
          />
        </div>
        <h1 className="hero__title">IGEO7 — The Equal-Area Hexagonal Grid</h1>
        <p className="hero__subtitle">
          A hierarchically indexed hexagonal DGGS with truly equal-area cells,
          powered by the Z7 indexing system. The equal-area alternative to H3.
        </p>

        <div className={styles.badges}>
          <span className={styles.badge}>Pure aperture 7</span>
          <span className={styles.badge}>21 resolution levels</span>
          <span className={styles.badge}>ISEA equal-area projection</span>
          <span className={styles.badge}>64-bit Z7 indexes</span>
        </div>

        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/intro"
          >
            Get Started
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/docs/reference/restable"
          >
            Resolution Table
          </Link>
          <Link
            className="button button--outline button--lg"
            to="/docs/comparisons/h3"
          >
            IGEO7 vs H3
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title="Equal-Area Hexagonal DGGS"
      description="IGEO7 is a hierarchically indexed hexagonal equal-area Discrete Global Grid System using the Z7 indexing system — the equal-area alternative to H3."
    >
      <HeroBanner />
      <main>
        <HomepageFeatures />
        <section className={styles.statsSection}>
          <div className="container">
            <div className="row">
              <div className="col col--12 text--center">
                <h2>Key Numbers</h2>
              </div>
            </div>
            <div className={clsx("row", styles.statsRow)}>
              <div className={clsx("col col--3", styles.statCard)}>
                <div className={styles.statValue}>21</div>
                <div className={styles.statLabel}>Resolution levels (0–20)</div>
              </div>
              <div className={clsx("col col--3", styles.statCard)}>
                <div className={styles.statValue}>12</div>
                <div className={styles.statLabel}>Base cells (pentagons)</div>
              </div>
              <div className={clsx("col col--3", styles.statCard)}>
                <div className={styles.statValue}>7</div>
                <div className={styles.statLabel}>Children per parent cell</div>
              </div>
              <div className={clsx("col col--3", styles.statCard)}>
                <div className={styles.statValue}>64-bit</div>
                <div className={styles.statLabel}>Z7 integer index size</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
