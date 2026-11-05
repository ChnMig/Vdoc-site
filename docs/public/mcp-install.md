# Install, update or remove Vdoc MCP

This guide configures the `@chnmig/vdoc-mcp` stdio adapter. Vdoc supplies document management tools; the consuming agent or application owns its business workflows. Do not install a companion Skill.

## Choose the channel and configuration scope

- `beta`: `@chnmig/vdoc-mcp@beta`, connected to the user's beta Vdoc backend.
- `release`: `@chnmig/vdoc-mcp@latest`, connected to the stable backend. Stable publications update only `latest`; beta publications update only `beta`. Check the resolved version before configuring a stable connection. An unavailable tag must fail; do not silently change channels.
- An exact version such as `@chnmig/vdoc-mcp@0.4.4` keeps a deployment on the backend's release.

Requires Node.js 20+ and npm. Verify the requested tag with `npm view @chnmig/vdoc-mcp@latest version` (or `@beta`). These are Vdoc package tags; do not upgrade unrelated client software or dependencies.

Install once for the current OS user and register one user-wide MCP connection shared by all projects. Inspect the client's user-level settings and existing Vdoc entries first, preserving other servers and settings. Keep credentials in private user configuration. For Codex, merge a server section into personal `~/.codex/config.toml`; Cursor uses personal `~/.cursor/mcp.json`; Claude Code uses top-level `mcpServers` in private `~/.claude.json` (user scope, outside `projects`). Preserve the client's configuration format. Do not create project-local MCP files or add Vdoc to a project's package.json or node_modules. Existing project entries may shadow global entries: identify and report them, preserving their settings unless the user requests migration.

## Install

Use `vdoc_beta` for a beta connection and `vdoc` for stable. Default to a global npm installation in the requested channel:

```sh
npm install --global @chnmig/vdoc-mcp@latest
vdoc-mcp --version
```

Use `@beta` for a beta backend. Locate the installed executable and use its absolute path if the client's GUI does not inherit the shell PATH. On Windows the executable may be `vdoc-mcp.cmd`. Preserve the configured backend URL and token; the same connection can discover all teams and projects the token owner can access.

Before changing a global executable, check which existing connections use it. Stable and beta connections that need different versions must retain separate per-user channel installations with distinct absolute commands, using the reviewed GitHub channel installer and its existing prefixes. Do not repoint another channel's shared executable. These installations still use user-wide MCP configuration shared by all projects.

Example user-wide stable configuration:

```json
{
  "mcpServers": {
    "vdoc": {
      "command": "vdoc-mcp",
      "env": {
        "VDOC_BASE_URL": "https://your-vdoc.example.test",
        "VDOC_MCP_TOKEN": "REPLACE_WITH_LOCAL_VDOC_MCP_TOKEN"
      }
    }
  }
}
```

Equivalent Codex configuration:

```toml
[mcp_servers.vdoc]
command = "vdoc-mcp"
startup_timeout_sec = 60
tool_timeout_sec = 180

[mcp_servers.vdoc.env]
VDOC_BASE_URL = "https://your-vdoc.example.test"
VDOC_MCP_TOKEN = "REPLACE_WITH_LOCAL_VDOC_MCP_TOKEN"
```

Use the URL/token already configured for the requested environment. If either is missing, leave an explicit placeholder and explain the remaining local configuration step. Do not infer a production or beta URL, copy a token to another environment, or ask users to paste credentials into public chat. The workbench creates and reveals MCP tokens. Pass credentials only through private environment/secret settings, never CLI arguments or logs.

Verify the configured executable with `vdoc-mcp --version` (or its absolute command). Restart or reload the MCP connection, run `tools/list`, and confirm the same user-wide connection is available from another project. Read an authorized document selected by the user. Report whether the executable, global configuration, connection and actual document access were checked; do not claim a connection is verified from `--version` alone.

## Update

Update the user's shared global connection. Preserve the existing channel, backend URL, token, server name, user-wide configuration and installation location. Report the old and selected version; all projects using that connection share the update. If only a legacy project-level connection exists, report its scope and migrate it only when the user asks for global installation.

- For `npx ...@beta` or `...@latest`, restart MCP: a new process resolves the current registry tag; a running process does not update in place. Do not clear unrelated npm caches.
- For an explicitly pinned npm version, align with the actual backend release before changing that pin; do not silently migrate a reproducible deployment to a moving tag.
- For a global npm installation, run `npm install --global @chnmig/vdoc-mcp@latest` (or the original `@beta` channel), then restart. A shared global installation affects all its users.
- Do not create or update project-local dependencies for this global action. Preserve unrelated project settings.
- Existing GitHub channel installations remain valid. Reuse their channel and dedicated prefix with the reviewed standalone `install-channel.mjs`; its output provides the update command. Old packages may reside at `node_modules/@vdoc/mcp`, new ones at `node_modules/@chnmig/vdoc-mcp`. Older bundled updaters that require a Skill must be replaced by the current standalone installer before the first upgrade. Preserve the install location and agent credentials.

On a successful backend request the adapter compares its own version with `X-Vdoc-Server-Version` from that actual server. If they differ, tell the user both versions and align the older component, or pin the client to that server's version. If the server version is unknown, report that it cannot be checked. A successful tool call does not prove version compatibility. Warnings use MCP logging and stderr and do not block document tools.

## Uninstall

Remove the selected Vdoc entry from the user's global MCP configuration. This removes that connection from all projects; report that scope. Preserve other MCP servers, project-specific entries, user settings and all document data on Vdoc. Do not revoke shared tokens unless the user requests it.

For a global npm installation, run `npm uninstall --global @chnmig/vdoc-mcp` only after confirming no remaining connection uses that executable. For npx, removing the configuration is sufficient; cached packages need not be deleted. Remove a dedicated channel prefix only when no remaining connection uses it. Preserve packages or prefixes still used by other connections and explain what remains. Leave project-local dependencies unchanged.

For legacy combined installations, remove only a Vdoc Skill symlink whose ownership is known. Preserve regular directories and locally maintained files. The current package has no Skill install command.

Restart or reload the client and confirm the selected Vdoc server entry is absent. Summarize the removed configuration and any shared installation retained.
