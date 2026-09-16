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

官网提供当前正式版。需要固定版本时，从 [v0.3.0 Release](https://github.com/ChnMig/Vdoc-site/releases/tag/v0.3.0) 下载同名 YAML；附带的 `docker-compose.yml.sha256` 可用于校验下载内容。

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

## 更新版本

备份数据后，在原 YAML 中更新 `x-backend-image` 和 `x-admin-image` 两处镜像版本，保留其余配置，然后执行：

```sh
docker compose pull
docker compose up -d
```

后端负责执行新版附带的数据库迁移，已完成的迁移不会重复执行。这不是自动追踪最新版：正式发布新版本后，由部署者选择更新时间。迁移失败时后端不会提供正常服务；查看日志并按[升级与回滚](release-rollback.md)处理。

## 日常管理与持久化

从保存 YAML 的目录运行：

```sh
docker compose ps
docker compose logs --tail=100 backend admin postgres rustfs
docker compose stop
docker compose up -d
```

`docker compose down` 删除容器和网络，但保留数据卷。不要对需要保留的数据使用 `docker compose down -v`，它会删除 `postgres-data`、`rustfs-data` 和 `rustfs-logs`。保持 Compose 项目名 `vdoc`，否则 Docker 会使用另一组卷。

PostgreSQL 18 的数据卷挂载到 `/var/lib/postgresql`。Vdoc 的应用迁移不包含 PostgreSQL 主版本升级；更早的数据库主版本需另外执行 `pg_upgrade` 或 dump/restore。

## 部署到服务器

默认端口绑定 `127.0.0.1`，适合本机访问或同一服务器上的 HTTPS 反向代理。PostgreSQL 和 RustFS 只在 Compose 网络内开放。

使用服务器域名时，在 YAML 中把 `VDOC_ADMIN_API_BASE_URL` 改成浏览器可访问的 HTTPS 后端地址，把 `VDOC_SERVER_CORS_ALLOWED_ORIGINS` 改成工作台的精确 HTTPS origin。若反向代理运行在其他容器或主机上，同时调整端口或网络，让代理可以连接 Backend 和 Admin。

Backend 内部使用 `postgres:5432` 和 `rustfs:9000`。不要把浏览器使用的 API 地址填为 `http://backend:8080`，浏览器无法解析 Compose 服务名。更改配置后运行 `docker compose up -d` 使其生效。

<div id="engineering-and-release-checks"></div>

## 源码开发与高级配置

只部署应用无需源码下载包。需要修改代码、运行一次性 E2E 测试或使用外部数据库/对象存储时，查看[公开工作区部署文档](https://github.com/ChnMig/Vdoc-site/blob/main/workspace/COMPOSE_DEPLOY.md)。源码工作区仍提供 `.env`、测试数据库脚本和精确源码锁，它们用于开发与发布校验。

密钥轮换涉及已存储密文，不能仅覆盖原密钥。需要轮换时，按[运行维护说明](https://github.com/ChnMig/Vdoc-site/blob/main/workspace/RELEASE_DEPLOY.md)配置历史 KID/keyring，并完成验证后再移除旧密钥。
