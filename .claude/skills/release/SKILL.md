---
name: release
description: Cut a new versioned release for 11ty-subspace-builder. Use when the user says "create a release", "cut a release", or "release following convention".
---

Run the repo's `release-please` release flow following the established convention.

## Steps

1. **Synchronize release state before inspecting the next release.**
   - Run `git pull --ff-only` on the current branch if you are preparing changes locally.
   - Run `git fetch origin --tags`.
   - Check the latest local tags after fetching, because the latest published release is still represented by Git tags.

2. **Determine the expected next version** from Conventional Commits:
   - Patch (`x.x.N`) — `fix:` commits
   - Minor (`x.N.0`) — `feat:` commits
   - Major (`N.0.0`) — `feat!:` commits or a `BREAKING CHANGE:` footer

3. **Do not cut the release manually.**
   - `release-please` manages the release PR and updates `package.json`, the mirrored root version fields in `package-lock.json`, and `CHANGELOG.md`.
   - Do not hand-edit those version files just to force a routine release. Land the implementation commits with correct Conventional Commit messages instead.

4. **Watch for the release PR** opened by `.github/workflows/release-please.yml` on `main`.
   - The release PR title should follow:

   ```
   chore: release vX.Y.Z
   ```

   - Review the changelog and version bump for correctness before merging.

5. **Keep implementation commits separate from the release PR.**
   - Feature, bug fix, refactor, and content changes should already be committed with their own intentional commit message before starting the release step.
   - Do not bundle new implementation changes into the release PR branch.

6. **Merge the release PR** once validation passes.
   - Merging the PR creates the `vX.Y.Z` tag and the GitHub release automatically.
   - If the workflow does not open or publish correctly, inspect `.release-please-config.json`, `.release-please-manifest.json`, and the GitHub Actions run before falling back to a manual recovery.
