# First Use

Use the `v0.4.0-beta.1` project repository model to save, review, publish and query a Markdown guide. Start with an isolated [Beta environment](deployment.md#beta-channel).

## Before You Start

- Follow the [Deployment Guide](deployment.md#quick-start), configure the initial administrator and confirm health reports `detail.healthy` as `true`.
- Use an agent with MCP stdio support; install Node.js 20 or later, npm and Git on its machine.

## 1. Log In and Create a Trial Project

Open the [local workbench](http://127.0.0.1:8081) or your deployment URL. Sign in with the Compose credentials. As the initial SuperAdmin, use **Workspace → All teams** to create a team, then create **Vdoc Trial**. **Documents** browses files; **Project members** assigns Reader, Writer and Project Admin. Team membership does not grant project access.

If no account exists, return to [initial-admin configuration](deployment.md#initial-admin). Changing initialization fields does not reset existing accounts.

## 2. Create a Working Branch and Document

From the project's protected `main`, create a working branch such as `docs/setup`. Direct edits to a protected branch are refused. Create a Markdown document named **Team Guide** at `docs/team-guide.md` with:

```md
# Team Guide

- The demo project codename is Northstar.
- Run the project tests before committing code.
- Save documentation changes as commits for administrator review and publication.
```

Uploads also accept OpenAPI JSON/YAML, Markdown and TXT. TXT preserves plain text and line endings without executing HTML. One save can include several files; the server assigns new document IDs.

## 3. Save, Compare and Branch {#commit-history}

Choose **Save and commit**. The server generates the commit ID, author, time and parents, preserving the complete file tree. **There is no draft version field**; an optional message explains the change. Successive commits retain content, line-ending and path changes. An unchanged tree does not create an empty commit.

**Commit history** opens or downloads exact old content. **Compare** selects two fixed commits, optionally one document, with OpenAPI semantic and Breaking Change checks where available. Source changes remain historical even with identical semantics. Reverting appends inverse changes and preserves unrelated later edits; it never deletes history.

Editing captures the commit and branch generation. If another writer saves first, the conflict keeps local input. Compare, reconcile or create another branch before saving. Retrying an identical request after a lost response does not duplicate commits. Do not overwrite the latest tree with an outdated full copy.

Beta comparisons accept up to 100 changed files and 8 MiB of cumulative old/new source. Larger comparisons fail explicitly; narrow by document.

## 4. Review and Publish

Open a **Merge request** from the working branch into `main` and inspect the real three-way candidate. Each round pins both commits and generations. Resolve conflicts explicitly and review the new round; advancing either branch invalidates old approval. An administrator approves and merges, then selects the target commit on `main` and publishes it.

Saving, merging and publishing are separate actions. The server generates release IDs and publication names; users do not type a version name. A release stays fixed despite later saves. MCP can commit, compare and request merges, but cannot approve, merge or bypass human publication.

## 5. Create a Read Token

On MCP Token choose **Create MCP token** with `doc:read` for Markdown/TXT. Confirm the user can access **Vdoc Trial** and set a future expiry. Keep the raw token in private agent configuration or a secret manager, away from repositories, CLI arguments, screenshots and logs. Active tokens can be revealed/copied; lists and expired/revoked tokens remain masked.

<div id="connect-agent"></div>

## 6. Connect Your Agent

Install the Beta adapter using the [MCP channel guide](mcp-tools.md#release-channels), then copy the Codex, Cursor or Claude Code configuration from the token page. Preserve other servers. Set `VDOC_MCP_TOKEN` to your token and make `VDOC_BASE_URL` reachable from **the agent machine**; `127.0.0.1` works only when Backend runs there too.

Restart MCP or the agent session and refresh tool discovery. Expect `list_projects`, `list_releases`, `get_release` and `get_document_at_commit`. Full configuration and commit-pinned alternatives are in [MCP Setup and Tools](mcp-tools.md). MCP and Skill must come from the same channel and package; they are not published to the npm registry.

<div id="first-query"></div>

## 7. Ask Your Agent to Read the Document

Send this prompt:

```text
Use Vdoc MCP to find the latest release on main in the Vdoc Trial project.
Resolve that release to its fixed commit_id and read docs/team-guide.md there.
What is the project codename, and what should I do before committing code?
Cite the path, branch, release ID and commit_id. If it is missing, say so;
do not invent content.
```

Verify `list_releases` / `get_release`, followed by `get_document_at_commit` with the release's commit ID. The answer should include **Northstar** and **run the project tests before committing code**. Tool discovery or a similar answer alone does not prove a read. An unpublished HEAD is not a publication.

For connection failures, check the agent runtime, Backend reachability and client errors. For missing documents, check token expiry, `doc:read`, project access and release selection. See [Troubleshooting](troubleshooting.md).

## Reading, AI, Sharing and Events

Copy or download exact content from the reader; Markdown offers Preview/Source. Narrow screens use file and outline drawers. Legacy OpenAPI endpoint lists and saved version links remain readable.

Request **AI analysis** for a fixed commit or pair. C3 arriving during C1→C2 analysis does not change its input. Results retain the fingerprint, model and status. Evidence is limited to 32 documents and 128 KiB with a truncation flag. Failures do not discard commits. AI cannot generate/apply patches or approve publication. Configure providers in [Admin AI](admin-ai.md).

### Create and Manage Public Shares

Create a fixed document share from **Release records**, with password, expiry, reveal and revocation. Optional passwords require 12–72 UTF-8 bytes without leading/trailing Unicode whitespace. Later commits cannot rewrite its content. Anonymous readers do not see private trees, activity or AI. Existing public links retain their scope and access rules.

Administrators manage durable event subscriptions, defaulting to publication events and optionally including internal commits. In-app subscriptions appear in the delivery ledger. Webhook consumers verify signatures, deduplicate event IDs and handle ordering. Pause/retry deliveries without undoing commits. Git-style means commit graphs, branches and merges, not native `git clone` / `git push` protocol support.

## Existing Projects and Compatibility Reads

An administrator explicitly initializes a project with legacy publications or drafts, then checks imported files, branches and provenance. The server preserves provable publications and still-available drafts. Matching old branch names do not prove an earlier atomic project commit; the initial combined tree is marked synthetic. Overwritten bodies without surviving evidence cannot be recovered.

After conversion, legacy content writes are refused; upgrade clients to commit tools. Explicit saved version/draft URLs remain read-only and resolve the original objects rather than moving HEADs. Legacy chat/comparisons keep their snapshot context. Compatibility tools such as `get_latest_doc` serve unconverted legacy data; new releases use fixed-commit reads above.

## Account and Version Settings

### Change Your Password {#change-password}

From a document, return to Workspace. In the account menu at the bottom of the sidebar, open **Settings → Account → Change password**. All users, including admins, enter the current password, new password, and confirmation.

Use a different password of 12–72 UTF-8 bytes, without leading/trailing whitespace. Success signs this browser out; sign in with the new password. Correct an incorrect current password or mismatched confirmation and retry.

A server operator can [reset a forgotten admin password](troubleshooting.md#reset-admin-password). `VDOC_INITIAL_ADMIN_PASSWORD` changes do not reset existing accounts.

### Version and Updates {#version-and-updates}

**Settings → Version → Version and updates** shows frontend/backend versions and update channel. Beta has its own icon. Version/channel mismatches prompt a deployment check.

**Check for updates** queries official releases on demand. The backend channel selects only Beta or stable releases, respectively. Updates link release notes; failed checks can be retried. Development builds cannot check releases.

Updates are reported only; operators [upgrade or roll back containers manually](release-rollback.md).

## Audit history

Action and resource filters use localized enums. Search actors by email substring or exact user ID; filtering happens on the backend before pagination. Rows show email and project name with original IDs in tooltips. System operations, anonymous visitors, and unavailable identities have explicit labels. Project administrators remain restricted to their own projects.
