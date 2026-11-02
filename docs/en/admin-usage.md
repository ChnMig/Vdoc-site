# First Use

Use the `v0.4.0-beta.4` document branch model to save, review, publish and query a Markdown guide. Start with an isolated [Beta environment](deployment.md#beta-channel).

## Before You Start

- Follow the [Deployment Guide](deployment.md#quick-start), configure the initial administrator and confirm health reports `detail.healthy` as `true`.
- Use an agent with MCP stdio support; install Node.js 20 or later, npm and Git on its machine.

## 1. Log In and Create a Trial Project

Open the [local workbench](http://127.0.0.1:8081) or your deployment URL. Sign in with the Compose credentials. As the initial SuperAdmin, use **Workspace → All teams** to create a team, then create **Vdoc Trial**. **Documents** browses files; **Project members** assigns Reader, Writer and Project Admin. Team membership does not grant project access.

If no account exists, return to [initial-admin configuration](deployment.md#initial-admin). Changing initialization fields does not reset existing accounts.

## 2. Create a Document

Open the project's **Documents** list and choose **Create document**. Select Markdown, name it **Team Guide**, and use `docs/team-guide.md`. The initial branch defaults to `main`; enter another name such as `dev` if needed. Enter or upload:

```md
# Team Guide

- The demo project codename is Northstar.
- Run the project tests before committing code.
- Save documentation versions for administrator review and publication.
```

OpenAPI JSON/YAML and TXT are also supported. TXT preserves text and line endings without executing HTML. Creation produces `main.1`, or `dev.1` when the initial branch is `dev`. Every document owns separate branches and history, independent of the document you were previously viewing.

## 3. Save, Compare and Branch {#commit-history}

Use **Document branch** below the title to choose a branch, and **Version** to read earlier content. Choose **Edit**, change the content and **Save version**. The next changed save after `main.1` is `main.2`, then `main.3`. Numbers are automatic; a commit message is optional.

Choose **New branch** beside the branch selector and enter `dev`. It starts from the version being viewed and retains its ancestry. Its first new save is `dev.1`, then `dev.2`. Another document's `dev.1` counts separately. Switching branches leaves the project document list and other documents unchanged.

**Version history** opens exact old content. **Compare** selects two fixed versions of this document, with OpenAPI semantic and Breaking Change checks when available. Reverting appends a version and preserves history. Importing a file of the same type replaces only this document's content.

Concurrent saves preserve local input. Compare and reconcile, or save your work on a new branch. Retrying the identical request after a lost response does not duplicate versions. Failed saves, unchanged content and retries do not consume numbers. Unsaved edits are retained per document and branch.

## 4. Review and Publish

`main` is editable by default. For collaborative review, use **Merge requests** in the right tool rail to select source and target branches of this document and inspect the actual merge candidate. An administrator reviews it. Advancing a branch or resolving conflicts requires a fresh review.

Saving, merging and publishing are separate actions. An administrator explicitly publishes the selected version through **Releases** in the right tool rail. Publications retain a readable name such as `main.2` and receive a separate release ID. Later saves cannot change published content. MCP can save, compare and propose merges, but cannot approve, merge or bypass human publication.

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
Use Vdoc MCP to find the Team Guide document in the Vdoc Trial project.
Then find the latest release on this document's main branch.
Resolve that release to its fixed commit_id and read docs/team-guide.md there.
What is the project codename, and what should I do before committing code?
Cite the path, branch, release ID and commit_id. If it is missing, say so;
do not invent content.
```

Verify `list_documents` identifies the document, then pass its `document_id` to `list_releases` / `get_release`, followed by `get_document_at_commit` with the release's commit ID. The answer should include **Northstar** and **run the project tests before committing code**. Tool discovery or a similar answer alone does not prove a read. An unpublished HEAD is not a publication.

For connection failures, check the agent runtime, Backend reachability and client errors. For missing documents, check token expiry, `doc:read`, project access and release selection. See [Troubleshooting](troubleshooting.md).

## Reading, AI, Sharing and Events

The document page retains the project directory on the left, content in the center, and tools on the right. Outline, AI, history, comparisons, merges, releases and events open in the same sidebar. On phones, open the Document tools menu. Expand the sidebar to grow it leftward over the document; collapse it to restore its width. Input, scrolling and conversations stay in place.

Copy or download exact content from the reader; Markdown offers Preview/Source. Legacy OpenAPI endpoint lists and saved version links remain readable.

Use **AI chat** to ask about this document, including a branch or version such as `dev` or `main.2`. Existing conversations, attachments, reasoning, stop/retry and send shortcuts remain available. Switch to **Version analysis** to inspect fixed-version results.

Request **AI analysis** for a fixed commit or pair. C3 arriving during C1→C2 analysis does not change its input. Results retain the fingerprint, model and status. Evidence is limited to 32 documents and 128 KiB with a truncation flag. Failures do not discard commits. AI cannot generate/apply patches or approve publication. Configure providers in [Admin AI](admin-ai.md).

### Create and Manage Public Shares

Use **Share** in the document header for the current published version. Unpublished versions prompt you to review and publish first. You can also share from **Release records**, with password, expiry, reveal and revocation. Optional passwords require 12–72 UTF-8 bytes without leading/trailing Unicode whitespace. Later commits cannot rewrite its content. Anonymous readers do not see private trees, activity or AI. Existing public links retain their scope and access rules.

Administrators choose events in **Event subscriptions**, grouped into Versions and branches, Review and merge, Publication, and AI analysis, with descriptions of when each event occurs. Subscriptions created from a document apply to that document. Publication events are selected by default; internal commits are optional. In-app subscriptions appear in the delivery ledger. Webhook consumers verify signatures, deduplicate event IDs and handle ordering. Pause/retry deliveries without undoing commits. Git-style means commit graphs, branches and merges, not native `git clone` / `git push` protocol support.

## Existing Projects and Compatibility Reads

Opening an existing document creates its isolated branches and history with provenance. Original project commits, publications and surviving drafts remain unchanged. Internal `legacy/...` references stay out of normal branch selection. Legacy history links and existing public shares remain readable. Overwritten bodies without surviving evidence cannot be recovered.

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
