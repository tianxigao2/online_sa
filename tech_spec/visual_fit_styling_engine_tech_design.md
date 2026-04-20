# Universal Visual Fit and Styling Recommendation Engine

Explainable algorithm for mapping body-image-derived relative proportions to garment recommendation and fit-risk prediction.

Scope note: this document excludes all body-specific conclusions tied to any single user. It defines a general algorithm only. Per-user findings belong in inference output, not in the universal design rules.

## 1. Objective

Build a recommendation engine that uses front and side photos of a user wearing fitted clothing, plus required basic measurements, to predict which garment design choices are more likely to flatter the user and which are more likely to create visual imbalance or fit problems.

The system is not a precise anthropometric tool and should not behave like a deterministic body-type classifier. Its job is to infer relative proportions, structural needs, and line balance, then map those findings to garment attributes such as neckline, waistline, silhouette, strap width, sleeve volume, length, and fabric behavior.

### Non-goals

- Do not generate permanent body-type labels as the core output.
- Do not claim exact fit or exact body measurements unless separately estimated and confidence-rated.
- Do not encode user-specific conclusions into the universal ruleset.
- Do not output absolute judgments such as "cannot wear" or "always flattering."

## 2. Product Positioning

Internally, this system should be described as a visual fit and styling recommendation engine. It combines computer-vision feature extraction with an explainable rule layer. The engine should output high-probability recommendations rather than certainties.

### Recommendation classes

| Class | Meaning | User-facing wording |
| --- | --- | --- |
| Recommended | Likely to support proportion, structure, and visual balance | High-probability flattering choice |
| Conditional / Maybe | May work depending on fabric, support, styling, or occasion | Worth trying under the right conditions |
| Low priority / Avoid | More likely to create horizontal bulk, imbalance, or fit failure | Lower-probability win |

## 3. Delivery Modes

The system now supports two product surfaces built on the same core rule engine.

### A. Shopping-page recommendation mode

This is the original extension mode. It runs on a supported retailer product page, reads normalized garment metadata from the page, and combines:

- body-state inference from profile inputs,
- garment attribute extraction from the product page,
- style scoring,
- fit-risk scoring,
- optional size guidance.

This mode answers product-specific questions such as:

- Is this specific dress shape promising?
- Does this neckline align with the user's proportions?
- What fit risks should be called out for this item?
- Is there enough information to make a directional size recommendation?

### B. Standalone fit-advice mode

This is the new non-shopping entry. It is designed for users who are not browsing a product page and want general guidance from their own profile alone.

The standalone entry is for questions such as:

- Would mini, midi, or maxi usually be better?
- Are open or closed necklines more likely to work?
- Is a defined waist usually beneficial?
- Should the user bias toward structured fabrics or softer drape?

This mode uses:

- front photo,
- side photo,
- height,
- weight,
- optional manual measurements,
- optional support state,
- optional style goals and preferences.

It does not require retailer page data and does not return shopping-specific information such as product score, product-specific fit risks, or size call for a visible SKU.

### Standalone user flow

1. User opens the standalone fit-advice entry from the extension action popup.
2. User provides front and side photos and basic body specs.
3. User may optionally add measurements, support state, and styling goals such as "look taller" or "emphasize waist."
4. Engine infers body-state variables.
5. Engine returns grouped general advice across length, neckline, waistline, silhouette, strap/sleeve, and fabric behavior.

### Standalone output design

The standalone view should emphasize general styling direction rather than product evaluation.

Expected outputs:

- recommended attributes by family,
- conditional attributes by family,
- low-priority attributes by family,
- concise rationale,
- confidence score,
- body-state summary,
- caution notes when confidence or input coverage is limited.

### Current implementation note

The standalone entry accepts front and side photos, but the current MVP implementation still relies primarily on saved body specs and profile signals for scoring. Photo presence currently improves context and confidence handling more than it drives true vision-derived morphology extraction. A dedicated vision extraction layer remains part of the target architecture rather than the current implementation.

## 4. Required Inputs

| Input | Required | Type | Notes |
| --- | --- | --- | --- |
| Front full-body photo | Yes | Image | Fitted clothing; neutral stance; minimal occlusion |
| Side full-body photo | Yes | Image | Needed for projection and torso-depth cues |
| Height | Yes | Numeric | Used to normalize relative dimensions |
| Weight | Yes | Numeric | Improves coarse inference; not sufficient alone |
| Bust / waist / hip | Optional | Numeric | Can calibrate image-based estimation |
| Bra / support state | Optional | Enum / text | Upper-body appearance changes with support |
| User preference goals | Optional | Tags | Examples: look taller, emphasize waist, reduce bust focus |
| Occasion | Optional | Tag | Examples: work, casual, date, formal, vacation |

## 5. System Architecture

Recommended MVP pipeline:

`Vision feature extraction -> morphology abstraction -> rule-based style scoring -> fit-risk scoring -> explainable output generation`

| Layer | Input | Output | Implementation note |
| --- | --- | --- | --- |
| A. Vision extraction | Photos + height/weight | Normalized body features | Use pose estimation, segmentation, contour analysis |
| B. Morphology abstraction | Raw features | Continuous body-state variables | Avoid hard labels as core logic |
| C. Style scoring | Body-state variables + garment metadata | Scores for garment attributes | Expert rules in MVP |
| D. Fit-risk scoring | Body-state variables + construction metadata | Risk flags for likely failure points | Separate from style score |
| E. Explanation layer | Scores + triggered rules | Human-readable rationale | Must stay concise and probabilistic |

### Standalone architecture path

The standalone entry reuses layers B, C, and E directly, and may reuse layer A when true photo extraction is available.

Current standalone MVP path:

`Profile inputs + optional photo references -> morphology abstraction -> attribute-family scoring -> grouped advice output`

Key architectural difference:

- shopping-page mode combines body-state with garment metadata,
- standalone mode combines body-state with universal style rules only.

## 6. Feature Extraction Specification

### 6.1 Front-view features

- Shoulder width
- Bust width
- Waist width
- High-hip width
- Full-hip width
- Thigh outer spread
- Visual leg-length ratio
- Waist vertical position
- Shoulder-to-hip width ratio
- Waist indentation ratio

### 6.2 Side-view features

- Bust projection
- Abdomen projection
- Butt projection
- Torso thickness
- Back-waist indentation
- Chest-to-waist transition slope
- Waist-to-hip release slope

### 6.3 Design rule for raw features

All raw features should be normalized to height or to another stable body reference. The algorithm should prefer relative proportions over absolute dimensions. Any estimated measurement should carry a confidence score.

## 7. Morphology Abstraction Layer

Instead of making the first-stage output a body-type label, compress raw features into continuous variables that directly drive garment scoring.

| Variable | Description | Possible signal sources | Why it matters |
| --- | --- | --- | --- |
| Upper-lower balance | Relative visual mass above vs below waist | Shoulder, bust, hip widths; side projections | Affects openness, shoulder framing, and release shape |
| Waist definition | Strength and clarity of visible waist narrowing | Front and side indentation; waist position | Determines how much the user benefits from shaped waists |
| Vertical line strength | Ability to benefit from uninterrupted vertical lines | Leg ratio; silhouette continuity | Affects long-line vs segmented recommendations |
| Horizontal sensitivity | Likelihood that cross-body cut lines create width | Upper-body width, torso depth, neckline closure sensitivity | Affects neckline, sleeve, and chest coverage scoring |
| Structure need | How much the body benefits from stable, shaped garments | Projection changes, contour softness, transition complexity | Affects seam placement, drape tolerance, and fabric choice |

Body-shape labels such as rectangle, triangle, inverted triangle, hourglass, or oval may be generated later as optional explanation tags, but they must not be the primary inference layer. Continuous variables should drive the actual scoring.

## 8. Garment Metadata Model

Each product must be normalized into attribute fields rather than treated as a raw product title.

| Attribute group | Fields | Comment |
| --- | --- | --- |
| Neckline | square, scoop, V, sweetheart, crew, mock, turtleneck, halter, off-shoulder, one-shoulder | Controlled vocabulary required |
| Waistline | none, dropped, natural, high, empire, wrap, fit-and-flare seam, gathered waist | Distinguish visual waist from constructed waist |
| Silhouette | straight, column, bias-skim, A-line, fit-and-flare, sheath, bodycon, trapeze, tulip | Do not collapse all dresses into one bucket |
| Shoulder / sleeve | strap width, sleeveless, tank shoulder, cap sleeve, flutter sleeve, puff sleeve | Often interacts with neckline |
| Length | mini, above knee, knee, midi, maxi | Store actual hem position if available |
| Fabric behavior | structure, cling, drape, stretch, recovery, surface gloss, thickness | Same style name can behave very differently |
| Construction risk cues | darting, princess seams, bust shaping, seam stability, release point, lining | Used by fit-risk model |
| Print / detail density | solid, low-detail, high-detail, visual complexity | Needed for visual load and emphasis |

Standalone mode does not require garment metadata input from the user. Instead, it uses the same attribute vocabulary as the output vocabulary, so the user can receive general advice in the same terms that shopping-page mode uses for product comparison.

## 9. Style Scoring Engine

The style engine should score garment attributes separately before combining them into a product score or a profile-only advice set.

Scorers:

- Neckline scorer
- Waistline scorer
- Silhouette scorer
- Strap and sleeve scorer
- Length scorer
- Fabric behavior scorer
- Visual complexity scorer

### Rule format

Each rule should be explicit, inspectable, and independently testable.

Example:

```text
IF waist_definition > threshold_high
AND structure_need >= threshold_medium
THEN score(fit_and_flare) += 0.8
AND score(shapeless_shift) -= 0.7
AND explanation += "Clear waist benefit; user likely responds better to shaped release than to unstructured drop."
```

### Standalone scoring behavior

In standalone mode, the engine should score the full attribute vocabulary even when no product exists. The output should be grouped by family so the user can directly read advice such as:

- recommended lengths,
- recommended necklines,
- recommended waist treatments,
- lower-priority silhouettes.

## 10. Fit-Risk Scoring Engine

Fit risk must be modeled separately from style recommendation. A garment can be aesthetically promising while still likely to fail at the bust, waist, high hip, armhole, or side seam.

| Risk flag | Meaning |
| --- | --- |
| Bust overfill risk | Upper bodice or bust area likely too restrictive or visually overfilled |
| Armhole digging risk | Armhole or upper side seam likely too tight or high |
| Waist compression risk | Waist seam likely too restrictive relative to body shape |
| High-hip release-too-early risk | Garment expands too early below waist and may create bulk |
| Loose-wrinkle risk | Extra ease likely to pool in a visually unflattering way |
| Drag-line risk | Stress lines likely due to insufficient allowance or bad balance |
| Shapeless excess-ease risk | Garment likely to hang without intentional structure |

Risk flags should come from a combination of body-state variables and garment construction metadata. They should never be generated solely from body features or solely from garment tags.

### Standalone fit-risk behavior

Standalone mode should not present garment-specific fit-risk flags unless the user has supplied actual garment construction data. In the current product surface split:

- shopping-page mode returns fit-risk flags,
- standalone mode returns general caution notes and low-priority attribute guidance.

## 11. Output Contract

### Shopping-page output

| Field | Type | Purpose |
| --- | --- | --- |
| recommended_attributes | list | High-scoring design variables |
| conditional_attributes | list | Design variables that may work depending on conditions |
| low_priority_attributes | list | Lower-scoring design variables |
| fit_risks | list | Risk flags with confidence scores |
| reasons | list | Short natural-language explanations |
| confidence | number | Overall confidence |
| body_state_summary | object | Continuous variables; not necessarily end-user visible |

Example API response skeleton:

```json
{
  "recommended_attributes": ["square_neck", "defined_waist", "a_line"],
  "conditional_attributes": ["bias_skim"],
  "low_priority_attributes": ["high_halter", "shapeless_shift"],
  "fit_risks": [{"type": "high_hip_release_too_early", "confidence": 0.71}],
  "reasons": ["Benefits from clearer line organization and controlled shaping."],
  "confidence": 0.78,
  "body_state_summary": {
    "upper_lower_balance": 0.11,
    "waist_definition": 0.72,
    "vertical_line_strength": 0.61,
    "horizontal_sensitivity": 0.58,
    "structure_need": 0.64
  }
}
```

### Standalone output

| Field | Type | Purpose |
| --- | --- | --- |
| attribute_groups | object | Advice grouped by neckline, waistline, silhouette, strap/sleeve, length, and fabric |
| recommended_attributes | list | Flattened list of highest-scoring profile-level recommendations |
| conditional_attributes | list | Flattened list of maybe / conditional directions |
| low_priority_attributes | list | Lower-probability directions |
| reasons | list | Short rationale for recommended directions |
| caution_notes | list | General cautions without product-specific fit-risk claims |
| confidence | number | Overall confidence |
| body_state_summary | object | Continuous variables used to drive scoring |

## 12. MVP Scope

- Support one model path at first if needed, but keep the data model extensible.
- Require front photo, side photo, height, and weight.
- Estimate a compact set of normalized body features.
- Compute five body-state variables: upper-lower balance, waist definition, vertical line strength, horizontal sensitivity, and structure need.
- Support attribute-level scoring for neckline, waistline, silhouette, strap/sleeve, length, and fabric behavior.
- Generate fit-risk flags for the most common failure zones in shopping-page mode.
- Return explainable recommendation text and confidence values.
- Support a standalone entry that can render general styling guidance without retailer or shopping-page context.

### Out of scope for MVP

- Exact made-to-measure pattern generation
- Automatic guarantee of size selection across brands
- Learning-based personalization without labeled feedback
- Highly granular aesthetic style identities
- Full vision-derived body extraction from standalone photos in the current shipped implementation

## 13. Evaluation Plan

| Metric | Definition | Target direction |
| --- | --- | --- |
| Recommendation agreement | How often expert reviewers agree with recommendation direction | High |
| Rule traceability | Whether each recommendation can be explained by triggered rules | 100% |
| Fit-risk usefulness | Whether flagged risks correspond to real try-on problems | High |
| User satisfaction | Whether recommendations are plausible and helpful | High |
| False certainty rate | Frequency of overconfident but wrong claims | Low |

Add a standalone-specific evaluation question:

- Does the standalone advice give useful general direction even when no shopping context is present?

## 14. Guardrails and Failure Modes

- Never write core rules using example-user conclusions.
- Never expose raw body judgments in demeaning language.
- Keep user-facing language probabilistic and non-absolute.
- Treat underwear/support state as a source of variance when upper-body recommendations are uncertain.
- Separate style score from fit-risk score to avoid misleading outputs.
- If image confidence is low, reduce recommendation confidence rather than hallucinating precision.
- In standalone mode, do not imply a product-specific fit failure when no actual garment construction data is available.

## 15. Future Extensions

- Add feedback loop from saves, purchases, returns, and try-on ratings.
- Train a reranker that adjusts expert-rule outputs using outcome data.
- Expand from attribute scoring to full outfit-level compatibility.
- Use richer garment construction metadata when available from product pages or manual labeling.
- Support multiple presentation modes: shopper-facing summary, stylist-facing detail, engineer-facing debug output.
- Add a true standalone vision extraction layer so uploaded photos contribute directly to body-feature estimation rather than primarily to confidence handling.

## Appendix A. Engineering Summary

Build an explainable system that converts body-image-derived relative proportions into scores for garment design variables, while separately predicting likely fit failure points and returning concise rationale.

The key architectural separation is between universal algorithm rules, per-user inferred body-state variables, and final recommendation output. User-specific styling conclusions belong only in inference and output layers, never in the universal ruleset.

The product now has two front doors:

- a shopping-page recommendation experience for specific items,
- a standalone fit-advice experience for profile-only styling guidance.

Both should continue to share the same morphology abstraction and attribute-scoring vocabulary so recommendations stay consistent across surfaces.
