export const standaloneStyles = `
  :root {
    color-scheme: light;
    font-family: "Avenir Next", "Trebuchet MS", sans-serif;
    color: #15231e;
    background:
      radial-gradient(circle at top left, rgba(133, 163, 144, 0.22), transparent 28%),
      radial-gradient(circle at bottom right, rgba(203, 180, 141, 0.18), transparent 32%),
      linear-gradient(180deg, #f4efe6 0%, #fcfaf5 100%);
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
  }

  .sf-page {
    max-width: 1320px;
    margin: 0 auto;
    padding: 32px 22px 56px;
    display: grid;
    gap: 24px;
  }

  .sf-hero {
    display: grid;
    gap: 12px;
  }

  .sf-eyebrow {
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #5e756b;
    font-weight: 700;
  }

  .sf-title {
    margin: 0;
    font-size: clamp(36px, 6vw, 64px);
    line-height: 0.94;
    max-width: 820px;
  }

  .sf-lede {
    max-width: 820px;
    color: #456055;
    line-height: 1.6;
    font-size: 16px;
  }

  .sf-shell {
    display: grid;
    grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
    gap: 20px;
    align-items: start;
  }

  .sf-panel {
    background: rgba(255, 252, 247, 0.9);
    border: 1px solid rgba(21, 35, 30, 0.08);
    border-radius: 28px;
    box-shadow: 0 20px 54px rgba(23, 42, 33, 0.08);
    overflow: hidden;
  }

  .sf-panel-head {
    padding: 18px 20px;
    background:
      radial-gradient(circle at top left, rgba(151, 186, 165, 0.34), transparent 45%),
      linear-gradient(135deg, #18392c 0%, #2d5d49 100%);
    color: #fcfaf5;
  }

  .sf-panel-title {
    margin: 6px 0 0;
    font-size: 20px;
    line-height: 1.15;
    font-weight: 700;
  }

  .sf-panel-body {
    padding: 18px 20px 20px;
    display: grid;
    gap: 16px;
  }

  .sf-section {
    display: grid;
    gap: 10px;
  }

  .sf-section-label {
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #61776c;
    font-weight: 700;
  }

  .sf-field-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .sf-field-grid.wide {
    grid-template-columns: 1fr;
  }

  label {
    display: grid;
    gap: 6px;
    font-size: 13px;
    color: #274036;
  }

  input,
  textarea,
  select {
    width: 100%;
    border: 1px solid rgba(21, 35, 30, 0.14);
    border-radius: 16px;
    padding: 11px 13px;
    background: #fffdf9;
    color: inherit;
  }

  textarea {
    min-height: 92px;
    resize: vertical;
  }

  .sf-file-input {
    padding: 10px;
    background: #fffaf3;
  }

  .sf-preview-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .sf-preview {
    border-radius: 18px;
    overflow: hidden;
    min-height: 180px;
    background:
      linear-gradient(145deg, rgba(239, 232, 218, 0.82), rgba(246, 241, 231, 0.96));
    border: 1px solid rgba(21, 35, 30, 0.08);
    display: grid;
    place-items: center;
    color: #6d7e74;
    font-size: 12px;
    line-height: 1.5;
    text-align: center;
    padding: 16px;
  }

  .sf-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .sf-button-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .sf-button {
    border: 0;
    border-radius: 999px;
    padding: 12px 16px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 700;
  }

  .sf-button.primary {
    background: #173c2d;
    color: #fcfaf5;
  }

  .sf-button.secondary {
    background: #edf1eb;
    color: #214635;
  }

  .sf-status {
    min-height: 20px;
    color: #486257;
    font-size: 13px;
  }

  .sf-result-shell {
    display: grid;
    gap: 18px;
  }

  .sf-note {
    padding: 14px 16px;
    border-radius: 18px;
    background: rgba(239, 230, 214, 0.72);
    color: #4e5f57;
    line-height: 1.55;
    font-size: 13px;
  }

  .sf-pill-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .sf-pill {
    display: inline-flex;
    align-items: center;
    padding: 7px 10px;
    border-radius: 999px;
    background: #edf2ee;
    color: #224837;
    font-size: 12px;
    font-weight: 700;
  }

  .sf-pill.subtle {
    background: #f3eee4;
    color: #70543b;
  }

  .sf-metric-strip {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 10px;
  }

  .sf-metric {
    padding: 14px 12px;
    border-radius: 18px;
    background: rgba(236, 241, 237, 0.92);
    display: grid;
    gap: 6px;
  }

  .sf-metric span {
    font-size: 12px;
    color: #5a7065;
  }

  .sf-metric strong {
    font-size: 18px;
    color: #173c2d;
  }

  .sf-family-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .sf-family-card {
    background: rgba(255, 253, 249, 0.96);
    border: 1px solid rgba(21, 35, 30, 0.08);
    border-radius: 24px;
    padding: 16px;
    display: grid;
    gap: 12px;
  }

  .sf-family-title {
    font-size: 15px;
    font-weight: 700;
    color: #18382c;
  }

  .sf-band {
    display: grid;
    gap: 8px;
  }

  .sf-band-label {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #5d7368;
    font-weight: 700;
  }

  .sf-list {
    margin: 0;
    padding-left: 18px;
    display: grid;
    gap: 6px;
    line-height: 1.5;
    color: #304b40;
    font-size: 14px;
  }

  .sf-inline-links {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .sf-inline-links a {
    color: #214635;
    font-weight: 700;
    text-decoration: none;
  }

  @media (max-width: 1040px) {
    .sf-shell {
      grid-template-columns: 1fr;
    }

    .sf-metric-strip {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .sf-page {
      padding: 24px 16px 42px;
    }

    .sf-field-grid,
    .sf-preview-grid,
    .sf-family-grid,
    .sf-metric-strip {
      grid-template-columns: 1fr;
    }
  }
`
