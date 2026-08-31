#!/usr/bin/env bash
# Run this ONCE on a fresh Ubuntu 24.04 LTS EC2 instance (see deploy/DEPLOY.md for the full
# runbook, including instance/security-group setup that happens before this script). Idempotent
# enough to re-run safely if it fails partway through.
set -euo pipefail

REPO_URL="https://github.com/bit-hopper/ase-bot.git"
REPO_DIR="$HOME/ase-bot"

echo "==> Installing Docker Engine + Compose plugin (official Docker apt repo)"
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# So `docker`/`docker compose` work without sudo after you log back in.
sudo usermod -aG docker "$USER"

echo "==> Cloning the repo"
if [ -d "$REPO_DIR" ]; then
  echo "    $REPO_DIR already exists, pulling latest instead"
  git -C "$REPO_DIR" pull
else
  git clone "$REPO_URL" "$REPO_DIR"
fi

echo
echo "==> Bootstrap done. Next steps:"
echo "    1. Log out and back in (or run 'newgrp docker') to pick up the docker group."
echo "    2. cd $REPO_DIR"
echo "    3. cp deploy/env.production.example .env"
echo "    4. Fill in .env with real values (see deploy/DEPLOY.md for what each one means)."
echo "    5. docker compose -f docker-compose.prod.yml up -d --wait"
