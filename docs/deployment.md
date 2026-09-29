# 部署

使用一个 `docker-compose.yml` 部署 Vdoc。配置、账号、密码和内部密钥都写在这个文件中，无需 `.env`、初始化脚本或源码仓库。

需要 Docker Engine / Docker Desktop 和 Docker Compose v2，支持 Linux amd64、arm64 镜像。下面以本机部署为例；已有部署请先看[升级与回滚](release-rollback.md)。

<div id="quick-start"></div>

## 1. 下载 Compose 文件

下载 [docker-compose.yml](https://chnmig.github.io/Vdoc-site/downloads/docker-compose.yml)，保存在专用部署目录。也可以运行：

```sh
mkdir vdoc-deploy
cd vdoc-deploy
curl -fLO https://chnmig.github.io/Vdoc-site/downloads/docker-compose.yml
chmod 600 docker-compose.yml
```

默认镜像策略：Backend 和 Admin 使用 `latest`，跟随已发布的稳定版本；PostgreSQL 使用 `18`，跟随 18.x 补丁；RustFS 使用 `1.0.0`。下载地址和应用镜像名无需随每次发版修改。`latest` 在执行 `docker compose pull` 时解析，已运行的容器不会自行升级。

已有 PostgreSQL 时，选择[外部数据库版](#external-postgresql)，它不启动数据库容器。两份 YAML 都附带字段注释，任选一份单独使用。

[Site Release](https://github.com/ChnMig/Vdoc-site/releases) 保留各版 YAML 和 `docker-compose.yml.sha256`，可核验配置文件来源。新版本 YAML 中的 `latest` 仍是滚动引用；需要固定应用版本时，将两处应用镜像改为所需的同一个 `vX.Y.Z` tag 或已记录的 digest。

<div id="initial-admin"></div>

## 2. 填写配置和登录账号

编辑 `docker-compose.yml`，替换所有 `CHANGE_ME` 值，并设置管理员邮箱和名字。密码直接写在 YAML 中，用引号包住；值中如果包含 `$`，写成 `$$`，避免 Compose 把它当作环境变量。

| 配置                                                   | 用途                                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `VDOC_DATABASE_PASSWORD`                               | PostgreSQL 密码，自动通过 YAML 锚点共享给数据库容器                               |
| `VDOC_STORAGE_ACCESS_KEY` / `VDOC_STORAGE_SECRET_KEY`  | RustFS 存储账号和密码，也通过锚点共享                                             |
| `VDOC_JWT_KEY`                                         | 签发和验证登录凭证，使用至少 32 字符的独立随机密钥                                |
| `VDOC_MCP_TOKEN_CIPHER_KEY`                            | 加密保存的 MCP 令牌、AI Provider 密钥和分享凭证，使用另一组至少 32 字符的随机密钥 |
| `VDOC_INITIAL_ADMIN_EMAIL` / `VDOC_INITIAL_ADMIN_NAME` | 首次创建的管理员邮箱和名字                                                        |
| `VDOC_INITIAL_ADMIN_PASSWORD`                          | 首次管理员密码，12–72 字节                                                        |

RustFS 的 access key 至少 3 字符，secret key 至少 8 字符。可以用密码管理器生成上述值；`openssl rand -hex 32` 也可以生成一组随机密钥，分别执行两次用于 JWT 和 MCP。

这些值由你填写并保存在 Compose 文件中，后端不会另行生成密钥文件。升级时保留原值：更换 JWT 密钥会让已有登录凭证失效，丢失 MCP 加密密钥会影响已保存密文的读取。请把填写后的 YAML 当作私密配置保存。

初始管理员只在用户表为空时创建。重启和升级不会重复创建账号，也不会用 YAML 中的密码覆盖用户后来修改的密码。公开注册默认关闭；空数据库缺少可用管理员配置时，后端会停止启动。

## 3. 启动

```sh
docker compose pull
docker compose up -d
docker compose ps
```

Compose 会先运行一次 `config-check`。如果还留有占位值或必填配置无效，检查会失败，PostgreSQL 和 RustFS 不会开始初始化。修正 YAML 后重新运行 `docker compose up -d` 即可。

检查通过后，Compose 启动 PostgreSQL、RustFS、Backend 和 Admin。Backend 启动时自动建表、执行尚未执行的数据库迁移、创建存储桶并初始化首个管理员。成功退出的 `config-check` 容器显示为 `Exited (0)` 属于正常状态。

打开 [Vdoc 工作台](http://127.0.0.1:8081)，使用刚填写的管理员账号登录。Backend 健康检查地址是 `http://127.0.0.1:8080/api/v1/open/health`。

接下来：[发布第一份文档并让 Agent 查询](admin-usage.md)。

<div id="compose-example"></div>

## 完整 Compose 示例

下面直接引用发布的 YAML 源文件，包含全部配置、四个常驻服务、一次性配置检查、健康检查和持久化数据卷。复制后替换占位值即可；与下载文件保持一致。

<<< @/../workspace/deploy/docker-compose.yml{yaml} [docker-compose.yml]

## 接入现有 PostgreSQL {#external-postgresql}

下载 [docker-compose.external-postgres.yml](https://chnmig.github.io/Vdoc-site/downloads/docker-compose.external-postgres.yml)，将它单独保存为部署目录中的 `docker-compose.yml`。不要与内置数据库版叠加使用，Compose 的文件合并不会自动删除原有 `postgres` 服务。

```sh
mkdir vdoc-external-db
cd vdoc-external-db
curl -fL https://chnmig.github.io/Vdoc-site/downloads/docker-compose.external-postgres.yml -o docker-compose.yml
chmod 600 docker-compose.yml
```

这份配置只启动 RustFS、Backend、Admin 和一次性配置检查，不创建 PostgreSQL 服务或数据库数据卷。数据库的版本、备份、可用性和升级由现有服务负责；此示例使用 PostgreSQL 18 验证。应用镜像仍使用 `latest`，RustFS 仍固定 `1.0.0`。

1. 在现有实例中准备一个 **Vdoc 专用数据库**和账号。后端会在该库中创建表并执行迁移，但不会创建数据库本身。账号需要连接、读写以及创建/修改应用表和索引的权限；新库建议由该账号拥有，且具备 `public` schema 的 `USAGE`、`CREATE` 权限。不要复用其他业务的库。若尚未创建，可由数据库管理员在 `psql` 中执行：

   ```sql
   CREATE ROLE vdoc LOGIN;
   \password vdoc
   CREATE DATABASE vdoc OWNER vdoc;
   ```

   `\password` 会交互式设置密码。已创建数据库或账号时直接使用现有配置，无需重复执行。

2. 编辑顶部 `x-backend-environment` 中的连接字段，并替换存储、JWT、MCP 和初始管理员的全部占位值：

   | 字段                                                            | 填写方式                                                                                                                                    |
   | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
   | `VDOC_DATABASE_HOST`                                            | 容器可访问的数据库域名或 IP，不带协议、端口                                                                                                 |
   | `VDOC_DATABASE_PORT`                                            | 实际数据库端口，默认 `5432`                                                                                                                 |
   | `VDOC_DATABASE_NAME` / `VDOC_DATABASE_USER`                     | 已准备好的专用库名和账号                                                                                                                    |
   | `VDOC_DATABASE_PASSWORD`                                        | 该账号的密码，无需 URL 编码；字面量 `$` 写为 `$$`                                                                                           |
   | `VDOC_DATABASE_SSL_MODE`                                        | 默认 `require`，强制 TLS 加密但不校验服务端身份；仅对明确未启用 TLS 的可信本机/私网实例改为 `disable`。云数据库按服务商的证书和校验要求配置 |
   | `VDOC_DATABASE_MAX_OPEN_CONNS` / `VDOC_DATABASE_MAX_IDLE_CONNS` | 默认 `20` / `5`，按数据库连接额度调整；空闲数不能超过总数                                                                                   |

   数据库运行在 Docker 宿主机时，可将 HOST 设为 `host.docker.internal`，使用数据库在宿主机开放的端口。文件已为 Backend 添加 Linux 的 `host-gateway` 映射。容器内 `127.0.0.1` 指向容器本身；数据库应监听容器可达的地址，`pg_hba.conf` 和防火墙应允许实际容器来源连接。

   若数据库位于另一个 Compose 网络，也可以将 Backend 加入该已有网络，通过数据库服务名连接；保留 Backend 默认网络，确保它仍可访问 RustFS。单独填写另一个网络内的服务名不会建立连通性。

3. 若使用域名，将 `VDOC_ADMIN_API_BASE_URL` 改为后端 HTTPS origin；[双域名 Caddy 配置](#caddy-domain)与内置数据库版相同。确认外部数据库已就绪后启动：

   ```sh
   docker compose config --quiet
   docker compose pull
   docker compose up -d --wait
   docker compose logs --tail=100 backend admin rustfs
   ```

`config-check` 只检查配置，不连接或验证外部数据库。实际连接、鉴权、TLS 和迁移在 Backend 启动时完成；连接失败可查看后端日志。外部数据库的就绪状态无法用本项目的 `depends_on` 管理。

此版本的 `docker compose down` 不会停止外部数据库；`down -v` 仍会删除本项目的 RustFS 数据卷，从而丢失文档对象。迁移已有 Vdoc 部署时，需要同时迁移数据库内容、保留对象存储数据和原有密钥，不能只把 HOST 指向一个空库。

完整字段说明直接写在下载的 YAML 注释中，包括连接池、TLS、密钥、端口、启动顺序和数据卷用途。

## 更新版本

默认无需修改两处应用镜像名。先查看版本说明并备份数据，保留原 YAML、账号、密钥、域名和数据卷，然后执行：

```sh
docker compose pull
docker compose up -d --wait
```

后端负责执行新版附带的数据库迁移，已完成的迁移不会重复执行。两处 `latest` 会跟随最新稳定发布，`postgres:18` 会获取新的 18.x 补丁，RustFS 保持 1.0.0。需要执行上面的命令才会更新容器；如果新版本增加配置，仍需按版本说明补充。迁移失败时后端不会提供正常服务；查看日志并按[升级与回滚](release-rollback.md)处理。

## 日常管理与持久化

从保存 YAML 的目录运行：

```sh
docker compose ps
docker compose logs --tail=100 backend admin postgres rustfs
docker compose stop
docker compose up -d
```

外部数据库版的日志命令省略 `postgres`；`pull` 不会更新外部数据库。

`docker compose down` 删除容器和网络，但保留数据卷。不要对需要保留的数据使用 `docker compose down -v`，它会删除 `postgres-data`、`rustfs-data` 和 `rustfs-logs`。保持 Compose 项目名 `vdoc`，否则 Docker 会使用另一组卷。

PostgreSQL 18 的数据卷挂载到 `/var/lib/postgresql`。Vdoc 的应用迁移不包含 PostgreSQL 主版本升级；更早的数据库主版本需另外执行 `pg_upgrade` 或 dump/restore。

## 通过 Caddy 使用域名 {#caddy-domain}

前后端保留独立端口和域名：前端 `docs.example.com` 反代到 `127.0.0.1:8081`，后端 `api.example.com` 反代到 `127.0.0.1:8080`。以下示例假设 Caddy 运行在同一台服务器的宿主机上。

1. 将两个域名的 DNS A/AAAA 记录都指向服务器，允许外部访问 Caddy 的 80/443 端口；只保留实际可达的 IPv6 记录。Caddy 会自动申请和续期 HTTPS 证书。
2. 保持后端 CORS 为 `*`，将前端的 API 地址改为后端 HTTPS origin，不带 `/api` 或末尾斜杠：

   ```yaml
   VDOC_SERVER_CORS_ALLOWED_ORIGINS: '*'
   VDOC_ADMIN_API_BASE_URL: 'https://api.example.com'
   ```

   第一项位于 `x-backend-environment`，允许任意来源的浏览器客户端；第二项位于 `services.admin.environment`，填写后端域名，Admin 的运行时配置和 CSP 会允许访问该地址。开放 CORS 不会关闭登录、权限、MCP Token 或分享凭证校验，也不启用跨站 Cookie。命令行 Skill/MCP 客户端通常不受浏览器 CORS 限制，连接地址同样使用后端域名。否则前端仍会请求访问者自己电脑上的 `127.0.0.1`。更改后运行 `docker compose up -d --wait`，让 Admin 重新生成运行时配置。

3. 将以下站点配置加入外部 Caddy 的 Caddyfile，替换两个示例域名，然后执行 `caddy validate --config /etc/caddy/Caddyfile` 和 `caddy reload --config /etc/caddy/Caddyfile`：

<<< @/../workspace/deploy/Caddyfile{caddyfile} [Caddyfile]

Caddy 按域名选择上游，不按路径分流或重写。后端继续接收完整 `/api/v1/...` 路径；Admin 自身处理 SPA 路由回退，因此刷新项目详情、登录页和分享链接仍能打开。

默认 Backend/Admin 端口仅绑定宿主机 `127.0.0.1`。PostgreSQL 和 RustFS 无需暴露到公网，文档内容由 Backend 读取。

**如果外部 Caddy 也在 Docker 容器中**，容器里的 `127.0.0.1` 不指向宿主机。将它接入已有 `vdoc_default` 网络，在 Caddyfile 中将前端域名的上游改成 `admin:8080`、后端域名的上游改成 `backend:8080`。在 Caddy 自己的 Compose 中追加持久网络配置：

```yaml
services:
  caddy:
    networks:
      - vdoc
networks:
  vdoc:
    external: true
    name: vdoc_default
```

先启动 Vdoc 创建网络，再启动 Caddy。若修改了 Vdoc 项目名，使用对应的实际网络名；保留 Caddy 原有网络和配置。浏览器的 API 地址仍然是 `https://api.example.com`，不能填 Docker 服务名。

如需日志和按客户端 IP 限流，给 Backend 的 `VDOC_SERVER_TRUSTED_PROXIES` 配置它实际看到的可信 Caddy 连接源 IP/专用代理网段；宿主机转发可能表现为 Docker 网关 IP。仅信任受你控制的代理，不要设置 `0.0.0.0/0`。

### 首次使用检查

```sh
curl -fsS https://api.example.com/api/v1/open/health
curl -fsS https://docs.example.com/runtime-config.js
```

健康响应的 `code` 应为 `200`，运行时配置的 `apiBaseUrl` 应是你的后端 HTTPS 域名。然后使用初始管理员登录：

1. 创建团队和项目，创建 Markdown 或 OpenAPI 文档。
2. 创建草稿、提交审核并发布，确认可以打开发布内容。
3. 创建 MCP Token，以 `https://api.example.com` 为连接地址，调用 `get_latest_doc` 或 `get_latest_schema` 查询刚发布的版本。
4. 若需要对外分享，创建分享链接并在未登录窗口打开。

详细操作见[管理端使用](admin-usage.md)。这些核心流程无需配置 AI；AI 助手另需在工作台配置可用 Provider、模型和 API Key，见[AI 配置](admin-ai.md)。

<div id="engineering-and-release-checks"></div>

## 源码开发与高级配置

只部署应用无需源码下载包；现有 PostgreSQL 可直接使用[外部数据库版](#external-postgresql)。需要修改代码、运行一次性 E2E 测试或使用外部对象存储时，查看[公开工作区部署文档](https://github.com/ChnMig/Vdoc-site/blob/main/workspace/COMPOSE_DEPLOY.md)。源码工作区仍提供 `.env`、测试数据库脚本和精确源码锁，它们用于开发与发布校验。

密钥轮换涉及已存储密文，不能仅覆盖原密钥。需要轮换时，按[运行维护说明](https://github.com/ChnMig/Vdoc-site/blob/main/workspace/RELEASE_DEPLOY.md)配置历史 KID/keyring，并完成验证后再移除旧密钥。
