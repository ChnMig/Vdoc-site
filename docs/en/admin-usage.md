# First Use

Publish a short team guide and let your agent read it from Vdoc. By the end, you will see an actual query: the agent reads published Markdown and answers from that document.

## Before You Start

- Complete the [Deployment Guide](deployment.md#quick-start), including the initial-admin account.
- Confirm the workbench opens and Backend health reports `detail.healthy` as `true`.
- Use an agent that supports MCP stdio, with Node.js 20 or later, npm, and Git installed on the machine running it.

This trial uses Markdown to cover create, review, publish, and query. Admin AI, public sharing, and the Skill can follow your first successful query.

## 1. Log In and Create a Trial Project

Open the [local workbench](http://127.0.0.1:8081) and log in with the email and password you set in `.env` during deployment. For a remote deployment, open its workbench URL.

Create or select a Team, then create a Project named **Vdoc Trial**. Use the initial SuperAdmin for this trial; add Reader, Writer, and Project Admin members when you start collaborating.

If the account is not set up, return to [initial-admin configuration](deployment.md#initial-admin). Changing initialization fields does not reset accounts in an existing database.

## 2. Create the Sample Document

In document management, select your new project and fill in:

| Field                    | Sample value                               |
| ------------------------ | ------------------------------------------ |
| Document name            | Team Guide                                 |
| Document type            | Markdown                                   |
| Repository-relative path | `docs/team-guide.md`                       |
| Working branch           | `dev` (select after creating the document) |

The relative path identifies the document consistently. New documents have `dev`, `test`, and protected `prod` branches; use `dev` for this trial.

## 3. Submit Your First Draft

On the drafts page, select the project, document, and `dev` branch. Set the version name to `v1` and paste this sample Markdown into the content field, or upload it as an `.md` file:

```md
# Team Guide

- The demo project codename is Northstar.
- Run the project tests before committing code.
- Submit documentation changes as drafts for a project administrator to review and publish.
```

This content is a trial example. Create the Draft, then submit it for review. Saving a draft alone does not make it a published document for your agent.

## 4. Review and Publish

Open the review page, select the submitted `v1` draft, inspect its content and Diff, then approve publication. A Project Admin or SuperAdmin performs this step.

On the versions page, confirm that `dev` contains published `v1` and that its content includes the three rules above. This is an immutable Version; further changes require a new draft.

**Publishing is a human action.** MCP can submit drafts but cannot publish Versions directly.

## 5. Create a Read Token

Open the MCP Token page and create a user-bound token:

- Select **`doc:read`** for Markdown access. This query does not need draft-write permissions.
- Confirm the token's user can access **Vdoc Trial** and set a future expiry.
- Copy the token into your agent's private configuration or secret manager.

Active tokens can be revealed and copied again from their details. Lists, revoked tokens, and expired tokens show masked values. Never put a raw token in command-line arguments, repositories, screenshots, or logs.

<div id="connect-agent"></div>

## 6. Connect Your Agent

Add Vdoc to your agent's MCP configuration. This example is for clients that accept `mcpServers` JSON; for other clients, enter the same command, arguments, and environment variables through their MCP settings.

```json
{
  "mcpServers": {
    "vdoc": {
      "command": "npx",
      "args": [
        "--yes",
        "github:ChnMig/Vdoc-mcp#b65f346453525a3f35a6ce466cf47a4488d5c8f8"
      ],
      "env": {
        "VDOC_BASE_URL": "http://127.0.0.1:8080",
        "VDOC_MCP_TOKEN": "REPLACE_WITH_LOCAL_VDOC_MCP_TOKEN"
      }
    }
  }
}
```

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
| The document exists, but no published version is available | Approve the draft on the review page and confirm `v1` appears in versions.                                                    |
| The agent answers without querying                         | Enable MCP and explicitly request `get_latest_doc`; retry in a new conversation if needed.                                    |

See [Troubleshooting](troubleshooting.md) for more detail.

## After Your First Successful Query

- **Keep your agent following the docs:** install [Vdoc Skill](skill-workflows.md#installation). It guides agents to query Vdoc before integration, migration analysis, and document changes; live content still comes from MCP.
- **Try an API change:** create an OpenAPI document (3.0 / 3.1 supported), submit and approve two versions, then query the Diff using the [API change example](how-it-works.md#example). Your token needs `api:read`.
- **Enable the built-in AI assistant:** follow [Admin AI](admin-ai.md) to configure an OpenAI-compatible provider for automatic summaries and page chat. It cannot approve, reject, modify, or publish content. Missing configuration or provider failures do not block human review.
- **Share outside your project:** create a public link as described below.
- **Verify a release candidate:** maintainers can continue to [Engineering and Release Checks](deployment.md#engineering-and-release-checks).

### Create and Manage Public Shares

A Project Admin or SuperAdmin can create a public share from the Documents page after selecting a Branch with a published Version. The default expiry is three months; one month, six months, one year, and permanent are also available. An optional password must contain 12–72 UTF-8 bytes with no leading or trailing Unicode whitespace. Copy the complete capability link after creation, reveal it again when needed, or revoke it irreversibly. The list distinguishes active, expired, and revoked links. Changing the Project or Document immediately clears any displayed capability and unsubmitted password from the Admin page.
