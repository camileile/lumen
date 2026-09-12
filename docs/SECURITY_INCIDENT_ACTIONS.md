# Lumen — Manual Security Incident Actions

This checklist covers manual containment actions following the discovery of committed credentials and a data-bearing development database. It intentionally contains no credential values.

Removing files from the current branch prevents future commits from tracking them, but **does not remove their contents from existing Git history, clones, forks, caches, or previously published artifacts**. This change does not rewrite history.

## Immediate credential actions

- Revoke the previously exposed OpenRouter API key in the provider console.
- Create a replacement OpenRouter API key and store it only in the local/deployment secret manager.
- Generate a new, cryptographically random JWT signing secret.
- Update the OpenRouter key and JWT secret in every active deployment environment.
- Restart/redeploy affected services after updating their secrets.
- Treat every JWT signed with the old secret as invalid. Rotating the signing secret invalidates those sessions; require users to authenticate again.
- Check provider usage and billing logs for unexpected activity from the exposed key.

Do not place replacement values in source files, examples, tickets, pull requests, logs, chat messages, or deployment documentation.

## Database exposure review

- Determine whether the repository was ever public and identify everyone who could access it while the database was tracked.
- Review the committed development database as potentially exposed user and browsing-history data.
- Identify which accounts and people are represented without copying their data into issue trackers or chat.
- Decide, with the repository/data owner, whether affected users require notification or a credential reset.
- Consider forced password resets if repository exposure makes offline attacks against committed password hashes plausible.
- Define retention and secure deletion rules for local/development databases.
- Confirm production data is not copied into repository worktrees or test fixtures.

## Repository and distribution review

- Review existing clones, forks, mirrors, CI caches, release artifacts, backups, and downloaded archives that may retain the files.
- Restrict repository access while the exposure assessment is in progress, if appropriate.
- Confirm current branches no longer track environment files, local databases, dependency directories, or backups.
- Enable repository secret scanning and push protection where available.
- Do not rewrite published Git history without a separately approved incident-response plan.

If a historical purge is later approved, coordinate backups, collaborator notification, branch protection changes, mirror/cache cleanup, forced re-cloning, and credential rotation. History rewriting alone is not credential containment.

## Deployment verification

- Confirm each environment supplies DATABASE_URL, JWT_SECRET, OPENROUTER_API_KEY, OPENROUTER_BASE_URL, OPENROUTER_SITE_URL, and OPENROUTER_APP_NAME through its secret/configuration system.
- Confirm placeholder example values are never accepted for a production deployment.
- Verify the service starts after rotation without printing secret values.
- Verify authentication rejects tokens signed with the old secret.
- Verify OpenRouter requests succeed only with the replacement key.

## Completion record

Record completion in the organization’s private incident system, not in this repository. Include owners, dates, affected environments, exposure scope, provider usage review, user-impact decision, and any later Git-history remediation approval.
