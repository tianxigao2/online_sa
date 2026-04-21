# Clothing Semantic Mapping Layer 技术设计文档
**版本**: v0.1  
**状态**: Draft  
**目标读者**: 工程师 / 产品经理 / 标注与规则维护人员  
**文档语言**: 中文  
**适用范围**: 多电商网站服装商品页（PDP）语义归一化，用于后续 sizing / styling / recommendation 引擎

---

## 1. 背景与目标

### 1.1 问题背景
服装电商网站之间存在大量异构表达，主要体现在：

1. **分类体系不同**
   - 一个网站写 `Bodycon Dress`
   - 一个网站写 `Occasion Dress`
   - 一个网站写 `Mini Dress`
   - 一个网站写 `Tailored Dress`
   - 这些词可能分别表达 silhouette、occasion、length、construction，但混在同一个分类层里

2. **描述语言不同**
   - 同样表示“正式”，不同网站会写：
     - polished
     - tailored
     - elevated
     - occasion-ready
     - refined
     - event dressing
   - 同样表示“花哨/装饰感强”，不同网站会写：
     - embellished
     - statement
     - ornate
     - romantic
     - ruffled
     - bow-detail
     - sequined

3. **营销文案与物理属性混杂**
   - `buttery soft` 是触感/表面感
   - `sculpting` 是压缩/贴身感
   - `elevated` 是风格级别
   - `drapey` 是垂坠属性
   - `desk to dinner` 是 occasion hint
   - `feminine silhouette` 语义模糊，需要拆解而不是原样下游消费

4. **下游需求是统一的**
   用户真正关心的是：
   - 这是什么类型的衣服
   - 它的结构/垂感/贴身程度如何
   - 它适合什么场景
   - 它是简洁还是花哨
   - 它是 casual / business casual / formal / party
   - 它对于某种 body/styling profile 是加分还是减分

### 1.2 核心目标
本中间映射层的目标不是直接输出“适不适合用户”，而是将不同网站的原始商品信息统一映射为一个稳定、可解释、可测试的 **Canonical Garment Schema**，供后续推荐引擎使用。

### 1.3 非目标
本层暂不负责：
- 最终用户个性化推荐分数
- 最终 size recommendation 裁决
- 图像深度视觉识别（可后续补）
- 对所有营销文案做开放式生成解释

---

## 2. 设计原则

### 2.1 Schema-first
先定义内部统一语义，再让不同网站映射到这套语义，而不是围绕站点现有字段去设计系统。

### 2.2 Config-driven
站点差异通过配置和词典吸收，避免 per-site 写大量 if/else 逻辑。

### 2.3 Evidence-based
每一个 canonical 字段都应尽可能能追溯到原始 evidence：
- 来源字段
- 命中的关键词/规则
- 置信度
- 冲突解决路径

### 2.4 Deterministic by default
核心映射流程优先使用确定性规则、词典、模板和优先级系统，而不是开放式推理。

### 2.5 Unknown-friendly
允许字段为 `unknown` / `unset`，不允许为了“看起来完整”而胡乱补全。

### 2.6 Category-aware
同一个词在不同品类中语义不同，必须支持 category-aware override。

---

## 3. 总体架构

```text
[Site PDP Raw Data]
        |
        v
[Raw Extraction Layer]
        |
        v
[Normalization & Preprocessing]
        |
        v
[Semantic Mapping Layer]
   |- Taxonomy Mapping
   |- Term Mapping
   |- Occasion Mapping
   |- Ornamentation / Formality / Style Signal Mapping
   |- Fabric & Fit Property Mapping
   |- Conflict Resolution
        |
        v
[Canonical Garment Schema]
        |
        v
[Derived Trait Engine]
        |
        v
[Recommendation / Sizing Engine]
```

---

## 4. 输入与输出

### 4.1 输入：Raw Product Payload
原始页面提取层应输出结构尽量扁平、忠实于站点原文，不在本层之前做复杂语义判断。

#### 示例
```json
{
  "site": "example_site",
  "brand": "Example Brand",
  "product_id": "12345",
  "title": "Tailored Bow Detail Midi Dress",
  "breadcrumbs": ["Women", "Clothing", "Dresses", "Occasion Dresses"],
  "category_tags": ["Occasion Dress", "Midi Dress"],
  "description_blocks": [
    "A polished midi dress with feminine bow detail.",
    "Perfect for weddings, dinners, and special events."
  ],
  "bullet_points": [
    "Tailored fit",
    "Invisible back zip",
    "Lined",
    "Midi length"
  ],
  "fit_notes": [
    "Fitted through the bodice",
    "Skims the waist"
  ],
  "fabric_notes": [
    "Structured crepe fabrication"
  ],
  "composition_text": "100% polyester; lining: 100% polyester",
  "care_text": "Dry clean only",
  "size_options": ["0", "2", "4", "6", "8", "10", "12"],
  "size_chart": {},
  "model_info": "Model is 5'9 and wears size 4"
}
```

### 4.2 输出：Canonical Garment Schema
输出为统一语义结构，供后续系统使用。

顶层模块：
1. `identity`
2. `construction`
3. `shape`
4. `style_semantics`
5. `occasion_semantics`
6. `sizing`
7. `evidence`
8. `confidence`

---

## 5. Canonical Garment Schema 设计

### 5.1 identity
```json
{
  "garment_type": "dress",
  "subcategory": "tailored_midi_dress",
  "primary_category_confidence": 0.93
}
```

#### 枚举建议
- `garment_type`
  - top
  - dress
  - skirt
  - pants
  - shorts
  - jumpsuit
  - jacket
  - coat
  - blazer
  - sweater
  - cardigan
  - active_top
  - active_bottom
  - unknown

- `subcategory`
  - 允许先自由枚举，但最终应尽量归一为有限集合
  - 示例：
    - bodycon_mini_dress
    - tailored_midi_dress
    - relaxed_button_down_shirt
    - wide_leg_trouser
    - cropped_fitted_jacket

### 5.2 construction
用于描述物理与材质相关属性。

```json
{
  "fabric_family": "crepe",
  "composition": [
    {"material": "polyester", "pct": 100}
  ],
  "lining": "full",
  "stretch_level": "low",
  "compression_level": "low",
  "structure_level": "medium_high",
  "drape_level": "medium_low",
  "surface_softness": "medium",
  "sheerness": "low",
  "surface_finish": ["smooth"],
  "care_level": "high"
}
```

#### 核心枚举建议
- `fabric_family`
  - woven_crisp
  - woven_fluid
  - crepe
  - satin_like
  - jersey
  - rib_knit
  - sweater_knit
  - denim
  - performance_knit
  - ponte
  - lace
  - chiffon
  - linen_like
  - unknown

- `stretch_level`
  - none
  - low
  - medium
  - high

- `compression_level`
  - none
  - low
  - medium
  - high

- `structure_level`
  - low
  - medium_low
  - medium
  - medium_high
  - high

- `drape_level`
  - low
  - medium_low
  - medium
  - medium_high
  - high

- `care_level`
  - low
  - medium
  - high

### 5.3 shape
描述版型、长度、领口、收腰等几何与视觉形态。

```json
{
  "silhouette": "fit_and_flare",
  "fit_intent": "tailored",
  "length": "midi",
  "waist_definition": "high",
  "neckline": "square",
  "sleeve_type": "sleeveless",
  "strap_type": "wide_strap",
  "hem_shape": "straight",
  "closure_type": "back_zip"
}
```

#### 核心枚举建议
- `silhouette`
  - fitted
  - body_skimming
  - straight
  - a_line
  - fit_and_flare
  - column
  - boxy
  - oversized
  - wide_leg
  - tapered
  - unknown

- `fit_intent`
  - second_skin
  - close_fit
  - fitted
  - tailored
  - classic
  - relaxed
  - oversized
  - unknown

- `length`
  - cropped
  - waist
  - hip
  - tunic
  - mini
  - above_knee
  - knee
  - midi
  - maxi
  - full_length
  - unknown

- `waist_definition`
  - none
  - low
  - medium
  - high

### 5.4 style_semantics
用于统一表达“风格感”“花哨程度”“视觉存在感”等营销文案里的语义。

```json
{
  "formality_level": "formal",
  "ornamentation_level": "medium_high",
  "visual_loudness": "medium",
  "romanticness": "medium",
  "minimalism_level": "low",
  "trend_signal": "moderate",
  "playfulness": "low",
  "sexiness_signal": "medium",
  "polish_level": "high"
}
```

#### 设计说明
这里不是“审美真理”，而是为后续推荐系统提供一个稳定的语义坐标系。

#### 核心枚举建议
- `formality_level`
  - lounge
  - casual
  - smart_casual
  - business_casual
  - formal
  - event_formal

- `ornamentation_level`
  - none
  - low
  - medium
  - medium_high
  - high

- `visual_loudness`
  - quiet
  - low
  - medium
  - high

- `romanticness`
  - none
  - low
  - medium
  - high

- `minimalism_level`
  - low
  - medium
  - high

- `polish_level`
  - low
  - medium
  - high

### 5.5 occasion_semantics
归一化站点文案中的场景暗示。

```json
{
  "occasion_tags": ["wedding_guest", "dinner", "special_event"],
  "day_night_flexibility": "night_leaning",
  "work_appropriateness": "low",
  "travel_friendliness": "medium_low",
  "seasonality": ["spring", "summer", "fall"]
}
```

#### occasion_tags 枚举建议
- everyday
- brunch
- vacation
- travel
- office
- business_meeting
- dinner
- date_night
- wedding_guest
- cocktail
- party
- special_event
- lounge
- workout

### 5.6 sizing
```json
{
  "size_system_type": "us_numeric_even",
  "size_labels": ["0", "2", "4", "6", "8", "10", "12"],
  "size_chart_available": true,
  "fit_bias": "unknown",
  "petite_tall_signal": "none"
}
```

### 5.7 evidence
```json
{
  "style_semantics.formality_level": [
    {
      "source_field": "breadcrumbs",
      "matched_text": "Occasion Dresses",
      "rule_id": "occasion_formal_from_breadcrumb",
      "weight": 3
    },
    {
      "source_field": "description_blocks",
      "matched_text": "Perfect for weddings, dinners, and special events.",
      "rule_id": "formal_event_keywords",
      "weight": 4
    }
  ]
}
```

### 5.8 confidence
```json
{
  "style_semantics.formality_level": 0.92,
  "style_semantics.ornamentation_level": 0.77,
  "construction.drape_level": 0.61
}
```

---

## 6. 中间映射层要解决的核心问题

本层必须能解决的不只是 category / size mapping，还包括：

1. **网站对服装风格的不同描述语言**
2. **网站对 occasion 的不同提示方式**
3. **网站对“花哨”“正式”“休闲”“性感”“浪漫”“极简”等主观风格词的不同表达**
4. **营销词与真实物理属性的拆分**

换句话说，本层要把：
- 自由文案
- 类目名
- bullet points
- fit text
- marketing phrases

统一映射到：
- 物理属性
- 版型属性
- 风格属性
- 场景属性

---

## 7. 映射层分模块设计

### 7.1 Taxonomy Mapping
用于将站点分类系统归一到统一 garment identity。

#### 输入来源
- `breadcrumbs`
- `category_tags`
- `title`

#### 示例规则
- `Occasion Dresses` -> `garment_type = dress`
- `Mini Dress` -> `length = mini`
- `Bodycon` -> `silhouette = fitted/body_skimming`
- `Tailored Dress` -> `fit_intent = tailored`

#### 原则
- taxonomy 词优先落到**最直接表达的维度**
- 不允许一个词吞掉多个维度且不保留证据

例如：
- `Occasion Dress` 主要映射 occasion，不应直接假定它一定 high ornamentation
- `Tailored Dress` 主要映射 fit_intent / structure，不应自动推定 businesswear

---

### 7.2 Term Mapping
用于将文案关键词映射到 canonical 属性向量。

#### 输入来源
- `title`
- `description_blocks`
- `bullet_points`
- `fit_notes`
- `fabric_notes`
- `composition_text`
- `care_text`

#### 规则形式
一个 term mapping 不应只输出一个标签，而应尽量输出一组属性。

例如：

```yaml
term: sculpting
maps_to:
  compression_level: medium_high
  fit_intent: close_fit
  cling_risk_prior: high
```

```yaml
term: drapey
maps_to:
  drape_level: high
  structure_level: low
```

```yaml
term: tailored
maps_to:
  fit_intent: tailored
  structure_level: medium_high
  polish_level: high
```

---

### 7.3 Style Semantics Mapping
这是本项目最重要的增强部分，用于解决“各网站对衣服风格的描述语言不同”的问题。

目标是从不同网站文案中统一判断以下维度：
- formality_level
- ornamentation_level
- visual_loudness
- romanticness
- minimalism_level
- polish_level
- sexiness_signal
- playfulness

#### 7.3.1 Formality 映射
**问题**：不同网站很少直接写 `formal`，而会使用大量间接词。

##### 正向 formal 信号词
- polished
- refined
- elevated
- tailored
- occasion-ready
- event-ready
- sophisticated
- sleek
- elegant
- black-tie
- cocktail
- evening
- ceremony
- wedding guest
- special event
- gala

##### 降低 formal 的词
- lounge
- laid-back
- off-duty
- easy
- throw-on
- relaxed essential
- casual staple
- beachy
- weekend
- lived-in

##### 规则示例
```yaml
rule_id: formal_event_keywords
when:
  any_text_contains:
    - wedding
    - cocktail
    - gala
    - evening
    - special event
set:
  style_semantics.formality_level: formal
  style_semantics.polish_level: high
weight: 4
```

```yaml
rule_id: business_casual_from_polished_tailored
when:
  all_text_contains:
    - polished
    - tailored
set:
  style_semantics.formality_level: business_casual
  style_semantics.polish_level: high
weight: 3
```

#### 7.3.2 Ornamentation / “花哨程度” 映射
**问题**：网站不会写“花哨”，但会通过装饰细节和文案暗示视觉复杂度。

##### 高 ornamentation 信号
- embellished
- sequined
- beaded
- ornate
- appliqué
- rosette
- tulle overlay
- statement bow
- dramatic ruffle
- lace-up detail
- cutout detail
- fringe
- feather trim
- metallic sheen
- jacquard floral
- puff sleeve（需 category-aware，不总是高）
- tiered（中等，需结合品类）
- contrast trim
- print-heavy

##### 低 ornamentation / 偏简洁信号
- clean lines
- minimal
- understated
- sleek
- pared-back
- classic
- simple silhouette
- timeless
- effortless
- no-fuss

##### 规则示例
```yaml
rule_id: high_ornamentation_from_embellishment
when:
  any_text_contains:
    - embellished
    - sequined
    - beaded
    - feather trim
    - ornate
set:
  style_semantics.ornamentation_level: high
  style_semantics.visual_loudness: high
weight: 5
```

```yaml
rule_id: minimalism_signal
when:
  any_text_contains:
    - minimal
    - clean lines
    - pared-back
    - understated
set:
  style_semantics.minimalism_level: high
  style_semantics.ornamentation_level: low
  style_semantics.visual_loudness: low
weight: 4
```

#### 7.3.3 Romanticness 映射
##### 常见 romantic 信号
- romantic
- feminine
- delicate
- soft ruffle
- lace trim
- puff sleeve
- sweetheart neckline
- bow detail
- floral appliqué
- floaty
- airy

##### 规则说明
`feminine` 不能直接强映射为 romanticness 高，必须降权处理，因为它语义过宽。

建议：
- `feminine` 单独出现 -> romanticness +1 弱信号
- `feminine + lace/ruffle/bow/sweetheart` -> romanticness 强信号

#### 7.3.4 Sexiness Signal 映射
##### 常见信号
- bodycon
- sculpting
- contouring
- plunging neckline
- cutout
- slit
- backless
- barely-there straps
- second-skin
- curve-hugging

##### 注意
`sexiness_signal` 与 `formality_level` 不冲突。很多产品可以同时：
- formal
- sexy
- ornamentation low

例如 sleek evening column dress。

---

### 7.4 Occasion Mapping
用于将原始文案中的场景暗示统一为 occasion tags。

#### 常见 occasion 线索
- wedding guest
- event dressing
- cocktail hour
- dinner date
- office-ready
- work-to-weekend
- vacation staple
- getaway
- brunch-ready
- party dressing

#### 规则示例
```yaml
rule_id: wedding_guest_occasion
when:
  any_text_contains:
    - wedding guest
    - weddings
set:
  occasion_semantics.occasion_tags:
    - wedding_guest
weight: 5
```

```yaml
rule_id: desk_to_dinner
when:
  any_text_contains:
    - desk to dinner
    - work to dinner
set:
  occasion_semantics.occasion_tags:
    - office
    - dinner
  occasion_semantics.day_night_flexibility: balanced
weight: 4
```

---

### 7.5 Fabric & Fit Property Mapping
用于把营销文案归一成物理与版型属性，而不是直接下推荐结论。

#### 典型 term -> property vector
```yaml
- term: buttery soft
  maps_to:
    construction.surface_softness: high
    construction.structure_level: low

- term: structured
  maps_to:
    construction.structure_level: medium_high

- term: fluid
  maps_to:
    construction.drape_level: high
    construction.structure_level: low

- term: sculpting
  maps_to:
    construction.compression_level: medium_high
    shape.fit_intent: close_fit

- term: brushed
  maps_to:
    construction.surface_finish:
      - brushed
    construction.surface_softness: medium_high

- term: crisp
  maps_to:
    construction.structure_level: high
    construction.drape_level: low
```

---

## 8. 词典系统设计

为了避免规则写死在代码里，映射层应采用分层词典。

### 8.1 Global Dictionary
全站通用词典，适合标准行业术语。

#### 示例
- neckline
  - scoop neck
  - square neck
  - v-neck
  - mock neck
- length
  - mini
  - midi
  - maxi
- fit
  - fitted
  - relaxed
  - oversized
- fabric
  - ribbed
  - woven
  - lined
  - stretch

### 8.2 Brand Dictionary
品牌专有词典，处理自有 marketing language。

#### 示例
- `Nulu`
- `Contour`
- `Softstreme`
- `AirEssentials`
- `Featherweight Cashmere`

品牌词典允许输出多维属性向量。

### 8.3 Category-aware Overrides
同一个词在不同品类下含义不同。

#### 示例
```yaml
term: structured
overrides:
  dress:
    construction.structure_level: medium
  blazer:
    construction.structure_level: high
  knit_top:
    construction.structure_level: medium_low
```

### 8.4 Phrase Dictionary 优先于单词词典
例如：
- `wedding guest dress` 优先于 `wedding`
- `desk to dinner` 优先于 `dinner`
- `clean lines` 优先于 `clean`

原因：多词短语的语义更稳定、歧义更少。

---

## 9. 映射规则执行顺序

建议固定顺序，以便可解释和可回归测试。

### 9.1 执行顺序
1. taxonomy mapping
2. phrase-level term mapping
3. single-term mapping
4. brand dictionary mapping
5. category-aware override
6. conflict resolution
7. confidence calculation

### 9.2 为什么这样排
- 先吃 taxonomy，因为它通常能提供较稳定的基础 category context
- phrase 优先于单词，避免语义碎裂
- brand term 可能覆盖全局词义
- category-aware override 必须在有 category 上下文后运行

---

## 10. 冲突解决机制

同一件商品中不同描述可能冲突，例如：
- `structured crepe`
- `softly draped skirt`
- `tailored bodice`

这不一定是矛盾，而可能表示不同部位特性。

### 10.1 字段级 conflict resolution
优先级建议：
1. 显式结构化字段
2. taxonomy / title phrase
3. bullet points
4. fit/fabric notes
5. marketing adjectives

### 10.2 权重累积而非最后覆盖
例如 formality：
- `Occasion Dresses` +3
- `weddings` +4
- `bow detail` +1
- `relaxed essential` -3

最终分数区间映射到离散等级，而不是“最后谁覆盖谁”。

### 10.3 Unknown 优先于硬猜
如果冲突无法收敛，应允许：
- `formality_level = smart_casual_or_formal_leaning`
- 或内部保留连续分数，外部离散时输出较保守档位

---

## 11. 置信度设计

每个字段应记录置信度，便于下游系统决定是否消费、如何解释。

### 11.1 简化做法
置信度可由以下因素组成：
- evidence 条数
- evidence 来源强度
- 是否存在冲突
- 是否来自 phrase-level 精准匹配
- 是否只来自模糊词

### 11.2 示例
- `wedding guest` 命中 -> 高置信度
- 仅命中 `elevated` -> 中低置信度
- 仅命中 `feminine` -> 低置信度

---

## 12. 配置驱动实现方案

### 12.1 推荐目录结构
```text
mapping/
  global/
    taxonomy.yaml
    terms_style.yaml
    terms_fabric.yaml
    terms_fit.yaml
    occasion.yaml
  brands/
    lululemon.yaml
    aritzia.yaml
    reformation.yaml
  overrides/
    category_overrides.yaml
  scoring/
    formality_rules.yaml
    ornamentation_rules.yaml
```

### 12.2 规则配置示例
```yaml
rule_id: occasion_formal_from_breadcrumb
source_fields:
  - breadcrumbs
match:
  type: phrase
  value: occasion dresses
apply:
  identity.garment_type: dress
  style_semantics.formality_level: formal
weight: 3
confidence: 0.85
```

```yaml
rule_id: bow_detail_adds_ornamentation
source_fields:
  - title
  - description_blocks
  - bullet_points
match:
  type: phrase
  value: bow detail
apply:
  style_semantics.ornamentation_level: medium
  style_semantics.romanticness: medium
weight: 2
confidence: 0.72
```

---

## 13. 核心接口设计

### 13.1 输入接口
```ts
interface RawProductPayload {
  site: string;
  brand?: string;
  productId?: string;
  title?: string;
  breadcrumbs?: string[];
  categoryTags?: string[];
  descriptionBlocks?: string[];
  bulletPoints?: string[];
  fitNotes?: string[];
  fabricNotes?: string[];
  compositionText?: string;
  careText?: string;
  sizeOptions?: string[];
  sizeChart?: Record<string, unknown>;
  modelInfo?: string;
}
```

### 13.2 输出接口
```ts
interface CanonicalGarment {
  identity: Record<string, unknown>;
  construction: Record<string, unknown>;
  shape: Record<string, unknown>;
  styleSemantics: Record<string, unknown>;
  occasionSemantics: Record<string, unknown>;
  sizing: Record<string, unknown>;
  evidence: Record<string, EvidenceItem[]>;
  confidence: Record<string, number>;
}

interface EvidenceItem {
  sourceField: string;
  matchedText: string;
  ruleId: string;
  weight: number;
}
```

---

## 14. 示例：如何识别“formal occasion 产品”

假设商品页包含以下文本：
- breadcrumb: `Occasion Dresses`
- title: `Tailored Bow Detail Midi Dress`
- description: `Perfect for weddings, dinners, and special events.`
- bullet: `Lined`
- bullet: `Invisible back zip`

### 映射过程
1. `Occasion Dresses` -> `garment_type = dress`, `formality +3`
2. `Tailored` -> `fit_intent = tailored`, `polish +2`
3. `weddings`, `special events` -> `occasion_tags += wedding_guest/special_event`, `formality +4`
4. `bow detail` -> `ornamentation +2`, `romanticness +1`
5. `lined`, `back zip` -> construction 完整度增强，但不直接定义 formal

### 最终输出
```json
{
  "identity": {
    "garment_type": "dress",
    "subcategory": "tailored_midi_dress"
  },
  "style_semantics": {
    "formality_level": "formal",
    "ornamentation_level": "medium",
    "romanticness": "medium_low",
    "polish_level": "high"
  },
  "occasion_semantics": {
    "occasion_tags": ["wedding_guest", "dinner", "special_event"]
  }
}
```

---

## 15. 示例：如何识别“花哨产品”

假设文本包含：
- `statement sequin mini dress`
- `designed for parties`
- `all-over embellishment`
- `dramatic feather trim`

### 输出应接近
```json
{
  "style_semantics": {
    "formality_level": "formal",
    "ornamentation_level": "high",
    "visual_loudness": "high",
    "playfulness": "medium",
    "polish_level": "medium"
  },
  "occasion_semantics": {
    "occasion_tags": ["party", "special_event"]
  }
}
```

注意：
- 花哨 ≠ 不正式
- 花哨 ≠ 不高级
- ornamentation 和 formality 必须是两个独立维度

---

## 16. 测试策略

### 16.1 单元测试
针对 term -> property mapping 做 deterministic 测试。

示例：
- 输入 `wedding guest dress`
- 预期 `occasion_tags` 包含 `wedding_guest`
- 预期 `formality_level` >= `formal`

### 16.2 回归测试
建立一组商品页 snapshot，站点升级或词典更新后跑回归。

### 16.3 人工标注评估集
建议构建小规模 gold set，包括以下人工标签：
- garment_type
- silhouette
- formality_level
- ornamentation_level
- visual_loudness
- occasion_tags

这是后续判断规则是否 drift 的基础。

---

## 17. Phase 0 落地建议

### 17.1 优先实现字段
第一阶段优先做：
- garment_type
- silhouette
- fit_intent
- length
- fabric_family
- stretch_level
- structure_level
- drape_level
- formality_level
- ornamentation_level
- occasion_tags
- polish_level
- minimalism_level

### 17.2 优先覆盖的描述语言问题
第一阶段必须重点解决：
1. formal vs casual
2. ornamented / loud vs minimal / quiet
3. occasion signals
4. tailored / relaxed / fitted
5. structured / drapey / soft / sculpting

### 17.3 暂时不要过度细化
先不要在 v0.1 中细分过多审美维度，例如：
- “法式感”
- “old money”
- “clean girl”
- “coquette”

这些更适合后续作为上层 style interpretation，而不是基础映射层。

---

## 18. 后续扩展方向

1. **加入图像辅助信号**
   - print density
   - visible ornamentation
   - silhouette verification

2. **引入用户反馈回流**
   - 用户认为“比想象中正式”
   - 用户认为“太花”
   - 用于修正规则权重

3. **支持 continuous score + discrete bucket 双轨制**
   - 内部维护 0~100 formality / ornamentation score
   - 外部暴露离散标签

4. **支持部位级语义**
   - bodice structured but skirt drapey
   - neckline ornate but body plain

---

## 19. 总结

本中间映射层的核心不是“理解网页”，而是建立一套稳定的服装语义坐标系，让不同网站的分类和文案都能映射进来。

尤其对于“网站对衣服的描述语言不同”这个核心痛点，本设计通过以下方式解决：

1. 将营销文案拆成多个独立维度，而不是整体消费
2. 用 `style_semantics` 显式承接 formal / 花哨 / romantic / minimal / polished 等风格信号
3. 用 `occasion_semantics` 单独承接 wedding / office / party / dinner 等场景信号
4. 用分层词典 + phrase 优先 + category-aware override 处理站点异构表达
5. 用 evidence 和 confidence 保证结果可解释、可调试、可回归测试

最终目标不是让所有网站说一样的话，而是让系统能把它们的话翻译成统一语言。
