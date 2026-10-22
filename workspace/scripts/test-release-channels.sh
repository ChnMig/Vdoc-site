#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${VDOC_WORKSPACE_ROOT:-$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)}"
stage="$(mktemp -d)"
trap 'rm -rf -- "$stage"' EXIT

# config 只解析配置，不启动容器或连接数据库。
env -u COMPOSE_PROJECT_NAME docker compose -f "$ROOT_DIR/deploy/docker-compose.yml" config --format json >"$stage/release.json"
env -u COMPOSE_PROJECT_NAME docker compose -f "$ROOT_DIR/deploy/docker-compose.beta.yml" config --format json >"$stage/beta.json"
python3 - "$stage/release.json" "$stage/beta.json" <<'PY'
import json
import sys

release, beta = [json.load(open(path)) for path in sys.argv[1:]]
assert release['name'] == 'vdoc'
assert beta['name'] == 'vdoc-beta'
for config, channel in [(release, 'latest'), (beta, 'beta')]:
    services = config['services']
    assert services['backend']['image'] == f'ghcr.io/chnmig/vdoc:{channel}'
    assert services['config-check']['image'] == services['backend']['image']
    assert services['admin']['image'] == f'ghcr.io/chnmig/vdoc-admin:{channel}'
    assert services['backend']['environment']['VDOC_DATABASE_HOST'] == 'postgres'
    assert services['backend']['environment']['VDOC_STORAGE_ENDPOINT'] == 'rustfs:9000'
    assert services['admin']['environment']['VDOC_ADMIN_API_BASE_URL'] == 'same-origin'
    assert not services['postgres'].get('ports')
    assert not services['rustfs'].get('ports')
    assert all(not volume.get('external') for volume in config['volumes'].values())
    assert all(not network.get('external') for network in config['networks'].values())

def names(config, key):
    return {value['name'] for value in config[key].values()}

def ports(config):
    return {(port.get('host_ip'), port['published'])
            for service in config['services'].values()
            for port in service.get('ports', [])}

assert names(release, 'volumes').isdisjoint(names(beta, 'volumes'))
assert names(release, 'networks').isdisjoint(names(beta, 'networks'))
assert ports(release).isdisjoint(ports(beta))
assert beta['services']['backend']['environment']['VDOC_DATABASE_NAME'] == 'vdoc_beta'
assert beta['services']['backend']['environment']['VDOC_STORAGE_BUCKET'] == 'vdoc-beta'
assert beta['services']['admin']['environment']['VDOC_ADMIN_RELEASE_CHANNEL'] == 'beta'
assert beta['services']['backend']['ports'][0]['published'] == '18080'
assert beta['services']['admin']['ports'][0]['published'] == '18081'
print('PASS: release/beta images, Compose projects, ports, networks, database and storage volumes are isolated')
PY
