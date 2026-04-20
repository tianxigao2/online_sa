export const optionsStyles = `
  :root {
    color-scheme: light;
    font-family: "Avenir Next", "Trebuchet MS", sans-serif;
    color: #12231d;
    background:
      radial-gradient(circle at top left, rgba(129, 165, 140, 0.22), transparent 28%),
      linear-gradient(180deg, #f7f3eb 0%, #fffdf9 100%);
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-height: 100vh;
    background:
      radial-gradient(circle at top left, rgba(129, 165, 140, 0.22), transparent 28%),
      linear-gradient(180deg, #f7f3eb 0%, #fffdf9 100%);
  }

  .page {
    max-width: 1180px;
    margin: 0 auto;
    padding: 40px 24px 64px;
  }

  .hero {
    display: grid;
    gap: 14px;
    margin-bottom: 28px;
  }

  .eyebrow {
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #4e685d;
    font-weight: 700;
  }

  h1 {
    margin: 0;
    font-size: clamp(32px, 4vw, 52px);
    line-height: 0.98;
    max-width: 860px;
  }

  .lede {
    max-width: 820px;
    line-height: 1.55;
    color: #40574d;
    font-size: 16px;
  }

  .hero-callout {
    display: grid;
    gap: 6px;
    max-width: 680px;
    padding: 14px 16px;
    border-radius: 18px;
    background: rgba(255, 252, 246, 0.82);
    border: 1px solid rgba(18, 35, 29, 0.08);
    color: #294338;
  }

  .hero-callout span {
    color: #557065;
    font-size: 14px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 18px;
  }

  .card {
    background: rgba(255, 252, 246, 0.92);
    border: 1px solid rgba(18, 35, 29, 0.08);
    border-radius: 24px;
    padding: 22px;
    box-shadow: 0 18px 45px rgba(28, 50, 41, 0.08);
    display: grid;
    gap: 16px;
    align-content: start;
  }

  .card-wide {
    grid-column: 1 / -1;
  }

  .section-title {
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #5a7065;
    font-weight: 700;
  }

  .section-subtitle {
    font-size: 14px;
    font-weight: 700;
    color: #1f3b2f;
  }

  .card-copy {
    line-height: 1.55;
    color: #4f675d;
    font-size: 14px;
  }

  .card-divider {
    height: 1px;
    background: rgba(18, 35, 29, 0.08);
  }

  .field-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 14px;
  }

  .photo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }

  .photo-preview {
    min-height: 220px;
    border-radius: 18px;
    overflow: hidden;
    background: rgba(237, 241, 235, 0.9);
    border: 1px solid rgba(18, 35, 29, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #5f776d;
    font-size: 13px;
    text-align: center;
  }

  .photo-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .field-shell,
  .choice-group {
    display: grid;
    gap: 8px;
    font-size: 13px;
    color: #294338;
  }

  .field-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-size: 13px;
    color: #1f3b2f;
  }

  .field-hint {
    font-size: 12px;
    line-height: 1.45;
    color: #62786e;
  }

  .badge {
    flex-shrink: 0;
    border-radius: 999px;
    padding: 4px 9px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .badge.required {
    background: #173c2d;
    color: #fffdf9;
  }

  .badge.optional {
    background: #edf1eb;
    color: #355746;
  }

  input,
  textarea,
  select {
    width: 100%;
    border: 1px solid rgba(22, 42, 34, 0.14);
    border-radius: 16px;
    padding: 11px 13px;
    font: inherit;
    background: #fffdf9;
    color: inherit;
  }

  .file-input {
    padding: 10px 12px;
    background: #edf1eb;
  }

  input::placeholder,
  textarea::placeholder {
    color: #8b9c95;
  }

  textarea {
    min-height: 110px;
    resize: vertical;
  }

  .unit-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
  }

  .unit-copy {
    display: grid;
    gap: 6px;
    max-width: 460px;
  }

  .segment-control {
    display: inline-flex;
    gap: 4px;
    padding: 4px;
    border-radius: 999px;
    background: #edf1eb;
  }

  .segment-button {
    border: 0;
    border-radius: 999px;
    padding: 10px 14px;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    color: #355746;
    background: transparent;
    cursor: pointer;
  }

  .segment-button.active {
    background: #173c2d;
    color: #fffdf9;
  }

  .choice-layout {
    display: grid;
    gap: 16px;
  }

  .profile-chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .profile-chip {
    border: 1px solid rgba(23, 60, 45, 0.16);
    border-radius: 999px;
    padding: 9px 14px;
    background: #fffdf9;
    color: #214635;
  }

  .profile-chip.active {
    background: #173c2d;
    color: #fffdf9;
    border-color: #173c2d;
  }

  .choice-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .choice-pill {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid rgba(23, 60, 45, 0.16);
    background: #fffdf9;
    color: #214635;
    cursor: pointer;
    transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
  }

  .choice-pill input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .choice-pill.active {
    background: #173c2d;
    border-color: #173c2d;
    color: #fffdf9;
  }

  .button-row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  button {
    border: 0;
    border-radius: 999px;
    padding: 12px 18px;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }

  .primary {
    background: #173c2d;
    color: #fffdf9;
  }

  .secondary {
    background: #edf1eb;
    color: #214635;
  }

  .danger {
    background: #f6e6e2;
    color: #7f2e1e;
  }

  .link-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
  }

  .status {
    min-height: 20px;
    color: #446454;
    font-size: 13px;
    line-height: 1.45;
  }

  .analysis-note {
    padding: 12px 14px;
    border-radius: 16px;
    background: rgba(237, 241, 235, 0.9);
    color: #264539;
    font-size: 13px;
    line-height: 1.5;
  }

  .analysis-note.subtle {
    background: rgba(255, 252, 246, 0.72);
    border: 1px dashed rgba(18, 35, 29, 0.14);
    color: #60796e;
  }

  .advice-list {
    margin: 0;
    padding-left: 18px;
    display: grid;
    gap: 8px;
    color: #2c473c;
    line-height: 1.55;
  }

  .advice-list.compact {
    gap: 6px;
    font-size: 14px;
  }

  .advice-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 14px;
  }

  .advice-family {
    display: grid;
    gap: 12px;
    padding: 16px;
    border-radius: 20px;
    background: rgba(255, 253, 249, 0.94);
    border: 1px solid rgba(18, 35, 29, 0.08);
  }

  .advice-band {
    display: grid;
    gap: 8px;
  }

  .advice-band-label {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #5d7368;
    font-weight: 700;
  }

  .advice-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 36px;
    padding: 0 12px;
    border-radius: 999px;
    background: #173c2d;
    color: #fffdf9;
    font-size: 12px;
    font-weight: 700;
  }

  .advice-pill.subtle {
    background: #edf1eb;
    color: #214635;
  }

  .rule-list {
    display: grid;
    gap: 12px;
  }

  .rule-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px;
    border-radius: 18px;
    background: rgba(237, 241, 235, 0.9);
  }

  .rule-copy {
    display: grid;
    gap: 4px;
    font-size: 13px;
    color: #294338;
  }

  .rule-copy span {
    color: #5c7066;
  }

  @media (max-width: 720px) {
    .page {
      padding: 28px 16px 44px;
    }

    .card {
      padding: 18px;
      border-radius: 20px;
    }

    .field-grid {
      grid-template-columns: 1fr;
    }
  }
`
