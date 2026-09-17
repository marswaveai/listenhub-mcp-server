# #817 review round 2（慢车道，accepted-findings 增量复审）

- **被审 final head SHA**：`ad94163`（PR #3）
- **被审范围**：`git diff 8a480e1..ad94163`（round 1 候选风险 C1–C6 的修复 + 一处 xo 注释大小写修正）
- **reviewer 数量**：1 个独立 agent
- **reviewer 上下文**：机械拼装——根 `CONTEXT.md` + Goal Contract + round 1 结论与本轮处理清单 + delta 原始 diff + 被审工作区。
- **round 计数**：review round 2；CI round 3（87341d1 因 xo `capitalized-comments` 红，ad94163 重跑）。

## Judgment

**`Approve`（已审 final head `ad94163`）。** delta 只覆盖 round 1 列出的 6 项，未跨出范围，不需升级全量重审。

## Confirmed findings

无。

## 候选风险（不阻断）

| ID | 一句话 | 处置 |
|---|---|---|
| R2-1 | CLI 传入以 `--` 开头的 token 会被当作缺值（走 fail closed；同一 token 用 `MCP_AUTH_TOKEN` 正常） | 记录，取舍优于旧行为 |
| R2-2 | `getArgValue` 未导出、无单测，`--` 规则只有手工运行证据 | 记录 |
| R2-3 | 本机无 Docker daemon，用干净目录 `npm ci` / `npm ci --omit=dev` 等价验证通过 | 记录 |

## 已排除

- `quiet: true` 不影响 `.env` 加载；stdio stdout 只剩 JSON-RPC。
- Bearer 正则：含空格 token 200、`Bearerx` 401、空 `Bearer ` 401、`x-api-key` 回退仍 200。
- `npm pack --dry-run` 45 文件，测试文件不在包内；`.dockerignore` 不排除 lockfile。
