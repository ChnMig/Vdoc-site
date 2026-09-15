#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$ROOT_DIR"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

assert_file_contains() {
  local file="$1"
  local needle="$2"
  grep -Fq -- "$needle" "$file" || fail "$file is missing required text: $needle"
}

assert_file_not_contains() {
  local file="$1"
  local needle="$2"
  if grep -Fq -- "$needle" "$file"; then
    fail "$file contains forbidden text: $needle"
  fi
}

assert_backend_root_docs_are_distributed() {
  local linked_doc
  while IFS= read -r linked_doc; do
    [[ -n "$linked_doc" ]] || continue
    [[ -f "$ROOT_DIR/$linked_doc" ]] || \
      fail "Vdoc README links to missing workspace document: $linked_doc"
    jq -e --arg path "$linked_doc" '.files | index($path) != null' \
      "$ROOT_DIR/workspace-distribution.json" >/dev/null || \
      fail "workspace bootstrap omits Vdoc README document: $linked_doc"
  done < <(
    grep -hoE '\]\((\.\./|https://github.com/ChnMig/Vdoc-site/blob/main/workspace/)[^)#]+\.md(#[^)]+)?\)' \
      "$ROOT_DIR/Vdoc/README.md" "$ROOT_DIR/Vdoc/README.zh-CN.md" |
      sed -E 's@.*\]\((\.\./|https://github.com/ChnMig/Vdoc-site/blob/main/workspace/)([^#)]+).*@\2@' |
      LC_ALL=C sort -u
  )
}

assert_immutable_container_sources() {
  local file line source
  for file in \
    "$ROOT_DIR/docker-compose.yml" \
    "$ROOT_DIR/Vdoc/docker-compose.yml" \
    "$ROOT_DIR/Vdoc/Dockerfile" \
    "$ROOT_DIR/Vdoc-admin/Dockerfile" \
    "$ROOT_DIR/Vdoc/.github/workflows/ci.yml"; do
    while IFS= read -r line; do
      source="$(printf '%s\n' "$line" | sed -E 's/^[[:space:]]*(FROM|image:)[[:space:]]+([^[:space:]]+).*/\2/')"
      [[ "$source" =~ @sha256:[0-9a-f]{64}$ ]] || \
        fail "$file uses a mutable container source: $source"
    done < <(grep -E '^[[:space:]]*(FROM|image:)[[:space:]]+' "$file" || true)
  done
}

openapi_routes() {
  awk '
    /^  \/api\/v1\/(open|private).*:$/ {
      path=$1
      sub(/:$/, "", path)
      next
    }
    /^    (get|post|put|patch|delete):$/ && path != "" {
      method=toupper($1)
      sub(/:$/, "", method)
      print method " " path
    }
  ' "$ROOT_DIR/Vdoc/docs/api/openapi.yaml" |
    sed -E 's/\{([^}]+)\}/:\1/g' |
    sort -u
}

implementation_plan_routes() {
  awk '
    /^(GET|POST|PUT|PATCH|DELETE)[[:space:]]+\/api\/v1\/(open|private)/ {
      print $1 " " $2
    }
  ' "$ROOT_DIR/IMPLEMENTATION_PLAN.md" | sort -u
}

mcp_manifest_tools() {
  jq -r '.tools[].name' "$ROOT_DIR/contracts/mcp-tools-v0.1.json" | sort -u
}

mcp_backend_tools() {
  sed -n '/^var toolDefinitions = /,/^}/p' "$ROOT_DIR/Vdoc/api/app/v1/open/mcp/mcp.go" |
    sed -nE 's/.*Name: "([a-z0-9_]+)".*/\1/p' |
    sort -u
}

mcp_marked_plain_inventory() {
  local file="$1"
  sed -n '/VDOC_MCP_TOOL_INVENTORY_START/,/VDOC_MCP_TOOL_INVENTORY_END/p' "$file" |
    sed -nE 's/^[[:space:]]*([a-z][a-z0-9_]+)[[:space:]]*$/\1/p' |
    sort -u
}

mcp_marked_markdown_inventory() {
  local file="$1"
  sed -n '/VDOC_MCP_TOOL_INVENTORY_START/,/VDOC_MCP_TOOL_INVENTORY_END/p' "$file" |
    sed -nE 's/^[[:space:]]*- `([a-z][a-z0-9_]+)`.*/\1/p' |
    sort -u
}

mcp_skill_test_tools() {
  jq -r '.tools[].name' "$ROOT_DIR/Vdoc-skill/references/mcp-tools.json" | sort -u
}

assert_mcp_inventory_matches() {
  local label="$1"
  shift
  if ! diff -u <(mcp_manifest_tools) <("$@"); then
    fail "$label MCP tool inventory must match contracts/mcp-tools-v0.1.json"
  fi
}

for repo in Vdoc Vdoc-admin Vdoc-site Vdoc-mcp Vdoc-skill; do
  workflow="$ROOT_DIR/$repo/.github/workflows/ci.yml"
  [[ -f "$workflow" ]] || fail "$repo CI workflow is missing"
  while IFS= read -r line; do
    action="${line#*uses: }"
    action="${action%% *}"
    case "$action" in
      ./*) ;;
      *@*)
        ref="${action##*@}"
        [[ "$ref" =~ ^[0-9a-f]{40}$ ]] || \
          fail "$repo CI uses a mutable third-party action reference: $action"
        ;;
      *) fail "$repo CI has an invalid action reference: $action" ;;
    esac
  done < <(grep -E '^[[:space:]]*uses:' "$workflow" || true)
done

[[ "$(jq -r '.packageManager' "$ROOT_DIR/Vdoc-admin/package.json")" == 'pnpm@11.6.0' ]] || \
  fail 'Vdoc-admin packageManager must match CI pnpm 11.6.0'
[[ "$(jq -r '.packageManager' "$ROOT_DIR/Vdoc-site/package.json")" == 'pnpm@11.6.0' ]] || \
  fail 'Vdoc-site packageManager must match CI pnpm 11.6.0'

[[ "$(jq -r '.schemaVersion' "$ROOT_DIR/workspace.lock.json")" == 2 ]] || \
  fail 'workspace.lock.json must use schemaVersion 2'
release_version="$(jq -r '.version' "$ROOT_DIR/workspace-distribution.json")"
release_ref="refs/tags/v$release_version"
jq -e --arg release_ref "$release_ref" 'all(.repositories[]; .ref == $release_ref)' \
  "$ROOT_DIR/workspace.lock.json" >/dev/null || \
  fail "workspace lock must pin every repository to $release_ref"
mcp_lock_commit="$(jq -r '.repositories[] | select(.path == "Vdoc-mcp") | .commit' "$ROOT_DIR/workspace.lock.json")"
skill_lock_commit="$(jq -r '.repositories[] | select(.path == "Vdoc-skill") | .commit' "$ROOT_DIR/workspace.lock.json")"
backend_lock_commit="$(jq -r '.repositories[] | select(.path == "Vdoc") | .commit' "$ROOT_DIR/workspace.lock.json")"
admin_lock_commit="$(jq -r '.repositories[] | select(.path == "Vdoc-admin") | .commit' "$ROOT_DIR/workspace.lock.json")"
[[ "$mcp_lock_commit" =~ ^[0-9a-f]{40}$ && "$skill_lock_commit" =~ ^[0-9a-f]{40}$ ]] || \
  fail 'workspace lock is missing MCP or Skill commit provenance'

if rg -n --pcre2 --hidden \
  -g '!**/.git/**' \
  -g '!**/node_modules/**' \
  -g '!**/dist/**' \
  -g '!**/docs/.vitepress/dist/**' \
  -g '!**/.omo/**' \
  -g '!**/.artifacts/**' \
  -g '!Vdoc-site/workspace/**' \
  -g '!scripts/vdoc-workspace-contracts.sh' \
  -g '!Vdoc-mcp/README.md' \
  -g '!Vdoc-mcp/examples/**' \
  "github:ChnMig/Vdoc-mcp(?!#${mcp_lock_commit})|git\\+https://github\\.com/ChnMig/Vdoc-mcp\\.git(?!#${mcp_lock_commit})" \
  .; then
  fail 'workspace contains an unpinned or lock-mismatched Vdoc MCP install source'
fi

if rg -n --hidden \
  -g '!**/.git/**' \
  -g '!**/node_modules/**' \
  -g '!**/dist/**' \
  -g '!**/docs/.vitepress/dist/**' \
  -g '!**/.omo/**' \
  -g '!**/.artifacts/**' \
  -g '!Vdoc-site/workspace/**' \
  -g '!scripts/vdoc-workspace-contracts.sh' \
  'git clone[^\n]*ChnMig/Vdoc-skill\.git' \
  .; then
  fail 'workspace contains an unpinned Vdoc Skill clone command'
fi

for file in \
  "$ROOT_DIR/Vdoc-site/docs/skill-workflows.md" \
  "$ROOT_DIR/Vdoc-site/docs/en/skill-workflows.md"; do
  assert_file_contains "$file" "VDOC_SKILL_COMMIT=$skill_lock_commit"
done
assert_file_contains "$ROOT_DIR/Vdoc-skill/README.md" 'VDOC_SKILL_COMMIT="$(jq -er'
assert_file_contains "$ROOT_DIR/Vdoc-skill/README.md" 'select(.path == "Vdoc-skill")'
assert_file_contains "$ROOT_DIR/Vdoc-mcp/README.md" 'VDOC_MCP_COMMIT="$(jq -er'
assert_file_contains "$ROOT_DIR/Vdoc-mcp/README.md" 'select(.path == "Vdoc-mcp")'
for file in \
  "$ROOT_DIR/Vdoc-mcp/examples/claude_desktop_config.json" \
  "$ROOT_DIR/Vdoc-mcp/examples/cursor_mcp.json" \
  "$ROOT_DIR/Vdoc-mcp/examples/opencode.jsonc"; do
  assert_file_contains "$file" 'github:ChnMig/Vdoc-mcp#<VDOC_MCP_COMMIT_FROM_WORKSPACE_LOCK>'
done
admin_skill_source="$ROOT_DIR/Vdoc-admin/src/features/vdoc-admin/skill-page.tsx"
admin_mcp_source="$ROOT_DIR/Vdoc-admin/src/features/vdoc-admin/page-utils.ts"
# Released Admin refs may predate page splitting; verify their existing barrel.
[[ -f "$admin_skill_source" ]] || admin_skill_source="$ROOT_DIR/Vdoc-admin/src/features/vdoc-admin/pages.tsx"
[[ -f "$admin_mcp_source" ]] || admin_mcp_source="$ROOT_DIR/Vdoc-admin/src/features/vdoc-admin/pages.tsx"
assert_file_contains "$admin_skill_source" "const vdocSkillCommit = '$skill_lock_commit'"
assert_file_contains "$admin_mcp_source" "github:ChnMig/Vdoc-mcp#$mcp_lock_commit"
assert_backend_root_docs_are_distributed

[[ -f "$ROOT_DIR/LICENSE" && ! -L "$ROOT_DIR/LICENSE" ]] || fail 'workspace root MIT license is missing'
jq -e '.files | index("LICENSE") != null' "$ROOT_DIR/workspace-distribution.json" >/dev/null || \
  fail 'Docker Compose bootstrap omits the root MIT license'

bootstrap_asset_url='https://vibe-doc.com/downloads/vdoc-compose-bootstrap-v0.1.0.tar.gz'
assert_file_contains "$ROOT_DIR/README.md" "$bootstrap_asset_url"
assert_file_contains "$ROOT_DIR/README.md" "$bootstrap_asset_url.sha256"
assert_file_contains "$ROOT_DIR/README.md" 'https://github.com/ChnMig/Vdoc-site/tree/main/workspace'
assert_file_contains "$ROOT_DIR/README.md" 'This is not a binary installer or a container-image bundle.'
assert_file_contains "$ROOT_DIR/RELEASE_DEPLOY.md" 'scripts/vdoc-workspace-release-assets-verify.sh'
assert_file_not_contains "$ROOT_DIR/README.md" 'No public bootstrap URL is declared'
# Locked source tags retain their historical README content. Current public
# navigation is validated by Site CI; it must not require an unpublished release.

assert_immutable_container_sources
assert_file_contains "$ROOT_DIR/Vdoc/Dockerfile" 'VDOC_SERVER_PID_FILE=""'
assert_file_contains "$ROOT_DIR/docker-compose.yml" 'VDOC_SERVER_PID_FILE: ""'
assert_file_contains "$ROOT_DIR/docker-compose.yml" 'VERSION: ${VDOC_BACKEND_VERSION:?set VDOC_BACKEND_VERSION}'
assert_file_contains "$ROOT_DIR/docker-compose.yml" 'GIT_COMMIT: ${VDOC_BACKEND_GIT_COMMIT:?set VDOC_BACKEND_GIT_COMMIT}'
assert_file_contains "$ROOT_DIR/docker-compose.yml" 'BUILD_TIME: ${VDOC_BACKEND_BUILD_TIME:?set VDOC_BACKEND_BUILD_TIME}'
assert_file_contains "$ROOT_DIR/docker-compose.yml" 'VERSION: ${VDOC_ADMIN_VERSION:?set VDOC_ADMIN_VERSION}'
assert_file_contains "$ROOT_DIR/docker-compose.yml" 'GIT_COMMIT: ${VDOC_ADMIN_GIT_COMMIT:?set VDOC_ADMIN_GIT_COMMIT}'
assert_file_contains "$ROOT_DIR/docker-compose.yml" 'BUILD_TIME: ${VDOC_ADMIN_BUILD_TIME:?set VDOC_ADMIN_BUILD_TIME}'
[[ "$(awk -F= '$1 == "VDOC_BACKEND_GIT_COMMIT" {print $2}' "$ROOT_DIR/.env.example")" == "$backend_lock_commit" ]] || \
  fail '.env.example backend Git provenance must match workspace.lock.json'
[[ "$(awk -F= '$1 == "VDOC_ADMIN_GIT_COMMIT" {print $2}' "$ROOT_DIR/.env.example")" == "$admin_lock_commit" ]] || \
  fail '.env.example Admin Git provenance must match workspace.lock.json'
for component in BACKEND ADMIN; do
  [[ "$(awk -F= -v key="VDOC_${component}_VERSION" '$1 == key {print $2}' "$ROOT_DIR/.env.example")" == "$release_version" ]] || \
    fail '.env.example build versions must match the Compose release version'
done
if rg -n 'ARG (VERSION=dev|BUILD_TIME=unknown|GIT_COMMIT=unknown)' "$ROOT_DIR/Vdoc/Dockerfile" "$ROOT_DIR/Vdoc-admin/Dockerfile"; then
  fail 'Docker build provenance still permits dev/unknown defaults'
fi

if ! diff -u <(openapi_routes) <(implementation_plan_routes); then
  fail 'IMPLEMENTATION_PLAN.md HTTP route inventory must match the OpenAPI contract'
fi

[[ "$(jq -r '.version' "$ROOT_DIR/contracts/mcp-tools-v0.1.json")" == '0.1' ]] || \
  fail 'MCP tool manifest version must be 0.1'
mcp_tool_count="$(jq -r '.tools | length' "$ROOT_DIR/contracts/mcp-tools-v0.1.json")"
[[ "$mcp_tool_count" -gt 0 ]] || fail 'MCP tool manifest must not be empty'
[[ "$(jq -r '[.tools[].name] | unique | length' "$ROOT_DIR/contracts/mcp-tools-v0.1.json")" == "$mcp_tool_count" ]] || \
  fail 'MCP v0.1 manifest contains duplicate tool names'
[[ "$(jq -r '.tools[] | select(.name == "get_doc_draft") | .scopes_any | join(",")' "$ROOT_DIR/contracts/mcp-tools-v0.1.json")" == 'doc:read' ]] || \
  fail 'get_doc_draft must require doc:read in the MCP manifest'

assert_mcp_inventory_matches 'backend runtime' mcp_backend_tools
assert_mcp_inventory_matches 'PRD.md' mcp_marked_plain_inventory "$ROOT_DIR/PRD.md"
assert_mcp_inventory_matches 'IMPLEMENTATION_PLAN.md' mcp_marked_plain_inventory "$ROOT_DIR/IMPLEMENTATION_PLAN.md"
assert_mcp_inventory_matches 'Chinese site docs' mcp_marked_markdown_inventory "$ROOT_DIR/Vdoc-site/docs/mcp-tools.md"
assert_mcp_inventory_matches 'English site docs' mcp_marked_markdown_inventory "$ROOT_DIR/Vdoc-site/docs/en/mcp-tools.md"
assert_mcp_inventory_matches 'Vdoc Skill' mcp_marked_plain_inventory "$ROOT_DIR/Vdoc-skill/SKILL.md"
assert_mcp_inventory_matches 'Vdoc Skill validation' mcp_skill_test_tools

if ! diff -u <(jq -S . "$ROOT_DIR/contracts/mcp-tools-v0.1.json") <(jq -S . "$ROOT_DIR/Vdoc-skill/references/mcp-tools.json"); then
  fail 'Skill argument contract must match the workspace MCP manifest'
fi

(
  cd "$ROOT_DIR/Vdoc"
  VDOC_MCP_CONTRACT_FILE="$ROOT_DIR/contracts/mcp-tools-v0.1.json" \
    go test ./api/app/v1/open/mcp -run '^TestMCPToolArgumentManifest$' -count=1
) || fail 'MCP argument manifest must match runtime tool schemas'

if sed -n '/^### 9\.2 MCP Tools/,/^## 10\./p' "$ROOT_DIR/PRD.md" |
  rg -n 'projectId|documentId|branchId|versionName|draftId|schemaContent|sourceGitCommitId|fromVersion|toVersion|endpointId|diffId|addedEndpoints|removedEndpoints|modifiedEndpoints|breakingChanges|mustHandle'; then
  fail 'PRD.md MCP contract still contains camelCase request or response fields'
fi

assert_file_contains "$ROOT_DIR/Vdoc-admin/.github/workflows/ci.yml" 'run: pnpm test:entrypoint'
assert_file_contains "$ROOT_DIR/Vdoc-admin/.github/workflows/ci.yml" 'run: pnpm test:browser'
assert_file_contains "$ROOT_DIR/Vdoc-site/.github/workflows/ci.yml" 'run: pnpm test:performance'

for repo in Vdoc Vdoc-admin Vdoc-mcp Vdoc-skill; do
  assert_file_contains "$ROOT_DIR/$repo/.github/workflows/ci.yml" 'contents: read'
  assert_file_contains "$ROOT_DIR/$repo/.github/workflows/ci.yml" 'persist-credentials: false'
done

if rg -n --hidden \
  -g '!**/.git/**' \
  -g '!**/node_modules/**' \
  -g '!**/dist/**' \
  -g '!**/docs/.vitepress/dist/**' \
  -g '!**/.omo/**' \
  -g '!**/.artifacts/**' \
  -g '!Vdoc-site/workspace/**' \
  -g '!**/.impeccable/**' \
  -g '!**/.playwright-mcp/**' \
  -g '!scripts/vdoc-workspace-contracts.sh' \
  'npm (install|i) -g @vdoc/mcp|npx (-y|--yes) @vdoc/mcp|8081:80([^0-9]|$)|pnpm@11\.15\.1|\.codex/skills/vdoc' \
  .; then
  fail 'workspace still contains a retired install, port, package-manager, or Skill path'
fi

printf 'Workspace contracts passed.\n'
