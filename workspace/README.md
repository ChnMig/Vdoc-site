<p>

  <img src="assets/vdoc-logo.png" width="96" height="96" alt="Vdoc logo" />
</p>

# Vdoc Workspace

## Recommended installation: one Compose file

Download [docker-compose.yml](https://chnmig.github.io/Vdoc-site/downloads/docker-compose.yml), put it in a dedicated directory, and fill every `CHANGE_ME` value in the YAML. All accounts, passwords, JWT/MCP keys, and connection settings stay in this private file. Then run:

```sh
docker compose pull
docker compose up -d
```

Open `http://127.0.0.1:8081` and sign in with your configured initial administrator. Backend automatically creates its schema, applies pending migrations, and creates the storage bucket and initial administrator. Ordinary deployments need no `.env`, source lock, installer, or test database script. For upgrades, keep the existing configuration and volumes, update the two application image versions, and repeat `pull` / `up -d` after backing up data. See the [deployment guide](https://chnmig.github.io/Vdoc-site/en/deployment) and [upgrade guide](https://chnmig.github.io/Vdoc-site/en/release-rollback).

The standalone source is `deploy/docker-compose.yml`. The root `docker-compose.yml` and instructions below support source development and release verification.

This directory is the release control plane for the five Vdoc repositories:

- `Vdoc/`: backend service and MCP HTTP API
- `Vdoc-admin/`: authenticated workbench and public-share frontend
- `Vdoc-site/`: public website and product documentation
- `Vdoc-mcp/`: installable MCP stdio adapter
- `Vdoc-skill/`: installable agent Skill

Product requirements, the repository lock, Compose orchestration, Pilot evidence, and release gates live at this workspace root. The root itself is intentionally not a Git repository; the five source repositories keep independent histories and releases.

## Docker Compose bootstrap artifact

Vdoc is self-hosted with Docker Compose. The developer source workspace is distributed as a checksummed bootstrap archive; ordinary deployments use the standalone YAML above. A release owner creates it from a clean, locked candidate:

```sh
cd Vdoc-site
pnpm workspace:package
pnpm build:root
pnpm site:package
```

This produces:

```text
vdoc-compose-bootstrap-v0.3.0.tar.gz
vdoc-compose-bootstrap-v0.3.0.tar.gz.sha256
```

This is not a binary installer or a container-image bundle. It contains `docker-compose.yml`, `.env.example`, the root deployment/release scripts, the MIT license, and `workspace.lock.json`. The optional offline installer downloads the separate Backend/Admin image archives, verifies their checksums and locked revisions, and loads them into Docker. Compose then starts PostgreSQL, RustFS, Backend, and Admin. Developers can instead initialize the five exact source checkouts and build locally. The archive contains no `.env`, credentials, local evidence, application binaries, container images, or repository working trees.

Packaging normalizes file order, mode, owner, group, timestamp, and gzip metadata, so identical inputs produce identical archive bytes. `workspace.lock.json` schema v2 binds each public repository to a credential-free GitHub HTTPS URL, an advertised ref, and its exact commit. It also binds the non-Git root control plane to a canonical SHA-256 over every distributed file except the lock itself. `scripts/vdoc-workspace-init.sh` fetches the locked ref and refuses it if the fetched commit differs. Users do not need GitHub SSH keys for bootstrap initialization.

Public copies of these workspace files live in [Vdoc-site/workspace](https://github.com/ChnMig/Vdoc-site/tree/main/workspace). The website serves the archive and checksum from its `downloads/` directory. Download, verify, and extract the bootstrap with:

```sh
VDOC_BOOTSTRAP_BASE=https://chnmig.github.io/Vdoc-site/downloads
curl -fLO "$VDOC_BOOTSTRAP_BASE/vdoc-compose-bootstrap-v0.3.0.tar.gz"
curl -fLO "$VDOC_BOOTSTRAP_BASE/vdoc-compose-bootstrap-v0.3.0.tar.gz.sha256"
shasum -a 256 -c vdoc-compose-bootstrap-v0.3.0.tar.gz.sha256
tar -xzf vdoc-compose-bootstrap-v0.3.0.tar.gz
cd vdoc-workspace
```

Direct assets: [Compose bootstrap archive](https://chnmig.github.io/Vdoc-site/downloads/vdoc-compose-bootstrap-v0.3.0.tar.gz) and [SHA-256 file](https://chnmig.github.io/Vdoc-site/downloads/vdoc-compose-bootstrap-v0.3.0.tar.gz.sha256). See the [deployment guide](https://chnmig.github.io/Vdoc-site/en/deployment) for configuration and first login. The archive and all five source tags use `v0.3.0`. The source lock uses `@release` only for the Site commit: a Git commit cannot contain its own hash. The Site tag build resolves this entry, verifies all five public tags against their pinned commits, and ships a fully resolved lock with five exact commit hashes. Website downloads become available when the corresponding Site build is deployed. They are evaluation snapshots and may be replaced; retain the downloaded archive and checksum when reproducing an environment. The checksum checks the bytes against the accompanying file; it does not authenticate a release or prove production readiness or a completed Pilot.

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
