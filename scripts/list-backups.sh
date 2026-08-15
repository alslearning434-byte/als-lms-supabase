#!/usr/bin/env bash
# List available backup restore points from GitHub
# Usage: ./scripts/list-backups.sh [--project PROJECT_ID] [--limit N]

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

LIMIT=30
PROJECT_ID=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --project)
      PROJECT_ID="$2"
      shift 2
      ;;
    --limit)
      LIMIT="$2"
      shift 2
      ;;
    -h|--help)
      cat <<EOF
Usage: $0 [options]

List available backup restore points from GitHub backups branch.

Options:
  --project PROJECT   GCP project ID (for gcloud auth context)
  --limit N           Number of backups to show (default: 30)
  -h, --help          Show this help
EOF
      exit 0
      ;;
    *)
      log_error "Unknown argument: $1"
      exit 1
      ;;
  esac
done

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null) || {
  log_error "Not in a GitHub repository or gh not authenticated"
  exit 1
}

log_info "Fetching backup tags from $REPO..."

# Fetch tags from backups branch
git ls-remote --tags "https://github.com/$REPO.git" "refs/tags/backup-*" 2>/dev/null | \
  awk '{print $2}' | \
  sed 's|refs/tags/||' | \
  sort -r | \
  head -n "$LIMIT" | \
  while read tag; do
    # Extract timestamp from tag
    TS="${tag#backup-}"
    # Format: YYYYMMDDTHHMMSSZ -> YYYY-MM-DD HH:MM:SS UTC
    if [[ "$TS" =~ ^([0-9]{4})([0-9]{2})([0-9]{2})T([0-9]{2})([0-9]{2})([0-9]{2})Z$ ]]; then
      FORMATTED="${BASH_REMATCH[1]}-${BASH_REMATCH[2]}-${BASH_REMATCH[3]} ${BASH_REMATCH[4]}:${BASH_REMATCH[5]}:${BASH_REMATCH[6]} UTC"
    else
      FORMATTED="$TS"
    fi
    echo "$tag|$FORMATTED"
  done

echo ""
log_info "To restore a backup, run:"
echo "  ./scripts/restore-backup.sh <tag-name> --project <PROJECT_ID> --bucket <GCS_BUCKET>"