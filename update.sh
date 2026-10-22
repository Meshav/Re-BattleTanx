#!/usr/bin/env bash
# Run on the Compose host: bash /path/to/Re-BattleTanx/update.sh
set -Eeuo pipefail

fail() { printf 'Update stopped: %s\n' "$*" >&2; exit 1; }

# Parse the whole function before Git updates this script on disk.
main() {
  if [[ ${1:-} == --help || ${1:-} == -h ]]; then
    printf 'Usage: bash update.sh\nFetch the current branch upstream, fast-forward, build and restart the Docker Compose game.\nRun as the checkout owner with Git and Docker access. Existing .env and database volumes are retained.\n'
    return
  fi
  [[ $# == 0 ]] || fail 'Unexpected arguments. Use --help for usage.'
  command -v git >/dev/null || fail 'Git is required.'
  command -v docker >/dev/null || fail 'Docker with the Compose plugin is required.'

  local repo_dir branch remote target before compose_help
  repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
  cd "$repo_dir"
  [[ $(git rev-parse --show-toplevel) == "$repo_dir" ]] || fail 'Keep update.sh at the root of this Git checkout.'

  # The lock is outside tracked files and is released on normal exit or interruption.
  update_lock="$(git rev-parse --absolute-git-dir)/retanx-update.lock"
  mkdir "$update_lock" 2>/dev/null || fail "Another update is running, or a previous one was killed. Check before removing $update_lock."
  trap 'rmdir "$update_lock" 2>/dev/null || true' EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  local phase=preflight
  trap 'status=$?; printf "Update failed during %s (exit %s). See the error above.\n" "$phase" "$status" >&2; exit "$status"' ERR

  [[ -z $(git status --porcelain --untracked-files=normal) ]] || fail 'The checkout has local changes. Commit or move them before updating; nothing has been discarded.'
  branch="$(git symbolic-ref --quiet --short HEAD)" || fail 'Detached HEAD. Check out the branch you deploy first.'
  remote="$(git config --get "branch.$branch.remote")" || fail "Branch $branch has no upstream. Set its GitHub tracking branch first."
  [[ $remote != . ]] || fail 'The upstream must be a remote repository, not another local branch.'
  git rev-parse --verify '@{upstream}' >/dev/null || fail "Branch $branch has no valid upstream."
  docker compose version >/dev/null
  docker info --format '{{.ServerVersion}}' >/dev/null
  compose_help="$(docker compose up --help)"
  [[ $compose_help == *--wait-timeout* ]] || fail 'Upgrade Docker Compose to a version supporting up --wait-timeout.'
  before="$(git rev-parse --short HEAD)"

  phase='Git update'
  printf '\nFetching %s for branch %s...\n' "$remote" "$branch"
  git fetch --prune "$remote"
  target="$(git rev-parse '@{upstream}')"
  git merge-base --is-ancestor HEAD "$target" || fail 'Local commits are ahead of or diverge from the upstream. Resolve them before deploying.'
  git merge --ff-only "$target"

  cd "$repo_dir/re-tanx"
  phase='Compose validation'
  docker compose config --quiet
  phase=build
  printf '\nBuilding the update; existing services keep running during the build...\n'
  docker compose build game web

  phase='database readiness'
  docker compose up -d --no-recreate --wait --wait-timeout 120 db
  phase='service restart'
  printf '\nRestarting game and web; active matches will disconnect.\n'
  docker compose up -d --no-build --no-deps --force-recreate --wait --wait-timeout 120 game web

  phase='website health check'
  # Use Node already installed in game; test Caddy's static route and proxy together.
  docker compose exec -T game node --input-type=module - <<'NODE'
for (let attempt = 1; attempt <= 10; attempt++) {
  try {
    for (const path of ["/", "/health"]) {
      const response = await fetch(`http://web:8080${path}`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
      if (path === "/health" && (await response.json()).ok !== true) throw new Error("Game server is not healthy");
      if (path === "/") await response.body?.cancel();
    }
    console.log("Website and game health check passed.");
    break;
  } catch (error) {
    if (attempt === 10) { console.error(error); process.exit(1); }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
NODE
  docker compose ps
  printf '\nUpdate complete: %s -> %s (%s).\n' "$before" "$(git rev-parse --short HEAD)" "$branch"
}

main "$@"
