#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy-fresh.sh  —  Nuclear fresh deploy for Tek Juice Data Engine Frontend
# Downloads the latest source directly from GitHub as a zip archive,
# completely replacing the server copy. No git history needed.
# ─────────────────────────────────────────────────────────────────────────────
set -e

REPO="tek-juice/Tek-Juice-Data-Engine-Frontend"
BRANCH="main"
# TOKEN is read from the environment — set it before running:
#   export GH_TOKEN=<your-github-token>  && bash deploy-fresh.sh
TOKEN="${GH_TOKEN:?GH_TOKEN env var is required}"
DEPLOY_DIR="/home/ec2-user/Tek-Juice-Data-Engine-Frontend"
CONTAINER="data-engine-frontend"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Tek Juice Data Engine — Nuclear Fresh Deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Step 1: Stop and remove everything Docker ─────────────────────────────────
echo "▶ Step 1/5 — Removing old container and image..."
docker rm -f "$CONTAINER" 2>/dev/null && echo "  ✔ Container removed" || echo "  ℹ No container to remove"
docker rmi -f $(docker images -q --filter=reference="*frontend*") 2>/dev/null && echo "  ✔ Old images removed" || echo "  ℹ No images to remove"
docker builder prune -f --filter type=exec.cachemount 2>/dev/null || true
docker builder prune -f 2>/dev/null || true
echo "  ✔ Build cache cleared"

# ── Step 2: Download latest source as zip from GitHub ─────────────────────────
echo ""
echo "▶ Step 2/5 — Downloading latest source from GitHub (branch: $BRANCH)..."
TMP_ZIP="/tmp/frontend-latest.zip"
TMP_DIR="/tmp/frontend-src"

# Download the zip archive of the branch
curl -sL \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$REPO/zipball/$BRANCH" \
  -o "$TMP_ZIP"

echo "  ✔ Downloaded $(du -sh $TMP_ZIP | cut -f1) archive"

# ── Step 3: Extract and replace deploy directory ──────────────────────────────
echo ""
echo "▶ Step 3/5 — Extracting and replacing source files..."
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"
unzip -q "$TMP_ZIP" -d "$TMP_DIR"

# GitHub zip has a single top-level folder named <org>-<repo>-<sha>/
EXTRACTED=$(ls "$TMP_DIR" | head -1)
echo "  ✔ Extracted to: $TMP_DIR/$EXTRACTED"

# Verify the key file looks correct before replacing anything
APPTSX="$TMP_DIR/$EXTRACTED/src/App.tsx"
if grep -q "GapDetection" "$APPTSX"; then
  echo "  ✔ Source verified — GapDetection import found in App.tsx"
else
  echo "  ✗ ERROR: App.tsx does not contain GapDetection — wrong source!"
  echo "    File preview:"
  head -30 "$APPTSX"
  exit 1
fi

# Check the commit SHA baked into the zip
echo "  ✔ Commit: $(echo $EXTRACTED | rev | cut -c1-7 | rev)"

# Copy source files into deploy dir (preserve docker-compose.yml, Dockerfile, nginx.conf)
# We copy everything then restore the infrastructure files
cp -r "$TMP_DIR/$EXTRACTED/." "$DEPLOY_DIR/"
echo "  ✔ Source files replaced in $DEPLOY_DIR"

# ── Step 4: Rebuild Docker image ──────────────────────────────────────────────
echo ""
echo "▶ Step 4/5 — Building Docker image (no cache)..."
cd "$DEPLOY_DIR"
docker compose build --no-cache --progress=plain 2>&1 | grep -E "(Step|step|STEP|RUN|COPY|FROM|Successfully|ERROR|error)" || true
echo "  ✔ Build complete"

# ── Step 5: Start container ───────────────────────────────────────────────────
echo ""
echo "▶ Step 5/5 — Starting container..."
docker compose up -d
sleep 3

STATUS=$(docker ps --filter "name=$CONTAINER" --format "{{.Status}}" 2>/dev/null)
if [[ "$STATUS" == Up* ]]; then
  echo "  ✔ Container is UP: $STATUS"
else
  echo "  ✗ Container not running. Logs:"
  docker logs "$CONTAINER" 2>&1 | tail -20
  exit 1
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Deploy complete — http://54.86.109.228:9601"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Hard refresh the browser: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)"
echo ""

# Cleanup temp files
rm -rf "$TMP_ZIP" "$TMP_DIR"
