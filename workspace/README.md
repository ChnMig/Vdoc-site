<p>
  <img src="assets/vdoc-logo.png" width="96" height="96" alt="Vdoc logo" />
</p>

# Vdoc Workspace

This directory is the release control plane for the five Vdoc repositories:

- `Vdoc/`: backend service and MCP HTTP API
- `Vdoc-admin/`: authenticated workbench and public-share frontend
- `Vdoc-site/`: public website and product documentation
- `Vdoc-mcp/`: installable MCP stdio adapter
- `Vdoc-skill/`: installable agent Skill

Product requirements, the repository lock, Compose orchestration, Pilot evidence, and release gates live at this workspace root. The root itself is intentionally not a Git repository; the five source repositories keep independent histories and releases.

## Docker Compose bootstrap artifact

Vdoc is self-hosted with Docker Compose. The supported one-entry acquisition format is a checksummed Compose bootstrap archive. A release owner creates it from a clean, locked candidate:

```sh
cd Vdoc-site
pnpm workspace:package
pnpm build:root
pnpm site:package
```

This produces:

```text
vdoc-compose-bootstrap-v0.1.0.tar.gz
vdoc-compose-bootstrap-v0.1.0.tar.gz.sha256
```

This is not a binary installer or a container-image bundle. It contains `docker-compose.yml`, `.env.example`, the root deployment/release scripts, the MIT license, and `workspace.lock.json`. The initializer fetches the five public repositories at the exact locked commits; `docker compose up -d --build` then builds the Backend/Admin images locally and starts PostgreSQL, RustFS, Backend, and Admin. The archive contains no `.env`, credentials, local evidence, application binaries, container images, or repository working trees.

Packaging normalizes file order, mode, owner, group, timestamp, and gzip metadata, so identical inputs produce identical archive bytes. `workspace.lock.json` schema v2 binds each public repository to a credential-free GitHub HTTPS URL, an advertised ref, and its exact commit. It also binds the non-Git root control plane to a canonical SHA-256 over every distributed file except the lock itself. `scripts/vdoc-workspace-init.sh` fetches the locked ref and refuses it if the fetched commit differs. Users do not need GitHub SSH keys for bootstrap initialization.

Public copies of these workspace files live in [Vdoc-site/workspace](https://github.com/ChnMig/Vdoc-site/tree/main/workspace). The website serves the archive and checksum from its `downloads/` directory. Download, verify, and initialize the whole workspace with:

```sh
VDOC_BOOTSTRAP_BASE=https://vibe-doc.com/downloads
curl -fLO "$VDOC_BOOTSTRAP_BASE/vdoc-compose-bootstrap-v0.1.0.tar.gz"
curl -fLO "$VDOC_BOOTSTRAP_BASE/vdoc-compose-bootstrap-v0.1.0.tar.gz.sha256"
shasum -a 256 -c vdoc-compose-bootstrap-v0.1.0.tar.gz.sha256
tar -xzf vdoc-compose-bootstrap-v0.1.0.tar.gz
cd vdoc-workspace
scripts/vdoc-workspace-init.sh
```

Direct assets: [Compose bootstrap archive](https://vibe-doc.com/downloads/vdoc-compose-bootstrap-v0.1.0.tar.gz) and [SHA-256 file](https://vibe-doc.com/downloads/vdoc-compose-bootstrap-v0.1.0.tar.gz.sha256). See the [deployment guide](https://vibe-doc.com/en/deployment) for configuration and first login. The archive and all five source tags use `v0.1.0`. The source lock uses `@release` only for the Site commit: a Git commit cannot contain its own hash. The Site tag build resolves this entry, verifies all five public tags against their pinned commits, and ships a fully resolved lock with five exact commit hashes. Website downloads become available when the corresponding Site build is deployed. They are evaluation snapshots and may be replaced; retain the downloaded archive and checksum when reproducing an environment. The checksum checks the bytes against the accompanying file; it does not authenticate a release or prove production readiness or a completed Pilot.

## Existing workspace

The commands below apply to a workspace extracted from a published Compose archive. The checked-in release source lock is a template; run `pnpm workspace:package` from `Vdoc-site/` after publishing the matching tags to materialize it. For pre-publication checks, `pnpm workspace:package --candidate` creates an explicitly non-deployable archive; the initializer and release packager reject it.

Verify that every repository origin and HEAD matches the lock, each remote
currently advertises the locked commit at the locked ref, the root control
plane matches its digest, and every worktree is clean:

```sh
scripts/vdoc-workspace-verify.sh
scripts/vdoc-workspace-contracts.sh
```

The initializer never fetches, resets, checks out, cleans, or overwrites an existing repository. The verifier queries each configured remote with `git ls-remote`; a forged or stale local `refs/remotes/origin/*` cannot prove publication. For a concrete extracted lock, commit and push the matching repositories before refreshing it. When preparing a new release in the maintainer workspace, keep the Site source entry as `@release`, update the other four commit pins, Agent install pins, and Compose provenance, then commit the Site export. The tag build resolves its own commit without a circular source lock. Review a concrete lock refresh with:

```sh
scripts/vdoc-workspace-lock-refresh.sh
scripts/vdoc-workspace-lock-refresh.sh --write
scripts/vdoc-workspace-verify.sh
```

The default refresh is non-mutating and prints a candidate plus diff. `--write` performs an atomic replacement only when every worktree is clean and every HEAD exactly equals its advertised remote ref. A moving branch such as `main` proves current publication but is not a durable release identity; create and review immutable release tags before claiming long-term release provenance.

The root control-plane digest detects accidental or partial drift, but it is not an external signature because the lock and verifier live in the same writable archive. The published archive SHA-256, release signature, immutable URL, and authenticated human release record remain the external trust anchors.

## Local deployment and release candidate

Use [PILOT_RUNBOOK.md](PILOT_RUNBOOK.md) for the local Compose and live-E2E path, and [RELEASE_DEPLOY.md](RELEASE_DEPLOY.md) for artifact, deployment, rollback, and human sign-off requirements.

```sh
scripts/vdoc-local-bootstrap.sh
docker compose --env-file .env up -d --build
scripts/vdoc-release-dry-run.sh --list
scripts/vdoc-release-dry-run.sh
```

The release dry-run proves an engineering candidate. It does not by itself prove product validation. A real Pilot result must start from `PILOT_RESULT.template.json` and pass `scripts/vdoc-pilot-result-verify.sh` with observed evidence, target-user feedback, and both required signatures.
