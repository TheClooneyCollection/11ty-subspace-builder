# Releases

Releases are managed by `release-please` through `.github/workflows/release-please.yml`.

- Push Conventional Commits to `main`: `feat:` triggers a minor release, `fix:` a patch release, and `feat!:` or a `BREAKING CHANGE:` footer a major release.
- When release-worthy commits land, `release-please` opens or updates a release PR that bumps `package.json` and `package-lock.json` and maintains `CHANGELOG.md`.
- Merging that PR creates the Git tag and the GitHub release.
- Only `feat` and `fix` commits (and breaking changes) appear in the changelog. `docs:`, `test:`, `chore:` and commits with any other prefix are left out, so give a reader-visible change a `feat:` or `fix:` prefix.
