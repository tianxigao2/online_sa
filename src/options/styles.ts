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
  }

  .page {
    max-width: 1080px;
    margin: 0 auto;
    padding: 40px 24px 64px;
  }

  .hero {
    display: grid;
    gap: 12px;
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
    max-width: 720px;
  }

  .lede {
    max-width: 700px;
    line-height: 1.55;
    color: #40574d;
    font-size: 16px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 18px;
  }

  .card {
    background: rgba(255, 252, 246, 0.9);
    border: 1px solid rgba(18, 35, 29, 0.08);
    border-radius: 24px;
    padding: 20px;
    box-shadow: 0 18px 45px rgba(28, 50, 41, 0.08);
    display: grid;
    gap: 14px;
  }

  .section-title {
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #5a7065;
    font-weight: 700;
  }

  .field-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
  }

  label {
    display: grid;
    gap: 6px;
    font-size: 13px;
    color: #294338;
  }

  input, textarea, select {
    width: 100%;
    border: 1px solid rgba(22, 42, 34, 0.14);
    border-radius: 16px;
    padding: 11px 13px;
    font: inherit;
    background: #fffdf9;
    color: inherit;
  }

  textarea {
    min-height: 110px;
    resize: vertical;
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
`
