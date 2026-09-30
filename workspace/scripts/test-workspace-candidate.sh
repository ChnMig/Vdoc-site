#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
command -v python3 >/dev/null 2>&1 || { printf 'FAIL: required command not found: python3\n' >&2; exit 1; }

# Every advertised ref is served by a disposable local bare repository. The
# synthetic HTTPS origins also exercise the distributable package lock schema.
python3 - "$ROOT_DIR" <<'PY'
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

SOURCE = Path(sys.argv[1])
SCRIPTS = SOURCE / 'scripts'
VERSION = '0.3.10'
REPOSITORIES = ('Vdoc', 'Vdoc-admin', 'Vdoc-site', 'Vdoc-mcp')
CANDIDATE = SCRIPTS / 'vdoc-workspace-candidate-verify.sh'
DIGEST = SCRIPTS / 'vdoc-control-plane-digest.sh'
EVIDENCE = os.environ.get('VDOC_CANDIDATE_TEST_EVIDENCE_DIR')
if EVIDENCE:
    EVIDENCE = Path(EVIDENCE)
    EVIDENCE.mkdir(parents=True, exist_ok=True)
if not CANDIDATE.is_file():
    raise SystemExit('FAIL: candidate verifier does not exist: ' + str(CANDIDATE))


class Fixture:
    def __init__(self, base, full_inventory=False):
        self.base = base
        self.root = base / 'workspace'
        self.root.mkdir(parents=True)
        self.remotes = base / 'remotes'
        self.remotes.mkdir()
        self.env = os.environ.copy()
        for key in list(self.env):
            if key.startswith(('VDOC_WORKSPACE_', 'VDOC_CONTROL_PLANE_', 'GIT_')):
                self.env.pop(key)
        self.env.update({
            'GIT_CONFIG_NOSYSTEM': '1',
            'GIT_CONFIG_GLOBAL': str(base / 'gitconfig'),
            'GIT_TERMINAL_PROMPT': '0',
            'VDOC_WORKSPACE_ROOT': str(self.root),
            'VDOC_WORKSPACE_LOCK_FILE': str(self.root / 'workspace.lock.json'),
            'VDOC_WORKSPACE_DISTRIBUTION_FILE': str(self.root / 'workspace-distribution.json'),
            'VDOC_CONTROL_PLANE_DIGEST_SCRIPT': str(DIGEST),
            'VDOC_WORKSPACE_VERIFY_SCRIPT': str(SCRIPTS / 'vdoc-workspace-verify.sh'),
        })
        (base / 'gitconfig').write_text(
            '[url "' + self.remotes.as_uri() + '/"]\n'
            '\tinsteadOf = https://github.com/vdoc-candidate-fixture/\n')
        if full_inventory:
            manifest = json.loads((SOURCE / 'workspace-distribution.json').read_text())
            for relative in manifest['files']:
                source = SOURCE / relative
                destination = self.root / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, destination)
            manifest['version'] = VERSION
            manifest['artifact_name'] = 'fixture-v' + VERSION
        else:
            (self.root / 'control.txt').write_text('Synthetic candidate gate fixture.\n')
            manifest = {
                'schema_version': 2,
                'name': 'fixture',
                'version': VERSION,
                'artifact_name': 'fixture-v' + VERSION,
                'root_directory': 'vdoc-workspace',
                'repository_lock': 'workspace.lock.json',
                'files': ['control.txt', 'workspace-distribution.json', 'workspace.lock.json'],
                'executables': [],
            }
        (self.root / 'workspace-distribution.json').write_text(json.dumps(manifest, indent=2) + '\n')
        rows = []
        for name in REPOSITORIES:
            bare = self.remotes / (name + '.git')
            repo = self.root / name
            self.checked(['git', 'init', '--quiet', '--bare', '--initial-branch=main', str(bare)])
            self.checked(['git', 'init', '--quiet', '--initial-branch=main', str(repo)])
            self.git(name, 'config', 'user.name', 'Candidate Fixture')
            self.git(name, 'config', 'user.email', 'candidate@example.invalid')
            (repo / 'fixture.txt').write_text('Pushed candidate commit.\n')
            if name != 'Vdoc':
                (repo / 'package.json').write_text(json.dumps({'name': name.lower(), 'version': VERSION}) + '\n')
            self.git(name, 'add', '.')
            self.git(name, 'commit', '--quiet', '-m', 'candidate fixture')
            remote = ('https://github.com/vdoc-candidate-fixture/' + name + '.git'
                      if full_inventory else str(bare))
            self.git(name, 'remote', 'add', 'origin', remote)
            self.git(name, 'push', '--quiet', '-u', 'origin', 'main')
            rows.append({'path': name, 'remote': remote, 'ref': 'refs/tags/v' + VERSION,
                         'commit': self.git(name, 'rev-parse', 'HEAD').strip()})
        self.lock = {
            'schemaVersion': 2,
            'repositories': rows,
            'controlPlane': {'manifest': 'workspace-distribution.json',
                             'sha256': self.checked([str(DIGEST)]).strip()},
        }
        self.write_lock()

    def call(self, args, cwd=None):
        return subprocess.run(args, cwd=cwd or self.root, env=self.env,
                              capture_output=True, text=True)

    def checked(self, args, cwd=None):
        result = self.call(args, cwd)
        if result.returncode:
            raise AssertionError('fixture command failed: ' + repr(args) + '\n' + result.stdout + result.stderr)
        return result.stdout

    def git(self, name, *args):
        return self.checked(['git', '-C', str(self.root / name), *args])

    def row(self, name='Vdoc-admin'):
        return next(row for row in self.lock['repositories'] if row['path'] == name)

    def write_lock(self):
        (self.root / 'workspace.lock.json').write_text(json.dumps(self.lock, indent=2) + '\n')

    def commit(self, name='Vdoc-admin', push=False):
        repo = self.root / name
        (repo / 'next.txt').write_text('A different commit.\n')
        self.git(name, 'add', '.')
        self.git(name, 'commit', '--quiet', '-m', 'next fixture commit')
        if push:
            self.git(name, 'push', '--quiet', 'origin', 'main')
        return self.git(name, 'rev-parse', 'HEAD').strip()

    def fingerprint(self):
        manifest = json.loads((self.root / 'workspace-distribution.json').read_text())
        return {
            'files': {path: hashlib.sha256((self.root / path).read_bytes()).hexdigest()
                      for path in manifest['files']},
            'repositories': {name: {
                'head': self.git(name, 'rev-parse', 'HEAD').strip(),
                'status': self.git(name, 'status', '--porcelain=v1', '--untracked-files=all'),
            } for name in REPOSITORIES},
        }


def prepare_contracts_fixture(fixture):
    # Exercise the actual contracts entry point and its unchanged pin scanner.
    # Only the earlier source/action/package gates need repository contents for
    # this focused rejection; no product configuration or application data is read.
    copied = []
    for script in ('vdoc-workspace-contracts.sh', 'vdoc-workspace-candidate-verify.sh',
                   'vdoc-control-plane-digest.sh'):
        relative = 'scripts/' + script
        destination = fixture.root / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(SCRIPTS / script, destination)
        copied.append(relative)
    for name in REPOSITORIES:
        workflow = fixture.root / name / '.github/workflows/ci.yml'
        workflow.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(SOURCE / name / '.github/workflows/ci.yml', workflow)
        if name in ('Vdoc-admin', 'Vdoc-site'):
            package_file = fixture.root / name / 'package.json'
            package = json.loads(package_file.read_text())
            package['packageManager'] = json.loads((SOURCE / name / 'package.json').read_text())['packageManager']
            package_file.write_text(json.dumps(package) + '\n')
        fixture.git(name, 'add', '.')
        fixture.git(name, 'commit', '--quiet', '-m', 'contract fixture action and package provenance')
        fixture.git(name, 'push', '--quiet', 'origin', 'main')
        fixture.row(name)['commit'] = fixture.git(name, 'rev-parse', 'HEAD').strip()
    stale_source = 'github:' + 'ChnMig/' + 'Vdoc-mcp#' + '0' * 40
    (fixture.root / 'pins.txt').write_text(stale_source + '\n')
    manifest_file = fixture.root / 'workspace-distribution.json'
    manifest = json.loads(manifest_file.read_text())
    manifest['files'] = sorted(manifest['files'] + copied + ['pins.txt'])
    manifest['executables'] = sorted(copied)
    manifest_file.write_text(json.dumps(manifest, indent=2) + '\n')
    fixture.lock['controlPlane']['sha256'] = fixture.checked([str(DIGEST)]).strip()
    fixture.write_lock()


checks = []


def probe(label, fixture, command, success=True, expected_text=None):
    before = fixture.fingerprint()
    result = fixture.call(command)
    output = result.stdout + result.stderr
    if EVIDENCE:
        directory = EVIDENCE / label
        directory.mkdir(exist_ok=True)
        (directory / 'output.log').write_text(output)
        for name in ('workspace.lock.json', 'workspace-distribution.json'):
            shutil.copy2(fixture.root / name, directory / name)
    if (result.returncode == 0) != success:
        raise AssertionError(label + ': unexpected exit code ' + str(result.returncode) + '\n' + output)
    if expected_text and expected_text not in output:
        raise AssertionError(label + ': missing diagnostic ' + repr(expected_text) + '\n' + output)
    if fixture.fingerprint() != before:
        raise AssertionError(label + ': gate changed source files, repository HEADs, or worktree status')
    checks.append({'scenario': label, 'exit_code': result.returncode,
                   'expected_text': expected_text, 'source_unchanged': True})
    print('ok: ' + label, flush=True)
    return output


with tempfile.TemporaryDirectory(prefix='vdoc-candidate-tests-') as temporary:
    base = Path(temporary)

    def fixture(label, full_inventory=False):
        return Fixture(base / label, full_inventory)

    f = fixture('tag-absent')
    for row in f.lock['repositories']:
        result = f.call(['git', 'ls-remote', '--exit-code', row['remote'], row['ref']])
        assert result.returncode == 2, 'fixture release tag unexpectedly exists'
    probe('main-pushed-release-tag-absent', f, [str(CANDIDATE)], True,
          'Candidate workspace verification complete')
    probe('strict-rejects-unadvertised-release-tag', f,
          [str(SCRIPTS / 'vdoc-workspace-verify.sh')], False, 'cannot resolve locked ref')

    f = fixture('branch')
    for row in f.lock['repositories']:
        f.git(row['path'], 'push', '--quiet', 'origin', 'HEAD:refs/heads/release/candidate')
        row['ref'] = 'refs/heads/release/candidate'
    f.write_lock()
    probe('explicit-safe-branch-lock', f, [str(CANDIDATE)], True,
          'Candidate workspace verification complete')

    f = fixture('dirty')
    (f.root / 'Vdoc-admin' / 'fixture.txt').write_text('Dirty candidate.\n')
    probe('dirty-tracked-worktree', f, [str(CANDIDATE)], False, 'worktree is dirty')

    f = fixture('untracked')
    (f.root / 'Vdoc-mcp' / 'untracked.txt').write_text('Untracked candidate input.\n')
    probe('dirty-untracked-worktree', f, [str(CANDIDATE)], False, 'worktree is dirty')

    f = fixture('head-drift')
    f.commit()
    probe('head-drift-from-lock', f, [str(CANDIDATE)], False, 'HEAD mismatch')

    f = fixture('unpushed')
    local_commit = f.commit()
    f.git('Vdoc-admin', 'update-ref', 'refs/remotes/origin/main', local_commit)
    f.row()['commit'] = local_commit
    f.write_lock()
    probe('forged-tracking-ref-unpushed-head', f, [str(CANDIDATE)], False, 'remote ref mismatch')

    f = fixture('remote-moved')
    original = f.row()['commit']
    f.commit(push=True)
    f.git('Vdoc-admin', 'checkout', '--quiet', '--detach', original)
    probe('advertised-main-moved', f, [str(CANDIDATE)], False, 'remote ref mismatch')

    f = fixture('origin-mismatch')
    f.git('Vdoc-admin', 'remote', 'set-url', 'origin', 'https://github.com/vdoc-candidate-fixture/other.git')
    probe('origin-mismatch', f, [str(CANDIDATE)], False, 'origin mismatch')

    f = fixture('digest-mismatch')
    (f.root / 'control.txt').write_text('Changed control-plane content.\n')
    probe('root-control-plane-digest-mismatch', f, [str(CANDIDATE)], False, 'control-plane digest mismatch')

    f = fixture('incomplete-lock')
    f.lock['repositories'].pop()
    f.write_lock()
    probe('incomplete-repository-set', f, [str(CANDIDATE)], False, 'invalid workspace lock')

    f = fixture('unsafe-ref')
    f.row()['ref'] = 'refs/heads/release/../main'
    f.write_lock()
    probe('unsafe-branch-ref', f, [str(CANDIDATE)], False, 'unsafe or unsupported ref')

    f = fixture('wrong-release-tag')
    f.row()['ref'] = 'refs/tags/v0.3.9'
    f.write_lock()
    probe('different-release-tag', f, [str(CANDIDATE)], False, 'candidate tag must match')

    f = fixture('missing-advertised-main')
    f.checked(['git', '--git-dir', str(f.remotes / 'Vdoc-admin.git'),
               'update-ref', '-d', 'refs/heads/main'])
    probe('missing-advertised-source-main', f, [str(CANDIDATE)], False,
          'cannot resolve candidate source ref')

    f = fixture('existing-tag-mismatch')
    original = f.row()['commit']
    f.commit()
    f.git('Vdoc-admin', 'tag', '-a', 'v' + VERSION, '-m', 'different advertised fixture')
    f.git('Vdoc-admin', 'push', '--quiet', 'origin', 'refs/tags/v' + VERSION)
    f.git('Vdoc-admin', 'checkout', '--quiet', '--detach', original)
    probe('existing-release-tag-at-different-commit', f, [str(CANDIDATE)], False,
          'existing tag mismatch')

    f = fixture('package-version')
    (f.root / 'Vdoc-admin' / 'package.json').write_text(json.dumps({'name': 'vdoc-admin', 'version': '0.3.9'}) + '\n')
    f.row()['commit'] = f.commit(push=True)
    f.write_lock()
    probe('component-package-version-mismatch', f, [str(CANDIDATE)], False,
          'package version mismatch')

    f = fixture('advertised-tag')
    for row in f.lock['repositories']:
        f.git(row['path'], 'tag', '-a', 'v' + VERSION, '-m', 'published fixture')
        f.git(row['path'], 'push', '--quiet', 'origin', row['ref'])
    probe('strict-annotated-advertised-release-tag', f,
          [str(SCRIPTS / 'vdoc-workspace-verify.sh')], True, '4 repositories match the lock and advertised remote refs')
    probe('candidate-matching-annotated-advertised-tag', f, [str(CANDIDATE)], True,
          'Candidate workspace verification complete')

    f = fixture('contracts-stale-pin')
    prepare_contracts_fixture(f)
    output = probe('candidate-contracts-reject-stale-mcp-install-pin', f,
                   [str(f.root / 'scripts/vdoc-workspace-contracts.sh'), '--candidate'], False,
                   'unpinned or lock-mismatched Vdoc MCP install source')
    assert 'Candidate workspace verification complete' in output, 'contracts bypassed candidate source proof'
    for row in f.lock['repositories']:
        row['ref'] = 'refs/heads/main'
    f.write_lock()
    probe('candidate-contracts-require-future-release-tag-refs', f,
          [str(f.root / 'scripts/vdoc-workspace-contracts.sh'), '--candidate'], False,
          'workspace lock must pin every repository to refs/tags/v' + VERSION)

    f = fixture('package-check', full_inventory=True)
    probe('candidate-package-inventory-check', f, [str(CANDIDATE), '--package-check'], True,
          '4 locked repositories')
    assert not (f.root / 'dist').exists(), 'candidate --package-check unexpectedly generated a source artifact'
    f.lock['candidate'] = True
    f.write_lock()
    for label, script, args, diagnostic in (
        ('strict-verifier-rejects-marked-candidate', 'vdoc-workspace-verify.sh', [], 'candidate bootstrap is for local checks only'),
        ('strict-init-rejects-marked-candidate', 'vdoc-workspace-init.sh', [], 'candidate bootstrap is for local checks only'),
        ('default-package-check-rejects-marked-candidate', 'vdoc-workspace-package.sh', ['--check'], 'candidate lock cannot be packaged as a release'),
        ('default-package-rejects-marked-candidate', 'vdoc-workspace-package.sh', [], 'candidate lock cannot be packaged as a release'),
    ):
        probe(label, f, [str(SCRIPTS / script), *args], False, diagnostic)
    assert not (f.root / 'dist').exists(), 'rejected candidate package created a source output directory'

if EVIDENCE:
    (EVIDENCE / 'results.json').write_text(json.dumps({
        'fixture': 'Disposable local bare Git repositories; synthetic HTTPS origins rewritten to file URLs by an isolated Git configuration.',
        'network_used': False,
        'checks': checks,
    }, indent=2) + '\n')
print('ok: ' + str(len(checks)) + ' candidate workspace gate checks')
PY
