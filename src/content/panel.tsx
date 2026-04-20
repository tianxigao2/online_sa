import React from "react"
import type { RecommendationResult, SavedUserProfile, StructuredProduct } from "../shared/types"

interface PanelProps {
  product?: StructuredProduct
  recommendation?: RecommendationResult
  unsupportedReason?: string
  statusMessage?: string
  collectionItems?: Array<{
    title: string
    level: RecommendationResult["level"]
    fitScore: number
    why: string
    confidence: number
  }>
  actionMessage?: string
  savedProfiles?: SavedUserProfile[]
  activeProfileId?: string
  onSelectProfile?: (profileId: string) => void
  collapsed?: boolean
  canCollapse?: boolean
  onToggleCollapse?: () => void
  onMovePointerDown?: (event: React.PointerEvent<HTMLElement>) => void
  onOpenSettings: () => void
  onIgnoreSimilar: () => void
  onUndoIgnore?: () => void
}

function levelLabel(level: RecommendationResult["level"]): string {
  switch (level) {
    case "needs_data":
      return "Needs More Data"
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

function itemLabel(product: StructuredProduct): string {
  switch (product.category) {
    case "dresses":
      return "dress"
    case "tops":
    case "tees":
    case "tanks":
    case "shirts":
    case "sweaters":
    case "hoodies":
    case "jackets":
    case "outerwear":
    case "bodysuits":
      return "top"
    case "leggings":
    case "pants":
    case "shorts":
      return "bottom"
    case "skirts":
      return "skirt"
    case "jumpsuits":
    case "rompers":
      return "one-piece"
    default:
      return "piece"
  }
}

function fabricLead(product: StructuredProduct): string {
  const materials = product.materials?.join(" ").toLowerCase() ?? ""
  if (materials.includes("satin")) {
    return "The satin fabric"
  }
  if (materials.includes("silk")) {
    return "The silky fabric"
  }
  if (materials.includes("rib")) {
    return "The ribbed fabric"
  }
  if (materials.includes("jersey")) {
    return "The jersey fabric"
  }
  if (product.attributes.fabricDrape === "clingy") {
    return "The clingier fabric"
  }
  if (product.attributes.fabricDrape === "fluid") {
    return "The drapey fabric"
  }
  return "The fabric"
}

function uniqueItems(values: string[], limit: number): string[] {
  return Array.from(new Set(values.filter(Boolean))).slice(0, limit)
}

function explainPositiveSignal(signal: string, product: StructuredProduct): string {
  switch (signal) {
    case "square_neck":
      return "Square neck should frame your upper body well."
    case "scoop_neck":
      return "The scoop neckline should keep the top line open and easy."
    case "v_neck":
      return "The V-neck should help the upper line read longer and cleaner."
    case "defined_waist":
      return `The ${itemLabel(product)} gives you real waist definition, which should be flattering here.`
    case "natural_waist":
      return `The waist placement on this ${itemLabel(product)} should sit in a flattering spot.`
    case "high_waist":
      return "The higher waist placement should help your proportions read longer."
    case "straight_column":
      return `The cleaner ${itemLabel(product)} line should look streamlined rather than bulky.`
    case "bias_skim":
      return `This ${itemLabel(product)} should skim the body without fighting your shape.`
    case "a_line":
      return "The gentle flare should balance your proportions better than a straighter cut."
    case "fit_and_flare":
      return "The fit-and-flare shape should give you shape without feeling stiff."
    case "wide_strap":
      return "The wider straps should give the top half better balance and support."
    case "tank_shoulder":
      return "The shoulder line should add enough framing to keep the top balanced."
    case "cap_sleeve":
      return "The sleeve line should add a bit of structure without closing you in."
    case "midi_length":
      return `This ${itemLabel(product)} length should keep the line looking long and clean.`
    case "maxi_length":
      return `The longer ${itemLabel(product)} length should work with your vertical line well.`
    case "full_length":
      return "The full length should help the proportions read continuous and clean."
    case "structured_fabric":
      return `${fabricLead(product)} should hold the shape better instead of collapsing on the body.`
    case "controlled_stretch":
      return `${fabricLead(product)} should give some support without feeling too loose.`
    case "fluid_drape":
      return `${fabricLead(product)} should move softly without needing heavy structure.`
    case "low_visual_detail":
      return "The cleaner finish should keep the look streamlined instead of visually busy."
    default:
      return `${labelize(signal)} is a direction that usually works well for you.`
  }
}

function explainCautionSignal(signal: string, product: StructuredProduct): string {
  switch (signal) {
    case "crew_neck":
      return "The crew neckline may make the upper body read heavier than you want."
    case "halter_neck":
      return "The halter neckline may over-focus your shoulders and upper body."
    case "low_rise":
      return "The lower rise is less likely to give you the shape and proportion you want."
    case "no_waist_definition":
      return `This ${itemLabel(product)} does not give much waist definition, so it may read flatter or boxier on you.`
    case "bodycon":
      return "The close, body-hugging cut may feel more exposing or tense than flattering here."
    case "trapeze":
      return `This ${itemLabel(product)} releases away from the body early, which may read too boxy or shapeless on you.`
    case "thin_strap":
      return "The thin straps may leave the top half feeling less balanced or supported."
    case "sleeveless":
      return "The sleeveless cut may put more attention on the upper body than you want."
    case "cropped_length":
      return `The cropped length may cut the line too early on this ${itemLabel(product)}.`
    case "clingy_finish":
      return `${fabricLead(product)} may catch at the waist and hips instead of hanging cleanly.`
    case "fluid_drape":
      return `${fabricLead(product)} may skim over your waist instead of shaping it clearly.`
    case "high_visual_detail":
      return "The extra detailing may add more visual weight than you want."
    default:
      return `${labelize(signal)} is not a direction I would prioritize for you on this item.`
  }
}

function isLowConfidence(level: RecommendationResult["level"], confidence: number): boolean {
  return level === "needs_data" || confidence < 0.58
}

export function ProductPanel({
  product,
  recommendation,
  unsupportedReason,
  statusMessage,
  collectionItems,
  actionMessage,
  savedProfiles,
  activeProfileId,
  onSelectProfile,
  collapsed = false,
  canCollapse = false,
  onToggleCollapse,
  onMovePointerDown,
  onOpenSettings,
  onIgnoreSimilar,
  onUndoIgnore
}: PanelProps) {
  const sizeRecommendation = recommendation?.sizeRecommendation
  const panelControls = (
    <div className="lfs-panel-controls">
      <button
        aria-label="Move panel"
        className="lfs-control-button lfs-control-button-compact"
        onPointerDown={onMovePointerDown}
        type="button"
      >
        ::
      </button>
      {canCollapse && onToggleCollapse ? (
        <button
          aria-label={collapsed ? "Expand panel" : "Collapse panel"}
          className="lfs-control-button"
          onClick={onToggleCollapse}
          type="button"
        >
          {collapsed ? "Expand" : "Collapse"}
        </button>
      ) : null}
    </div>
  )

  const profileSelector =
    savedProfiles && savedProfiles.length > 0 && onSelectProfile ? (
      <div className="lfs-profile-switcher">
        <label className="lfs-profile-label" htmlFor="lfs-profile-select">
          Profile
        </label>
        <select
          className="lfs-profile-select"
          id="lfs-profile-select"
          value={activeProfileId ?? savedProfiles[0]?.id ?? ""}
          onChange={(event) => onSelectProfile(event.target.value)}
        >
          {savedProfiles.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.nickname}
            </option>
          ))}
        </select>
      </div>
    ) : null

  if (collapsed && product && recommendation) {
    return (
      <div className="lfs-card lfs-card-collapsed">
        <div className="lfs-collapsed-row">
          <button
            aria-label="Expand panel"
            className={`lfs-collapsed-score level-${recommendation.level}`}
            onClick={onToggleCollapse}
            type="button"
          >
            {recommendation.fitScore}/10
          </button>
          <button
            aria-label="Move panel"
            className="lfs-control-button lfs-control-button-compact"
            onPointerDown={onMovePointerDown}
            type="button"
          >
            ::
          </button>
        </div>
      </div>
    )
  }

  if (collectionItems?.length) {
    return (
      <div className="lfs-card lfs-chip-card">
        <div className="lfs-header">
          <div className="lfs-header-top">
            <div className="lfs-kicker">Lululemon Fit Signal</div>
            {panelControls}
          </div>
          <div className="lfs-title">Collection Ranking</div>
          {profileSelector}
        </div>
        <div className="lfs-collection-summary">
          <div className="lfs-text">Ranked best fit first from the cards scanned on this page.</div>
          <ol className="lfs-collection-list">
            {collectionItems.map((item, index) => (
              <li className="lfs-collection-item" key={`${item.title}-${item.level}-${index}`}>
                <div className="lfs-collection-item-top">
                  <span className="lfs-collection-rank">{index + 1}</span>
                  <strong className="lfs-collection-title">{item.title}</strong>
                </div>
                <div className="lfs-pill-row">
                  <span className={`lfs-pill score level-${item.level}`}>Fit Score {item.fitScore}/10</span>
                  {item.confidence < 0.58 ? <span className="lfs-pill subtle">Low confidence</span> : null}
                </div>
                <div className="lfs-text">{item.why}</div>
              </li>
            ))}
          </ol>
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
          {panelControls}
        </div>
        {profileSelector ? <div className="lfs-debug-profile-row">{profileSelector}</div> : null}
      </div>
    )
  }

  if (unsupportedReason) {
    return (
      <div className="lfs-card">
        <div className="lfs-header">
          <div className="lfs-header-top">
            <div className="lfs-kicker">Version A Scope</div>
            {panelControls}
          </div>
          <div className="lfs-title">Outside Apparel Coverage</div>
          {profileSelector}
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

  const positiveBadges = uniqueItems(
    [
      ...recommendation.matchedProductSignals.map((signal) => explainPositiveSignal(signal, product)),
      ...recommendation.conditionalProductSignals.map((signal) => explainPositiveSignal(signal, product)),
      ...(recommendation.matchedProductSignals.length === 0 ? recommendation.reasons : [])
    ],
    4
  )
  const cautionBadges = uniqueItems(
    [
      ...recommendation.conflictingProductSignals.map((signal) => explainCautionSignal(signal, product)),
      ...recommendation.fitRisks.map((risk) => risk.reason),
      ...(recommendation.conflictingProductSignals.length === 0 ? recommendation.risks : [])
    ],
    4
  )
  const showConfidenceWarning = isLowConfidence(recommendation.level, recommendation.confidence)
  const lowConfidenceMessage =
    recommendation.level === "needs_data"
      ? "I'm not very confident with the judgment for this product yet."
      : "I'm not very confident with the judgment for this product."

  return (
    <div className="lfs-card">
      <div className="lfs-header">
        <div className="lfs-header-top">
          <div className="lfs-kicker">Lululemon Fit Signal</div>
          {panelControls}
        </div>
        <div className="lfs-title">{product.title}</div>
        {profileSelector}
      </div>

      <div className="lfs-body">
        <div className="lfs-pill-row">
          <span className={`lfs-pill score level-${recommendation.level}`}>Fit Score {recommendation.fitScore}/10</span>
          <span className="lfs-pill">{product.category}</span>
          {sizeRecommendation?.recommendedSize ? (
            <span className="lfs-pill">Size {sizeRecommendation.recommendedSize}</span>
          ) : null}
        </div>

        {showConfidenceWarning ? (
          <div className="lfs-note lfs-note-warning">
            <strong>{lowConfidenceMessage}</strong>
            {recommendation.confidenceNote ? ` ${recommendation.confidenceNote}` : null}
          </div>
        ) : null}

        {positiveBadges.length > 0 ? (
          <div className="lfs-section">
            <div className="lfs-label">Why It Could Work</div>
            <div className="lfs-pill-row">
              {positiveBadges.map((text) => (
                <span className="lfs-pill narrative" key={text}>
                  {text}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {cautionBadges.length > 0 ? (
          <div className="lfs-section">
            <div className="lfs-label">What To Watch</div>
            <div className="lfs-pill-row">
              {cautionBadges.map((text) => (
                <span className="lfs-pill subtle narrative" key={text}>
                  {text}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {recommendation.reasons.length > 0 && recommendation.matchedProductSignals.length === 0 ? (
          <div className="lfs-section">
            <div className="lfs-label">Other Reasons</div>
            <ul className="lfs-list">
              {recommendation.reasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          </div>
        ) : null}

        {recommendation.occasions.length > 0 ? (
          <div className="lfs-section">
            <div className="lfs-label">Occasions</div>
            <div className="lfs-pill-row">
              {recommendation.occasions.map((occasion) => (
                <span className="lfs-pill" key={occasion}>
                  {occasion}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="lfs-section">
          <div className="lfs-label">Size Guidance</div>
          <div className="lfs-meta">
            <div>
              Recommendation: <strong>{sizeRecommendation?.recommendedSize ?? "Not enough profile data"}</strong>
            </div>
            {sizeRecommendation?.confidence === "medium" ? <div>Sizing is still a moderately rough guess.</div> : null}
            {sizeRecommendation?.confidence === "low" ? <div>Sizing is still a rough guess on this item.</div> : null}
          </div>
          {sizeRecommendation?.reasons.length ? (
            <ul className="lfs-list">
              {sizeRecommendation.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
        </div>

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
