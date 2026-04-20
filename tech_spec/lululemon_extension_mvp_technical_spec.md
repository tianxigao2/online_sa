# Lululemon 服饰推荐 Chrome 插件
## 技术文档 v1

---

## 1. 文档目标

本文档用于明确本项目的产品需求、技术范围、系统设计、实施路径、测试方式与交付标准，作为 Phase 0 与 Version A（本地可测版）的统一执行依据。

本文档的目标不是描述长期愿景，而是把当前可执行的 MVP 讲清楚，避免开发过程中 scope 漂移、接口混乱或验收标准模糊。

---

## 2. 项目背景与核心问题

用户在购买女装时，存在几个高频且痛点明确的问题：

1. 不同品牌、不同商品的尺码标准不统一，导致用户很难快速判断应该穿什么码。
2. 用户即使知道自己的风格和身材特点，也很难在浏览商品时快速判断“这件值不值得点进去”或“这件大概率适不适合自己”。
3. 电商网站提供的 filter 和属性标签并不总是足够细，且不同站点之间缺乏一致性。
4. 用户已经知道自己有一些明确的偏好和避雷项，但现有购物体验无法把这些偏好转化为实时筛选与解释型建议。

本项目旨在通过 Chrome 插件，在用户浏览商品页时，自动提取商品信息，并结合用户画像给出：

- 推荐等级
- 尺码建议
- 风险点
- 推荐原因
- 适用场景

该产品第一阶段先聚焦于 Lululemon 单站点，并支持所有服饰类商品，排除 accessories / equipment。

---

## 3. PRD（当前版本的准确产品定义）

### 3.1 产品定位

这是一个面向购物决策场景的 Chrome 插件产品。

插件在用户打开 Lululemon 商品页时自动触发，对当前商品进行实时分析，并返回可解释的推荐建议。其第一版目标不是全网比价、全网搜索，也不是自动搭配，而是解决最核心的“是否适合”和“尺码怎么选”两个问题。

### 3.2 当前版本的产品边界

当前只支持：

- 网站：Lululemon
- 商品范围：所有服饰类（apparel）
- 排除范围：accessories / equipment / non-apparel 商品
- 运行方式：本地可测版（Version A）
- 账号体系：Version A 不强依赖正式 Google 登录，保留后续接入结构
- 数据存储：Version A 可以使用本地 mock / 本地轻量存储

### 3.3 当前产品必须提供的价值

用户第一次使用时，应当能够感受到以下价值：

1. 当前商品能被自动识别
2. 系统能明确告诉用户：
   - 推荐等级
   - 大致推荐尺码
   - 主要风险点
   - 原因解释
3. 输出不是神秘分数，而是可读、可理解、可质疑的判断
4. 对 accessories / equipment 不会误判为服饰推荐对象

### 3.4 产品长期方向（非当前实现范围，但必须兼容）

未来用户画像的主要输入形式将演进为：

- 身着紧身衣物的全身照（正面、侧面）
- 身高
- 体重

系统未来会通过视觉分析和比例推断，估算：

- 腿长感
- 肩宽
- 胸腰臀关系
- 腰线位置
- 上下半身比例
- 体型轮廓

Version A 不要求实现该能力，但技术架构必须兼容未来由图片推导出的 body profile，不得把用户模型写死为“只能手填三围”。

---

## 4. Phase 0 定义

### 4.1 Phase 0 的目的

Phase 0 不是用户可见版本，而是 Version A 能否稳定落地的基础。其目标是先把底层 schema、模块边界、数据流和类目体系定下来。

如果不先做 Phase 0，后续会出现以下问题：

- 商品解析结果字段混乱
- 不同类目输出标准不一致
- 推荐引擎难以扩展
- 后续接入图片体型分析时需要大改
- 测试与验收无法统一

### 4.2 Phase 0 的 scope

Phase 0 必须完成以下定义工作：

#### A. 用户画像 schema

定义两层结构：

1. 原始输入层（可来自手填、未来可来自图片）
2. 派生特征层（推荐引擎真正消费的 body profile）

建议结构：

- 基础输入：height, weight
- 手填测量（可选）：bust, waist, hips, shoulderWidth
- 未来图片入口预留：frontImage, sideImage
- 显式偏好：喜欢/不喜欢的版型、长度、领型、裤腰、压缩感等
- 用途偏好：workout / casual / travel / lounge / commute 等
- 风险偏好：保守 / 可尝试 / 愿意冒险

#### B. 商品结构化 schema

必须定义一套适用于“全服饰类”的统一商品模型，而不是只适用于 dress/top 的 schema。

至少需要统一这些字段：

- source
- productId
- url
- title
- category
- price / salePrice
- availableSizes
- sizeChart
- description
- productFeatures
- materials
- attributes（fit, neckline, sleeve, waistRise, length, inseam, supportLevel, compression, stretch 等）

#### C. 类目 taxonomy

定义支持的服饰类目清单，并明确 accessories / equipment 的排除逻辑。

服饰类建议包括：

- tops
- tees
- tanks
- shirts
- sweaters
- hoodies
- jackets
- outerwear
- dresses
- skirts
- pants
- leggings
- shorts
- jumpsuits
- rompers
- bodysuits
- bras
- underwear
- base_layers

非服饰类排除项包括：

- bags
- bottles
- yoga mats
- towels
- keychains
- belts（如后续需要可另议）
- hats / gloves / scarves（当前按 accessory 处理）

#### D. 输出 schema

推荐系统输出必须统一，不允许不同类目输出格式不一致。

输出至少包括：

- 推荐等级：强推荐 / 可尝试 / 谨慎 / 不建议
- 尺码建议
- 推荐原因（不超过 3 条核心原因）
- 风险点
- 适用场景
- 把握度 / 信息不足说明

#### E. 规则引擎框架

明确推荐引擎采用：

- 通用基础规则
- 类目专属规则模块
- 统一结果汇总与解释层

不允许直接写成不可维护的巨型 if/else 逻辑。

#### F. 模块边界

明确系统模块：

- Chrome extension UI 与注入逻辑
- 页面解析器（parser/adapter）
- 商品标准化层
- 推荐引擎
- 本地用户数据管理
- 测试样本与调试工具

### 4.3 Phase 0 的可交付物

Phase 0 完成后，至少要交付：

1. 用户 schema 文档
2. 商品 schema 文档
3. 类目 taxonomy 文档
4. 输出 schema 文档
5. 推荐引擎模块划分文档
6. 基础项目目录结构草案
7. Version A 的接口与数据流说明

---

## 5. Version A（本地可测版）定义

### 5.1 Version A 的目标

Version A 是第一个可以在本地运行、可被真实使用和测试的版本。

它的目标不是完整产品上线，而是：

1. 在 Chrome 中加载插件
2. 打开 Lululemon 商品页时自动识别
3. 对服饰类商品生成基础可解释推荐
4. 对非服饰类商品不误触发或明确提示不支持
5. 提供一个极简用户资料录入和偏好配置方式
6. 能够通过本地数据完成完整闭环测试

### 5.2 Version A 的范围（in scope）

#### A. 站点支持

- 仅支持 Lululemon

#### B. 商品范围

支持 Lululemon 服饰类商品页，包括但不限于：

- dresses
- skirts
- tops
- shirts / tanks / tees
- jackets / outerwear / hoodies
- pants
- leggings
- shorts
- bras
- bodysuits
- jumpsuits / rompers
- underwear / base layers

#### C. 非支持商品

以下商品不作为推荐对象：

- bags
- yoga mats
- bottles
- towels
- keychains
- 其他 accessories / equipment

#### D. 用户资料输入（Version A）

Version A 以本地 mock 用户资料为主，不要求正式上线登录系统。

可支持：

- 本地 profile JSON
- 本地偏好配置页
- 导入 / 导出 profile 数据

输入字段建议包括：

- height
- weight
- manualMeasurements（可选）
- explicitPreferences
- avoidRules
- useCases
- riskPreference

#### E. 商品页识别

插件应在商品页完成：

- 商品识别
- 类目识别
- 价格识别
- 尺码列表识别
- 商品描述提取
- 关键属性解析

#### F. 推荐功能

插件应输出：

- 推荐等级
- 尺码建议
- 风险点
- 核心原因
- 适用场景
- 信息不足时的提示

#### G. 反馈与本地状态

Version A 支持基础本地交互：

- 收藏（可选）
- 不再推荐类似款（本地记录）
- 用户 profile 导入/导出

### 5.3 Version A 的范围（out of scope）

Version A 明确不做：

- 多站点支持
- 手机 app
- 云端账号同步
- 正式 Google 登录强依赖
- 图片体型分析模型
- 复杂 ML 排序模型
- 全网商品搜索
- 自动降价监控
- 衣橱录入
- 穿搭生成图
- 社交功能
- accessories / equipment 推荐

---

## 6. 技术方案

### 6.1 总体架构

Version A 采用本地可测架构：

1. Chrome Extension 前端
2. 本地 profile 配置页
3. 页面 parser + normalizer
4. 本地 recommendation engine
5. 本地存储与导入导出

即：即使没有正式后端部署，Version A 也能在本地完整运行。

### 6.2 技术栈建议

#### Extension

- TypeScript
- React
- Plasmo（推荐）

#### 本地配置页

- React
- 插件 options page 或本地独立页面

#### 存储

- chrome.storage.local
- 本地 JSON 导入导出

#### 测试

- 单元测试：Vitest / Jest
- 端到端可选：Playwright（后期）

### 6.3 模块划分

#### A. Content Script

职责：

- 检测当前页面是否为 Lululemon 商品页
- 抽取页面信息
- 调用本地推荐逻辑
- 在页面中渲染分析面板

#### B. Parser / Adapter

职责：

- 从页面 HTML / script / DOM 中提取商品原始信息
- 识别 category
- 识别价格与尺码信息
- 判断是否为非服饰类商品

#### C. Normalizer

职责：

- 将原始商品信息映射为统一 schema
- 统一属性枚举与标签
- 生成推荐引擎可消费的标准化对象

#### D. Recommendation Engine

职责：

- 读取用户 profile
- 结合商品标签和类目规则输出推荐结果
- 统一生成解释文本与风险点

#### E. Local Profile Store

职责：

- 存储用户资料
- 存储偏好
- 存储“不再推荐类似款”规则
- 支持导入 / 导出

#### F. UI Panel

职责：

- 展示推荐结果
- 展示尺码建议
- 展示原因 / 风险点
- 提供收藏 / 忽略相似款等按钮（如 Version A 纳入）

---

## 7. 数据模型

### 7.1 用户输入模型（原始输入层）

```ts
interface UserInputProfile {
  height?: number
  weight?: number
  frontImageUrl?: string
  sideImageUrl?: string
  manualMeasurements?: {
    bust?: number
    waist?: number
    hips?: number
    shoulderWidth?: number
  }
  explicitPreferences?: {
    likedFits?: string[]
    dislikedFits?: string[]
    likedLengths?: string[]
    dislikedLengths?: string[]
    likedNecklines?: string[]
    dislikedNecklines?: string[]
    likedRise?: string[]
    dislikedRise?: string[]
    likedSupportLevels?: string[]
    dislikedSupportLevels?: string[]
  }
  useCases?: string[]
  avoidRules?: string[]
  riskPreference?: "safe" | "balanced" | "adventurous"
}
```

### 7.2 派生 body profile（推荐引擎消费层）

```ts
interface DerivedBodyProfile {
  source: "manual" | "image_estimation" | "hybrid"
  proportions?: {
    legLine?: "short" | "balanced" | "long"
    shoulderPresence?: "narrow" | "balanced" | "broad"
    waistDefinition?: "low" | "medium" | "high"
    bustPresence?: "small" | "medium" | "full"
    hipPresence?: "narrow" | "balanced" | "full"
    torsoLength?: "short" | "balanced" | "long"
  }
  derivedMeasurements?: {
    estimatedBust?: number
    estimatedWaist?: number
    estimatedHips?: number
    estimatedShoulderWidth?: number
  }
}
```

### 7.3 商品模型

```ts
type ApparelCategory =
  | "tops"
  | "tees"
  | "tanks"
  | "shirts"
  | "sweaters"
  | "hoodies"
  | "jackets"
  | "outerwear"
  | "dresses"
  | "skirts"
  | "pants"
  | "leggings"
  | "shorts"
  | "jumpsuits"
  | "rompers"
  | "bodysuits"
  | "bras"
  | "underwear"
  | "base_layers"
  | "unknown"

interface StructuredProduct {
  source: "lululemon"
  productId: string
  url: string
  title: string
  category: ApparelCategory
  price?: number
  salePrice?: number
  currency?: string
  availableSizes: string[]
  sizeChart?: {
    rawText?: string
    table?: Array<Record<string, string>>
  }
  description?: string
  materials?: string[]
  productFeatures?: string[]
  attributes: {
    fit?: string
    silhouette?: string
    neckline?: string
    sleeve?: string
    strapStyle?: string
    waistDefinition?: string
    waistRise?: string
    length?: string
    inseam?: string
    supportLevel?: string
    coverage?: string
    compression?: string
    stretch?: string
    intendedUse?: string[]
  }
}
```

### 7.4 输出模型

```ts
interface RecommendationResult {
  level: "strong" | "try" | "cautious" | "avoid"
  sizeRecommendation?: {
    recommendedSize?: string
    confidence: "high" | "medium" | "low"
    reasons: string[]
    risks: string[]
  }
  reasons: string[]
  risks: string[]
  occasions: string[]
  confidenceNote?: string
}
```

---

## 8. 推荐引擎设计

### 8.1 总体原则

推荐引擎 Version A 采用规则引擎，不使用黑盒式模型作为主决策来源。其要求是：

- 可解释
- 可调试
- 可扩展
- 能按类目逐步增强

### 8.2 分层设计

#### 层 1：通用基础规则

适用于所有服饰类：

- 是否命中用户显式喜欢项
- 是否命中用户避雷项
- 用途是否匹配
- 是否存在信息不足
- 尺码信息是否充足
- 面料弹性 / fit 风险
- 暴露度 / 长度 / 压缩感风险

#### 层 2：类目专属规则

- dressRules
- skirtRules
- topRules
- leggingsRules
- pantsShortsRules
- outerwearRules
- braRules
- bodysuitRules
- jumpsuitRomperRules

第一版要求：

- 所有类目都至少接入基础规则
- 重点类目支持更细规则：tops / dresses / skirts / leggings / pants / shorts / outerwear

#### 层 3：统一汇总与解释层

将分数与命中规则映射成：

- 推荐等级
- 三条核心原因
- 风险点
- 适用场景
- 信息不足提示

### 8.3 尺码建议策略

Version A 尺码建议采用启发式规则：

1. 优先读取页面尺码表
2. 如果无完整尺码表，则依据 available sizes + 类目 + fit + stretch 输出低把握度建议
3. 如果商品文案含有 oversized / slim fit / compressive / high support 等信息，则做尺码风险修正

如果信息不足，系统必须明确写出“不确定性高”，不能假装准确。

---

## 9. 页面解析策略

### 9.1 解析目标

从 Lululemon 商品页提取：

- 商品标题
- 价格 / sale price
- 当前有货尺码
- 商品描述
- 商品特征文案
- 尺码表（如可读取）
- 类目和属性线索

### 9.2 数据来源优先级

1. 页面内嵌 JSON / script 数据
2. 结构化 DOM 节点
3. 文本与标题关键词解析

### 9.3 非服饰排除逻辑

必须实现非服饰类商品过滤逻辑。

排除依据可以来自：

- breadcrumb
- 页面 category
- title keyword
- product metadata

例如命中以下关键词优先视为非服饰：

- bottle
- bag
- mat
- towel
- keychain
- accessory
- equipment

### 9.4 容错要求

如果某些字段缺失：

- 系统仍应尽可能展示部分结果
- 明确提示“信息不足”
- 不应导致插件报错或空白崩溃

---

## 10. UI 设计要求（Version A）

### 10.1 商品页面板必须展示

- 商品是否在支持范围内
- 推荐等级
- 推荐尺码
- 2–3 条原因
- 1–3 条风险点
- 适用场景
- 信息不足提示（如有）

### 10.2 交互要求

Version A 可包含：

- 标记“以后别推荐类似款”
- 打开 profile 配置页
- 导入/导出 profile

### 10.3 非服饰类商品页面

应展示以下二选一效果之一：

1. 不显示插件推荐面板
2. 显示简短提示：“当前商品不在服饰推荐范围内”

Version A 推荐采用第二种，方便测试和调试。

---

## 11. 实施计划

### 11.1 实施顺序

#### Step 1：Phase 0 文档与 schema 定稿

完成：

- schema
- taxonomy
- 输出规范
- 目录结构

#### Step 2：Extension 项目骨架

完成：

- content script
- panel UI
- options/profile 页面
- 本地存储模块

#### Step 3：Lululemon parser

完成：

- 商品页识别
- 服饰 vs 非服饰分类
- 核心商品字段抽取
- 基础属性归一化

#### Step 4：Recommendation Engine v1

完成：

- 通用基础规则
- 重点类目规则
- 输出解释生成

#### Step 5：本地 profile 管理

完成：

- profile 录入
- 导入/导出
- 本地存储
- ignore similar 本地规则

#### Step 6：自测与修复

完成：

- parser 自测
- 推荐结果自测
- 非服饰误判测试
- UI 稳定性测试

---

## 12. Self Test（开发者自测方案）

### 12.1 自测目标

确保 Version A 至少达到“在真实浏览场景下可用”的水平，而不是只在 demo 数据上看起来成立。

### 12.2 自测维度

#### A. 页面识别测试

测试内容：

- Lululemon 服饰商品页能触发
- Lululemon 非服饰商品页不误推荐
- 页面切换时状态能刷新

通过标准：

- 服饰页触发率高
- 非服饰页误触发率低
- 无明显残留旧页面结果问题

#### B. 数据解析测试

测试内容：

- title 是否正确
- category 是否正确
- price 是否正确
- available sizes 是否正确
- description / features 是否有提取

通过标准：

- 核心字段准确率达到可用水平
- 缺失字段时不崩溃

#### C. 推荐逻辑测试

测试内容：

- 避雷项是否生效
- 用途偏好是否影响推荐
- 重点类目是否使用对应规则
- 信息不足时是否降低把握度

通过标准：

- 输出与预期方向一致
- 原因和风险点与商品实际特征相符
- 不出现明显自相矛盾

#### D. 尺码建议测试

测试内容：

- 有尺码表商品是否能输出推荐码
- 信息不足商品是否降低 confidence
- oversized / compressive 等文案是否影响建议

通过标准：

- 有信息时给出合理建议
- 没信息时不装懂

#### E. UI 与交互测试

测试内容：

- 面板展示是否稳定
- 不遮挡核心购买按钮
- profile 改动后结果是否刷新
- ignore similar 是否落地到本地存储

通过标准：

- 面板可见、可交互、状态正确

### 12.3 测试样本要求

Version A 开发期应准备一批固定测试样本：

- 每个服饰类目若干商品页
- 若干 accessories / equipment 商品页
- 若干信息丰富的商品页
- 若干信息较少的商品页

建议最少样本规模：

- 服饰类样本：20–30 个
- 非服饰类样本：8–10 个

### 12.4 Bug 等级建议

#### P0
- 插件在支持页面完全不触发
- 页面崩溃 / 报错
- 非服饰页被强行推荐

#### P1
- 类目识别明显错误
- 尺码建议明显荒谬
- 原因和风险点互相矛盾

#### P2
- 个别字段缺失
- 文案表达不自然
- UI 小范围错位

---

## 13. 可交付标准（Delivery Criteria）

Version A 交付必须满足以下标准，才能认为“可交付”：

### 13.1 功能可运行

- 插件可在本地 build 并加载到 Chrome
- 打开 Lululemon 商品页时能够自动触发
- 能识别服饰类与非服饰类

### 13.2 推荐功能可用

- 对服饰类商品输出推荐等级
- 对大部分商品输出基础尺码建议或明确不确定提示
- 输出中包含原因和风险点
- 输出文本为可解释的人话，而非黑盒分数

### 13.3 支持全服饰范围

- 所有主要服饰类商品至少能进入推荐链路
- accessories / equipment 被正确排除

### 13.4 Profile 机制可用

- 用户可通过本地方式配置基本 profile
- 可导入 / 导出 profile
- 修改 profile 后推荐结果发生相应变化

### 13.5 稳定性达标

- 不因字段缺失导致插件崩溃
- 页面刷新或切换时状态正确
- 常见测试样本中无 P0 问题

### 13.6 结构可扩展

- 数据模型兼容未来图片体型分析输入
- 推荐引擎支持新增类目规则
- parser / normalizer / engine 模块边界明确

---

## 14. 非目标与未来扩展

### 14.1 当前非目标

当前版本不以“推荐是否绝对精准”作为目标，而以“建立稳定、可解释、可迭代的基础系统”作为目标。

### 14.2 后续自然扩展方向

1. Google 登录
2. 云端 profile 同步
3. 多站点支持
4. 图片体型分析
5. 更精细的尺码推断
6. 收藏与偏好学习
7. 站点级规则维护后台

---

## 15. 最终结论

本项目当前应收敛为：

- 单站点：Lululemon
- 全服饰类支持
- 排除 accessories / equipment
- 本地可测版优先
- 规则引擎为主
- 图片体型分析结构预留

Phase 0 的任务是把 schema、taxonomy、模块边界和输出标准定死；Version A 的任务是让系统能在 Chrome 中真实跑起来，并在真实商品页上输出可解释建议。

只有当 Version A 达到“本地可跑、真实页面可测、结果可解释、范围可控”的标准后，才进入下一阶段。

