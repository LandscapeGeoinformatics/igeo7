import React from "react";
import styles from "./styles.module.css";

// Header from proposal/mockup.html, minus its badge row. The badges restated
// the grid configuration, but the statement of work puts that note in the help
// bar ("Help bar (bottom): keyboard shortcuts, library attribution, IGEO7
// config note"), and HelpBar.js carries it there -- reading it from the config
// itself, so it cannot drift. Two copies of the same sentence was one too many,
// and the row cost vertical space the map wanted.
export default function PageHeader() {
  return (
    <header className={styles.header}>
      <h1>IGEO7 Interactive Explorer</h1>
      <p className={styles.headerText}>
        Visualise ISEA aperture-7 hexagonal cells, navigate the Z7 hierarchy, and convert
        between coordinates and cell indices.
      </p>
    </header>
  );
}
