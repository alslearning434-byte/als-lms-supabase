#!/usr/bin/env bash
# Restore Firestore backup from GitHub backup tag
# Usage: ./scripts/restore-backup.sh <tag-name> [--project PROJECT_ID]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# Default values
TAG=""
PROJECT_ID=""
GCS_BUCKET=""
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --project)
      PROJECT_ID="$2"
      shift 2
      ;;
    --bucket)
      GCS_BUCKET="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      cat <<EOF
Usage: $0 <tag-name> [options]

Restore Firestore database from a GitHub backup tag.

Arguments:
  <tag-name>          Backup tag name (e.g., backup-20260814T050000Z)

Options:
  --project PROJECT   GCP project ID (required)
  --bucket BUCKET     GCS bucket for temp staging (required)
  --dry-run           Show what would be done without executing
  -h, --help          Show this help

Prerequisites:
  - gcloud CLI installed and authenticated
  - GitHub CLI (gh) installed and authenticated
  - Repository access to fetch backup tag

Environment variables (can be used instead of options):
  GCP_PROJECT_ID      GCP project ID
  GCS_BUCKET          GCS bucket name
EOF
      exit 0
      ;;
    *)
      if [[ -z "$TAG" ]]; then
        TAG="$1"
      else
        log_error "Unknown argument: $1"
        exit 1
      fi
      shift
      ;;
  esac
done

# Use environment variables if not provided
PROJECT_ID="${PROJECT_ID:-${GCP_PROJECT_ID:-}}"
GCS_BUCKET="${GCS_BUCKET:-}"

if [[ -z "$TAG" ]]; then
  log_error "Tag name is required"
  exit 1
fi

if [[ -z "$PROJECT_ID" ]]; then
  log_error "Project ID is required (--project or GCP_PROJECT_ID env)"
  exit 1
fi

if [[ -z "$GCS_BUCKET" ]]; then
  log_error "GCS bucket is required (--bucket or GCS_BUCKET env)"
  exit 1
fi

# Validate tag format
if [[ ! "$TAG" =~ ^backup-[0-9]{8}T[0-9]{6}Z$ ]]; then
  log_warn "Tag format unexpected: $TAG (expected backup-YYYYMMDDTHHMMSSZ)"
fi

log_info "Starting restore from tag: $TAG"
log_info "Project: $PROJECT_ID"
log_info "GCS Bucket: $GCS_BUCKET"

# Create temp directory
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

cd "$TMPDIR"

# Fetch the backup tag from GitHub
log_info "Fetching backup tag from GitHub..."
if ! gh release view "$TAG" --repo "$(gh repo view --json nameWithOwner -q .nameWithOwner)" >/dev/null 2>&1; then
  log_error "Tag $TAG not found as a release. Checking for tag in backups branch..."
fi

# Try to fetch from backups branch
log_info "Cloning backups branch..."
git clone --branch backups --depth 1 "https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner).git" backup-repo 2>/dev/null || {
  log_error "Failed to clone backups branch. Ensure the repository has a 'backups' branch with backup tags."
  exit 1
}

cd backup-repo

# Check if tag exists locally
if ! git rev-parse "$TAG" >/dev/null 2>&1; then
  log_error "Tag $TAG not found in backups branch"
  exit 1
fi

# Checkout the tag
log_info "Checking out tag $TAG..."
git checkout "$TAG"

# Read manifest
if [[ ! -f "manifest.json" ]]; then
  log_error "manifest.json not found in backup tag"
  exit 1
fi

MANIFEST=$(cat manifest.json)
CHUNKS=$(echo "$MANIFEST" | jq -r '.chunks')
CHUNK_FILES=$(echo "$MANIFEST" | jq -r '.chunk_files[]')
ORIGINAL_SIZE=$(echo "$MANIFEST" | jq -r '.original_size')

log_info "Backup manifest: $CHUNKS chunks, original size: $ORIGINAL_SIZE bytes"

# Reassemble chunks
ARCHIVE_NAME="backup-${TAG#backup-}.tar.gz"
log_info "Reassembling $CHUNKS chunks into $ARCHIVE_NAME..."

if [[ $CHUNKS -eq 1 ]]; then
  cp "$CHUNK_FILES" "$ARCHIVE_NAME"
else
  cat $CHUNK_FILES > "$ARCHIVE_NAME"
fi

# Verify size
ACTUAL_SIZE=$(stat -c%s "$ARCHIVE_NAME")
if [[ $ACTUAL_SIZE -ne $ORIGINAL_SIZE ]]; then
  log_warn "Size mismatch: expected $ORIGINAL_SIZE, got $ACTUAL_SIZE"
fi

log_success "Reassembled archive: $ARCHIVE_NAME ($ACTUAL_SIZE bytes)"

# Upload to GCS for Firestore import
GCS_PATH="gs://$GCS_BUCKET/firestore-restores/$TAG"
log_info "Uploading to $GCS_PATH..."

if [[ "$DRY_RUN" == "true" ]]; then
  log_info "[DRY RUN] Would upload $ARCHIVE_NAME to $GCS_PATH"
  log_info "[DRY RUN] Would run: gcloud firestore import $GCS_PATH --project=$PROJECT_ID"
  exit 0
fi

gsutil cp "$ARCHIVE_NAME" "$GCS_PATH/"

# Import to Firestore
log_info "Starting Firestore import..."
gcloud firestore import "$GCS_PATH/" --project="$PROJECT_ID"

log_success "Restore completed successfully!"
log_info "Backup tag: $TAG"
log_info "Imported from: $GCS_PATH/"

# Cleanup GCS temp file (optional)
read -p "Delete temporary GCS file? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  gsutil rm "$GCS_PATH/$(basename "$ARCHIVE_NAME")"
  log_info "Cleaned up GCS temp file"
fi