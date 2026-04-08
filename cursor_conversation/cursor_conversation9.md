# 试卷问题结果统计功能
_Exported on 4/2/2026 at 15:59:40 GMT+8 from Cursor (2.6.22)_

---

**User**

请帮我增加一个新功能。在学生和老师端，在做完试卷后，可以看到所有发布试卷的问题结果统计，学生自己或老师可以所有试卷知识点tag的掌握情况

---

**Cursor**


正在探索代码库结构，以实现试卷问题结果统计与知识点 tag 掌握情况展示。




正在实现：在 `papers-repo` 中新增跨试卷聚合查询；添加 `/api/papers/stats` API；新增学生端 `/papers/overview` 与教师端页面；在试卷结果页与导航中加入入口。




正在实现：在 `paper-types.ts` 中添加类型；在 `papers-repo.ts` 中添加聚合函数；添加 API 与页面。




正在修复教师端 `studentId` 与 URL 的同步逻辑，并移除可能导致问题的 `useSearchParams`（避免需 Suspense）。




下面是已实现功能的说明。

## 功能概述

1. **所有已发布试卷的「题目级」班级统计**  
   对每一份**已发布**试卷，按题号汇总：**答对人数 / 提交人数** 与 **正确率**（只统计学生、且每人每卷取**最新一次**提交，与教师端单卷分析一致）。

2. **跨试卷知识点（主题）掌握情况**  
   题目上的 **IB Theme（A–E、M）** 会汇总成条形图（与单卷里的 *Theme mastery* 相同维度）。  
   - **学生**：默认只看**自己**在所有已发布试卷上的主题正确率。  
   - **教师**：可选 **全班汇总**，或在下拉里选**某一学生**只看该生的跨卷主题掌握。

## 新增/修改的文件

| 位置 | 作用 |
|------|------|
| `lib/papers-repo.ts` | `getPublishedPapersAggregateQuestionStats`、`getCrossPaperThemeMasteryForUser`、`getCrossPaperThemeMasteryClassWide` |
| `lib/paper-types.ts` | `PublishedPaperQuestionStat`、`PublishedPaperStatsRow` |
| `lib/users-repo.ts` | `listStudentUsersBrief`（教师下拉列表） |
| `app/api/papers/stats/route.ts` | `GET`：学生看自己；教师支持 `?studentId=` |
| `components/paper-stats-overview.tsx` | 统计与图表 UI（可折叠每卷题号列表） |
| `app/(main)/papers/overview/page.tsx` | 学生端总览 |
| `app/(main)/teacher/papers-overview/page.tsx` | 教师端总览（非教师会重定向到 `/papers/overview`） |

## 入口

- **学生**：试卷列表 `/papers`、交卷结果页底部「Open overview →」→ `/papers/overview`  
- **教师**：首页链接、底部导航 **Stats** → `/teacher/papers-overview`  

---

**说明**：数据库里每题只有 `theme`（大纲 **Theme A–E / M**），没有更细的子标签（如 A.1 Kinematics）。若要按子标签统计，需要给题目增加子标签字段并在判分里写入。若你希望，我可以再帮你设计一版子标签模型与界面。

---

**User**

请帮我在学生端将试卷总览功能做得更醒目

---

**Cursor**


增强学生端试卷总览的可见性：在底部导航加入独立入口，并修正 `/papers/overview` 与 `/papers` 的激活状态冲突；在试卷列表页加入醒目的主视觉卡片。




正在添加底部导航的「Stats」入口，修正激活逻辑，并在试卷列表与结果页加入更醒目的主视觉卡片。





已把学生端的「试卷总览」做得更显眼，改动如下：

### 1. 底部导航（`duo-nav.tsx`）
- 增加第 4 项 **Stats**，直达 `/papers/overview`，图标与教师端统计一致（柱状图）。
- 修正高亮逻辑：`/papers/overview` 只点亮 **Stats**，不会误点亮 **Papers**（原先凡是以 `/papers/` 开头的路径都会点亮 Papers）。

### 2. 试卷列表 `/papers`（`papers/page.tsx`）
- 在「Choose a paper」**上方**放一块 **绿色渐变大卡**（粗底边、白字、📊），标题 **「See all papers at a glance」**，底部整行 **「Open overview →」** 白底绿字按钮，第一眼就能看到。

### 3. 单卷交卷后 `/papers/[id]`（`papers/[id]/page.tsx`）
- 在成绩区块**最上面**插入同风格的 **「Next step」** 大卡，引导去看全站统计；下面再显示分数、主题、错题。
- 去掉底部重复的「All published papers」小卡片，避免与顶部大卡重复。

### 4. 总览页 `/papers/overview`（`papers/overview/page.tsx`）
- 标题区改为带绿色图标块的卡片头图，与列表页视觉统一。

若你希望文案改成中文或去掉 emoji，可以说明一下我帮你改一版。

---

**User**

请帮我加入一个功能完善：在学生做完一份卷子后，基于现有的情况，学生还可以知道这份卷子每个Theme有多少题，自己每个theme做对了几道题。老师在这份卷子的统计中也可以看到同样的信息

---

**Cursor**


实现试卷按 Theme 的题目数量统计，并在学生交卷结果与教师单卷统计中展示。正在查看相关代码。




正在实现：从试卷题目汇总各 Theme 的题目数，并在学生与教师 API/UI 中展示；`correctTagMastery` 已含每主题答对数，将显式对照题目总数。




正在实现：在 `papers-repo` 中添加按 Theme 的题目统计，并更新 API 与 UI。




正在更新表格组件，以支持班级汇总（分子/分母为全班聚合）。





功能已接好，说明如下。

## 数据层（`lib/papers-repo.ts`）

- 新增 **`buildPaperThemeQuestionCounts`**：按题目上的 `theme` 统计**本卷每个 Theme 有几道题**（与判分用的 `canonicalizePaperThemeLabel` 一致，顺序按大纲 Theme A–E / M）。
- 新增 **`getPaperThemeQuestionCounts`**：按 `paperId` 读题目并汇总。
- **`getPaperForAnswering`**：在返回里增加 **`themeQuestionCounts`**（题目仍只给题号给学生端答题）。
- **`getStudentPaperAttemptSummary`** / **`submitPaperAttempt`**：在结果里附带 **`themeQuestionCounts`**。
- **`getAttemptDetail`**：增加 **`themeQuestionCounts`**（与 `GET /api/paper-attempts/[id]` 一致）。
- **`getTeacherPaperAnalytics`**：增加 **`themeQuestionCounts`**（来自该卷所有题目的 theme）。

类型 **`PaperThemeCountRow`** 在 `lib/paper-types.ts` 中定义。

## UI

- 新组件 **`components/paper-theme-breakdown.tsx`**：表格三列 — **Theme**、**# Questions**（本卷该主题题量）、**得分列**（见下）。
  - **`perPaper`**：学生/教师看某个学生时，第三列为 **答对数 / 本卷该主题题数**（与条形图一致）。
  - **`aggregate`**：教师看**全班**时，第三列为 **全班答对总数 / 全班作答总次数**（与原先 Overall 条形图含义一致）。

## 学生端 `papers/[id]`

- 交卷或查看已有答卷时，在分数卡片下方增加 **「This paper — questions & your results by theme」** 表格。

## 教师端 `teacher/[id]`

- 在「Overall theme mastery」图表**上方**增加 **「This paper — questions & class results by theme」**（全班聚合）。
- 每位学生卡片里在条形图**上方**增加 **「By theme (this paper)」**（该生答对 / 本卷题量）。

若某卷尚未上传题目或没有 theme，`themeQuestionCounts` 为空，学生会看到组件里的提示文案；教师端整块表格不显示（与 `length > 0` 判断一致）。

---

**User**

在老师界面，一份卷子中，添加查看学生提交情况时的筛选与搜索功能，老师可以通过搜索学生名字看到对应结果

---

**Cursor**


在教师单卷页面为学生列表添加按姓名与邮箱的本地搜索，并显示匹配数量与空状态提示。




仅在分析数据加载完成后显示学生提交区块，避免加载时出现空白搜索框。




已在教师单卷页（`teacher/[id]`）加上学生提交区的**搜索与筛选**（前端本地过滤，无需改 API）。

### 行为说明
- **搜索框**：`type="search"`，占位符为 “Search name or email…”。
- **匹配规则**：不区分大小写，对 **显示姓名** 与 **邮箱** 做子串匹配（例如输入 `Zhang`、`zhang@` 都能找到）。
- **计数**：有提交记录时显示 **Showing X of Y (filtered)**，便于确认筛选结果。
- **无匹配**：提示 *No students match "…". Try another name or email.*
- **换卷**：切换试卷 `paperId` 时会**清空**搜索词，避免沿用上一张卷的筛选。

### 区块结构
- 新增标题 **Student submissions**，说明可搜姓名或邮箱；下方是搜索框，再下面是按筛选结果渲染的学生卡片（主题表 + 条形图不变）。

若你还希望支持 **按正确率排序** 或 **仅显示未命名学生** 等，可以再说一下规则我帮你加。

---

**User**

帮我添加按正确率排序

---

**Cursor**


后端已返回 `latestAccuracy`，但前端类型未声明。将扩展类型、在筛选后加入按正确率排序，并在学生卡片上显示分数。




已在教师单卷页的 **Student submissions** 区域加上按正确率排序，并沿用接口里已有的 `latestAccuracy`（当前页仍用 `mode=latest`，即该生在本卷**最新一次提交**的得分）。

### 改动摘要
1. **Sort list** 下拉框（在搜索框下方）  
   - **Name (A–Z)**：按姓名（默认）  
   - **Accuracy (high to low)**：正确率从高到低  
   - **Accuracy (low to high)**：正确率从低到高  

2. **排序逻辑**：先按搜索过滤，再排序；无正确率数据的学生排在列表**末尾**；同分按姓名 A–Z。

3. **学生卡片**：姓名右侧显示 **正确率徽章**（如 `82.5%`），便于对照排序结果。

4. **换卷**：与搜索一样，切换试卷会重置为 **Name (A–Z)**。

后端无需修改，`getTeacherPaperAnalytics` 已返回每位学生的 `latestAccuracy`。

---

**User**

请帮我在老师查看学生错题集的界面也添加同样的搜索筛选功能

---

**Cursor**


在 `teacher/mistakes` 页面添加与单卷页相同风格的搜索（姓名/邮箱）与排序（姓名、错题数高/低），并在筛选变化时若当前展开项被隐藏则收起。




已在 **Class mistake analytics**（`/teacher/mistakes`）里加上与单卷页同风格的筛选与排序，改动在 `app/(main)/teacher/mistakes/page.tsx`。

### 功能
- **搜索**：不区分大小写，匹配 **姓名**、**完整邮箱**，以及列表上显示的 **展示名**（无姓名时用邮箱 `@` 前一段）。
- **排序**（下拉框 **Sort list**）  
  - **Name (A–Z)**：按展示名  
  - **Mistakes (most to fewest)**：错题数从高到低  
  - **Mistakes (fewest to most)**：错题数从低到高  
  同分再按展示名 A–Z。
- **计数**：`Showing X of Y (filtered)`（有搜索词时带 filtered）。
- **无匹配**：与试卷页相同的提示文案。
- **展开收起**：若当前展开的学生被筛掉，会自动收起，避免指向隐藏项。

上方的 **All students** 汇总区不受影响，仍代表全班数据。

---

**User**

现在请帮我在教师端添加一个功能，在学生们做完一份试卷后，老师可以清空所有提交学生的答题记录，学生可以重新尝试第二次。老师也可以一次清空所有学生所有试卷的答题记录

---

**Cursor**


实现教师端清空试卷提交记录（单卷与全部）。正在查看数据模型与教师 API 的权限逻辑。




正在实现：在 `papers-repo` 中添加清空函数；新增两个 API 路由；在教师单卷页与教师首页添加带确认的按钮。




功能已加上，说明如下。

## 1. 单卷清空（学生可再交一次）

- **接口**：`POST /api/teacher/papers/[id]/clear-submissions`  
- **逻辑**：删除该卷下**所有学生**的 `PaperAttempt`（答题明细随外键级联删除）。**试卷与题目保留**，仍可发布。
- **权限**：与删卷一致，仅**创建该卷的老师**可操作（`createdById`）。
- **界面**：教师打开某卷详情（`/teacher/[id]`），在「Delete paper」上方增加橙色按钮 **Clear student submissions (allow retake)**，带确认框；成功后自动刷新统计。

## 2. 清空全校所有卷的提交

- **接口**：`POST /api/teacher/clear-all-paper-submissions`  
- **逻辑**：删除**所有学生**在所有试卷上的 `PaperAttempt`（`user.role === STUDENT`）。**试卷、题目、错题库 Mistake 不动**。
- **权限**：任意登录的 **Teacher** 账号（与当前产品里其他教师接口一致）。
- **界面**：教师首页 `/teacher` 底部 **Reset all paper attempts** 区块，按钮 **Clear all students’ submissions (all papers)**，**两次 `confirm`** 后才执行。

## 代码位置

- `lib/papers-repo.ts`：`clearStudentAttemptsForPaper`、`clearAllStudentPaperAttemptsEverywhere`
- `app/api/teacher/papers/[id]/clear-submissions/route.ts`
- `app/api/teacher/clear-all-paper-submissions/route.ts`
- `app/(main)/teacher/[id]/page.tsx`、`app/(main)/teacher/page.tsx`

学生端仍显示「每卷只能提交一次」；老师清空后库里无记录，学生可再次提交。若你希望「全校清空」也限制为只有创建者或白名单邮箱，可以再说一下规则。

---

**User**

我想将老师端权限从仅创建该卷的老师改为所有老师账号

---

**Cursor**


正在将删除试卷与清空提交改为：任意教师账号均可操作（仍要求 `TEACHER` 角色）。




已按你的要求改完：**只要账号是教师（`TEACHER`），就可以操作任意试卷**，不再校验是否为创建人。

### 代码改动

1. **`lib/papers-repo.ts`**
   - **`deletePaperForTeacher(paperId)`**：去掉 `teacherId` 参数与 `createdById` 比对；试卷存在则删除，返回类型改为 `"deleted" | "not_found"`（不再有 `"forbidden"`）。
   - **`clearStudentAttemptsForPaper(paperId)`**：同样去掉创建人校验；返回类型去掉 `"forbidden"`。

2. **`app/api/teacher/papers/[id]/route.ts`**（`DELETE`）  
   - 调用改为 `deletePaperForTeacher(id)`，并删除原 403「只能删自己创建的卷」分支。

3. **`app/api/teacher/papers/[id]/clear-submissions/route.ts`**（`POST`）  
   - 调用改为 `clearStudentAttemptsForPaper(id)`，并删除原 403 分支。

### 说明

- 其它教师接口（发布、改题目、看统计）**本来就没有**「仅创建者」限制，现在与 **删卷**、**清空本卷提交** 一致。
- `createdById` 仍会在新卷创建时写入，仅作记录；若以后要显示「谁建的」可在 UI 里用，与权限无关。

构建已通过。

---

**User**

请帮我做一个完善：老师在发布完试卷后无法看到试卷的正确答案和每道题对应的theme。我希望老师在上传后仍能看到正确答案和对应theme

---

**Cursor**


实现：从数据库加载题目并同步到编辑区；新增 `GET /api/teacher/papers/[id]/questions`；在页面上显示可读的答案与 Theme 表。




正在更新教师试卷页：添加从服务器加载题目、同步 textarea，并显示答案与 Theme 表格。




已实现：教师打开试卷页时会从数据库拉取题目，**发布前后**都能看到正确答案与 Theme。

### 原因说明（之前）
编辑框里的内容一直是占位示例 `1,A,A\n2,B,B`，**没有按试卷 ID 从服务端回填**，所以上传/发布后容易误以为「看不见答案和 theme」。

### 实现要点

1. **`GET /api/teacher/papers/[id]/questions`**（教师登录）  
   返回 `{ questions: [{ number, correctAnswer, theme }] }`，与库里 `PaperQuestion` 一致。

2. **`lib/papers-repo.ts`**  
   新增 `getPaperQuestionsWithAnswers(paperId)`。

3. **`lib/paper-themes.ts`**  
   新增 `paperThemeToUploadToken`，把库里完整 Theme 文案还原成上传用的 **A–E / M**，用于同步 CSV 文本框。

4. **教师页 `/teacher/[id]`**  
   - 进入页面并在统计加载成功后，自动请求题目并**写入文本框**。  
   - 增加 **「Saved answer key」** 表格：题号、正确答案、完整 Theme 名称（可滚动）。  
   - 保存题目、刷新统计（`loadAnalytics`）时会**再次拉取题目**，表格与文本框与数据库一致。  
   - 尚无题目时提示在上方编辑后点 **Save questions**。

学生端接口仍不返回答案与 theme，行为不变。

