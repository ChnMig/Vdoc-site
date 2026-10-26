# Install or Update Vdoc MCP and Skill

For an AI handling installation or update. Reply in the user's language. Use Vdoc's channel installer; no skills.sh. Installing or updating needs no backend URL or token.

## Identify the operation

- **Install:** use the requested `release` or `beta` channel; only a new install defaults to `release`. The bootstrap tag below does not select the channel. Use the current project's Skill directory: Codex `.agents/skills/vdoc`, Claude Code `.claude/skills/vdoc`. Resolve an unknown project/agent first; personal scope requires a user request.
- **Update:** locate the existing MCP command and Skill's real link target without exposing credentials. Determine their package source, original channel, absolute prefix, and Skill destination. Check `<prefix>/.vdoc-mcp-channel.json`: repository `ChnMig/Vdoc-mcp`, channel, and completed `tag` must agree with `@vdoc/mcp` package name/version and the linked `skills/vdoc` source. The marker alone is not proof of trusted provenance. Preserve this channel, prefix, target, scope, and MCP configuration; never default an update to `release` or guess a default prefix.
- Preserve local edits and other configuration. Unknown/unmanaged sources, incomplete or mismatched markers, conflicting channels, symlinked prefixes, copied Skills, or unrelated/broken links require clarification before replacement or migration. Do not delete files, fabricate markers, or silently create another installation. Keep matching links. Updating a shared prefix updates its MCP and every linked Skill, including other projects/personal scopes; explain that scope before proceeding.

## Verified installation

1. Check patched, supported Node.js and npm (installer minimum Node.js 20). Do not upgrade Node. Download both files into a fresh temporary directory:
   - https://github.com/ChnMig/Vdoc-mcp/releases/download/v0.3.17-beta.14/install-channel.mjs
   - https://github.com/ChnMig/Vdoc-mcp/releases/download/v0.3.17-beta.14/install-channel.mjs.sha256
2. Compute SHA-256 locally and compare before execution. Stop on download/checksum failure; never pipe remote scripts to a shell.
3. For a new install, run `node "<downloaded-installer>" --channel release` (or `beta`). For updates, explicitly pass **both original values**: `node "<downloaded-installer>" --channel <original-channel> --prefix "<original-absolute-prefix>"`. It verifies the latest release in that channel, with no fallback to main/another channel. `@vdoc/mcp` is not on npm; do not use `npm install @vdoc/mcp`. Reinstallation is not transactional; report failures without claiming success.
4. New installs normally report `~/.local/share/vdoc/mcp/release` or `.../beta`; custom prefixes must be dedicated and absolute. Link the complete Skill, including references, templates and examples:

   ```sh
   node "<prefix>/node_modules/@vdoc/mcp/dist/index.js" skill install --directory "<project-skill-directory>"
   ```

   Updates retain the existing target/link. Channels share the name `vdoc`: separate their projects/scopes. Never overwrite another installation, copy only `SKILL.md`, or link temporary npx caches. Adapt quoting/paths to the OS; POSIX syntax is not PowerShell. Windows junction/path installation has simulated tests only.

5. Run `node "<prefix>/node_modules/@vdoc/mcp/dist/index.js" --version`; verify package/marker agreement, read the linked `SKILL.md`, and check referenced files. Report channel, old/new version for updates, prefix, Skill target, and checks. Remove only your temporary downloads. Restart MCP and reload Skills; disk updates do not prove a running process has reloaded. Report pending restarts honestly. No background updater.

## MCP connection

Keep existing connection settings and all other MCP servers unchanged; do not read or print tokens. Configure MCP only if requested, using the reported command and environment-specific URL/token in private client settings or secret storage. Never put tokens in chat, Skill files, CLI arguments, or logs. Without credentials report "Skill installed; MCP not connected". Verify `tools/list` and an authorized read after restart before claiming a working connection. Agents submit drafts; humans publish.
