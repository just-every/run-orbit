#!/usr/bin/env bash
set -euo pipefail

wf="${WF_REF%@*}"; wf="${wf##*/}"
# Only the newest same-repository PUSH of this workflow is evidence. A PR may
# itself be a skip, and a dispatch may qualify only a subset. API errors fail open
# to a full verification, never to a green skip.
newest_push() {
  gh api "repos/$GITHUB_REPOSITORY/actions/workflows/$wf/runs?head_sha=$1&event=push&per_page=100" \
    --jq "[.workflow_runs[] | select(.event == \"push\" and .head_repository.full_name == \"$GITHUB_REPOSITORY\" and .id != $GITHUB_RUN_ID)] | max_by(.id) | select(. != null) | \"\(.status) \(.conclusion)\"" || true
}
green() { [ "$(newest_push "$1")" = 'completed success' ]; }
skip=false
light=false
if [ "$EVENT" = push ] && [ "$REF" = refs/heads/main ] && green "$GITHUB_SHA"; then skip=true; fi
# Exact-tree reuse only: retain verification for any changed byte.
if [ "$skip" = false ] && [ "$EVENT" = push ] && parent=$(git rev-parse -q --verify HEAD~1) \
   && [ "$(git rev-parse 'HEAD^{tree}')" = "$(git rev-parse 'HEAD~1^{tree}')" ] && green "$parent"; then skip=true; fi
if [ "$EVENT" = pull_request ] && [ "$SAME_REPO" = true ]; then
  for _ in $(seq 1 50); do
    state=$(newest_push "$PR_HEAD")
    case "$state" in
      'completed success') skip=true; break ;;
      ''|completed\ *) break ;;
      *) sleep 30 ;;
    esac
  done
fi
# Documentation/lock-only changes inherit the parent's full push proof and
# still check the current source lock, contract, CLI and public site build.
if [ "$skip" = false ] && [ "$EVENT" = push ] && [[ "$REF" == refs/heads/* ]] && parent=$(git rev-parse -q --verify HEAD~1) && green "$parent"; then
  changed=$(git diff --name-only "$parent" HEAD)
  if [ -n "$changed" ] && ! printf '%s\n' "$changed" | grep -Ev '^(sources\.lock\.json|CONTRACT\.md|ACCEPTANCE\.md|CLAIMS\.md|docs/CLAIMS\.md|HANDOVER\.md|STATUS\.md|evidence/.*|\.artifacts/.*)$' >/dev/null; then light=true; fi
fi
echo "light=$light" >> "$GITHUB_OUTPUT"
echo "skip=$skip" >> "$GITHUB_OUTPUT"
