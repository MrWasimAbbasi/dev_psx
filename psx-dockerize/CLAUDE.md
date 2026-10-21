# psx-dockerize — local Docker stack for the PSX CRM and the AI Control Plane

## Purpose
Runs the PSX CRM (`./src`, Laravel 6 / PHP 7.2) and its services locally in Docker, and — through
`include:` in `docker-compose.yml` — the AI Control Plane stack from `./psx-ai-control-plane/`.
This repo holds infrastructure only: Dockerfiles, compose files, PHP/xdebug config, the websocket
(socket.io) service, a local MinIO (S3 stand-in) and the Twilio dev phone. Application code lives in
the nested repos, each with its own CLAUDE.md:

| Path | Repo | Rules |
|------|------|-------|
| `src/` | PSX CRM (Azure DevOps `PSXDigital/PSX Development/PSX`) | `src/CLAUDE.md` + `src/.cursor/rules/*.mdc` |
| `psx-ai-control-plane/` | AI Control Plane (GitHub `waqarpsx/psx-ai-control-plane`) | `psx-ai-control-plane/CLAUDE.md` |

`src/`, `psx-ai-control-plane/`, `AI_Agent_Followup/` and `minio-local/minio` are git-ignored here.

## How to run
Full first-time setup is in `README.md` (follow it in order). Day to day:

```bash
cp .env.example .env                                          # first time only, then fill the values
cp docker-compose.override-example.yml docker-compose.override.yml   # host ports
docker compose up -d --build                                  # CRM + DBs + agent stack
docker compose exec laravel bash                              # CRM shell: composer install, php artisan …
```

Host ports come from `docker-compose.override.yml` (current local map: CRM web 8002, MariaDB 33069,
Mongo 27018, mongo-express 8001, Redis 6381, MinIO 9010/9011, websocket 3000, Twilio dev phone 3001).
The agent stack keeps its own ports (web 8090, UI 5174, MySQL 3317, Redis 6380 — see
`psx-ai-control-plane/BUILD_NOTES.md`).

## How to test
There are no tests in this repo. Check a change by rebuilding (`docker compose up -d --build`) and
opening the CRM on its mapped port. CRM tests run inside the `laravel` container
(`vendor/bin/phpunit`); after any CRM PHP edit run `src/scripts/verify-php72-laravel6.sh <files>`.
Control-plane tests: `cd psx-ai-control-plane && php artisan test`.

## Structure
| Path | What it is |
|------|------------|
| `docker-compose.yml` | Services: `laravel` (CRM, Apache), `database` (MariaDB 10.2), `mongo`, `mongo-express`, `redis`, `websocket`, `minio`, `twilio-dev-phone`; includes the agent compose |
| `docker-compose.override-example.yml` | Template for host port mappings (copy to `docker-compose.override.yml`) |
| `Dockerfile` | CRM image (PHP 7.2 + Apache). `Dockerfile7/8/9/12` are optional PHP variants for the `ascend` profile (commented out) |
| `php/` | PHP and xdebug ini files mounted into the CRM image |
| `websocket/` | socket.io broadcast service (reads Redis) |
| `minio-local/` | Builds MinIO from the bundled binary (Docker Hub image was removed) |
| `dev-phone/` | Twilio browser phone for local call testing |
| `pdftk/`, `aws/` | Tooling baked into images (PDF forms, AWS CLI installer) |
| `.gitlab-ci.yml` | Builds and pushes the CRM image to the GitLab registry |

## Owners
Infrastructure / DevOps owner: **to confirm** (record name and date here and in DISC-13).
CRM code owners: see `src/CLAUDE.md`. Control plane: see `psx-ai-control-plane/CLAUDE.md`.

## Secrets
No secret values in this file or in git. Values live in the git-ignored `.env` here, `src/.env`
(CRM) and `psx-ai-control-plane/.env` + `storage/app/private/psx-secrets.json` (agent, local only).
Ask the tech lead for the team's local values; registry access uses your GitLab login
(`docker login https://registry.scr.ee`).

## Gotchas
- Local CRM shares production-like data. The CRM blocks external side effects outside `beta` /
  `production` (`allowsExternalSideEffects()`): no lead-export webhooks, SMS or emails leave a local box.
- The CRM container reaches the agent at `host.docker.internal`, not `localhost` (on Linux add
  `extra_hosts: ["host.docker.internal:host-gateway"]`).
- Twilio dev phone: use the spare `TWILIO_DEV_PHONE_NUMBER` only, never the website virtual number.
- `src/storage/framework/{cache,sessions,views}` and `src/storage/logs` must exist and be writable.
- `APP_URL` in `src/.env` needs the trailing `/`.
- Do not write to dev/staging/production databases or deploy from here without explicit approval
  (`src/.cursor/rules/psx.mdc`).
