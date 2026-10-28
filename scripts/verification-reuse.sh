#!/usr/bin/env bash
set -euo pipefail
wf="${WF_REF%@*}"; wf="${wf##*/}"
# Only a same-repository push is evidence for ordinary commit reuse. A main push
# must find the passing branch push, never another main skip or a PR merge ref.
newest_push() {
  local branch_filter='true'
  if [ "${2:-}" = branch ]; then branch_filter='.head_branch != "main"'; fi
  gh api "repos/$GITHUB_REPOSITORY/actions/workflows/$wf/runs?head_sha=$1&event=push&per_page=100" \
    --jq "[.workflow_runs[] | select(.event == \"push\" and .head_repository.full_name == \"$GITHUB_REPOSITORY\" and .id != $GITHUB_RUN_ID) | select($branch_filter)] | max_by(.id) | select(. != null) | \"\(.status) \(.conclusion)\"" || true
}
green() { [ "$(newest_push "$1" "${2:-}")" = 'completed success' ]; }
skip=false
light=false
if [ "$EVENT" = push ] && [ "$REF" = refs/heads/main ] && green "$GITHUB_SHA" branch; then skip=true; fi
if [ "$skip" = false ] && [ "$EVENT" = push ] && parent=$(git rev-parse -q --verify HEAD~1); then
  if [ "$(git rev-parse 'HEAD^{tree}')" = "$(git rev-parse 'HEAD~1^{tree}')" ]; then
    if green "$parent"; then skip=true; fi
  elif git diff --name-only "$parent" HEAD | awk '
    !/^(sources\.lock\.json|CONTRACT\.md|ACCEPTANCE\.md|CLAIMS\.md|docs\/CLAIMS\.md|HANDOVER\.md|STATUS\.md|evidence\/.*|\.artifacts\/.*)$/ { changed=1 }
    END { exit changed }'; then
    if green "$parent"; then light=true; fi
  fi
fi
if [ "$EVENT" = pull_request ] && [ "$SAME_REPO" = true ]; then
  for _ in $(seq 1 5); do
    state=$(newest_push "$PR_HEAD")
    case "$state" in
      'completed success') skip=true; break ;;
      ''|completed\ *) break ;;
      *) sleep 300 ;;
    esac
  done
fi
# A scheduled run contains only extended qualification; do not repeat a green SHA.
if [ "$EVENT" = schedule ]; then
  state=$(gh api "repos/$GITHUB_REPOSITORY/actions/workflows/$wf/runs?head_sha=$GITHUB_SHA&event=schedule&per_page=100" \
    --jq "[.workflow_runs[] | select(.id != $GITHUB_RUN_ID and .head_repository.full_name == \"$GITHUB_REPOSITORY\" and .conclusion == \"success\")] | length" || echo 0)
  if [ "$state" -gt 0 ]; then skip=true; fi
fi
printf 'skip=%s\nlight=%s\n' "$skip" "$light" >> "$GITHUB_OUTPUT"
