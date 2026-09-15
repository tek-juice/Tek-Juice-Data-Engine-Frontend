#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Build and run the Data Engine Frontend on EC2 port 9601
# Supports: Amazon Linux 2/2023, Ubuntu
# Usage: bash deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_NAME="data-engine-frontend"
PORT=9601

echo "──────────────────────────────────────────"
echo "  Data Engine Frontend — Deploy to :$PORT"
echo "──────────────────────────────────────────"

# ── Detect package manager ───────────────────────────────────────────────────
if command -v dnf &>/dev/null; then
  PKG="sudo dnf"
elif command -v yum &>/dev/null; then
  PKG="sudo yum"
elif command -v apt-get &>/dev/null; then
  PKG="sudo apt-get"
else
  echo "ERROR: No supported package manager found (dnf/yum/apt-get)." && exit 1
fi

# ── 1. Install Docker if not present ────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "[1/5] Installing Docker..."
  $PKG install -y docker
  sudo systemctl enable docker
  sudo systemctl start docker
  sudo usermod -aG docker "$USER"
  echo "[1/5] Docker installed."
else
  echo "[1/5] Docker already installed — skipping."
  # Make sure daemon is running
  sudo systemctl start docker 2>/dev/null || true
fi

# ── 2. Install Docker Compose plugin if not present ─────────────────────────
if ! docker compose version &>/dev/null 2>&1; then
  echo "[2/5] Installing Docker Compose plugin..."
  # Try package manager first
  $PKG install -y docker-compose-plugin 2>/dev/null || {
    echo "      Falling back to standalone docker-compose..."
    sudo curl -SL "https://github.com/docker/compose/releases/download/v2.27.1/docker-compose-$(uname -s)-$(uname -m)" \
      -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    sudo ln -sf /usr/local/bin/docker-compose /usr/libexec/docker/cli-plugins/docker-compose 2>/dev/null || true
  }
  echo "[2/5] Docker Compose installed."
else
  echo "[2/5] Docker Compose already installed — skipping."
fi

# ── 3. Open port 9601 in firewall ────────────────────────────────────────────
if command -v ufw &>/dev/null && sudo ufw status 2>/dev/null | grep -q "Status: active"; then
  echo "[3/5] Opening port $PORT in UFW..."
  sudo ufw allow $PORT/tcp && sudo ufw reload
else
  echo "[3/5] Firewall: ensure port $PORT is open in your AWS Security Group."
fi

# ── 4. Build the Docker image ────────────────────────────────────────────────
echo "[4/5] Building Docker image..."
sudo docker compose build --no-cache

# ── 5. Start the container ───────────────────────────────────────────────────
echo "[5/5] Starting container..."
sudo docker compose down 2>/dev/null || true
sudo docker compose up -d

echo ""
echo "✓ Frontend is live at http://$(curl -sf ifconfig.me || echo '54.86.109.228'):$PORT"
echo "  Logs:  sudo docker compose logs -f"
echo "  Stop:  sudo docker compose down"
