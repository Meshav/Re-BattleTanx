#!/usr/bin/env bash
# Offline integration check: real temporary Git repos, fake Docker (no live services).
set -Eeuo pipefail
repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)"
test_dir="$(mktemp -d "${TMPDIR:-/tmp}/retanx-update-test.XXXXXX")"
trap 'rm -rf "$test_dir"' EXIT
export GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null
export GIT_AUTHOR_NAME='Updater Test' GIT_AUTHOR_EMAIL='updater@example.invalid'
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME" GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
export UPDATE_TEST_LOG="$test_dir/docker.log" UPDATE_TEST_HEALTH="$test_dir/health.mjs"
mkdir "$test_dir/bin"
cat > "$test_dir/bin/docker" <<'DOCKER'
#!/usr/bin/env bash
set -eu
printf '%s\n' "$*" >> "$UPDATE_TEST_LOG"
case "$*" in
  'compose up --help') printf '%s\n' '--wait --wait-timeout' ;;
  'compose build game web') [[ ${UPDATE_TEST_FAIL:-} != build ]] || exit 7 ;;
  'compose exec -T game node --input-type=module -')
    cat > "$UPDATE_TEST_HEALTH"
    [[ ${UPDATE_TEST_FAIL:-} != health ]] || exit 9 ;;
  'compose up -d --no-build --no-deps --force-recreate --wait --wait-timeout 120 game web')
    [[ ${UPDATE_TEST_FAIL:-} != restart ]] || exit 8 ;;
esac
DOCKER
chmod +x "$test_dir/bin/docker"
export PATH="$test_dir/bin:$PATH"
git init -q --bare "$test_dir/remote.git"
git init -q -b main "$test_dir/writer"
mkdir "$test_dir/writer/re-tanx"
cp "$repo_dir/update.sh" "$test_dir/writer/"
cp "$repo_dir/re-tanx/.gitignore" "$test_dir/writer/re-tanx/"
printf 'services: {}\n' > "$test_dir/writer/re-tanx/docker-compose.yml"
printf 'v1\n' > "$test_dir/writer/app.txt"
git -C "$test_dir/writer" add .
git -C "$test_dir/writer" commit -qm initial
git -C "$test_dir/writer" remote add origin "$test_dir/remote.git"
git -C "$test_dir/writer" push -qu origin main
git --git-dir="$test_dir/remote.git" symbolic-ref HEAD refs/heads/main
git clone -q "$test_dir/remote.git" "$test_dir/instance with spaces"
instance="$test_dir/instance with spaces"
printf 'SERVER_SECRET=keep-this-local\n' > "$instance/re-tanx/.env"
cp "$instance/re-tanx/.env" "$test_dir/env-original"

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
run_update() {
  : > "$UPDATE_TEST_LOG"
  # Deliberately run from outside the checkout.
  (cd "$test_dir" && bash "$instance/update.sh") > "$test_dir/result.log" 2>&1
}
expect_failure() {
  if run_update; then fail "Expected failure: $1"; fi
  grep -q "$1" "$test_dir/result.log" || { cat "$test_dir/result.log"; fail "Missing error: $1"; }
}
no_build() { ! grep -q '^compose build' "$UPDATE_TEST_LOG" || fail 'Unexpected build'; }
no_restart() { ! grep -q '^compose up -d' "$UPDATE_TEST_LOG" || fail 'Services changed after failure'; }
publish() {
  printf '%s\n' "$1" > "$test_dir/writer/app.txt"
  git -C "$test_dir/writer" add .
  git -C "$test_dir/writer" commit -qm "$1"
  git -C "$test_dir/writer" push -q
}

printf 'local edit\n' >> "$instance/app.txt"
expect_failure 'local changes'
no_build
git -C "$instance" restore app.txt
printf 'untracked\n' > "$instance/notes.txt"
expect_failure 'local changes'
no_build
[[ -f "$instance/notes.txt" ]] || fail 'Untracked file was removed'
rm "$instance/notes.txt"
mkdir "$instance/.git/retanx-update.lock"
expect_failure 'update is running'
[[ -d "$instance/.git/retanx-update.lock" ]] || fail 'Another process lock was removed'
rmdir "$instance/.git/retanx-update.lock"

# Pull also updates the currently executing script; its parsed main function must finish.
printf '\n# Upstream revision\n' >> "$test_dir/writer/update.sh"
publish v2
run_update || { cat "$test_dir/result.log"; fail 'Successful update failed'; }
[[ $(cat "$instance/app.txt") == v2 ]] || fail 'Did not fetch upstream code'
[[ $(git -C "$instance" rev-parse HEAD) == $(git -C "$test_dir/writer" rev-parse HEAD) ]] || fail 'Wrong deployed commit'
cmp "$test_dir/env-original" "$instance/re-tanx/.env"
[[ ! -d "$instance/.git/retanx-update.lock" ]] || fail 'Lock was not released'
cat > "$test_dir/expected.log" <<'EXPECTED'
compose version
info --format {{.ServerVersion}}
compose up --help
compose config --quiet
compose build game web
compose up -d --no-recreate --wait --wait-timeout 120 db
compose up -d --no-build --no-deps --force-recreate --wait --wait-timeout 120 game web
compose exec -T game node --input-type=module -
compose ps
EXPECTED
cmp "$test_dir/expected.log" "$UPDATE_TEST_LOG"
node --check "$UPDATE_TEST_HEALTH"

publish v3
export UPDATE_TEST_FAIL=build
expect_failure 'failed during build'
no_restart
unset UPDATE_TEST_FAIL
run_update || { cat "$test_dir/result.log"; fail 'Retry after failed build failed'; }
export UPDATE_TEST_FAIL=restart
expect_failure 'failed during service restart'
! grep -q '^compose exec' "$UPDATE_TEST_LOG" || fail 'Health ran after failed restart'
export UPDATE_TEST_FAIL=health
expect_failure 'failed during website health check'
! grep -q 'Update complete:' "$test_dir/result.log" || fail 'Reported unhealthy deployment as successful'
unset UPDATE_TEST_FAIL

printf 'local commit\n' > "$instance/local.txt"
git -C "$instance" add local.txt
git -C "$instance" commit -qm local
expect_failure 'ahead of or diverge'
no_build
publish v4
expect_failure 'ahead of or diverge'
no_build
git -C "$instance" checkout -q --detach
expect_failure 'Detached HEAD'
no_build
[[ ! -d "$instance/.git/retanx-update.lock" ]] || fail 'Failure leaked update lock'
printf 'PASS: fast-forward/self-update, paths with spaces, .env preservation, build/restart order, failed-build retry, restart/health failures, dirty/ahead/diverged/detached checkout guards and update lock.\n'
