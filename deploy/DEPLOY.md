# Deploying Asé to AWS

Single EC2 instance running Docker Compose (Postgres + Redis + the app itself) — no ECS, no
RDS/ElastiCache, no load balancer. The bot has no inbound HTTP endpoint (it only makes outbound
connections to Bluesky, Postgres, and Redis), so this is deliberately about as simple as an AWS
deployment gets.

Nothing here is automated from any CI/CD pipeline — you run these steps yourself, once, from
the AWS Console (or the CLI-equivalent commands noted at the end) and directly on the instance.

## 1. Launch the instance

AWS Console → EC2 → Launch instance:

- **AMI:** Ubuntu Server 24.04 LTS, **arm64**. (`sweph`, the Swiss Ephemeris native binding,
  ships prebuilt binaries for `linux-arm64`, so Graviton instances work with zero extra setup
  and are meaningfully cheaper than the x86 equivalent.)
- **Instance type:** `t4g.small` (2 vCPU, 2 GiB RAM) — recommended default. Postgres + Redis +
  the Node app all share this one box; `t4g.micro` (1 GiB) is cheaper but risks OOM once all
  three are running together. Size up to `t4g.medium` later if needed — nothing here is
  instance-size-specific.
- **Storage:** 20 GiB gp3 root volume (default 8 GiB is tight once Docker images + Postgres
  data + logs accumulate over time).
- **Key pair:** create or select one — you'll need it to SSH in.
- **Security group:**
  - Inbound: SSH (port 22), source = **your own IP only** (not `0.0.0.0/0`). No other inbound
    rules are needed — there is no web server here.
  - Outbound: leave the default "allow all" — the bot needs outbound access to Bluesky's XRPC
    endpoints, GitHub (to clone/pull), and apt/Docker Hub.
  - *Optional hardening:* skip opening port 22 entirely and use AWS Systems Manager Session
    Manager instead, if you'd rather not expose SSH at all. Not covered step-by-step here, but
    it's a drop-in replacement for the SSH steps below.

## 2. Bootstrap the instance

SSH in, then either paste `deploy/bootstrap.sh`'s contents directly, or copy the file up first:

```bash
scp -i /path/to/your-key.pem deploy/bootstrap.sh ubuntu@<instance-public-ip>:~/
ssh -i /path/to/your-key.pem ubuntu@<instance-public-ip>
chmod +x bootstrap.sh && ./bootstrap.sh
```

This installs Docker Engine + the Compose plugin (official Docker apt repo, not the older
`docker.io` distro package) and clones the repo to `~/ase-bot`.

## 3. Configure secrets

```bash
newgrp docker          # picks up the docker group from bootstrap.sh without a full re-login
cd ~/ase-bot
cp deploy/env.production.example .env
nano .env               # fill in ASE_HANDLE / ASE_APP_PASSWORD / ASE_DID / POSTGRES_PASSWORD
```

- `ASE_HANDLE` / `ASE_APP_PASSWORD` / `ASE_DID`: same as local dev — a **dedicated Bluesky app
  password**, never the account's primary password (§11.1).
- `POSTGRES_PASSWORD`: generate a real secret — `openssl rand -base64 24` — don't reuse local
  dev's `"ase"` password.
- Leave `WHIMSY_ENABLED=true` as-is unless you want it off for this deployment.
- Do **not** add `DATABASE_URL`/`REDIS_URL`/`SWEPH_PATH` here — `docker-compose.prod.yml` sets
  those directly, since they're fixed by the container topology rather than being secrets.

`.env` stays on the instance only — it's gitignored and never committed.

## 4. Bring it up

```bash
docker compose -f docker-compose.prod.yml up -d --wait
```

First run builds the app image (installs deps, fetches the two Swiss Ephemeris data files,
runs `verify-ephemeris` as a build-time gate — see `Dockerfile`), then starts all three
containers. `--wait` blocks until Postgres/Redis pass their healthchecks before `app` starts.

## 5. Verify

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
```

You should see migrations apply, then:

```
Asé is live as ase.tinylil.world (did:plc:...)
```

Confirm migrations landed:

```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U ase -d ase -c "select name from schema_migrations;"
```

All 7 migration files should be listed.

Real end-to-end check: from any Bluesky account, mention the bot with `/help` and confirm a
reply arrives.

## 6. Reboot resilience

Every service has `restart: unless-stopped`, and the official Docker install enables the
`docker` systemd unit by default — so after an instance stop/start or an unexpected reboot, all
three containers come back on their own with no extra setup. Worth testing once:

```bash
sudo reboot
# wait ~30s, ssh back in
docker compose -f docker-compose.prod.yml ps
```

## Updating the deployed bot later

```bash
cd ~/ase-bot
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

`--build` rebuilds the `app` image only if something changed; Postgres/Redis data volumes are
untouched.

## CLI-equivalent for step 1 (if you have the AWS CLI configured)

```bash
aws ec2 run-instances \
  --image-id <ubuntu-24.04-arm64-ami-id-for-your-region> \
  --instance-type t4g.small \
  --key-name <your-key-pair-name> \
  --security-group-ids <your-sg-id> \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":20,"VolumeType":"gp3"}}]' \
  --count 1
```

Look up the current Ubuntu 24.04 arm64 AMI ID for your region at
https://cloud-images.ubuntu.com/locator/ec2/ — it changes over time, so it's not hardcoded here.
