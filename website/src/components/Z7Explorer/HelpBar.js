import React from "react";
import styles from "./styles.module.css";
import { ORIENTATION_LON } from "./igeo7-config.mjs";

// Help bar from proposal/mockup.html: the keyboard shortcuts, then library
// attribution and the IGEO7 config note. "+ / -" and the arrow keys are
// MapLibre's own bindings, so they are documented here but not implemented by
// us; the bracket/P/C/R bindings are ours (see useShortcuts in index.js).
const KEYS = [
  ["+ / −", "Zoom in/out"],
  ["← → ↑ ↓", "Pan map"],
  ["[ / ]", "Resolution"],
  ["P", "Parent"],
  ["C", "Children"],
  ["R", "K-ring"],
];

export default function HelpBar() {
  return (
    <div className={styles.helpBar}>
      <span className={styles.helpItem}>Click the map to select a cell</span>
      {KEYS.map(([k, what]) => (
        <span className={styles.helpItem} key={k}>
          <kbd className={styles.key}>{k}</kbd> {what}
        </span>
      ))}
      <span className={styles.attrib}>
        Powered by <strong>webDggrid</strong> (DGGRID WASM) &amp;{" "}
        <strong>MapLibre GL JS</strong> &mdash; IGEO7 config: vert₀ lon {ORIENTATION_LON}°,
        authalic on
      </span>
    </div>
  );
}
