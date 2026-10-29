# Install, Update, or Uninstall Vdoc MCP and Skill

Reply in the user's language. Use Vdoc's channel installer, not skills.sh. Installation/updates need no backend URL or token.

## Identify the operation

- **Install:** select the requested `release`/`beta`; only new installs default to `release`. The bootstrap tag does not select a channel. Use the project's Skill directory: Codex `.agents/skills/vdoc`, Claude Code `.claude/skills/vdoc`. Resolve unknown project/agent first; personal scope needs a user request.
- **Update:** locate the MCP command and real Skill link without exposing credentials; determine source, original channel, absolute prefix, and Skill target. Verify `<prefix>/.vdoc-mcp-channel.json`: repository `ChnMig/Vdoc-mcp`, channel, completed `tag`, `@vdoc/mcp` name/version, and linked `skills/vdoc` source must agree. A marker alone cannot prove trusted provenance. Retain channel/prefix/target/scope/MCP configuration: never default updates to `release` or guess prefixes.
- **Uninstall:** remove only this project's integration by default; use the removal section, not installation steps.
- Preserve local edits/configuration. Unknown/unmanaged sources, incomplete/mismatched markers, conflicting channels, symlinked prefixes, copied Skills, or foreign/broken links need clarification before replacement/migration. Never delete files, fabricate markers, or silently add another install. Keep matching links. Explain shared scope first: updating a prefix updates its MCP and all linked project/personal Skills.

## Verified installation and updates

1. Check patched, supported Node.js/npm (installer minimum Node.js 20); do not upgrade Node. Download into a fresh temporary directory:
   - https://github.com/ChnMig/Vdoc-mcp/releases/download/v0.3.17-beta.24/install-channel.mjs
   - https://github.com/ChnMig/Vdoc-mcp/releases/download/v0.3.17-beta.24/install-channel.mjs.sha256
2. Compare locally computed SHA-256 before execution. Stop on download/checksum failure; never pipe remote scripts to a shell.
3. Install: `node "<downloaded-installer>" --channel release` (or `beta`). Update with **both original values**: `node "<downloaded-installer>" --channel <original-channel> --prefix "<original-absolute-prefix>"`. This verifies the channel's latest release; never fall back to main/another channel. `@vdoc/mcp` is not on npm: do not run `npm install @vdoc/mcp`. Reinstallation is nontransactional; report failures honestly.
4. New prefixes default to `~/.local/share/vdoc/mcp/release` or `.../beta`; custom prefixes must be dedicated/absolute. Link the whole Skill, including references, templates and examples:

   ```sh
   node "<prefix>/node_modules/@vdoc/mcp/dist/index.js" skill install --directory "<project-skill-directory>"
   ```

   Updates retain the target/link. Channels share the name `vdoc`: separate projects/scopes. Never overwrite another install, copy only `SKILL.md`, or link temporary npx caches. Use OS-appropriate paths/quoting; POSIX is not PowerShell. Windows junction/path installs have simulated tests only.

5. Run `node "<prefix>/node_modules/@vdoc/mcp/dist/index.js" --version`; verify package/marker agreement, read linked `SKILL.md`, and check its references. Report channel, version (old/new for updates), prefix, Skill target, and checks. Remove only your temporary downloads. Restart MCP/reload Skills; report pending restarts. Disk updates cannot prove running processes reloaded. No background updater.

## MCP connection

Preserve connection settings/other MCP servers; do not read or print tokens. Configure MCP only on request, using the reported command and environment URL/token in private client settings/secret storage. Never put tokens in chat, Skill files, CLI arguments, or logs. Without credentials report "Skill installed; MCP not connected". After restart, verify `tools/list` and an authorized read before claiming connection success. Agents submit drafts; humans publish.

## Remove the current project's integration

No uninstall CLI exists: never invent `skill uninstall`, `vdoc-mcp uninstall`, or `--uninstall`. Do not download/run the installer.

1. Verify source/channel/prefix/package/marker as above; inspect Skill `lstat`/`readlink` and actual project configuration. Match MCP command/args to the package, never names/URLs alone. Preserve global/shared MCP entries and personal Skills; report inherited access. Disable locally only where supported. Resolve unknown ownership/scope first; absent items need no action.
2. Remove only the exact project Vdoc MCP entry; preserve other servers/fields/tools/secrets without printing them. Unlink only a proven project-owned Skill symlink/junction targeting this package. Never follow links, recursively delete normal directories, remove foreign/broken links, or delete copied Skills/local edits.
3. Keep packages/prefixes, other projects' links/configuration, and Node/npm. Global cleanup requires an explicit request, proven ownership, and reference checks. No reverse-reference registry exists: preserve/report any installation whose shared use cannot be excluded. Never delete prefixes/dependencies based on the name `vdoc`. Never revoke backend Tokens or delete services, databases, documents, or Compose resources.
4. Verify intended project removal/local disabling and retention of other configuration/shared installs. Disconnect this project's Vdoc MCP and reload Skills; report pending reloads and removed/retained items. Disclose remaining shared/global access; never claim complete removal or stopped processes without verification.
