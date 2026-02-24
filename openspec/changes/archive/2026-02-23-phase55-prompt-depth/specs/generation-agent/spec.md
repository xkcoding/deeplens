# Generation Agent (Delta Spec)

## MODIFIED Requirements

### R1: Depth Model Integration

**Original**: Hub 和 Spoke 文档结构为松散的 bullet list 描述。

**Updated**: Generator Prompt 必须嵌入 WHAT-HOW-WHY-EDGE 四层深度模型（引用 prompt-depth-model spec），并在 Hub/Spoke 标准模板中标注每个章节对应的深度层。

### R2: Hub Document Structure

**Original**: 5 个 bullet point 描述 Hub 内容。

**Updated**: 替换为精确的 Hub 标准模板（引用 prompt-templates spec R1），包含 7 个固定章节。Agent 必须按模板生成，不可省略任何章节。

### R3: Spoke Document Structure

**Original**: 5 个 bullet point 描述 Spoke 内容。

**Updated**: 替换为精确的 Spoke 标准模板（引用 prompt-templates spec R2），包含 7 个固定章节。特别强调：
- "设计决策"章节不可为空 — 即使决策看似"显而易见"，也要说明为什么
- "边界与约束"章节至少列出 1 个约束（并发、性能、错误处理三选一）

### R4: BAD vs GOOD Examples

**Original**: 无对比示例。

**Updated**: Prompt 中增加 BAD vs GOOD 对比表（引用 prompt-templates spec R3），使用通用术语。

### R5: Code Snippet Standards

**Original**: "Code highlights: important functions, data structures, algorithms"。

**Updated**: 引用 prompt-templates spec R4，明确量化标准。

### R6: render_mermaid Compression

**Original**: 3 个完整 JSON 示例（flowchart + sequence + class），占 ~56 行。

**Updated**: 压缩为 1 个 flowchart 示例 + 格式说明表（sequence/class 用表格描述字段），节省 ~40 行空间给深度引导内容。

### R7: Deep Reading Strategy

**Original**: "Read the source files for the current domain"，一次读取。

**Updated**: 要求 Generator 对每个域执行**两遍阅读**：
1. 第一遍：快速浏览所有文件（read_file_snippet 前 50-100 行），理解整体结构
2. 第二遍：深入阅读核心文件（read_file 全文 + grep_search 查找调用关系），提取 HOW/WHY/EDGE 信息

### R8: Writing Depth Guidance

**Original**: "Concise but thorough — explain the 'why' not just the 'what'"。

**Updated**: 增加量化标准：
- Hub 文档：300-600 词/域（不含代码块和图表）
- Spoke 文档：400-1000 词/组件（不含代码块和图表）
- 每个 Spoke 至少包含 1 个 Mermaid 图 + 1 段代码片段
