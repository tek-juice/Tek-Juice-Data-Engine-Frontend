#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Build and run the Data Engine Frontend on EC2 port 9601
# Usage: bash deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_NAME="data-engine-frontend"
PORT=9601

echo "──────────────────────────────────────────"
echo "  Data Engine Frontend — Deploy to :$PORT"
echo "──────────────────────────────────────────"

# ── 1. Install Docker if not present ────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "[1/5] Installing Docker..."
  sudo apt-get update -y
  sudo apt-get install -y ca-certificates curl gnupg lsb-release
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo usermod -aG docker "$USER"
  echo "[1/5] Docker installed."
else
  echo "[1/5] Docker already installed — skipping."
fi

# ── 2. Install Docker Compose plugin if not present ─────────────────────────
if ! docker compose version &>/dev/null; then
  echo "[2/5] Installing Docker Compose plugin..."
  sudo apt-get install -y docker-compose-plugin
else
  echo "[2/5] Docker Compose already installed — skipping."
fi

# ── 3. Open port 9601 in UFW firewall (if active) ───────────────────────────
if command -v ufw &>/dev/null && sudo ufw status | grep -q "Status: active"; then
  echo "[3/5] Opening port $PORT in UFW..."
  sudo ufw allow $PORT/tcp
  sudo ufw reload
else
  echo "[3/5] UFW not active — skipping firewall rule."
  echo "      Make sure port $PORT is open in your AWS Security Group."
fi

# ── 4. Build the Docker image ────────────────────────────────────────────────
echo "[4/5] Building Docker image..."
docker compose build --no-cache

# ── 5. Start the container ───────────────────────────────────────────────────
echo "[5/5] Starting container..."
docker compose up -d

echo ""
echo "✓ Frontend is running at http://$(curl -s ifconfig.me):$PORT"
echo "  Container logs: docker compose logs -f"
echo "  Stop:           docker compose down"
