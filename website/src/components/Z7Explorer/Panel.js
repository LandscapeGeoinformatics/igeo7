import React from "react";
import styles from "./styles.module.css";
import { MAX_RES } from "./geometry.mjs";

// The docked sidebar from proposal/mockup.html. Presentational only: every
// piece of state and every handler is owned by index.js, so this file can be
// read and changed without knowing how the engine works.

function Row({ k, v, accent }) {
  return (
    <div className={styles.prow}>
      <span className={styles.pk}>{k}</span>
      <span className={accent ? `${styles.pv} ${styles.pvAccent}` : styles.pv}>{v}</span>
    </div>
  );
}

export default function Panel({
  res,
  onRes,
  latInput,
  lonInput,
  setLatInput,
  setLonInput,
  onLocate,
  idInput,
  setIdInput,
  onGoId,
  idBad,
  cell,
  kidsShown,
  ringShown,
  onParent,
  onToggleKids,
  onToggleRing,
}) {
  return (
    <aside className={styles.panel} aria-label="Explorer controls">
      <div className={styles.section}>
        <div className={styles.label}>Resolution</div>
        <div className={styles.resRow}>
          <span className={styles.resNum}>{res}</span>
          <div className={styles.resTrack}>
            <input
              type="range"
              min={0}
              max={MAX_RES}
              value={res}
              onChange={(e) => onRes(Number(e.target.value))}
              aria-label="resolution"
            />
            <div className={styles.ticks}>
              <span>0</span><span>2</span><span>4</span><span>6</span><span>8</span><span>10</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.label}>Z7 Index Lookup</div>
        <div className={styles.row}>
          <input
            className={idBad ? `${styles.in} ${styles.bad}` : styles.in}
            value={idInput}
            onChange={(e) => setIdInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onGoId()}
            placeholder="e.g. 0064156"
            aria-label="Z7 index"
          />
          <button className={styles.btn} onClick={onGoId}>Find</button>
        </div>
        <div className={styles.hint}>Z7 text ID or 16-digit hex (0x…)</div>
      </div>

      <div className={styles.section}>
        <div className={styles.label}>Selected Cell</div>
        {cell ? (
          <div className={styles.card}>
            <div className={styles.cardHeader}>⬢ Cell at Resolution {cell.res}</div>
            <div>
              <Row k="Z7 text ID" v={cell.id} accent />
              <Row k="Hex (64-bit)" v={cell.hex} />
              <Row k="Centroid lat" v={cell.latLabel} />
              <Row k="Centroid lon" v={cell.lonLabel} />
              <Row k="Area" v={cell.area} />
              <Row k="Topology" v={cell.type} />
              <Row k="Neighbours" v={cell.nbr} />
            </div>
          </div>
        ) : (
          <div className={styles.empty}>Click the map, or look up an index.</div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.label}>Hierarchy</div>
        <div className={styles.btnCol}>
          <button
            className={styles.btnWide}
            onClick={onParent}
            disabled={!cell || cell.res <= 0}
          >
            ⬆ Go to Parent Cell
            <span className={styles.btnSub}>{cell && cell.res > 0 ? `res ${cell.res - 1}` : "—"}</span>
          </button>
          <button
            className={styles.btnWide}
            onClick={onToggleKids}
            disabled={!cell || cell.kids === 0}
            data-on={kidsShown ? "true" : "false"}
          >
            ⬇ {kidsShown ? "Hide" : "Show"} {cell ? cell.kids : 7} Children
            <span className={styles.btnSub}>{cell && cell.kids ? `res ${cell.res + 1}` : "—"}</span>
          </button>
          <button
            className={styles.btnWide}
            onClick={onToggleRing}
            disabled={!cell}
            data-on={ringShown ? "true" : "false"}
          >
            ▦ K-ring neighbours
            <span className={styles.btnSub}>{ringShown ? "k = 1" : "off"}</span>
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.label}>Jump to coordinates</div>
        <div className={styles.row}>
          <input
            className={styles.in}
            value={latInput}
            onChange={(e) => setLatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onLocate()}
            placeholder="Lat"
            aria-label="latitude"
          />
          <input
            className={styles.in}
            value={lonInput}
            onChange={(e) => setLonInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onLocate()}
            placeholder="Lon"
            aria-label="longitude"
          />
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onLocate}>
          ▶ Locate
        </button>
      </div>
    </aside>
  );
}
