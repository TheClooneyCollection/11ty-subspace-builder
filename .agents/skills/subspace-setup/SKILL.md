---
name: subspace-setup
description: Set up a new site from 11ty Subspace Builder and keep it current with upstream. Use when the user wants to start a blog or site with Subspace Builder, configure or deploy it, turn off the sample content, or update their site to a newer Builder.
---

Settings and their accepted values are in [docs/configuration.md](../../../docs/configuration.md). Read the section a step names; don't guess option names.

1. **Get the code.** Run `git lfs install`, then fork or clone the Builder and keep it reachable as the `upstream` remote. Run `npm install` and `npm run dev`. Done: the site serves locally and post images load.
2. **Make it theirs.** Ask the user for the site title, public URL and author, and set them in `_data/site.yaml` ("Site identity and navigation") and `_data/me.yaml` ("Author"). Done: the header, page titles and canonical URLs show their values.
3. **Choose the look.**
   - Theme strategy and default ("Theme settings"): `simple` with one `defaultId`, or `fun` with weekday and weekend pools. Show the user the theme picker in the running site before they choose.
   - Share card style ("Open Graph images"): the build renders one card per page. Show them the styles before they pick.
   - Turn the sample posts, notes and timeline off with `sampleContent: false`. Hide them this way; don't delete them, or every later rebase onto upstream conflicts on those files. `npm run starter:reset` is only for clearing the starter's personal metadata on a fresh fork.

   Done: `npm run build` passes with the chosen theme default and card style, and no sample pages are in `_site`.
4. **Deploy to Cloudflare Pages.** Connect the repo. Use build command `npm run build`, output directory `_site`, and set `NODE_VERSION=20`. Done: the deploy succeeds, a post with an image shows the image (not an LFS pointer), and its `og:image` URL returns a PNG.
5. **Stay current with upstream.** The site's history sits on top of the Builder's; an update replays it onto the new Builder:
   ```sh
   git fetch upstream
   git tag backup/main-$(date +%F) && git push origin backup/main-$(date +%F)
   git rebase upstream/main
   npm test && npm run build
   git lfs push origin main
   git push --force-with-lease=main:<old origin/main hash> origin main
   ```
   In a conflict, keep the site's own files (README, `_data/`, content) and take the Builder's code. Never merge upstream into the branch. Done: the backup tag is on the remote, tests and the build pass, and the push names the old hash in `--force-with-lease`.
