# Exploration Agent (Delta Spec)

## MODIFIED Requirements

### R1: Sampling Range Adjustment

**Original**: Phase 3 (Probe) 读取 3-8 个代表性源文件。

**Updated**: Phase 3 (Probe) 读取 5-12 个代表性源文件。

对于大型项目（list_files 显示 >20 个源文件目录），应倾向上限（10-12）。对于小型项目（<10 个源文件），5-8 即可。

### R2: Sub-concept Quality Standards

**Original**: "Break each domain into 2-5 sub-concepts"，无质量标准。

**Updated**: 每个 sub_concept 必须满足以下标准：
- 是一个**可独立文档化的功能单元**（对应 Generator 的一个 spoke 文档）
- 有明确的**职责边界**（不与同域内其他 sub_concept 重叠 >30%）
- 包含**至少 1 个源文件**映射
- 命名使用项目自身的 ubiquitous language

增加 BAD vs GOOD sub_concept 示例（通用术语）。

### R3: grep_search Strategic Guidance

**Original**: "Use grep_search to find specific patterns when needed"。

**Updated**: Phase 3 (Probe) 增加策略化引导：
- 用 grep_search 搜索跨文件 import/require 关系，发现组件间依赖
- 用 grep_search 搜索接口/抽象类的实现（如 `implements`, `extends`），发现设计模式
- 用 grep_search 搜索错误处理模式（如 `catch`, `throw`, `Error`），辅助域分类

### R4: Inter-domain Interaction Signal

**Original**: reasoning 字段只解释"为什么这些文件构成一个域"。

**Updated**: reasoning 字段新增要求：
- 标注该域与其他域的**已知依赖方向**（如"该域导入了 auth 模块的 validateToken()"）
- 基于 grep_search 或 read_file 发现的实际调用关系，不要猜测
