# Lumen — CI and Branch Protection

## Pull Request checks

The repository now defines four Pull Request jobs in `.github/workflows/ci.yml`:

- Frontend;
- Backend;
- Extension;
- Secret scan.

They validate installation, lint, types, tests, builds, dependency policy, extension syntax, and newly introduced secrets. The workflow does not deploy or merge code.

## Recommended `main` protection

Configure the `main` branch in GitHub after the first successful workflow run so the exact generated check names can be selected:

1. Require a Pull Request before merging.
2. Require at least one approving manual review.
3. Dismiss stale approvals when new commits are pushed.
4. Require the Frontend, Backend, Extension, and Secret scan checks to pass.
5. Require conversation resolution before merge.
6. Block force pushes.
7. Block branch deletion.
8. Optionally require the branch to be current with `main` before merge when queue latency is acceptable.

Keep merge execution manual. Do not enable automatic production deployment as part of this protection rule.

## Known-history note

Phase 0 removed sensitive files from the current tree but intentionally did not rewrite published Git history. The Pull Request secret scan prevents new leaks; it does not prove that historical commits are free of previously documented credentials or data. Credential rotation and the incident-response guidance in `docs/SECURITY_INCIDENT_ACTIONS.md` remain authoritative.

## Administration

This document is a recommendation only. Phase 3 does not call the GitHub branch-protection API and does not modify repository settings, collaborator permissions, merge methods, or deployment environments.
