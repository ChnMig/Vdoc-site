# Install, update or remove Vdoc MCP

This guide configures the `@chnmig/vdoc-mcp` stdio adapter. Vdoc supplies document management tools; the consuming agent or application owns its business workflows. Do not install a companion Skill.

## Choose the channel and configuration scope

- `beta`: `@chnmig/vdoc-mcp@beta`, connected to the user's beta Vdoc backend.
- `release`: `@chnmig/vdoc-mcp@latest`, connected to the stable backend. The first npm publication is beta only; `latest` is available after a stable npm release. An unavailable tag must fail; do not silently change channels.
- An exact version such as `@chnmig/vdoc-mcp@0.4.0-beta.6` keeps a deployment on the backend's release.

Requires Node.js 20+ and npm. Verify the requested tag with `npm view @chnmig/vdoc-mcp@beta version` (or `@latest`). These are Vdoc package tags; do not upgrade unrelated client software or dependencies.

Inspect the current project's MCP settings and existing Vdoc entries first. Preserve other servers and settings. Use project-local private configuration or a user configuration entry associated with this project; keep credentials out of tracked project files. For Codex, merge a server section into personal `~/.codex/config.toml`; Cursor uses personal `~/.cursor/mcp.json`; Claude Code uses top-level `mcpServers` in private `~/.claude.json`, with the project's existing scope where applicable. Preserve the client's configuration format.

## Install

Use `vdoc_beta` for a beta connection and `vdoc` for stable. With npx, no global package or separate installation directory is needed. Example for beta:

```json
{
  "mcpServers": {
    "vdoc_beta": {
      "command": "npx",
      "args": ["--yes", "@chnmig/vdoc-mcp@beta"],
      "env": {
        "VDOC_BASE_URL": "https://your-beta-vdoc.example.test",
        "VDOC_MCP_TOKEN": "REPLACE_WITH_LOCAL_VDOC_MCP_TOKEN"
      }
    }
  }
}
```

Equivalent Codex configuration:

```toml
[mcp_servers.vdoc_beta]
command = "npx"
args = ["--yes", "@chnmig/vdoc-mcp@beta"]
startup_timeout_sec = 60
tool_timeout_sec = 180

[mcp_servers.vdoc_beta.env]
VDOC_BASE_URL = "https://your-beta-vdoc.example.test"
VDOC_MCP_TOKEN = "REPLACE_WITH_LOCAL_VDOC_MCP_TOKEN"
```

Use the URL/token already configured for the requested environment. If either is missing, leave an explicit placeholder and explain the remaining local configuration step. Do not infer a production or beta URL, copy a token to another environment, or ask users to paste credentials into public chat. The workbench creates and reveals MCP tokens. Pass credentials only through private environment/secret settings, never CLI arguments or logs.

Verify the executable with `npx --yes @chnmig/vdoc-mcp@beta --version`. Restart or reload the MCP connection, run `tools/list`, then read an authorized document selected by the user. Report whether the executable, connection and actual document access were checked; do not claim a connection is verified from `--version` alone.

## Update

Preserve the existing channel, backend URL, token, server name, configuration scope and installation location. Report the old and selected version.

- For `npx ...@beta` or `...@latest`, restart MCP: a new process resolves the current registry tag; a running process does not update in place. Do not clear unrelated npm caches.
- For an explicitly pinned npm version, align with the actual backend release before changing that pin; do not silently migrate a reproducible deployment to a moving tag.
- For a global npm installation, run `npm install --global @chnmig/vdoc-mcp@beta` (or the original `@latest` channel), then restart. A shared global installation affects all its users.
- For a project-local npm installation, update within the same prefix and existing dependency convention. Do not replace a shared installation with a global one.
- Existing GitHub channel installations remain valid. Reuse their channel and dedicated prefix with the reviewed standalone `install-channel.mjs`; its output provides the update command. Old packages may reside at `node_modules/@vdoc/mcp`, new ones at `node_modules/@chnmig/vdoc-mcp`. Older bundled updaters that require a Skill must be replaced by the current standalone installer before the first upgrade. Preserve the install location and agent credentials.

On a successful backend request the adapter compares its own version with `X-Vdoc-Server-Version` from that actual server. If they differ, tell the user both versions and align the older component, or pin the client to that server's version. If the server version is unknown, report that it cannot be checked. A successful tool call does not prove version compatibility. Warnings use MCP logging and stderr and do not block document tools.

## Uninstall

Remove only the identifiable Vdoc entry belonging to the current project or selected connection. Preserve other MCP servers, user settings and all document data on Vdoc. Do not revoke shared tokens unless the user requests it.

For npx, removing the configuration is sufficient; cached packages need not be deleted. Remove a project-local npm dependency only when this project owns it. Do not delete a user-wide/global package, a channel prefix or configuration shared with other projects. Explain any shared installation left in place. If a private prefix is conclusively owned only by this integration, remove only that prefix.

For legacy combined installations, remove only a Vdoc Skill symlink whose ownership is known. Preserve regular directories and locally maintained files. The current package has no Skill install command.

Restart or reload the client and confirm the selected Vdoc server entry is absent. Summarize the removed configuration and any shared installation retained.
