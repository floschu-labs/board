#!/usr/bin/env bash
#
# release.sh — bump the version in package.json, commit, tag, and push.
#
# Usage:
#   ./release.sh <version>
#
#   version    New version, e.g. 0.7.0 (must be MAJOR.MINOR.PATCH).
#
# package.json's `version` is the single source of truth baked into every build
# (see vite.config.ts), so this script keeps it in lockstep with the git tag: it
# writes package.json, commits, tags v<version>, and pushes. Pushing the tag
# triggers the Release workflow (.github/workflows/release.yml), which re-verifies
# the tag matches package.json, then builds the Docker image, deploys GitHub Pages,
# and creates the GitHub Release.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

PKG="$ROOT/package.json"

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
die()   { red "error: $*" >&2; exit 1; }

# On any failure after we've bumped the version, roll package.json + lockfile back
# to HEAD so a failed release doesn't leave the working tree dirty.
restore_version() { git checkout -- "$PKG" package-lock.json 2>/dev/null || true; }

# --- parse args ---------------------------------------------------------------
[ $# -eq 1 ] || die "usage: ./release.sh <version>  (e.g. ./release.sh 0.7.0)"
NEW_NAME="$1"
[[ "$NEW_NAME" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "version must be MAJOR.MINOR.PATCH (got: $NEW_NAME)"

# --- preconditions ------------------------------------------------------------
command -v git >/dev/null  || die "git not found"
command -v node >/dev/null || die "node not found"
[ -f "$PKG" ]              || die "missing package.json"
[ -n "$(git status --porcelain)" ] && die "working tree not clean — commit or stash first"
git remote get-url origin >/dev/null 2>&1 || die "no 'origin' remote configured"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[ "$BRANCH" = "develop" ] || red "warning: releasing from '$BRANCH', not 'develop'"

CUR_NAME="$(node -p "require('$PKG').version")"
[ "$CUR_NAME" = "$NEW_NAME" ] && die "package.json is already at $NEW_NAME"

TAG="v$NEW_NAME"
git rev-parse -q --verify "refs/tags/$TAG" >/dev/null && die "tag $TAG already exists"

bold "Releasing Board $CUR_NAME -> $NEW_NAME  ($TAG)"

# --- write version into package.json -----------------------------------------
trap restore_version EXIT   # cleared after a successful commit + tag below

# --no-git-tag-version writes package.json (and package-lock.json) without creating
# its own commit or tag — we do those explicitly below.
npm version "$NEW_NAME" --no-git-tag-version >/dev/null
green "Version written to package.json."

# --- commit + tag -------------------------------------------------------------
git add package.json package-lock.json
git commit -m "Release v$NEW_NAME"
git tag -a "$TAG" -m "Board $NEW_NAME"
green "Committed and tagged $TAG."
trap - EXIT   # release succeeded; keep the bumped version

# --- push ---------------------------------------------------------------------
bold "Pushing $BRANCH and $TAG to origin…"
git push origin "$BRANCH" --follow-tags
green "Pushed. The Release workflow will build and publish $TAG."
