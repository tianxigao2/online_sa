export const panelStyles = `
  :host {
    all: initial;
  }

  .lfs-root {
    font-family: "Avenir Next", "Trebuchet MS", sans-serif;
    color: #13251f;
    position: fixed;
    width: 340px;
    max-width: min(340px, calc(100vw - 24px));
    max-height: calc(100vh - 120px);
    z-index: 2147483647;
  }

  .lfs-root.collapsed {
    width: auto;
    max-width: calc(100vw - 24px);
    max-height: none;
  }

  .lfs-root.debug {
    width: auto;
    max-width: min(420px, calc(100vw - 24px));
  }

  .lfs-card {
    background: linear-gradient(180deg, #f6f1e8 0%, #fdfbf7 100%);
    border: 1px solid rgba(26, 60, 45, 0.12);
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(26, 60, 45, 0.12);
    overflow: hidden;
    max-height: inherit;
    display: flex;
    flex-direction: column;
  }

  .lfs-card.debug {
    border-radius: 999px;
  }

  .lfs-card-collapsed {
    overflow: visible;
    border-radius: 999px;
  }

  .lfs-header {
    padding: 18px 18px 14px;
    background:
      radial-gradient(circle at top left, rgba(132, 169, 140, 0.35), transparent 45%),
      linear-gradient(135deg, #173c2d 0%, #285b49 100%);
    color: #fdfbf7;
    flex: 0 0 auto;
  }

  .lfs-header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .lfs-kicker {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.86;
  }

  .lfs-panel-controls {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .lfs-control-button {
    border: 1px solid rgba(19, 37, 31, 0.12);
    border-radius: 999px;
    padding: 7px 10px;
    background: rgba(253, 251, 247, 0.15);
    color: inherit;
    font: inherit;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }

  .lfs-control-button-compact {
    padding: 8px 10px;
    background: transparent;
    color: #5d7268;
  }

  .lfs-header .lfs-control-button-compact {
    background: transparent;
    color: #fdfbf7;
  }

  .lfs-header .lfs-control-button {
    border-color: rgba(253, 251, 247, 0.24);
    background: rgba(253, 251, 247, 0.12);
    color: #fdfbf7;
  }

  .lfs-title {
    margin-top: 8px;
    font-size: 20px;
    line-height: 1.2;
    font-weight: 700;
  }

  .lfs-profile-switcher {
    margin-top: 12px;
    display: grid;
    gap: 6px;
  }

  .lfs-profile-label {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.82;
  }

  .lfs-profile-select {
    width: 100%;
    border: 1px solid rgba(253, 251, 247, 0.24);
    border-radius: 12px;
    padding: 9px 11px;
    font: inherit;
    font-size: 12px;
    background: rgba(253, 251, 247, 0.14);
    color: #fdfbf7;
  }

  .lfs-profile-select option {
    color: #13251f;
  }

  .lfs-body {
    padding: 16px 18px 18px;
    display: grid;
    gap: 14px;
    overflow-y: auto;
    overscroll-behavior: contain;
    min-height: 0;
  }

  .lfs-pill-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .lfs-pill {
    display: inline-flex;
    align-items: center;
    padding: 7px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    background: #edf2ee;
    color: #214635;
  }

  .lfs-pill-button {
    border: 0;
    cursor: pointer;
    font: inherit;
  }

  .lfs-pill.subtle {
    background: #f3efe6;
    color: #69533b;
  }

  .lfs-pill.score {
    background: #dcebe3;
    color: #173c2d;
  }

  .lfs-pill.narrative {
    align-items: flex-start;
    white-space: normal;
    line-height: 1.35;
    border-radius: 16px;
    padding: 9px 12px;
  }

  .lfs-pill.level-strong { background: #d6eddf; color: #195637; }
  .lfs-pill.level-try { background: #f1ead6; color: #7a5a11; }
  .lfs-pill.level-cautious { background: #f3e5d8; color: #8b4f22; }
  .lfs-pill.level-avoid { background: #f4dcda; color: #8a2c2a; }
  .lfs-pill.level-needs_data { background: #dbe9f4; color: #235475; }

  .lfs-section {
    display: grid;
    gap: 8px;
  }

  .lfs-detail-card {
    padding: 12px 14px;
    border-radius: 16px;
    background: rgba(237, 242, 238, 0.72);
  }

  .lfs-label {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #5d7268;
    font-weight: 700;
  }

  .lfs-list {
    margin: 0;
    padding-left: 18px;
    display: grid;
    gap: 6px;
    font-size: 13px;
    line-height: 1.45;
  }

  .lfs-text {
    font-size: 13px;
    line-height: 1.5;
    color: #304a3e;
  }

  .lfs-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .lfs-button {
    border: 0;
    border-radius: 999px;
    padding: 10px 14px;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 120ms ease, opacity 120ms ease;
  }

  .lfs-button:hover {
    transform: translateY(-1px);
  }

  .lfs-button.primary {
    background: #173c2d;
    color: #fdfbf7;
  }

  .lfs-button.secondary {
    background: #ebefe7;
    color: #234635;
  }

  .lfs-meta {
    display: grid;
    gap: 6px;
    font-size: 12px;
    color: #52665d;
  }

  .lfs-confidence-wrap {
    position: relative;
    display: inline-flex;
  }

  .lfs-hover-card {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 2;
    width: 240px;
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(19, 37, 31, 0.96);
    color: #fdfbf7;
    box-shadow: 0 18px 38px rgba(19, 37, 31, 0.2);
    font-size: 11px;
    line-height: 1.45;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-4px);
    transition: opacity 120ms ease, transform 120ms ease;
  }

  .lfs-confidence-wrap:hover .lfs-hover-card,
  .lfs-confidence-wrap:focus-within .lfs-hover-card {
    opacity: 1;
    transform: translateY(0);
  }

  .lfs-hover-title {
    margin-bottom: 6px;
    font-weight: 700;
  }

  .lfs-hover-note {
    margin-top: 6px;
    color: rgba(253, 251, 247, 0.78);
  }

  .lfs-metric-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .lfs-metric {
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(237, 242, 238, 0.9);
    color: #29493b;
    font-size: 12px;
  }

  .lfs-metric strong {
    font-size: 15px;
    color: #173c2d;
  }

  .lfs-note {
    padding: 12px 14px;
    border-radius: 14px;
    background: rgba(239, 230, 214, 0.7);
    font-size: 12px;
    line-height: 1.45;
  }

  .lfs-note-warning {
    background: rgba(244, 220, 218, 0.82);
    color: #6e2b28;
  }

  .lfs-collapsed-row {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
  }

  .lfs-collapsed-score {
    border: 0;
    border-radius: 999px;
    padding: 10px 14px;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    color: #173c2d;
    background: #dcebe3;
  }

  .lfs-collapsed-score.level-strong { background: #d6eddf; color: #195637; }
  .lfs-collapsed-score.level-try { background: #f1ead6; color: #7a5a11; }
  .lfs-collapsed-score.level-cautious { background: #f3e5d8; color: #8b4f22; }
  .lfs-collapsed-score.level-avoid { background: #f4dcda; color: #8a2c2a; }
  .lfs-collapsed-score.level-needs_data { background: #dbe9f4; color: #235475; }

  .lfs-inline-action {
    border: 0;
    padding: 0;
    background: transparent;
    color: #173c2d;
    font: inherit;
    font-weight: 700;
    text-decoration: underline;
    cursor: pointer;
  }

  .lfs-debug-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    font-size: 12px;
    color: #294338;
  }

  .lfs-debug-row .lfs-panel-controls {
    margin-left: auto;
  }

  .lfs-debug-profile-row {
    margin-top: 10px;
  }

  .lfs-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: #2d7254;
    box-shadow: 0 0 0 6px rgba(45, 114, 84, 0.12);
    flex: 0 0 auto;
  }

  .lfs-chip-card {
    border-radius: 18px;
  }

  .lfs-collection-summary {
    display: grid;
    gap: 10px;
    padding: 14px 16px 16px;
    overflow-y: auto;
    overscroll-behavior: contain;
    min-height: 0;
  }

  .lfs-collection-list {
    margin: 0;
    padding-left: 22px;
    display: grid;
    gap: 10px;
    font-size: 12px;
    line-height: 1.45;
    color: #304a3e;
  }

  .lfs-collection-item {
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(237, 242, 238, 0.68);
  }

  .lfs-collection-item-top {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .lfs-collection-rank {
    font-size: 12px;
    font-weight: 700;
    color: #5d7268;
  }

  .lfs-collection-title {
    color: #173c2d;
  }

  .lfs-inline-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    padding: 6px 9px;
    border-radius: 999px;
    font-family: "Avenir Next", "Trebuchet MS", sans-serif;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.02em;
    color: #173c2d;
    background: #edf2ee;
    border: 1px solid rgba(23, 60, 45, 0.1);
    box-shadow: 0 8px 18px rgba(23, 60, 45, 0.08);
  }

  .lfs-inline-badge[data-level="strong"] {
    background: #d6eddf;
    color: #195637;
  }

  .lfs-inline-badge[data-level="try"] {
    background: #f1ead6;
    color: #7a5a11;
  }

  .lfs-inline-badge[data-level="cautious"] {
    background: #f3e5d8;
    color: #8b4f22;
  }

  .lfs-inline-badge[data-level="avoid"] {
    background: #f4dcda;
    color: #8a2c2a;
  }

  .lfs-inline-target {
    position: relative;
  }

  @media (max-width: 768px) {
    .lfs-root {
      top: auto;
      right: 12px;
      bottom: 12px;
      width: min(340px, calc(100vw - 24px));
      max-height: calc(100vh - 24px);
    }
  }
`
