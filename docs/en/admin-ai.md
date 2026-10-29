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

| Field                       | Rule                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------- |
| `base_url`                  | HTTPS root or versioned gateway URL, including `/v1`.                                 |
| `api_mode`                  | `responses` (new default) or `chat_completions`.                                      |
| `model`                     | Model name supported by the provider.                                                 |
| `api_key`                   | Required, encrypted at rest; ordinary responses are redacted.                         |
| `enabled`                   | Controls whether this configuration can be used.                                      |
| `stream`                    | Defaults to `true` (streaming); `false` selects non-streaming.                        |
| `temperature`               | Slider from `0` through `2`; reset to `0.2`.                                          |
| `timeout_ms`                | Total generation time, default `600000` (10 minutes).                                 |
| `first_response_timeout_ms` | Wait for the first body data including connection time, default `180000` (3 minutes). |
| `idle_timeout_ms`           | Maximum gap between response body data, default `120000` (2 minutes).                 |
| `max_output_tokens`         | Default `1000`, range `1` through `32000`.                                            |

`name` is an optional display name. Provider reads use `api_key_set` to report whether a key exists and expose only `api_key_last4` as masked state. You can keep the existing encrypted key while updating other fields. Never copy the key into docs, logs, or screenshots.

Open **Settings → AI → System defaults / Project override → Response mode** and choose **Streaming (default)** or **Non-streaming**. Both API modes support this setting for provider tests, automatic summaries and chat; model discovery is unchanged. Existing configurations default to streaming after upgrade. Explicit non-streaming settings are retained, and an enabled project override takes precedence over system defaults.

Streaming chat displays text progressively; non-streaming displays the completed answer at once. Automatic summaries remain background jobs with generation status and a final result. Provisional chat fragments are saved only after complete generation and permission checks. An interrupted or failed stream clears incomplete fragments and preserves the prompt for retry. Reverse proxies should pass SSE chunks through without response buffering.

The API key field precedes the model. A saved key is masked; click the eye to view it, or **Replace key** to enter another one. Hiding clears the revealed value. Viewing a key does not send it as a replacement on save or model discovery. Only SuperAdmins can reveal the system key; project administrators can reveal only their own active project override. Every reveal is audited without the secret and is not cached.

Base URLs such as `https://host`, `https://host/v1`, and `https://host/gateway/v1/` work for both discovery and inference without repeating `/v1`. A 404 may also mean the provider does not support the selected API mode or model; fetching models does not prove Responses support. New forms prefer Responses while saved modes remain unchanged.

Type a model ID, or open its list to fetch and search models in either scope before saving. The backend queries `/v1/models` with the current connection; fetching changes neither the model nor saved configuration. A saved key requires the same URL; a new URL needs its own key. Connection changes clear the list. Refresh to retry; empty or failed lists still allow manual entry.

Run a system or project provider test before or after saving. A test uses the current form payload or the saved effective configuration for a short connectivity call, then returns `ok` and non-secret `content`. When a project has no enabled override, an empty-form test does not submit an incomplete provider; it tests the currently enabled system fallback. Test results and failures are audited.

Each limit has an independent **Unlimited** switch (API value `0`); finite values accept `1000` through `2147483647` milliseconds. Response data and SSE heartbeats renew the idle timer, without resetting the total timer. Unlimited total time still follows any enabled first-response and idle limits. With all three disabled, cancellation, disconnection or upstream completion ends the call. Non-streaming responses use the same first-data and response-body idle protection. Migration **014** raises the historical `30000` total default to `600000` and preserves other custom totals. Back up the database and upgrade Backend/Admin together. Configure external reverse proxies to allow the intended request duration.

## Configure Prompts

System and project scopes can override these prompt keys:

- `draft_review_summary`
- `version_change_summary`
- `diff_change_summary`
- `page_chat`

Each prompt has `system_prompt`, `user_prompt_template`, and `enabled`. Both text fields must be non-blank. Every `user_prompt_template` must retain the literal <code v-pre>{{context}}</code>, and `page_chat` must also retain <code v-pre>{{message}}</code>. The request path is the source of truth for `prompt_key`; update bodies do not repeat it. A project override takes precedence over the system or built-in template. Disabling a summary prompt records the matching generation as `skipped` and does not block Draft submission or Version publishing. Prompt overrides are managed product data; logs and audit metadata must exclude keys, tokens, and other secrets embedded in prompts.

## Automatic Summaries and Regeneration

- After an OpenAPI or Markdown Draft is submitted, Vdoc automatically attempts a Draft review summary.
- Updating and resubmitting a Draft triggers another summary attempt.
- After human approval creates an immutable Version, Vdoc automatically attempts a Version change summary.
- Draft, Version, and Diff summaries have read routes and can be regenerated manually when permissions allow.

Backend context is target-specific and bounded: Draft includes bounded normalized content plus its `ID`, version name, status, and `changelog`; Version includes bounded normalized content plus its `ID`, version name, and `changelog`; Diff includes the Diff `ID`, from-version ID, to-version ID, and aggregate `added`, `removed`, `modified`, and `breaking` counts; each item includes `method`, `path`, `location`, `breaking`, and `message`. Summaries are AI-generated helper text. Machine Diff remains the change record, and human review decides whether to publish.

Automatic outcomes include `pending` while generation is in flight, followed by `succeeded`, `skipped`, or `failed`. No usable provider or a disabled prompt produces `skipped`; provider call errors produce `failed`. Before accepting a provider response, Vdoc rechecks permissions, target content, provider configuration, and prompt configuration, so stale output cannot overwrite newer state. These outcomes are non-blocking. They do not roll back Draft submission or Version publishing, and the original Diff, Version view, and human review remain available.

Page AI Chat includes a bounded window of the current session history. A persisted generation token ensures that only the latest request can append messages across multiple Vdoc instances; an older delayed response is rejected. Admin lists retained sessions for the current page context so existing conversations can be recovered and switched after refresh.

## Page Chat

Summary and chat have separate tabs, opening chat by default. Expand the workspace for more room, including full-screen expansion on phones. Switching tabs, collapsing or closing the panel retains the conversation and input within the current document. User messages align right and AI replies left; Markdown lists, code and tables are formatted, with copy controls for answers and code. New output does not pull readers away from earlier content; Latest message returns to the bottom.

Enter sends by default; switch to Ctrl/Command+Enter if preferred. Shift+Enter inserts a newline, and IME composition never submits. Search and switch conversations through Chat history. New conversation creates a record only on the first send, with separate unsent drafts for visited conversations. Stop and failure retain text and attachments for retry.

Use the paperclip to upload, or paste/drop images and files into the composer. PNG, JPEG, WebP, GIF, PDF and UTF-8 text (Markdown, code, JSON and CSV) are supported: up to four files, 4 MB each and 6 MB combined, with text limited to 100 KB. Enlarge image previews, remove attachments or download them. Images and PDFs require a supporting model. Attachments persist with completed messages and remain available within a bounded follow-up context; failures and cancellations save no provisional messages. Upgrade Backend and Admin together; startup applies migration 015.

Open **Document AI** in a document. Summaries follow the selected version/draft; chat stays bound to the document and searches its branches, published versions and saved drafts, distinguishing each source. Each request selects up to 16 bodies/48,000 characters plus a 12,000-character index. Long sources use relevant excerpts and disclose omissions. Other documents are excluded. Existing Draft/Version/Diff chat APIs remain compatible.

Answers must be marked AI-generated. Page chat cannot read across Projects or present an answer as machine Diff or a human review decision.

Archived Projects/Documents allow history reads but no new sessions/messages. Legacy branch-bound sessions also respect branch archival. Active document chat may search archived branch history. Readers may chat; provider/prompt configuration, tests and manual summary regeneration still require administrator permission.

After the first completed answer, AI generates a short conversation title. If that request fails, the first question remains a readable provisional title and the saved answer and attachments remain available. Expanded chat keeps history in a left rail on wide screens and shows robot/user avatars with local message times; compact mode hides avatars.

The composer's **Reasoning** selector follows the model by default, or explicitly requests off, minimal, low, medium, high, extra high or maximum effort. Choices persist per conversation and seed this account's new conversations in this browser; existing conversations retain their own setting. Supported levels depend on the model. If rejected, switch to default and retry. Settings cannot change during a reply. Startup applies migration 016; upgrade Backend/Admin together.

## API Routes

See [API Reference](api-reference.md#admin-ai-routes) for the complete route and auth list. The API groups cover:

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
5. Open an independent document page, select the test draft or published version, and send one non-sensitive message in **Document AI**. Confirm the selected revision.
6. Confirm disabled or failed cases show `skipped` or `failed` while Diff and human review still work.
7. Check that audit data has status and token usage, but no raw credentials, credential headers, or secrets embedded in prompts; prompt override, summary, and chat records remain available as defined by the product.

For external Agent access, read [MCP Tools](mcp-tools.md) and [Skill Workflows](skill-workflows.md). They can query facts or submit Drafts, but they also cannot replace human review and publishing.
