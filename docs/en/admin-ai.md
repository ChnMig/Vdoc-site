# Admin AI

Admin AI is the review assistant built into the Vdoc backend. It reads Draft, Version, and Diff context already produced by Vdoc, generates AI summaries, and supports page chat. It is separate from the external MCP adapter and Vdoc Skill. It provides no Agent publishing shortcut and never replaces machine Diff or human review.

## Permissions and Precedence

- SuperAdmins configure the system default AI provider and system prompts.
- Project Admins can configure a project provider and project prompt overrides.
- Only SuperAdmins may read, update, or test system configuration. Only the corresponding Project Admin or a SuperAdmin may read, update, or test project configuration. Readers and Writers cannot read Provider/Prompt configuration, but may still use page summaries and Chat where document permissions allow.
- An enabled project provider takes precedence over the system provider. If the project provider is absent or disabled, Vdoc falls back to the enabled system provider.
- Project prompt overrides affect only that Project. Every AI read remains limited by the current user's Project permissions.

AI can only explain, summarize, and point out review concerns. It cannot approve, request changes, reject, modify, or publish. A Project Admin or SuperAdmin remains the human review and publishing gate.

## Configure a Provider

Vdoc uses OpenAI-compatible providers and supports two API modes:

- `chat_completions` calls the provider `/v1/chat/completions` route.
- `responses` calls the provider `/v1/responses` route.

| Field               | Rule                                                      |
| ------------------- | --------------------------------------------------------- |
| `base_url`          | HTTPS origin for the provider or private gateway.         |
| `api_mode`          | `chat_completions` or `responses`.                        |
| `model`             | Model name supported by the provider.                     |
| `api_key`           | Required, encrypted at rest, never returned in plaintext. |
| `enabled`           | Controls whether this configuration can be used.          |
| `temperature`       | Default `0.2`, range `0` through `2`.                     |
| `timeout_ms`        | Default `30000`, range `1000` through `120000`.           |
| `max_output_tokens` | Default `1000`, range `1` through `32000`.                |

`name` is an optional display name. Provider reads use `api_key_set` to report whether a key exists and expose only `api_key_last4` as masked state. You can keep the existing encrypted key while updating other fields. Never copy the key into docs, logs, or screenshots.

Run a system or project provider test before or after saving. A test uses the current form payload or the saved effective configuration for a short connectivity call, then returns `ok` and non-secret `content`. When a project has no enabled override, an empty-form test does not submit an incomplete provider; it tests the currently enabled system fallback. Test results and failures are audited.

## Configure Prompts

System and project scopes can override these prompt keys:

- `draft_review_summary`
- `version_change_summary`
- `diff_change_summary`
- `page_chat`

Each prompt has `system_prompt`, `user_prompt_template`, and `enabled`. Both text fields must be non-blank. Every `user_prompt_template` must retain the literal `{{context}}`, and `page_chat` must also retain `{{message}}`. The request path is the source of truth for `prompt_key`; update bodies do not repeat it. A project override takes precedence over the system or built-in template. Disabling a summary prompt records the matching generation as `skipped` and does not block Draft submission or Version publishing. Prompt overrides are managed product data; logs and audit metadata must exclude keys, tokens, and other secrets embedded in prompts.

## Automatic Summaries and Regeneration

- After an OpenAPI or Markdown Draft is submitted, Vdoc automatically attempts a Draft review summary.
- Updating and resubmitting a Draft triggers another summary attempt.
- After human approval creates an immutable Version, Vdoc automatically attempts a Version change summary.
- Draft, Version, and Diff summaries have read routes and can be regenerated manually when permissions allow.

Backend context is target-specific and bounded: Draft includes bounded normalized content plus its `ID`, version name, status, and `changelog`; Version includes bounded normalized content plus its `ID`, version name, and `changelog`; Diff includes the Diff `ID`, from-version ID, to-version ID, and aggregate `added`, `removed`, `modified`, and `breaking` counts; each item includes `method`, `path`, `location`, `breaking`, and `message`. Summaries are AI-generated helper text. Machine Diff remains the change record, and human review decides whether to publish.

Automatic outcomes include `pending` while generation is in flight, followed by `succeeded`, `skipped`, or `failed`. No usable provider or a disabled prompt produces `skipped`; provider call errors produce `failed`. Before accepting a provider response, Vdoc rechecks permissions, target content, provider configuration, and prompt configuration, so stale output cannot overwrite newer state. These outcomes are non-blocking. They do not roll back Draft submission or Version publishing, and the original Diff, Version view, and human review remain available.

Page AI Chat includes a bounded window of the current session history. A persisted generation token ensures that only the latest request can append messages across multiple Vdoc instances; an older delayed response is rejected. Admin lists retained sessions for the current page context so existing conversations can be recovered and switched after refresh.

## Page Chat

Draft Review, Version, and Compare / Diff pages can create page-scoped chat sessions. A session is bound to the current Project, Document, and Draft, Version, or Diff, and can read only context the current user may access. Page chat reuses the same Draft, Version, and Diff context builder and adds no other page data.

Answers must be marked AI-generated. Page chat cannot read across Projects or present an answer as machine Diff or a human review decision.

After the Project, Document, or target Branch is archived, Project Admins and SuperAdmins retain read-only access to historical provider/prompt configuration, and existing summaries and Chat history remain readable. Provider update/test, prompt update, summary regeneration, new sessions, and new messages are blocked. Readers and Writers do not gain configuration-read access from archival. Readers may use Chat in an active context, while manual summary regeneration requires Project Admin or SuperAdmin permission.

## API Routes

See [API Reference](api-reference#admin-ai-routes) for the complete route and auth list. The API groups cover:

- System and project provider reads, updates, and tests.
- System and project prompt reads and overrides.
- Draft, Version, and Diff summary reads and regeneration.
- Page chat session listing/recovery, creation, retrieval, and message sending.

## Audit and Secret Safety

- AI API keys are encrypted by the server. Ordinary responses expose masked state only.
- Provider tests, automatic summaries, manual regeneration, chat messages, and failure reasons are audited.
- When the provider returns usage, audit metadata records `prompt_tokens`, `completion_tokens`, and `total_tokens`.
- Logs and audit metadata must never record raw API keys, JWTs, MCP Tokens, `Authorization` headers, or secrets embedded in prompts. Prompt overrides, generated summaries, and chat content remain managed product records.
- Never put secrets in URLs, shell arguments, logs, screenshots, or tickets.

## Operator Check

1. Have a SuperAdmin configure and test the system provider.
2. If a Project needs a separate model, gateway, or prompts, have its Project Admin configure and test the override.
3. Submit a test Draft and confirm its summary status can be read.
4. Have a human review and publish the test Version, then confirm the Version summary can be read.
5. Send one non-sensitive chat message from a Draft, Version, or Diff page.
6. Confirm disabled or failed cases show `skipped` or `failed` while Diff and human review still work.
7. Check that audit data has status and token usage, but no raw credentials, credential headers, or secrets embedded in prompts; prompt override, summary, and chat records remain available as defined by the product.

For external Agent access, read [MCP Tools](mcp-tools) and [Skill Workflows](skill-workflows). They can query facts or submit Drafts, but they also cannot replace human review and publishing.
