# First Use

Publish a Markdown team guide, then have your agent query it and answer from its content.

## Before You Start

- Complete the [Deployment Guide](deployment.md#quick-start), including the initial-admin account.
- Confirm the workbench opens and Backend health reports `detail.healthy` as `true`.
- Use an agent that supports MCP stdio, with Node.js 20 or later, npm, and Git installed on the machine running it.

This walkthrough covers creation, review, publication, and query. Configure Admin AI, sharing, and Skill afterward.

## 1. Log In and Create a Trial Project

Open the [local workbench](http://127.0.0.1:8081), or your remote workbench URL. Log in with the credentials set in `docker-compose.yml`.

In **Workspace**, the left tree selects teams/projects; the right lists their contents. As the initial SuperAdmin, choose a team or click **All teams → Create team**. Inside it, click **Create project** and name it **Vdoc Trial**. Forms open in dialogs.

**Documents** browses project folders/files; **Project members** lists members. Project Admins and SuperAdmins can add/remove members, assign Reader/Writer/Project Admin roles, and open **Project settings** in active projects. SuperAdmins also have **Team settings** and **People**. Access is per project, not inherited from its team.

Missing an account? See [initial-admin configuration](deployment.md#initial-admin). Changing initialization fields does not reset existing accounts.

Settings has Account, Appearance, AI, and Version. Appearance controls theme/language; AI has system/project scopes. Switching retains unsaved input. Other pages have a **Page guide** beside the title.

### Open a Document from Workspace

Under **Documents**, browse folders and click a file to open its reading page:

| Area                           | Purpose                                                                                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Project file tree on the left  | Shows only this project's folders and documents. Return to Workspace, switch files, or create folders and documents here.              |
| Content in the center          | Read the selected published version or draft. Controls above it select the branch, content state, and revision.                        |
| Outline and tools on the right | Jump to a content heading. Versions, Diffs, Activity, and Document AI have separate entries; Document settings appears when permitted. |
| Document header                | Use **Share** or **Edit draft** when your role permits. Sharing targets the selected published version.                                |

Click a folder row to expand/collapse it and select a creation location without closing the document. File and folder selections are distinct. Teams, projects, people, folders, and OpenAPI/Markdown/TXT files have distinct icons.

A compact information area above the content labels the file path. Markdown uses icons with tooltips for **Preview / Source**. Published OpenAPI has **Source / Endpoints** tabs with search, grouping, pagination, and details. Existing endpoint links still work.

Use upper-right **Copy content** / **Download source** for the original content without interface text, including empty TXT. Theme/language controls sit in the header. Public shares and the workbench share this reader.

Interface language follows the browser (Chinese/English, otherwise English) until a manual choice is saved; content stays unchanged. Theme follows the system by default; GitHub sits at the far right of each header.

**Activity** lists document/branch changes, drafts, submissions, reviews, and publications, newest first with pagination. It requires document read access; public shares omit it.

**Versions** lists publication history. **Diffs** selects a published version or saved draft on each side, across branches. Source changes have line numbers, unified/split views, expandable context and downloads; semantic changes remain available. Draft comparisons use saved content at comparison time, do not enter published comparison history, and need recomparison after edits. Oversized comparisons offer downloads.

**Document settings** has **Document details** and **Branches** tabs. Switching retains input; project role and document status govern actions.

**Document AI** toggles beside the content on wide screens or in a narrow-screen modal; use its entry, close button or `Esc` to close. Summaries follow the selected revision. Chat searches this document’s branches, published versions and saved drafts, distinguishing sources.

On narrow screens, **Show files** opens a drawer that closes on document selection; **On this page** opens the outline dialog. Tools move to the top. Content without headings has an empty outline.

Tools retain reading position, Preview/Source and input. Document chat retains its session across reading revisions, sidebar toggles and breakpoints; changing document/account clears it. Folders/project tabs update locally; Back/Forward restores URL selections. Save unsaved work.

**Workspace** groups browsing and management; MCP, Skill, Audit, and Settings remain separate. Selectors and date/time pickers use workbench controls. Dates/times display in device-local time and submit as UTC.

### Change Your Password {#change-password}

From a document, return to Workspace. In the account menu at the bottom of the sidebar, open **Settings → Account → Change password**. All users, including admins, enter the current password, new password, and confirmation.

Use a different password of 12–72 UTF-8 bytes, without leading/trailing whitespace. Success signs this browser out; sign in with the new password. Correct an incorrect current password or mismatched confirmation and retry.

A server operator can [reset a forgotten admin password](troubleshooting.md#reset-admin-password). `VDOC_INITIAL_ADMIN_PASSWORD` changes do not reset existing accounts.

### Version and Updates {#version-and-updates}

**Settings → Version → Version and updates** shows frontend/backend versions and update channel. Beta has its own icon. Version/channel mismatches prompt a deployment check.

**Check for updates** queries official releases on demand. The backend channel selects only Beta or stable releases, respectively. Updates link release notes; failed checks can be retried. Development builds cannot check releases.

Updates are reported only; operators [upgrade or roll back containers manually](release-rollback.md).

## 2. Create the Sample Document

Choose a team, project, and folder in **Workspace**, then **Create document**. On a document page, select a location in the file tree and click **New document**:

| Field         | Sample value    |
| ------------- | --------------- |
| Document name | Team Guide      |
| Document type | Markdown        |
| Filename      | `team-guide.md` |
| Folder        | `docs`          |

The display name and filename are separate. The filename follows the name/upload until edited; later uploads preserve your choice. Select a project root/folder or create nested folders; empty folders persist without a depth limit. Folders are project-scoped; team isolation follows project ownership. Folder plus filename produces `docs/team-guide.md`; existing paths remain unchanged.

Creation accepts OpenAPI JSON/YAML, Markdown `.md`, or plain-text `.txt` as an unpublished, unsubmitted `dev` draft. Skip the upload here. Default branches are `dev`, `test`, and protected `prod`. Admins can add safe names such as `main` or `release/2026` under **Document settings → Branches**; no `feature/` prefix is required.

TXT preserves plain text and line breaks without rendering headings, links, or HTML. It uses line diffs and the Markdown draft/review/publication and `doc:read` / `doc:draft` permissions.

## 3. Submit Your First Draft

Open the document, select `dev` and **Draft**, then **Edit draft → Editing and review**. Name the version `v1`. Paste this content or upload it as `.md`:

```md
# Team Guide

- The demo project codename is Northstar.
- Run the project tests before committing code.
- Submit documentation changes as drafts for a project administrator to review and publish.
```

Create the Draft, then submit it for review. Saving alone does not publish it for the agent.

New drafts can **Start from branch/version**, then **Load source content** to edit its full original. Existing input requires replacement confirmation; selectors alone do not overwrite it. The header selects the target branch.

## 4. Review and Publish

Select submitted `v1` and **Edit draft**. A Project Admin or SuperAdmin checks content/Diff in **Editing and review**, then approves publication.

Choose **Published → v1** and confirm the three rules on `dev`. This Version is immutable; edits need a new draft. Use Versions, Diffs, or AI as described above. The tree marks published, unpublished-draft, and empty documents.

Approval opens the actual published version; requesting changes/rejecting retains the draft. History opens published draft snapshots read-only, separating creation and real publication times. Unpublished drafts have no publication time. Review inputs appear only while awaiting review.

**Publishing is a human action.** MCP can submit drafts but cannot publish Versions directly.

## 5. Create a Read Token

On MCP Token, click **Create MCP token** beside the list title for a user-bound token:

- Select **`doc:read`** for Markdown or TXT access. This query does not need draft-write permissions.
- Confirm the token's user can access **Vdoc Trial** and set a future expiry.
- Copy the token into your agent's private configuration or secret manager.

Reveal/copy active tokens in their details. Lists, revoked tokens, and expired tokens remain masked. Keep raw tokens out of CLI arguments, repositories, screenshots, and logs.

<div id="connect-agent"></div>

## 6. Connect Your Agent

Choose your client format; Admin's MCP Token page provides Codex, Cursor, and Claude Code configurations:

::: code-group

```json [Cursor / Claude Code]
{
  "mcpServers": {
    "vdoc": {
      "command": "npx",
      "args": [
        "--yes",
        "github:ChnMig/Vdoc-mcp#4e8e000e08a9bd7836028a0f4e4d5a8fe6a9280d"
      ],
      "env": {
        "VDOC_BASE_URL": "http://127.0.0.1:8080",
        "VDOC_MCP_TOKEN": "REPLACE_WITH_LOCAL_VDOC_MCP_TOKEN"
      }
    }
  }
}
```

```toml [Codex]
[mcp_servers.vdoc]
command = "npx"
args = ["--yes", "github:ChnMig/Vdoc-mcp#4e8e000e08a9bd7836028a0f4e4d5a8fe6a9280d"]
startup_timeout_sec = 60
tool_timeout_sec = 180

[mcp_servers.vdoc.env]
VDOC_BASE_URL = "http://127.0.0.1:8080"
VDOC_MCP_TOKEN = "REPLACE_WITH_LOCAL_VDOC_MCP_TOKEN"
```

:::

- **Codex:** merge TOML into personal `~/.codex/config.toml`. Restart Vdoc MCP or open a new session; inspect with `/mcp`. The 60-second startup timeout allows the first `npx` download. See the [official guide](https://developers.openai.com/codex/mcp/).
- **Cursor:** merge JSON into `mcpServers` in personal `~/.cursor/mcp.json`; enable/restart Vdoc in Settings → Tools & MCP. Other `mcpServers` clients reuse JSON at their own configuration path.
- **Claude Code:** merge JSON into personal `~/.claude.json` top-level `mcpServers`, preserving other servers. Restart and inspect `/mcp`. Keep tokens out of shared `.mcp.json`. See the [official guide](https://code.claude.com/docs/en/mcp-quickstart).

Preserve existing servers. Store tokens only in private configuration, never a project repository.

Replace the placeholder with step 5's token, save, and reload MCP. The official GitHub commit must match `Vdoc-mcp` in the deployment's `workspace.lock.json`; this package is not on npm registry.

`VDOC_BASE_URL` must be reachable from **the agent machine**. Use `127.0.0.1` only when Backend runs there too; otherwise use a reachable Backend address. See [MCP options](mcp-tools.md).

Confirm Vdoc connects and lists `list_projects`, `list_documents`, and `get_latest_doc`.

<div id="first-query"></div>

## 7. Ask Your Agent to Read the Document

Send this prompt to your agent:

```text
First use Vdoc MCP to find the latest published document at
docs/team-guide.md on the dev branch in the Vdoc Trial project.
Based on the document, what is the project codename, and what should I do
before committing code? Cite the document path, branch, and version.
If you cannot find it, say so instead of filling in the content yourself.
```

Check these three results:

- The agent calls Vdoc MCP and reads published content with `get_latest_doc`.
- Its answer includes **Northstar** and **run the project tests before committing code**.
- It cites `docs/team-guide.md`, `dev`, and published `v1`; the document ID can verify the source.

This completes human review through agent use. `tools/list` success or a similar answer alone does not prove the document was read.

## If the Result Is Different

| Symptom                                                    | Next step                                                                                                                     |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| MCP does not start or connect                              | Check Node.js, npx, Git, and Backend reachability on the agent's machine, then inspect the client's MCP error.                |
| Tools appear, but the project or document is missing       | Check that the token is active, has `doc:read`, and belongs to a user with project access. Confirm the path and `dev` branch. |
| The document exists, but no published version is available | Select the draft at the top, approve it, then switch to published versions and confirm `v1`.                                  |
| The agent answers without querying                         | Enable MCP and explicitly request `get_latest_doc`; retry in a new conversation if needed.                                    |

See [Troubleshooting](troubleshooting.md) for more detail.

## After Your First Successful Query

- **Agent workflow:** install [Vdoc Skill](skill-workflows.md#installation) to query docs before integration, migration analysis, or edits. Live content comes from MCP.
- **API changes:** create OpenAPI 3.0/3.1, submit and approve two versions, then [query the Diff](how-it-works.md#example) with `api:read`.
- **Admin AI:** [configure an OpenAI-compatible provider](admin-ai.md) for summaries/chat. AI cannot approve, reject, modify, or publish. Missing configuration or failures do not block human review.
- **External sharing:** create a public link below.
- **Release candidates:** maintainers can run [engineering and release checks](deployment.md#engineering-and-release-checks).

### Create and Manage Public Shares

On a document page, a Project Admin or SuperAdmin selects a published version and clicks **Share**. Check document, branch, and version, then create the link. It pins that version despite later publications. Drafts cannot be shared; existing latest/all-version links keep their scope.

Expiry defaults to three months; choose one month, six months, one year, or permanent. Optional passwords require 12–72 UTF-8 bytes without leading/trailing Unicode whitespace. Copy the full capability link, reveal it again, or revoke irreversibly. The list marks active/expired/revoked links. Switching project/document clears the shown capability and unsubmitted password.

Shares retain these reading features; mobile uses an outline button. OpenAPI/TXT show original content. Private trees, activity, AI, and management tools are omitted.

## Audit history

Action and resource filters use localized enums. Search actors by email substring or exact user ID; filtering happens on the backend before pagination. Rows show email and project name with original IDs in tooltips. System operations, anonymous visitors, and unavailable identities have explicit labels. Project administrators remain restricted to their own projects.
