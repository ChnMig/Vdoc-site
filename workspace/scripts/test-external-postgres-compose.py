#!/usr/bin/env python3
"""用独立 PostgreSQL 项目验证外部数据库部署；仅创建和清理本次测试资源。"""
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import tempfile
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
ENV = {key: value for key, value in os.environ.items() if not key.startswith(('VDOC_', 'COMPOSE_'))}
PRIVATE = []


def secret():
    value = secrets.token_hex(24)
    PRIVATE.append(value)
    return value


def redact(text):
    for value in PRIVATE:
        text = text.replace(value, '[redacted]')
    return text


def run(command, *, input=None):
    result = subprocess.run(command, input=input, env=ENV, text=True,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=300)
    if result.returncode:
        raise AssertionError(redact(result.stdout))
    return result.stdout.strip()


def free_port():
    with socket.socket() as connection:
        connection.bind(('127.0.0.1', 0))
        return connection.getsockname()[1]


with tempfile.TemporaryDirectory(prefix='vdoc-external-db-') as directory:
    folder = Path(directory)
    project = 'vdoc-external-' + secrets.token_hex(5)
    provider = project + '-provider'
    database_password, administrator_password = secret(), secret()
    backend_port, admin_port = free_port(), free_port()
    # 仅用于测试的证书，默认 require 模式应建立加密连接。
    run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
         '-subj', '/CN=existing-db', '-keyout', str(folder / 'server.key'),
         '-out', str(folder / 'server.crt')])
    provider_source = {
        'services': {'database': {
            'image': 'postgres:18',
            'environment': {'POSTGRES_USER': 'bootstrap', 'POSTGRES_PASSWORD': secret()},
            'entrypoint': ['/bin/sh', '-ec',
                          'cp /certs/server.crt /certs/server.key /tmp/; '
                          'chown postgres:postgres /tmp/server.crt /tmp/server.key; '
                          'chmod 600 /tmp/server.key; '
                          'exec /usr/local/bin/docker-entrypoint.sh postgres -c ssl=on '
                          '-c ssl_cert_file=/tmp/server.crt -c ssl_key_file=/tmp/server.key'],
            'volumes': ['./server.crt:/certs/server.crt:ro', './server.key:/certs/server.key:ro',
                        'database-data:/var/lib/postgresql'],
            'networks': {'default': {'aliases': ['existing-db']}},
            'healthcheck': {'test': ['CMD', 'pg_isready', '-U', 'bootstrap'],
                            'interval': '2s', 'timeout': '2s', 'retries': 30},
        }},
        'volumes': {'database-data': {}},
    }
    (folder / 'provider.json').write_text(json.dumps(provider_source))
    (folder / 'provider.json').chmod(0o600)
    source = (ROOT / 'deploy/docker-compose.external-postgres.yml').read_text()
    replacements = {
        'CHANGE_ME_DATABASE_HOST': 'existing-db',
        'CHANGE_ME_DATABASE_PASSWORD': database_password,
        'CHANGE_ME_STORAGE_ACCESS_KEY': secret(),
        'CHANGE_ME_STORAGE_SECRET_KEY': secret(),
        'CHANGE_ME_JWT_KEY': secret(),
        'CHANGE_ME_MCP_ENCRYPTION_KEY': secret(),
        'CHANGE_ME_INITIAL_ADMIN_PASSWORD': administrator_password,
        '127.0.0.1:8080:8080': f'127.0.0.1:{backend_port}:8080',
        '127.0.0.1:8081:8080': f'127.0.0.1:{admin_port}:8080',
        '"http://127.0.0.1:8080"': f'"http://127.0.0.1:{backend_port}"',
    }
    for before, after in replacements.items():
        source = source.replace(before, after)
    (folder / 'docker-compose.yml').write_text(source)
    (folder / 'docker-compose.yml').chmod(0o600)
    # 外部网络只附加到 Backend；不把数据库服务/卷合并进应用项目。
    (folder / 'connection.json').write_text(json.dumps({
        'services': {'backend': {'networks': ['default', 'existing-database']}},
        'networks': {'existing-database': {'external': True, 'name': provider + '_default'}},
    }))
    provider_command = ['docker', 'compose', '-p', provider, '-f', str(folder / 'provider.json')]
    app_command = ['docker', 'compose', '-p', project, '-f', str(folder / 'docker-compose.yml'),
                   '-f', str(folder / 'connection.json')]

    def provider_compose(*args):
        return run(provider_command + list(args))

    def app(*args):
        return run(app_command + list(args))

    def sql(query, database='bootstrap'):
        return run(provider_command + ['exec', '-T', 'database', 'psql', '-v', 'ON_ERROR_STOP=1',
                                      '-U', 'bootstrap', '-d', database, '-At'], input=query)

    def api(path, data=None, token=''):
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = token
        request = Request(f'http://127.0.0.1:{backend_port}' + path,
                          data=None if data is None else json.dumps(data).encode(), headers=headers)
        with urlopen(request, timeout=25) as response:
            result = json.load(response)
        assert result.get('code') == 200, f'API failed: {path}, {result.get("status")}'
        return result['detail']

    try:
        rendered = json.loads(app('config', '--format', 'json'))
        assert set(rendered['services']) == {'config-check', 'rustfs', 'backend', 'admin'}
        assert set(rendered['volumes']) == {'rustfs-data', 'rustfs-logs'}
        provider_compose('up', '-d', '--wait', '--wait-timeout', '90')
        provider_id = provider_compose('ps', '-q', 'database')
        sql(f"CREATE ROLE vdoc LOGIN PASSWORD '{database_password}';\n"
            'CREATE DATABASE vdoc OWNER vdoc;\n'
            'CREATE TABLE deployment_sentinel (value text);\n'
            "INSERT INTO deployment_sentinel VALUES ('external service retained');\n")
        assert sql("SELECT rolsuper FROM pg_roles WHERE rolname='vdoc';") == 'f'
        print('PASS: independently managed PostgreSQL 18 with TLS and a non-superuser application owner', flush=True)

        app('up', '-d', '--wait', '--wait-timeout', '180')
        assert sql("SELECT bool_and(s.ssl) FROM pg_stat_ssl s JOIN pg_stat_activity a USING (pid) "
                   "WHERE a.usename='vdoc' AND a.datname='vdoc';") == 't'
        migrations = sql('SELECT version || checksum FROM schema_migrations ORDER BY version;', 'vdoc')
        assert migrations
        identity = api('/api/v1/open/auth/login', {'email': 'admin@example.com', 'password': administrator_password})
        token = identity['token']
        PRIVATE.append(token)
        assert identity['user']['is_super_admin']
        print('PASS: external TLS connection, startup migrations and initial administrator login', flush=True)

        team = api('/api/v1/private/teams', {'name': 'External database test'}, token)
        project_data = api('/api/v1/private/projects', {
            'team_id': team['id'], 'name': 'External persistence', 'admin_user_id': identity['user']['id'],
        }, token)
        base = f"/api/v1/private/projects/{project_data['id']}/documents"
        document = api(base, {'name': 'External database document', 'document_type': 2,
                              'relative_path': 'docs/external.md'}, token)
        base += '/' + document['id']
        branch = next(item for item in api(base + '/branches', token=token) if item['name'] == 'dev')
        content = '# External PostgreSQL\n\nPersistent document content.\n'
        draft = api(base + '/drafts', {'branch_id': branch['id'], 'version_name': '1.0.0', 'content': content}, token)
        draft_path = base + '/drafts/' + draft['id']
        api(draft_path + '/submit', {}, token)
        revision = api(draft_path + '/content/raw', token=token)['draft']['review_revision']
        version = api(draft_path + '/approve', {'expected_review_revision': revision}, token)
        content_path = base + '/versions/' + version['id'] + '/content/raw'
        assert api(content_path, token=token)['content'] == content
        print('PASS: document creation, review and publication using external database and RustFS', flush=True)

        app('down', '--remove-orphans')
        assert provider_compose('ps', '-q', 'database') == provider_id
        assert sql('SELECT value FROM deployment_sentinel;') == 'external service retained'
        app('up', '-d', '--wait', '--wait-timeout', '180')
        assert api(content_path, token=token)['content'] == content
        assert sql('SELECT count(*) FROM users;', 'vdoc') == '1'
        assert sql('SELECT version || checksum FROM schema_migrations ORDER BY version;', 'vdoc') == migrations
        print('PASS: app teardown/recreation preserves database, migrations, login credentials and document content', flush=True)

        app('down', '--volumes', '--remove-orphans')
        assert provider_compose('ps', '-q', 'database') == provider_id
        assert sql('SELECT value FROM deployment_sentinel;') == 'external service retained'
        assert sql('SELECT count(*) FROM users;', 'vdoc') == '1'
        print('PASS: removing app-owned volumes neither stops nor removes the external database', flush=True)
    finally:
        try:
            app('down', '--volumes', '--remove-orphans')
        finally:
            provider_compose('down', '--volumes', '--remove-orphans')
    print('PASS: all isolated test containers, networks and volumes removed', flush=True)
