# Install Vdoc Skill

For an AI asked to install Vdoc Skill. Reply in the user's language. Skill installation needs no backend URL or token.

1. Use the requested `release` or `beta` channel; default to `release`. Do not infer the channel from the bootstrap tag below.
2. Use the current project's agent-specific Skill directory: Codex `.agents/skills/vdoc`, Claude Code `.claude/skills/vdoc`. Resolve an unknown project/agent first; personal scope requires a user request. Preserve other configuration and local edits; never overwrite a different installation.
3. Check patched, supported Node.js and npm (installer minimum Node.js 20). Do not silently upgrade the runtime. Download both files into a new temporary directory:
   - https://github.com/ChnMig/Vdoc-mcp/releases/download/v0.3.17-beta.14/install-channel.mjs
   - https://github.com/ChnMig/Vdoc-mcp/releases/download/v0.3.17-beta.14/install-channel.mjs.sha256
4. Compute SHA-256 locally and compare with the checksum before execution. Stop on download/checksum failure; never pipe a remote script into a shell.
5. Run `node "<downloaded-installer>" --channel release` (use `beta` when selected). It resolves and verifies the newest package in that channel. Never fall back to main/another channel. `@vdoc/mcp` is not on npm; do not run `npm install @vdoc/mcp`.
6. Use the reported absolute prefix, normally `~/.local/share/vdoc/mcp/release` or `.../beta`. A custom `--prefix` must be dedicated and absolute. Link the complete Skill, including references, templates and examples:

   ```sh
   node "<prefix>/node_modules/@vdoc/mcp/dist/index.js" skill install --directory "<project-skill-directory>"
   ```

   Channels share the name `vdoc`: keep their projects/scopes separate. Reuse only a matching existing link. Do not copy just `SKILL.md` or link from temporary npx caches. Adapt quoting/paths to the host OS; POSIX syntax is not PowerShell. Windows junction/path behavior has simulated, not real-host installation tests.

7. Read the installed `SKILL.md`, verify its referenced files and package source, reload Skills, and report channel, resolved version, prefix, target and checks. Remove only your temporary downloads.

## Connection and updates

Configure MCP only if requested, preserving other servers. Use the reported MCP command, that environment's URL and token in private client settings/secret storage. Never put tokens in chat, Skill files, CLI arguments or logs. Without credentials report "Skill installed; MCP not connected". Check `tools/list` and an authorized read before claiming connection success. Agents submit drafts; humans publish.

Repeat the verified installer with the same channel/prefix to update MCP and its linked Skill; restart MCP and reload Skills. No background updater.
