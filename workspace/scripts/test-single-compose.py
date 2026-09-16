#!/usr/bin/env python3
"""在隔离项目中验证单文件首次部署、重复启动及旧镜像升级；只清理本次创建的卷。"""
import argparse
import json
import os
from pathlib import Path
import secrets
import re
import socket
import subprocess
import tempfile
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--backend-image')
parser.add_argument('--admin-image')
parser.add_argument('--legacy-backend-image')
args = parser.parse_args()
template = (ROOT / 'deploy/docker-compose.yml').read_text()
backend_source = re.search(r'^x-backend-image: &backend-image (\S+)$', template, re.M).group(1)
admin_source = re.search(r'^x-admin-image: &admin-image (\S+)$', template, re.M).group(1)
if args.backend_image:
    template = template.replace(backend_source, args.backend_image)
if args.admin_image:
    template = template.replace(admin_source, args.admin_image)
environment = {k: v for k, v in os.environ.items() if not k.startswith(('VDOC_', 'COMPOSE_'))}
private_values = []


def redacted(value):
    for secret in private_values:
        value = value.replace(secret, '[redacted]').replace(quote(secret, safe=''), '[redacted]')
    return value


def port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


def scenario(legacy=False):
    with tempfile.TemporaryDirectory(prefix='vdoc-single-compose-') as directory:
        folder = Path(directory)
        compose_file = folder / 'docker-compose.yml'
        project = 'vdoc-single-' + secrets.token_hex(5)
        api_port, admin_port = port(), port()
        source = template.replace('127.0.0.1:8080:8080', f'127.0.0.1:{api_port}:8080')
        source = source.replace('VDOC_ADMIN_API_BASE_URL: "http://127.0.0.1:8080"',
                                f'VDOC_ADMIN_API_BASE_URL: "http://127.0.0.1:{api_port}"')
        source = source.replace('127.0.0.1:8081', f'127.0.0.1:{admin_port}')
        source = source.replace('localhost:8081', f'localhost:{admin_port}')
        compose_file.write_text(source)
        compose_file.chmod(0o600)
        prefix = ['docker', 'compose', '--project-name', project, '-f', str(compose_file)]

        def compose(*command, check=True):
            result = subprocess.run(prefix + list(command), cwd=folder, env=environment,
                                    text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                    timeout=300)
            if check and result.returncode:
                raise AssertionError(redacted(result.stdout))
            return result

        def sql(query):
            return compose('exec', '-T', 'postgres', 'sh', '-c',
                           'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "$1"',
                           'sh', query).stdout.strip()

        def request(path, data=None, token='', rpc=False):
            headers = {'Content-Type': 'application/json'}
            if token:
                headers['Authorization'] = token
            payload = None if data is None else json.dumps(data).encode()
            req = Request(f'http://127.0.0.1:{api_port}' + path, data=payload, headers=headers)
            with urlopen(req, timeout=25) as response:
                result = json.load(response)
            if rpc:
                assert 'error' not in result, 'MCP request failed'
                return result['result']
            assert result.get('code') == 200, f'API failed: {path}, {result.get("status")}'
            return result.get('detail')

        try:
            compose('config', '--quiet')
            if not legacy:
                rejected = compose('up', '-d', check=False)
                assert rejected.returncode != 0, 'placeholder configuration was accepted'
                state = compose('ps', '--status', 'running', '--services').stdout.strip()
                assert not state, 'a service started before valid configuration'
                print('PASS: placeholders rejected before database/storage startup', flush=True)

            db_password = secrets.token_hex(14) + ':@/?#%$'
            admin_password = secrets.token_hex(18)
            values = {
                'CHANGE_ME_DATABASE_PASSWORD': db_password,
                'CHANGE_ME_STORAGE_ACCESS_KEY': 'vdoc-' + secrets.token_hex(6),
                'CHANGE_ME_STORAGE_SECRET_KEY': secrets.token_hex(24),
                'CHANGE_ME_JWT_KEY': secrets.token_hex(32),
                'CHANGE_ME_MCP_ENCRYPTION_KEY': secrets.token_hex(32),
                'CHANGE_ME_INITIAL_ADMIN_PASSWORD': admin_password,
            }
            private_values.extend(values.values())
            for placeholder, value in values.items():
                source = source.replace(placeholder, value.replace('$', '$$'))
            current_source = source
            if legacy:
                new_image = args.backend_image or backend_source
                source = source.replace(new_image, args.legacy_backend_image)
                source = source.replace('command: ["--check-config"]', 'command: ["--version"]')
                dsn = 'postgres://vdoc:' + quote(db_password, safe='') + '@postgres:5432/vdoc?sslmode=disable'
                source = source.replace('  VDOC_DATABASE_HOST:', '  VDOC_DATABASE_DSN: "' + dsn + '"\n  VDOC_DATABASE_HOST:')
            compose_file.write_text(source)
            compose('up', '-d', '--wait', '--wait-timeout', '180')
            assert sorted(p.name for p in folder.iterdir()) == ['docker-compose.yml']
            auth = request('/api/v1/open/auth/login', {'email': 'admin@example.com', 'password': admin_password})
            token = auth['token']; private_values.append(token)
            assert auth['user']['is_super_admin']
            assert sql('SELECT count(*) FROM users') == '1'
            assert sql("SELECT count(*) FROM pg_database WHERE datname='vdoc_e2e'") == '0'
            migrations = sql('SELECT version || checksum FROM schema_migrations ORDER BY version')
            assert migrations and len(migrations.splitlines()) >= 2
            team = request('/api/v1/private/teams', {'name': 'Single Compose Test'}, token)
            project_data = request('/api/v1/private/projects', {
                'team_id': team['id'], 'name': 'Persistent project', 'admin_user_id': auth['user']['id']}, token)
            base = '/api/v1/private/projects/' + project_data['id'] + '/documents'
            document = request(base, {'name': 'Persistent document', 'document_type': 2,
                                      'relative_path': 'docs/persistence.md'}, token)
            base += '/' + document['id']
            branches = request(base + '/branches', token=token)
            branch = next(item for item in branches if item['name'] == 'dev')
            content = '# Persistent content\n\nSingle-file deployment survives an update.\n'
            draft = request(base + '/drafts', {'branch_id': branch['id'], 'version_name': '1.0.0',
                                             'content': content}, token)
            draft_url = base + '/drafts/' + draft['id']
            request(draft_url + '/submit', {}, token)
            snapshot = request(draft_url + '/content/raw', token=token)
            version = request(draft_url + '/approve', {'expected_review_revision': snapshot['draft']['review_revision']}, token)
            content_url = base + '/versions/' + version['id'] + '/content/raw'
            assert request(content_url, token=token)['content'] == content
            mcp = request('/api/v1/private/mcp-tokens', {'name': 'Persistent token', 'scopes': [3]}, token)
            private_values.append(mcp['token'])
            print('PASS: automatic schema/admin/bucket setup; document stored; no test database', flush=True)

            # 仅替换后端版本/配置；原有卷、凭据和已签发令牌必须继续可用。
            compose_file.write_text(current_source)
            compose('up', '-d', '--force-recreate', '--wait', '--wait-timeout', '180')
            assert sql('SELECT count(*) FROM users') == '1'
            assert set(migrations.splitlines()).issubset(
                sql('SELECT version || checksum FROM schema_migrations ORDER BY version').splitlines())
            request('/api/v1/private/identity/me', token=token)
            request('/api/v1/open/auth/login', {'email': 'admin@example.com', 'password': admin_password})
            assert request(content_url, token=token)['content'] == content
            revealed = request('/api/v1/private/mcp-tokens/' + mcp['id'], token=token)
            assert revealed['token'] == mcp['token']
            tools = request('/api/v1/open/mcp', {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/list'}, mcp['token'], rpc=True)
            assert any(tool['name'] == 'get_latest_doc' for tool in tools['tools'])
            with urlopen(f'http://127.0.0.1:{admin_port}/', timeout=10) as response:
                assert response.status == 200
            assert sorted(p.name for p in folder.iterdir()) == ['docker-compose.yml']
            print('PASS: ' + ('legacy backend upgrade' if legacy else 'container recreation') +
                  ' preserves login, JWT, MCP ciphertext, document and migration history', flush=True)
        except Exception:
            print(redacted(compose('logs', '--tail=40', 'backend', 'config-check', check=False).stdout))
            raise
        finally:
            compose('down', '--volumes', '--remove-orphans', check=False)


scenario()
if args.legacy_backend_image:
    scenario(legacy=True)
print('PASS: standalone Compose deployment checks complete; isolated test volumes removed', flush=True)
