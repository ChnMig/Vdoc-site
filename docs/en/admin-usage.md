# First Use

Publish a short team guide and let your agent read it from Vdoc. By the end, you will see an actual query: the agent reads published Markdown and answers from that document.

## Before You Start

- Complete the [Deployment Guide](deployment.md#quick-start), including the initial-admin account.
- Confirm the workbench opens and Backend health reports `detail.healthy` as `true`.
- Use an agent that supports MCP stdio, with Node.js 20 or later, npm, and Git installed on the machine running it.

This trial uses Markdown to cover create, review, publish, and query. Admin AI, public sharing, and the Skill can follow your first successful query.

## 1. Log In and Create a Trial Project

Open the [local workbench](http://127.0.0.1:8081) and log in with the email and password you set in `docker-compose.yml` during deployment. For a remote deployment, open its workbench URL.

After sign-in, **Workspace** opens with a team and project tree on the left. The right side lists the teams, projects, or project folders and documents at your current location. Use the initial SuperAdmin to click **Create team** under **All teams**, or choose an existing team. Open that team and click **Create project** to create **Vdoc Trial**. Creation forms open in dialogs.

Within a project, **Documents** browses its folders and files, while **Project members** lists its members. In an active project, a Project Admin or SuperAdmin can add members, assign Reader, Writer, or Project Admin roles, remove members, and access **Project settings**. SuperAdmins can also open **Team settings** and **People** from Workspace. Access is assigned per project; grouping projects in a team does not automatically grant access to the other projects.

If the account is not set up, return to [initial-admin configuration](deployment.md#initial-admin). Changing initialization fields does not reset accounts in an existing database.

Settings has Account, Appearance, AI and Version. Appearance controls theme/language; AI has system/project scopes. Category/scope changes retain unsaved input. Expand **Page guide** beside the page title.

### Open a Document from Workspace

Browse folders under the project's **Documents** tab and click a document to open its own reading page:

| Area                           | Purpose                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Project file tree on the left  | Shows only this project's folders and documents. Return to Workspace, switch files, or create folders and documents here.    |
| Content in the center          | Read the selected published version or draft. Controls above it select the branch, content state, and revision.              |
| Outline and tools on the right | Jump to a content heading. Versions, Diffs, and Document AI have separate entries; Document settings appears when permitted. |
| Document header                | Use **Share** or **Edit draft** when your role permits. Sharing targets the selected published version.                      |

Click anywhere on a folder row to expand or collapse it and choose a creation location without closing the current document. The open document and folder location have separate selection states. Teams, projects, people, and folders have distinct icons, as do OpenAPI, Markdown, and TXT files.

**Versions** lists publication history across the document's branches; select a revision to read it. The separate **Diffs** tool selects a source and target branch with their published versions. Compare within or across branches of the same document, excluding drafts. Changes run from source to target. After changing a branch, reselect its version. Stored results load automatically; otherwise click **Compare**.

**Document settings** contains **Document details** and **Branches** tabs. Switching retains unsaved input; actions depend on your project role and document status.

**Document AI** toggles independently: a right dock beside the usable content or tool on wide screens, a right modal on narrow screens. Close it with its entry, close button, or `Esc` inside the panel to restore the page position. Summary and chat use the version or draft selected above.

On narrow screens, **Show files** opens the project tree in a drawer that closes after you choose a document. **On this page** opens the outline in a dialog, and document tools move to the top. Content without headings shows an empty-outline message.

Returning from a tool preserves the reading position and Preview/Source choice; visited tools retain input. For the same reading target, AI input survives closing, reopening, and resizing across breakpoints. Changing the branch, version, or draft creates a new AI context. Folders and project tabs update locally; Back/Forward restores URL selections. This temporary state is scoped to the current document, project, and session, and does not replace saving.

The global menu groups this browsing and management under **Workspace**; MCP, Skill, Audit, and Settings keep their own entries. Project selectors and date/time pickers use workbench components; selected dates and times use the device's local time and convert to UTC on submission.

### Change Your Password {#change-password}

After signing in, return to Workspace if you are on a document page, then open **Settings** from the avatar menu and choose **Account → Change password**. Enter your current password, a new password, and its confirmation. Both regular users and administrators can change their own password.

The new password must differ from the current one, contain 12–72 UTF-8 bytes, and have no leading or trailing whitespace. After a successful change, the current browser signs out; sign in again with your new password. If the current password is incorrect or the confirmation does not match, correct the form and retry.

If an administrator forgets their password, a server operator can use the [command-line reset](troubleshooting.md#reset-admin-password). Changing `VDOC_INITIAL_ADMIN_PASSWORD` in Compose does not reset an existing account.

### Version and Updates {#version-and-updates}

After signing in, open **Settings → Version** and find **Version and updates** to view the deployed frontend version, backend version, and update channel. Beta deployments use a separate Beta icon. If the frontend and backend versions or channels differ, the page prompts you to check the deployment configuration.

Click **Check for updates** to query official releases. The current backend version determines the channel: Beta checks only Beta releases, and stable checks only stable releases. Available updates include a release-notes link; failed checks can be retried. Development builds do not support release checks.

This feature only checks and reports availability. Operators still update containers manually using [upgrade and rollback](release-rollback.md).

## 2. Create the Sample Document

In **Workspace**, open the team, project, and target folder, then click **Create document**. From an independent document page, you can also select a location in the left file tree and click **New document**:

| Field         | Sample value    |
| ------------- | --------------- |
| Document name | Team Guide      |
| Document type | Markdown        |
| Filename      | `team-guide.md` |
| Folder        | `docs`          |

The document name is a display label. The separate filename follows that name or the uploaded filename until you edit it; later uploads preserve your edited filename. Select the project root or an existing folder in the tree; create subfolders at any level. Empty folders persist, with no fixed depth limit. Folders belong to one project; team isolation follows project ownership. The example becomes `docs/team-guide.md`: the folder and filename generate the relative path. Existing paths are retained.

You may upload OpenAPI JSON/YAML, Markdown `.md`, or plain-text `.txt` at creation. It creates a `dev` draft without submission or publication. Leave the upload empty for this walkthrough. Default `dev`, `test`, and protected `prod` are environment branches; administrators can create safe custom names such as `main` or `release/2026` in **Document settings → Branches**, without a `feature/` prefix.

TXT previews preserve plain text and line breaks: headings, links, and HTML are not rendered as Markdown. Comparisons use line diffs. TXT shares the Markdown draft, review, publication, and `doc:read` / `doc:draft` permission flow.

## 3. Submit Your First Draft

Open this document, choose `dev` and **Draft** at the top, then click **Edit draft** in the header to open **Editing and review**. Set the version name to `v1` and paste this Markdown into the content field, or upload it as an `.md` file:

```md
# Team Guide

- The demo project codename is Northstar.
- Run the project tests before committing code.
- Submit documentation changes as drafts for a project administrator to review and publish.
```

This content is a trial example. Create the Draft, then submit it for review. Saving a draft alone does not make it a published document for your agent.

## 4. Review and Publish

Select the submitted `v1` draft at the top and click **Edit draft**. Inspect its content and Diff in **Editing and review**, then approve publication. A Project Admin or SuperAdmin performs this step.

Choose **Published** at the top and select `v1`. Confirm that `dev` contains the three rules. This is an immutable Version; changes need a new draft. The separate **Versions** entry shows publication history; **Diffs** selects a branch and published version on each side for comparison. Expand **Document AI** whenever you need a summary or chat about the content selected at the top. The tree distinguishes published documents, unpublished drafts, and empty documents.

**Publishing is a human action.** MCP can submit drafts but cannot publish Versions directly.

## 5. Create a Read Token

Open the MCP Token page, click **Create MCP token** beside the list title, and create a user-bound token:

- Select **`doc:read`** for Markdown or TXT access. This query does not need draft-write permissions.
- Confirm the token's user can access **Vdoc Trial** and set a future expiry.
- Copy the token into your agent's private configuration or secret manager.

Active tokens can be revealed and copied again from their details. Lists, revoked tokens, and expired tokens show masked values. Never put a raw token in command-line arguments, repositories, screenshots, or logs.

<div id="connect-agent"></div>

## 6. Connect Your Agent

Choose the configuration format for your client. The MCP Token page in Admin also generates both formats.

::: code-group

```json [Cursor]
{
  "mcpServers": {
    "vdoc": {
      "command": "npx",
      "args": [
        "--yes",
        "github:ChnMig/Vdoc-mcp#35a60d23963aec29832b4da059081883d195bef3"
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
args = ["--yes", "github:ChnMig/Vdoc-mcp#35a60d23963aec29832b4da059081883d195bef3"]
startup_timeout_sec = 60
tool_timeout_sec = 180

[mcp_servers.vdoc.env]
VDOC_BASE_URL = "http://127.0.0.1:8080"
VDOC_MCP_TOKEN = "REPLACE_WITH_LOCAL_VDOC_MCP_TOKEN"
```

:::

- **Codex:** merge the TOML section into your personal `~/.codex/config.toml`, save, then restart the Vdoc MCP server or open a new session. Use `/mcp` to inspect the connection. The example allows 60 seconds for the first `npx` download. See the [official MCP configuration guide](https://developers.openai.com/codex/mcp/).
- **Cursor:** merge the JSON entry into `mcpServers` in your personal `~/.cursor/mcp.json`, then enable or restart Vdoc in Settings → Tools & MCP. Other `mcpServers` clients can reuse the JSON with their own configuration location.

Keep existing server entries and store tokens only in private configuration, never in a project repository.

Replace the placeholder with the token from step 5 in your client's private configuration, save, and reload the MCP connection. This example uses a fixed commit from the official GitHub repository. It must match `Vdoc-mcp` in your deployment's `workspace.lock.json`; the package is not currently published to the npm registry.

`VDOC_BASE_URL` must be reachable from **the machine running your agent**. Use `127.0.0.1` only when the agent and Backend run on the same machine; remote agents need a Backend address they can reach. See [MCP Setup and Tools](mcp-tools.md) for all options.

The client should show Vdoc as connected, with `list_projects`, `list_documents`, and `get_latest_doc` in its tool list.

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

- The agent actually calls Vdoc MCP and reads published content with `get_latest_doc`.
- The answer includes **Northstar** and **run the project tests before committing code** from the sample.
- It cites `docs/team-guide.md`, the `dev` branch, and published `v1`. The document ID can also help verify the source.

You have now completed the first flow from human review to agent use. A successful `tools/list` call or a similar-looking answer alone does not prove the agent read this document.

## If the Result Is Different

| Symptom                                                    | Next step                                                                                                                     |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| MCP does not start or connect                              | Check Node.js, npx, Git, and Backend reachability on the agent's machine, then inspect the client's MCP error.                |
| Tools appear, but the project or document is missing       | Check that the token is active, has `doc:read`, and belongs to a user with project access. Confirm the path and `dev` branch. |
| The document exists, but no published version is available | Select the draft at the top, approve it, then switch to published versions and confirm `v1`.                                  |
| The agent answers without querying                         | Enable MCP and explicitly request `get_latest_doc`; retry in a new conversation if needed.                                    |

See [Troubleshooting](troubleshooting.md) for more detail.

## After Your First Successful Query

- **Keep your agent following the docs:** install [Vdoc Skill](skill-workflows.md#installation). It guides agents to query Vdoc before integration, migration analysis, and document changes; live content still comes from MCP.
- **Try an API change:** create an OpenAPI document (3.0 / 3.1 supported), submit and approve two versions, then query the Diff using the [API change example](how-it-works.md#example). Your token needs `api:read`.
- **Enable the built-in AI assistant:** follow [Admin AI](admin-ai.md) to configure an OpenAI-compatible provider for automatic summaries and page chat. It cannot approve, reject, modify, or publish content. Missing configuration or provider failures do not block human review.
- **Share outside your project:** create a public link as described below.
- **Verify a release candidate:** maintainers can continue to [Engineering and Release Checks](deployment.md#engineering-and-release-checks).

### Create and Manage Public Shares

On the independent document page, a Project Admin or SuperAdmin selects a published version at the top and clicks **Share** in the header. Check the document, branch, and version in the dialog before creating the link. The link stays fixed to the version on screen, even after newer publications. Drafts cannot be publicly shared. Existing latest-version and all-version links retain their original scope.

Expiry defaults to three months, with one month, six months, one year, and permanent also available. An optional password needs 12–72 UTF-8 bytes without leading or trailing Unicode whitespace. Copy the complete capability link; reveal it again or revoke it irreversibly when needed. The list distinguishes active, expired, and revoked links. Changing the project or document clears the displayed capability and unsubmitted password.
