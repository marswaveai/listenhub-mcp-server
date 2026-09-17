# #817 review round 1（慢车道 gate，全量）

- **被审 commit SHA**：`8a480e1285941d645a6eb15cf489a4890ff6ab88`（PR #3 当时的 head）
- **被审范围**：`git diff 0269633..8a480e1`（不含 `package-lock.json`）
- **reviewer 数量**：2 个独立 agent（升级理由：diff 触及鉴权/安全边界，重点找绕过路径）
- **reviewer 上下文**：机械拼装——根 `CONTEXT.md` + issue #817 body（Goal Contract）+ `git diff` 原始输出 + 被审工作区与已安装依赖源码。无 per-repo lessons 文件。无 writer 对话、试错或辩护。
- **lens**：implementation correctness / business-product impact / concurrency-recovery-data integrity / tests-observability-rollout safety / blast radius-backward compatibility / minimal-solution / minimal-code，两个 reviewer 各自全部加载。
- **round 计数**：review round 1；CI round 1（checks.yml 在 8a480e1 绿）。

## Judgment

| reviewer | judgment |
|---|---|
| A | Approve |
| B | Approve |

**本轮共识判定：`Approve`（2/2）。** 无 confirmed blocking finding。

## Confirmed findings

| ID | 严重度 | blocking | 提出者 | 一句话 |
|---|---|---|---|---|
| F1 | P2 | 否（既有，非本 diff 引入） | A + B | legacy SSE 传输在当前依赖组合（fastmcp 3.35 / mcp-proxy 6.7）下不可用：带 token `GET /sse` 正常，但随后 `POST /messages?sessionId=…` 被 fastmcp `onUnhandledRequest` 先吞成 404。main 今天 fresh install 同样如此；候选处置：另开 issue，撤掉 README / `--transport sse` 的 legacy SSE 承诺或推上游修复。安全无影响。 |

## 候选风险（不阻断）

| ID | 提出者 | 一句话 | 处置 |
|---|---|---|---|
| C1 | A | `--auth-token` 后跟另一个 flag 时把该 flag 当 token 启动 | round 2 已修 |
| C2 | B | Bearer 值被空白归一化，含空格 token 误拒 | round 2 已修 |
| C3 | B | Dockerfile 未复制 lockfile、用 `npm install`，镜像未锁版本 | round 2 已修 |
| C4 | A + B | `distribution/**/*.test.*` 随 npm 包发布 | round 2 已修 |
| C5 | A + B | dotenv 17 往 stdout 打提示行，污染 stdio JSON-RPC（既有） | round 2 已修 |
| C6 | B | README Cursor 示例 `localhost` 与默认绑定 `127.0.0.1` 口径不一致 | round 2 已修 |
| C7 | A + B | `checks.yml` 未跑 `test:unit`；`publish.yml` 引用不存在脚本 | 凭证缺 workflow scope，diff 在 PR body 等 owner 应用 |
| C8 | A | `HOST` 是通用环境变量名，某些环境预置会改默认绑定 | Contract 拍板项，有 token 兜底，记录 |
| C9 | A + B | `/health` `/ready` `/ping` 无鉴权，只泄漏存活信息 | 记录 |
| C10 | A | `node --test "<glob>"` 需 Node 21+，只影响本地低版本开发者 | 记录 |
| C11 | B | Docker 基础镜像 node:18，fastmcp 3.35 在 Node 18 未验证 | 记录 |

## 已排除（两位 reviewer 均实测）

- 鉴权覆盖 `/mcp` POST/GET/DELETE、`/sse`、stateless、modern 协议 leg：无/错 token 均 401 且不发 `Mcp-Session-Id`；session 复用绕过不存在。
- header 解析：空 `Bearer`、`Basic`、前缀、逗号多值、重复头、`Bearer 错 + x-api-key 对` 均 401。
- fail closed 在监听前发生；`--allow-unauthenticated` 只有精确 flag 或 env 严格 `true` 才放开。
- CORS `*` 无 credentials，浏览器不会自动附 token；DNS rebinding 被 token 挡住。
- 日志无 token 泄漏；版本号一致 1.2.0；stdio 路径不受影响。
