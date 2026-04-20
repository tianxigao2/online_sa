import React from "react"
import type { RecommendationResult, StructuredProduct } from "../shared/types"

interface PanelProps {
  product?: StructuredProduct
  recommendation?: RecommendationResult
  unsupportedReason?: string
  statusMessage?: string
  collectionItems?: Array<{
    title: string
    level: RecommendationResult["level"]
    why: string
  }>
  actionMessage?: string
  onOpenSettings: () => void
  onIgnoreSimilar: () => void
  onUndoIgnore?: () => void
}

function levelLabel(level: RecommendationResult["level"]): string {
  switch (level) {
    case "strong":
      return "Strong Recommend"
    case "try":
      return "Worth Trying"
    case "cautious":
      return "Proceed Carefully"
    case "avoid":
      return "Not Recommended"
  }
}

function labelize(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (token) => token.toUpperCase())
}

export function ProductPanel({
  product,
  recommendation,
  unsupportedReason,
  statusMessage,
  collectionItems,
  actionMessage,
  onOpenSettings,
  onIgnoreSimilar,
  onUndoIgnore
}: PanelProps) {
  if (collectionItems?.length) {
    return (
      <div className="lfs-card lfs-chip-card">
        <div className="lfs-header">
          <div className="lfs-kicker">Lululemon Fit Signal</div>
          <div className="lfs-title">Collection View Highlights</div>
        </div>
        <div className="lfs-collection-summary">
          <div className="lfs-text">Highlighted cards on this listing page are the strongest current matches for your saved profile.</div>
          <ul className="lfs-collection-list">
            {collectionItems.slice(0, 4).map((item) => (
              <li key={`${item.title}-${item.level}`}>
                <strong>{item.title}</strong>: {levelLabel(item.level)}. {item.why}
              </li>
            ))}
          </ul>
          <div className="lfs-actions">
            <button className="lfs-button primary" onClick={onOpenSettings} type="button">
              Open Profile Settings
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (statusMessage) {
    return (
      <div className="lfs-card debug">
        <div className="lfs-debug-row">
          <span className="lfs-dot" />
          <span>{statusMessage}</span>
        </div>
      </div>
    )
  }

  if (unsupportedReason) {
    return (
      <div className="lfs-card">
        <div className="lfs-header">
          <div className="lfs-kicker">Version A Scope</div>
          <div className="lfs-title">Outside Apparel Coverage</div>
        </div>
        <div className="lfs-body">
          <div className="lfs-text">{unsupportedReason}</div>
          <div className="lfs-actions">
            <button className="lfs-button primary" onClick={onOpenSettings} type="button">
              Open Profile Settings
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!product || !recommendation) {
    return null
  }

  const sizeRecommendation = recommendation.sizeRecommendation

  return (
    <div className="lfs-card">
      <div className="lfs-header">
        <div className="lfs-kicker">Lululemon Fit Signal</div>
        <div className="lfs-title">{product.title}</div>
      </div>

      <div className="lfs-body">
        <div className="lfs-pill-row">
          <span className={`lfs-pill level-${recommendation.level}`}>{levelLabel(recommendation.level)}</span>
          <span className="lfs-pill">{product.category}</span>
          <span className="lfs-pill">Confidence {Math.round(recommendation.confidence * 100)}%</span>
          {sizeRecommendation?.recommendedSize ? (
            <span className="lfs-pill">Size {sizeRecommendation.recommendedSize}</span>
          ) : null}
        </div>

        <div className="lfs-section">
          <div className="lfs-label">Recommended Signals</div>
          <div className="lfs-pill-row">
            {recommendation.recommendedAttributes.length > 0 ? (
              recommendation.recommendedAttributes.map((attribute) => (
                <span className="lfs-pill" key={attribute}>
                  {labelize(attribute)}
                </span>
              ))
            ) : (
              <span className="lfs-text">The current profile does not produce strong attribute wins yet.</span>
            )}
          </div>
        </div>

        <div className="lfs-section">
          <div className="lfs-label">Worth Trying</div>
          <div className="lfs-pill-row">
            {recommendation.conditionalAttributes.length > 0 ? (
              recommendation.conditionalAttributes.map((attribute) => (
                <span className="lfs-pill" key={attribute}>
                  {labelize(attribute)}
                </span>
              ))
            ) : (
              <span className="lfs-text">No conditional attributes surfaced above the current threshold.</span>
            )}
          </div>
        </div>

        <div className="lfs-section">
          <div className="lfs-label">Core Reasons</div>
          <ul className="lfs-list">
            {recommendation.reasons.length > 0 ? (
              recommendation.reasons.map((reason) => <li key={reason}>{reason}</li>)
            ) : (
              <li>The parser found only limited preference and product signals.</li>
            )}
          </ul>
        </div>

        <div className="lfs-section">
          <div className="lfs-label">Lower Priority Signals</div>
          <div className="lfs-pill-row">
            {recommendation.lowPriorityAttributes.length > 0 ? (
              recommendation.lowPriorityAttributes.map((attribute) => (
                <span className="lfs-pill subtle" key={attribute}>
                  {labelize(attribute)}
                </span>
              ))
            ) : (
              <span className="lfs-text">No clear low-priority attribute conflicts were detected.</span>
            )}
          </div>
        </div>

        <div className="lfs-section">
          <div className="lfs-label">Fit Risks</div>
          <ul className="lfs-list">
            {recommendation.fitRisks.length > 0 ? (
              recommendation.fitRisks.map((risk) => (
                <li key={risk.type}>
                  <strong>{labelize(risk.type)}</strong> ({Math.round(risk.confidence * 100)}%): {risk.reason}
                </li>
              ))
            ) : (
              <li>No major fit-risk combinations surfaced from the current body-state and garment metadata.</li>
            )}
          </ul>
        </div>

        <div className="lfs-section">
          <div className="lfs-label">Risk Notes</div>
          <ul className="lfs-list">
            {recommendation.risks.length > 0 ? (
              recommendation.risks.map((risk) => <li key={risk}>{risk}</li>)
            ) : (
              <li>No major risks surfaced from the currently visible page data.</li>
            )}
          </ul>
        </div>

        <div className="lfs-section">
          <div className="lfs-label">Body-State Summary</div>
          <div className="lfs-metric-grid">
            <div className="lfs-metric">
              <span>Upper / Lower Balance</span>
              <strong>{recommendation.bodyStateSummary.upperLowerBalance}</strong>
            </div>
            <div className="lfs-metric">
              <span>Waist Definition</span>
              <strong>{recommendation.bodyStateSummary.waistDefinition}</strong>
            </div>
            <div className="lfs-metric">
              <span>Vertical Line</span>
              <strong>{recommendation.bodyStateSummary.verticalLineStrength}</strong>
            </div>
            <div className="lfs-metric">
              <span>Horizontal Sensitivity</span>
              <strong>{recommendation.bodyStateSummary.horizontalSensitivity}</strong>
            </div>
            <div className="lfs-metric">
              <span>Structure Need</span>
              <strong>{recommendation.bodyStateSummary.structureNeed}</strong>
            </div>
          </div>
        </div>

        <div className="lfs-section">
          <div className="lfs-label">Occasions</div>
          <div className="lfs-pill-row">
            {recommendation.occasions.length > 0 ? (
              recommendation.occasions.map((occasion) => (
                <span className="lfs-pill" key={occasion}>
                  {occasion}
                </span>
              ))
            ) : (
              <span className="lfs-text">No explicit use-case language was detected.</span>
            )}
          </div>
        </div>

        <div className="lfs-section">
          <div className="lfs-label">Size Guidance</div>
          <div className="lfs-meta">
            <div>
              Recommendation: <strong>{sizeRecommendation?.recommendedSize ?? "Not enough profile data"}</strong>
            </div>
            <div>Confidence: {sizeRecommendation?.confidence ?? "low"}</div>
          </div>
          {sizeRecommendation?.reasons.length ? (
            <ul className="lfs-list">
              {sizeRecommendation.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
        </div>

        {recommendation.confidenceNote ? <div className="lfs-note">{recommendation.confidenceNote}</div> : null}
        {actionMessage ? (
          <div className="lfs-note">
            {actionMessage}
            {onUndoIgnore ? (
              <>
                {" "}
                <button className="lfs-inline-action" onClick={onUndoIgnore} type="button">
                  Undo
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="lfs-actions">
          <button className="lfs-button primary" onClick={onOpenSettings} type="button">
            Open Profile Settings
          </button>
          <button className="lfs-button secondary" onClick={onIgnoreSimilar} type="button">
            Ignore Similar Items
          </button>
        </div>
      </div>
    </div>
  )
}
