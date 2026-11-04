# First Use

Use `v0.4.1-beta.1` to save, review, publish and query a guide after completing [deployment](deployment.md#quick-start).

## Before You Start

- [Deploy](deployment.md#quick-start), configure the initial admin and verify `detail.healthy: true`.
- Use an agent with MCP stdio support; install Node.js 20 or later, npm and Git on its machine.

## 1. Log In and Create a Trial Project

Sign in to the [workbench](http://127.0.0.1:8081) or your deployment with the Compose credentials. As SuperAdmin, create a team under **Workspace → All teams**, then create **Vdoc Trial**. Browse **Documents**; assign Reader, Writer or Project Admin under **Project members**. Team membership does not grant project access.

Without an account, use [initial-admin setup](deployment.md#initial-admin); its fields cannot reset existing accounts.

## 2. Create a Document

In **Documents → Create document**, select Markdown, name it **Team Guide**, and set `docs/team-guide.md`. Keep the default `main` branch or enter `dev`. Enter or upload:

```md
# Team Guide

- The demo project codename is Northstar.
- Run the project tests before committing code.
- Save documentation versions for administrator review and publication.
```

OpenAPI JSON/YAML and TXT are also supported. TXT preserves text and line endings without executing HTML. Creation produces `main.1` or `dev.1` for the chosen branch. Documents have independent branches and history.

## 3. Save, Compare and Branch {#commit-history}

Choose **Document branch** and **Version** below the title. **Edit → Save version** appends `main.2`, then `main.3`. Numbers are automatic; a commit message is optional.

Choose **New branch → dev** beside the selector. It starts from the viewed version, retaining ancestry; new saves become `dev.1`, then `dev.2`. Each document counts separately. Branch switches preserve the project list and other documents.

**Version history** opens exact content; **Compare** compares two fixed versions, including available OpenAPI semantic and Breaking Change checks. Reverting appends a version. Importing a same-type file edits only this document.

Concurrent saves preserve local input: compare and reconcile, or save on a new branch. Identical retries after a lost response do not duplicate versions. Failures, unchanged content and retries consume no numbers. Unsaved edits stay with each document and branch.

## 4. Review and Publish

`main` is editable. In **Merge requests**, select this document’s source and target branches and inspect the merge candidate for administrator review. Branch changes and conflict resolution require a fresh review.

Saving, merging and publishing are separate. Administrators publish through **Releases**. A release retains its version name, such as `main.2`, with a separate release ID and immutable content. MCP can save, compare and propose merges; approval, merging and publication require human action.

## 5. Create a Read Token

Choose **Create MCP token** with `doc:read` for Markdown/TXT, access to **Vdoc Trial**, and a future expiry. Store it in private agent configuration or a secret manager; exclude repositories, CLI arguments, screenshots and logs. Active tokens support reveal/copy; lists and expired/revoked tokens stay masked.

<div id="connect-agent"></div>

## 6. Connect Your Agent

In the token page’s **MCP client configuration**, send the one-sentence install prompt to your AI, or copy the Codex, Cursor or Claude Code npx configuration using `@chnmig/vdoc-mcp@latest`. Preserve other servers. Set `VDOC_MCP_TOKEN` and a `VDOC_BASE_URL` reachable from **the agent machine**; localhost requires Backend on that machine.

Restart MCP or the agent and refresh tools. Expect `list_projects`, `list_releases`, `get_release` and `get_document_at_commit`. See [MCP Setup](mcp-tools.md) for npm channels and exact versions. Align the client and backend if a version warning appears.

<div id="first-query"></div>

## 7. Ask Your Agent to Read the Document

Send this prompt:

```text
Use Vdoc MCP to find the Team Guide document in the Vdoc Trial project.
Then find the latest release on this document's main branch.
Resolve that release to its fixed commit_id and read docs/team-guide.md there.
What is the project codename, and what should I do before committing code?
Cite the path, branch, release ID and commit_id. If it is missing, say so;
do not invent content.
```

Verify `list_documents` identifies the document; pass its `document_id` to `list_releases` / `get_release`, then read the release’s commit with `get_document_at_commit`. Expect **Northstar** and **run the project tests before committing code**. Tool discovery or a similar answer does not prove a read; unpublished HEAD is not a publication.

Check runtime, Backend reachability and client errors; for missing documents check expiry, `doc:read`, project access and release selection. See [Troubleshooting](troubleshooting.md).

## Reading, AI, Sharing and Events

The project directory stays left, content center, and tools right. Outline, AI, history, comparison, merge, release and event sidebars expand leftward over content and collapse in place, retaining input and scrolling. Phones use the Document tools menu.

Copy/download content or switch Markdown Preview/Source. Legacy OpenAPI lists and saved links remain readable.

**AI chat** supports document, branch and version questions, existing conversations, attachments, reasoning, stop/retry and send shortcuts. **Version analysis** inspects fixed versions.

**AI analysis** fixes a commit or pair: C3 cannot change C1→C2 input. Results retain fingerprint, model and status. Evidence caps at 32 documents/128 KiB with truncation marked. Failure preserves commits. AI cannot generate/apply patches or approve publication. See [Admin AI](admin-ai.md).

### Create and Manage Public Shares

**Share** publishes a fixed link to the current release; unpublished content requires review/publication first. **Release records** also supports sharing, expiry, reveal and revocation. Optional passwords require 12–72 UTF-8 bytes without surrounding Unicode whitespace. Later commits cannot rewrite shared content. Anonymous readers cannot see private trees, activity or AI; existing links retain their access rules.

Administrators choose described **Event subscriptions** grouped by versions/branches, review/merge, publication and AI. These apply to the current document; publication is selected by default and internal commits are optional. In-app delivery has a ledger. Webhooks require signature verification, event-ID deduplication and ordering handling. Pause/retry preserves commits. Git-style covers graphs, branches and merges, not `git clone` / `git push`.

## Existing Projects and Compatibility Reads

Opening an existing document creates isolated branches and history with provenance. Project commits, publications and surviving drafts remain intact; `legacy/...` references stay hidden from branch selection. Old history links and shares remain readable. Missing overwritten bodies cannot be recovered.

After conversion, use commit tools: legacy content writes are refused. Saved version/draft URLs remain read-only at their original snapshots, including chat/comparisons. `get_latest_doc` serves unconverted data; new releases use fixed-commit reads.

## Account and Version Settings

### Change Your Password {#change-password}

Return to Workspace and open the bottom account menu: **Settings → Account → Change password**. Users and admins enter current/new passwords and confirmation.

Use a different password: 12–72 UTF-8 bytes, no surrounding whitespace. Success signs this browser out. Correct current-password/confirmation errors and retry; then sign in with the new password.

Operators can [reset forgotten admin passwords](troubleshooting.md#reset-admin-password); `VDOC_INITIAL_ADMIN_PASSWORD` cannot reset existing accounts.

### Version and Updates {#version-and-updates}

**Settings → Version → Version and updates** shows component versions/channel, a Beta icon and mismatch warnings.

**Check for updates** queries official releases in the backend’s Beta/stable channel and links notes. Retry failed checks; development builds cannot check releases.

Updates are reported only; operators [upgrade or roll back containers manually](release-rollback.md).

## Audit history

Localized filters and email-substring/exact-ID search run before pagination. Rows show email/project names with ID tooltips and explicit system/anonymous/unavailable actors. Project admins see only their projects.

Super administrators set 0–36500 days under **Settings → Global → Audit retention**, for all users and projects. The default is 30 calendar days in Asia/Shanghai; cleanup runs daily at 01:00, at startup and after changes. A value of 1 retains logs from yesterday at midnight onward. A value of 0 stops retaining new audit logs and permanently clears existing records; increasing retention cannot recover them. Documents, versions, chats, tokens, shares and service diagnostic logs are unaffected.
