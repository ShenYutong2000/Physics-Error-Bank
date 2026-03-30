# 新功能设计：错题统计与可视化
_Exported on 3/30/2026 at 22:41:46 GMT+8 from Cursor (2.6.21)_

---

**User**

我想添加一个新功能，我现在有2019至2025年的过往单选题试卷正确答案与每道题对应的标签(每年有Nov和May共两份，每份卷子有30道单选题)。学生可以点开一个特定试卷（不用显示题目），在表格中输入每道题的答案，点击提交后可以显示他做错的题目以及标签，并且可视化他错题标签的统计分布（柱状图），请帮我进行设计

---

**Cursor**

我会先快速查看你现有的数据结构和页面组织（尤其是 `lib/types.ts`、题库页和添加页），然后给你一套可直接落地的功能设计：包含数据模型、页面流程、校验逻辑和图表实现方案。

我已经看到你现有的标签体系和柱状图组件，下一步我会确认你项目里 API 与数据存储的组织方式，然后给你“最少改动、可扩展”的完整方案。

你这个需求非常适合做成一个**“真题练习模块”**，并且可以复用你现有的标签体系和柱状图组件。下面给你一套能直接落地的设计。

## 功能目标（对应你的描述）

- 学生先选择一份试卷（`2019-2025`，每年 `May/Nov`，每份30题）
- 进入试卷后只显示答题表格（不显示题目）
- 输入每题答案后点击提交
- 返回：
  - 总分/正确率
  - 错题题号、正确答案、学生答案
  - 每道错题对应标签
  - 错题标签分布柱状图

---

## 推荐页面结构（前端）

- `papers`（试卷列表页）
  - 按年份分组，显示 `May / Nov`
  - 每个卡片显示：年份、场次、题量（30）
- `papers/[paperId]`（答题页）
  - 30行表格：题号 + 答案输入（建议用 `A/B/C/D` 单选按钮或下拉）
  - 顶部进度：已答 `x/30`
  - 按钮：`提交`
- `papers/[paperId]/result/[attemptId]`（结果页）
  - 成绩摘要（正确数、错误数、正确率）
  - 错题清单（题号、你的答案、正确答案、标签）
  - 标签统计柱状图（可复用 `components/tag-stats-chart.tsx`）

---

## 数据模型设计（Prisma）

你现在已有 `User/Mistake/Tag`，建议新增这4个模型：

1. `Paper`：一份试卷（如 `2021-Nov`）
2. `PaperQuestion`：某份试卷的某题（题号、正确答案、标签）
3. `PaperAttempt`：某用户的一次提交记录
4. `PaperAttemptAnswer`：一次提交里每题的学生答案与判分结果

核心字段建议：

- `Paper`
  - `id`、`year`、`session`(`MAY|NOV`)、`title`
  - `questionCount`（默认30）
  - `@@unique([year, session])`
- `PaperQuestion`
  - `paperId`、`number`(1..30)、`correctAnswer`、`tags`（`String[]` 或关联Tag表）
  - `@@unique([paperId, number])`
- `PaperAttempt`
  - `userId`、`paperId`、`correctCount`、`wrongCount`、`submittedAt`
- `PaperAttemptAnswer`
  - `attemptId`、`questionNumber`、`studentAnswer`、`correctAnswer`、`isCorrect`、`tagsSnapshot`

> 你现在的标签是 `PRESET_TAGS`，建议复用，避免新模块标签不统一。

---

## API 设计（后端）

建议新增：

- `GET /api/papers`
  - 返回可选试卷列表（含题量）
- `GET /api/papers/:id`
  - 返回答题页需要的基础信息（仅题号1-30，不返回题干）
- `POST /api/papers/:id/submit`
  - 入参：30题答案
  - 服务端进行判分（不能在前端判）
  - 返回：成绩 + 错题列表 + 标签统计 + attemptId
- `GET /api/paper-attempts/:attemptId`
  - 返回某次结果详情（用于刷新后还可查看）

---

## 判分与统计逻辑

提交时服务端流程：

1. 拉取该 `paperId` 的30道题标准答案与标签
2. 逐题比对：
   - `normalize(answer) => trim().toUpperCase()`
   - 空值记为未作答（也算错）
3. 生成：
   - `correctCount`、`wrongCount`
   - `wrongQuestions[]`（题号、你的答案、正确答案、标签）
4. 统计错题标签：
   - `Map<tag, count>`
   - 多标签题每个标签都 +1
5. 存储 attempt（可追踪历史），返回前端渲染

---

## 你现有代码可复用点

- 标签常量：`lib/types.ts` 里的 `TAG_GROUPS / PRESET_TAGS`
- 柱状图：`components/tag-stats-chart.tsx`
  - 你只要把错题统计转成 `[{ tag, count }]` 传进去即可
- 页面风格：`app/(main)/add/page.tsx` 与 `app/(main)/library/page.tsx` 的卡片和按钮样式可以直接复用
- 导航：`components/duo-nav.tsx` 可新增 `Papers` 入口

---

## 数据导入方案（你已有2019-2025答案+标签）

建议先统一成一个 JSON（最省事）：

```json
{
  "papers": [
    {
      "year": 2021,
      "session": "NOV",
      "questions": [
        { "number": 1, "correctAnswer": "B", "tags": ["A.1 Kinematics"] }
      ]
    }
  ]
}
```

然后写一个 seed/import 脚本一次性入库。  
总量只有 `14 * 30 = 420` 题，体量很小，查询和统计都很轻。

---

## 交互细节建议（实用）

- 提交前提醒：未作答题号列表（可允许提交）
- 答案输入用固定选项（避免输入非法字符）
- 结果页支持“只看错题”
- 提供“再做一遍同一套”按钮
- 可选：历史趋势（同一卷多次尝试正确率变化）

---

如果你愿意，我下一步可以给你一份**“按你当前项目目录可直接开工的实施清单”**（具体到每个文件该新增什么、接口入参与返回体定义、以及 Prisma model 草案）。  
当前是 Ask 模式，我先给设计；你切到 Agent 模式后我可以直接帮你落代码。

---

**User**

我想新增一个新的教师用户类别有别于学生用户，会提供一个教师用户邮箱的名单（如果注册用户在名单上，则是教师用户，初始名单中有yutshen@uwcchina.org）。在新功能中，教师可以添加新试卷并上传对应的正确答案与每道题标签。同时，教师用户可以点开每个试卷并看到每个同学的错题标签统计分布，与班级的总体错题标签统计，请结合上述内容完善设计

---

**Cursor**


下面在「真题练习 + 判分统计」的基础上，把**教师身份**、**试卷管理**和**班级学情分析**补全成一套可落地的设计（与现有 `User` + 登录体系兼容）。

---

## 1. 用户类别：教师 vs 学生

**规则（你描述的）**

- 注册仍是同一套账号体系（同一 `User` 表）。
- **是否在教师名单上**由邮箱决定：注册邮箱（或登录后识别到的邮箱）在名单里 → `role = TEACHER`，否则 `STUDENT`。
- 初始名单含：`yutshen@uwcchina.org`（可扩展更多）。

**实现要点**

- **名单来源**（三选一或组合）：
  - **环境变量**：`TEACHER_EMAILS=yutshen@uwcchina.org,other@school.org`（适合少量、运维改）。
  - **数据库表** `TeacherEmailAllowlist`：`email` 唯一，便于后台增删、审计。
  - **静态 JSON** 随部署更新（简单但改名单要发版）。
- **判定时机**：用户**注册成功**或**每次登录/会话刷新**时，根据当前 `user.email` 与名单比对，写入 `User.role`（或仅算 `isTeacher` 布尔，二选一）。
- **前端/接口**：`GET /api/auth/me`（若已有）或等价接口返回 `{ email, role: "teacher" | "student" }`，用于隐藏/显示教师菜单与路由守卫。

**安全**

- 教师名单**仅服务端可读**；不要把完整名单下发给前端（前端只需知道「当前用户是不是教师」）。
- 若有人把自己邮箱改成名单上的地址：若产品允许改邮箱，需在改邮箱时重新校验名单；若不允许改邮箱，则风险较低。

---

## 2. 权限模型（谁能做啥）

| 能力 | 学生 | 教师 |
|------|------|------|
| 浏览/作答已发布试卷 | ✓ | ✓（可选：教师也可做题自测） |
| 提交答案、看自己的错题与标签图 | ✓ | ✓ |
| **创建/编辑试卷**、上传答案与标签 | ✗ | ✓ |
| **看某试卷下班级的错题标签统计** | ✗ | ✓ |
| **看某试卷下每个学生的错题标签统计** | ✗ | ✓ |

路由：`/teacher/...` 或 `/papers/manage` 等，**服务端校验 `role === TEACHER`**，不能只靠前端隐藏按钮。

---

## 3. 数据模型补充（在先前 Paper / Attempt 设计上扩展）

在已有设想基础上建议明确：

**试卷与题目（教师维护）**

- `Paper`：`id`、`title`、`year`、`session`（May/Nov）、`questionCount`（如 30）、`createdByUserId`（教师）、`publishedAt`（可选：未发布学生不可见）、`classId` 或 `organizationId`（若要多班级，见下）。
- `PaperQuestion`：`paperId`、`number`、`correctAnswer`、`tags[]`（建议仍用你现有的 `PRESET_TAGS` 字符串，与错题本一致）。

**学生作答**（与之前一致）

- `PaperAttempt`：`userId`、`paperId`、`submittedAt`、汇总字段等。
- `PaperAttemptAnswer`：逐题结果；错题用于算标签统计。

**班级（若需要「班级总体」）**

- **方案 A（简单）**：一个 `Class`（或 `Cohort`），教师创建班级，学生通过**邀请码/班级码**加入，`User.classId`。
- **方案 B**：无班级表，用「选了同一门课/同一试卷的所有学生」当隐式班级——仅当全校共用一套试卷且你愿意把所有提交者都算进去时可用，一般不推荐。

「班级总体错题标签统计」需要明确：**统计范围是哪些学生**。通常用方案 A。

---

## 4. 教师功能流程

### 4.1 添加新试卷 + 正确答案与标签

- **入口**：仅教师可见，例如「试卷管理 → 新建试卷」。
- **步骤建议**：
  1. 填元数据：年份、场次、题量（默认 30）、标题。
  2. **导入数据**（推荐其一）：
     - 上传 **CSV/Excel**（列：题号、正确答案、标签，可多标签列或分号分隔）；
     - 或粘贴 **JSON**（与之前设计的 `questions[]` 结构一致）；
     - 或表格 UI 逐行编辑（题量大时累，适合改错）。
  3. 服务端校验：题号 1..N 连续、答案 ∈ {A,B,C,D}、标签 ⊆ `PRESET_TAG_SET`（你项目里已有预设标签集）。
  4. 保存为草稿 → **发布**（`publishedAt`），学生端列表只显示已发布试卷。

### 4.2 教师查看：每张试卷的学情

**页面：`/teacher/papers/[paperId]`（示例）**

1. **筛选**：班级（若有）、时间范围（可选）。
2. **班级总体**
   - 指标：提交人数、平均分/正确率（可选）。
   - **错题标签柱状图**：对所有**错题**上的标签做频次统计（与 `TagStatsChart` 同形态：`{ tag, count }`）。
   - 可附：**最常错的题号 Top K**（按错误次数）。
3. **每个学生**
   - 列表：学生标识（邮箱脱敏或姓名若你有）、提交次数、最近成绩。
   - 点进一名学生：**该生在该卷上的错题标签柱状图**（仅基于该生 `PaperAttempt` 的错题）。
4. **隐私与体验**
   - 列表默认按邮箱/学号排序；若合规要求，可配置「仅显示学号后几位」。
   - 无提交时显示「暂无数据」。

**统计口径（务必写清）**

- **单次提交**：可按「最近一次」或「历次合并」；建议默认 **最近一次**，并提供切换「该生历史所有尝试合并」若你需要。

---

## 5. API 设计（教师相关）

在原有学生 API 之外增加：

- `GET /api/teacher/papers` — 教师创建的/有权限管理的试卷列表。
- `POST /api/teacher/papers` — 创建试卷元数据。
- `POST /api/teacher/papers/:id/questions` — 批量写入题目（或合并进创建流程）。
- `PATCH /api/teacher/papers/:id/publish` — 发布。
- `GET /api/teacher/papers/:id/analytics?classId=...`
  - 返回：`classTagCounts: { tag, count }[]`、`submissions: number`、可选 `perStudent: { userId, displayName, attemptId?, tagCounts }[]`。
- 学生侧仍用：`GET /api/papers`、`POST /api/papers/:id/submit` 等，且 **仅已发布且对学生可见** 的试卷。

所有 `teacher/*` 路由内：`requireTeacher()`（查 `User.role` 或名单）。

---

## 6. 与现有「错题本」的关系

- **标签体系统一**：试卷题目标签仍用 `lib/types.ts` 的 `PRESET_TAGS`，教师导入时校验，这样班级统计与 Library 里的标签语义一致。
- **可选增强**：学生某次提交后，一键「把错题同步到错题本」——需配图或仅记题号+标签，这是独立功能，可二期做。

---

## 7. 实施顺序建议

1. **User.role + 教师邮箱名单**（含 `yutshen@uwcchina.org`）与 `auth/me`。
2. **Paper / PaperQuestion** + 教师 CRUD + 发布。
3. **学生作答 + Attempt** + 个人结果页与柱状图。
4. **Teacher analytics**：班级汇总 + 按学生 breakdown，复用 `TagStatsChart`。
5. （可选）**Class** 与加入班级，再让班级统计只含本班。

---

## 8. 需要你拍板的产品细节（避免返工）

- 一名教师是否**只能看到自己创建的试卷**，还是全校教师共享题库？
- 「班级」是硬性需求还是先做「全站选了该卷的所有学生」？
- 学生是否允许**多次提交**同一卷？教师统计默认取哪一次？

把这几点定下来，库表和 API 就可以一次定型。若你切换到 Agent 模式，我可以按你选的方案对照现有 `schema.prisma` 和 `requireDbAndUser` 给出具体字段与路由文件名清单（仍可由你审阅后再改代码）。

---

**User**

完善：教师可共享题库，选择全站选了该卷的所有学生，学生允许多次提交同一卷，在学生提交答案更新后，教师统计也会对应更新，在登录端要求学生输入姓名，在教师统计中也会显示每位学生姓名，请结合上述内容完善设计

---

**Cursor**

很好，这些约束一加，方案就可以定型了。下面是**按你最新决定**的完整版本（可直接作为开发规格）。

## 一、核心规则（已定）

- 教师共享题库：所有教师可见并管理同一套试卷库。
- 班级口径：统计范围为“**全站选了该卷的所有学生**”。
- 学生可多次提交同一卷。
- 教师统计实时反映学生最新提交（或按你选择的统计口径）。
- 登录时学生需填写姓名；教师统计中显示学生姓名。

---

## 二、数据模型（建议）

### 1) 用户表扩展 `User`
新增字段：
- `role`: `TEACHER | STUDENT`
- `name`: `String`（必填，登录/注册时采集）
- `updatedAt`: 时间戳（可选但建议）

教师判定仍基于 allowlist（含 `yutshen@uwcchina.org`）。

### 2) 教师名单表（推荐）
`TeacherEmailAllowlist`
- `email`（唯一）
- `createdAt`

> 比环境变量更易维护；初始插入 `yutshen@uwcchina.org`。

### 3) 试卷相关
`Paper`
- `id`, `year`, `session`, `title`, `questionCount`, `publishedAt`
- `createdBy`（可记录创建者，但权限不依赖它）

`PaperQuestion`
- `paperId`, `number`(1..30), `correctAnswer`, `tags`（建议 `String[]`）

### 4) 多次提交与答案快照
`PaperAttempt`
- `id`, `paperId`, `userId`, `submittedAt`
- `correctCount`, `wrongCount`, `accuracy`
- `isLatest`（关键：每个 `(paperId, userId)` 仅一条为 true）

`PaperAttemptAnswer`
- `attemptId`, `questionNumber`
- `studentAnswer`, `correctAnswer`, `isCorrect`
- `tagsSnapshot`（提交时快照，避免后续改题标签导致历史回放不一致）

---

## 三、统计口径（重点）

你现在要求“学生提交更新后教师统计对应更新”，推荐默认：

- **教师看板默认统计每位学生的“最新一次提交”**（`isLatest = true`）
- 学生再次提交后：
  - 新建一条 `PaperAttempt`
  - 旧 attempt 的 `isLatest` 置 `false`
  - 新 attempt 的 `isLatest` 置 `true`
  - 教师统计自动变化（查询最新集即可）

可选附加：
- 提供切换：`latest` / `all attempts`
  - `latest` 反映当前水平
  - `all attempts` 反映累计薄弱点

---

## 四、API 设计（定稿版）

### 学生端
- `GET /api/papers`
  - 返回已发布试卷列表
- `GET /api/papers/:id`
  - 返回题号 1..N（不返回题目）
- `POST /api/papers/:id/submit`
  - 入参：30题答案
  - 动作：判分 + 写 `PaperAttempt` + 写 `PaperAttemptAnswer` + 维护 `isLatest`
  - 出参：成绩、错题、标签统计、attemptId
- `GET /api/paper-attempts/:attemptId`
  - 查看一次提交详情（历史回看）

### 教师端（共享题库）
- `GET /api/teacher/papers`
- `POST /api/teacher/papers`
- `PUT /api/teacher/papers/:id/questions`（整卷覆盖更新）
- `PATCH /api/teacher/papers/:id/publish`
- `GET /api/teacher/papers/:id/analytics?mode=latest|all`
  - 返回：
    - `overallTagCounts`
    - `students[]`：`userId`, `name`, `email`, `tagCounts`, `latestScore`, `attemptCount`

---

## 五、登录与姓名采集

## 登录/注册流程调整
- 注册时：`name + email + password + recovery...`
- 登录时：
  - 若已有 `name`，正常登录
  - 若 `name` 为空（兼容老用户），登录后强制补全姓名（一次性）

## 校验规则
- `name` 必填，去前后空格，长度建议 2~30
- 防止纯空白、超长或特殊字符滥用

## 教师页面展示
- 学生列表显示 `name`（主）+ `email`（次）
- 若姓名缺失（极少兼容场景）显示 `Unnamed` 并提示完善

---

## 六、教师看板页面结构（你这版需求）

`/teacher/papers/[paperId]`

- 顶部：试卷信息、统计口径切换（最新/全部）
- 卡片1：全站总体错题标签柱状图（复用 `TagStatsChart`）
- 卡片2：学生列表（姓名、邮箱、最新分数、提交次数）
- 点开某学生：
  - 该生错题标签柱状图
  - 最近一次错题题号/标签
  - 历史提交记录（时间 + 分数）

---

## 七、并发与一致性（必须做）

在 `POST /submit` 里用事务：

1. 锁定该用户该试卷当前 latest（或先 updateMany 置 false）
2. 创建新 attempt（`isLatest=true`）
3. 写入 answers
4. 提交事务

并加唯一约束（或逻辑约束）确保 `(paperId, userId, isLatest=true)` 只有一条，避免并发双提交导致教师统计抖动。

---

## 八、你现有项目可直接复用

- 标签体系：`lib/types.ts` 的 `PRESET_TAGS/PRESET_TAG_SET`
- 统计图：`components/tag-stats-chart.tsx`
- 鉴权模式：沿用 `requireDbAndUser`，新增 `requireTeacher`

---

如果你愿意，我下一步可以给你一份**“数据库迁移草案 + API 入参/出参 TS 类型定义”**，你可以直接交给实现阶段使用。

---

**User**

请给我一份给你一份**“数据库迁移草案 + API 入参/出参 TS 类型定义”**，以便给实现阶段使用

---

**Cursor**

下面给你一份可直接进入实现阶段的草案，分为两部分：

1) **数据库迁移草案（Prisma）**  
2) **API 入参/出参 TS 类型定义**

我按你已确认的规则写：教师共享题库、全站学生口径、学生可多次提交、教师看最新统计动态更新、登录要求姓名。

---

## 一、数据库迁移草案（Prisma）

建议新建 migration，核心是：扩展 `User`，新增教师名单、试卷、题目、提交、提交明细。

### 1) 枚举

```prisma
enum UserRole {
  STUDENT
  TEACHER
}

enum PaperSession {
  MAY
  NOV
}

enum ChoiceOption {
  A
  B
  C
  D
  BLANK
}
```

---

### 2) 修改 `User` 模型（在你现有基础上扩展）

```prisma
model User {
  id                    String    @id @default(uuid()) @db.Uuid
  email                 String    @unique
  passwordHash          String    @map("password_hash")
  recoveryAnswer1Hash   String?   @map("recovery_answer_1_hash")
  recoveryAnswer2Hash   String?   @map("recovery_answer_2_hash")
  recoveryAnswer3Hash   String?   @map("recovery_answer_3_hash")
  createdAt             DateTime  @default(now()) @map("created_at")

  // NEW
  name                  String    @default("") @db.VarChar(80)
  role                  UserRole  @default(STUDENT)
  updatedAt             DateTime  @updatedAt @map("updated_at")

  mistakes              Mistake[]
  tags                  Tag[]

  // NEW
  paperAttempts         PaperAttempt[]
  papersCreated         Paper[]   @relation("PaperCreator")

  @@map("users")
}
```

---

### 3) 教师邮箱白名单（动态维护）

```prisma
model TeacherEmailAllowlist {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique @db.VarChar(320)
  createdAt DateTime @default(now()) @map("created_at")

  @@map("teacher_email_allowlist")
}
```

> 初始 seed 插入：`yutshen@uwcchina.org`

---

### 4) 试卷与题目（教师共享题库）

```prisma
model Paper {
  id            String        @id @default(uuid()) @db.Uuid
  title         String        @db.VarChar(160)
  year          Int
  session       PaperSession
  questionCount Int           @default(30) @map("question_count")
  publishedAt   DateTime?     @map("published_at")
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  createdById   String        @map("created_by_id") @db.Uuid
  createdBy     User          @relation("PaperCreator", fields: [createdById], references: [id], onDelete: Restrict)

  questions     PaperQuestion[]
  attempts      PaperAttempt[]

  @@unique([year, session])
  @@index([publishedAt])
  @@index([createdAt(sort: Desc)])
  @@map("papers")
}

model PaperQuestion {
  id            String       @id @default(uuid()) @db.Uuid
  paperId       String       @map("paper_id") @db.Uuid
  number        Int
  correctAnswer ChoiceOption @map("correct_answer")
  // 用字符串数组，直接兼容你现有 PRESET_TAGS
  tags          String[]     @default([])

  paper         Paper        @relation(fields: [paperId], references: [id], onDelete: Cascade)

  @@unique([paperId, number])
  @@index([paperId])
  @@map("paper_questions")
}
```

---

### 5) 多次提交与答案明细（支持 latest 统计）

```prisma
model PaperAttempt {
  id            String    @id @default(uuid()) @db.Uuid
  paperId       String    @map("paper_id") @db.Uuid
  userId        String    @map("user_id") @db.Uuid

  submittedAt   DateTime  @default(now()) @map("submitted_at")
  correctCount  Int       @default(0) @map("correct_count")
  wrongCount    Int       @default(0) @map("wrong_count")
  accuracy      Decimal   @default(0) @db.Decimal(5, 2) // 0.00 ~ 100.00

  // 关键字段：每个 (paper, user) 仅一个 latest=true
  isLatest      Boolean   @default(true) @map("is_latest")

  paper         Paper     @relation(fields: [paperId], references: [id], onDelete: Cascade)
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  answers       PaperAttemptAnswer[]

  @@index([paperId, userId, submittedAt(sort: Desc)])
  @@index([paperId, isLatest])
  @@index([userId, submittedAt(sort: Desc)])
  @@map("paper_attempts")
}

model PaperAttemptAnswer {
  id             String       @id @default(uuid()) @db.Uuid
  attemptId      String       @map("attempt_id") @db.Uuid
  questionNumber Int          @map("question_number")

  studentAnswer  ChoiceOption @map("student_answer")
  correctAnswer  ChoiceOption @map("correct_answer")
  isCorrect      Boolean      @map("is_correct")

  // 提交时保存标签快照，防止后续改题标签影响历史回放
  tagsSnapshot   String[]     @default([]) @map("tags_snapshot")

  attempt        PaperAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)

  @@unique([attemptId, questionNumber])
  @@index([attemptId])
  @@index([isCorrect])
  @@map("paper_attempt_answers")
}
```

---

### 6) 迁移后需要的 DB 约束建议（非常重要）

Prisma 目前对“部分唯一索引（isLatest=true）”支持有限，建议额外 SQL：

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_paper_attempt_latest
ON paper_attempts (paper_id, user_id)
WHERE is_latest = true;
```

这样可强制保证每个学生每套卷只有一个 latest attempt，教师看板会稳定。

---

## 二、API 入参/出参 TS 类型定义（草案）

建议放在：`lib/paper-types.ts`（实现时你可拆分）。

```ts
// ========== 通用 ==========
export type UserRole = "STUDENT" | "TEACHER";
export type PaperSession = "MAY" | "NOV";
export type ChoiceOption = "A" | "B" | "C" | "D" | "BLANK";
export type AnalyticsMode = "latest" | "all";

// ========== 用户 ==========
export type AuthMeResponse = {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
};

// ========== 试卷基础 ==========
export type PaperSummary = {
  id: string;
  title: string;
  year: number;
  session: PaperSession;
  questionCount: number;
  publishedAt: string | null;
};

export type PaperListResponse = {
  papers: PaperSummary[];
};

// 学生答题页只需题号，不返回题干
export type PaperForAnsweringResponse = {
  paper: PaperSummary;
  questions: Array<{ number: number }>; // 1..questionCount
};

// ========== 教师创建/更新试卷 ==========
export type TeacherCreatePaperRequest = {
  title: string;
  year: number;
  session: PaperSession;
  questionCount: number; // 默认30
};

export type TeacherCreatePaperResponse = {
  paper: PaperSummary;
};

export type TeacherUpsertPaperQuestionsRequest = {
  questions: Array<{
    number: number;
    correctAnswer: ChoiceOption; // 不允许 BLANK
    tags: string[];              // 必须在 PRESET_TAGS 中
  }>;
};

export type TeacherUpsertPaperQuestionsResponse = {
  paperId: string;
  questionCount: number;
  updatedAt: string;
};

export type TeacherPublishPaperRequest = {
  publish: boolean; // true 发布, false 取消发布
};

export type TeacherPublishPaperResponse = {
  paper: PaperSummary;
};

// ========== 学生提交 ==========
export type SubmitPaperRequest = {
  answers: Array<{
    questionNumber: number;
    answer: ChoiceOption; // 未答可传 BLANK
  }>;
};

export type WrongQuestionItem = {
  questionNumber: number;
  studentAnswer: ChoiceOption;
  correctAnswer: ChoiceOption;
  tags: string[];
};

export type TagCountRow = {
  tag: string;
  count: number;
};

export type SubmitPaperResponse = {
  attemptId: string;
  paperId: string;
  submittedAt: string;
  correctCount: number;
  wrongCount: number;
  accuracy: number; // 0-100
  wrongQuestions: WrongQuestionItem[];
  wrongTagCounts: TagCountRow[]; // 给学生结果页柱状图
};

// ========== 提交详情（历史） ==========
export type AttemptDetailResponse = {
  attempt: {
    id: string;
    paperId: string;
    userId: string;
    submittedAt: string;
    correctCount: number;
    wrongCount: number;
    accuracy: number;
  };
  wrongQuestions: WrongQuestionItem[];
  wrongTagCounts: TagCountRow[];
};

// ========== 教师统计 ==========
export type TeacherPaperAnalyticsResponse = {
  paper: PaperSummary;
  mode: AnalyticsMode;

  overall: {
    studentCount: number;         // 参与过该卷的学生数
    attemptCount: number;         // mode=all 时可 > studentCount
    averageAccuracy: number;      // 可选但建议给
    wrongTagCounts: TagCountRow[];// 班级总体柱状图
  };

  students: Array<{
    userId: string;
    name: string;
    email: string;
    attemptCount: number;
    latestAttemptId: string | null;
    latestSubmittedAt: string | null;
    latestAccuracy: number | null;
    wrongTagCounts: TagCountRow[]; // 每位学生柱状图
  }>;
};
```

---

## 三、接口与权限矩阵（实现时照表）

- 学生可用：
  - `GET /api/papers`
  - `GET /api/papers/:id`
  - `POST /api/papers/:id/submit`
  - `GET /api/paper-attempts/:attemptId`（仅自己）
- 教师可用（`requireTeacher`）：
  - `GET /api/teacher/papers`
  - `POST /api/teacher/papers`
  - `PUT /api/teacher/papers/:id/questions`
  - `PATCH /api/teacher/papers/:id/publish`
  - `GET /api/teacher/papers/:id/analytics?mode=latest|all`

---

## 四、实现阶段注意点（避免返工）

- `name` 为必填：注册接口与表单一起改；老用户登录后补录。
- 教师角色来源以 allowlist 为准，建议在登录/注册时同步写 `User.role`。
- 提交接口必须事务化，先把旧 latest 清掉，再插入新 latest。
- 统计默认 `mode=latest`，最贴合“提交后教师统计同步更新”。

---

如果你要，我下一步可以直接给你**Prisma migration 的 SQL 初稿**（包含 `ALTER TABLE` 和 `CREATE TABLE` 顺序），以及每个 API 的 `zod` 校验 schema 草案。

---

**User**

请帮我实现按最新决定的完整版本功能，并且帮我提出我需要手动运行的操作，以及如何添加教师用户

---

**Cursor**

我会直接开始落地完整功能：先补数据库与鉴权（角色/姓名/教师名单），再做试卷与提交 API，最后接上学生与教师页面，并在完成后给你一份“必须手动执行”的清单。先快速读取现有认证与路由结构，确保改动和你项目完全兼容。

我已确认鉴权与登录代码结构，接下来会实现数据库模型和后端 API（角色、教师名单、试卷、提交、统计）再接前端页面。先补充读取脚手架配置与现有样式/导航公共组件，确保新增页面风格一致并可运行。

我开始动代码了：先改 `prisma/schema.prisma`，一次性加入角色、教师名单、试卷、题目、提交与答案快照模型；然后再串 API 与页面。

我正在把登录链路补齐到“姓名+角色”维度：接下来会更新 `/api/auth/me` 返回 `name/role`，并新增“更新姓名”接口，保证教师统计可显示学生姓名。

后端主干已接上，下一步我会新增学生/教师页面（试卷列表、作答、结果、教师统计与试卷管理），并把导航入口连起来。完成后会跑一轮 lint 检查并修正报错。

---

**User**

For the code present, we get this error:
```
Duplicate identifier 'PaperSession'.
```
Fix it, verify, and then give a concise explanation. @lib/types.ts:69-72 

---

**Cursor**

我先定位 `lib/types.ts` 里重复声明的位置并做最小修复，然后跑一次类型/lint 验证确认错误消失。

