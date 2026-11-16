---
title: Preview production drafts locally
date: 2025-09-28
tags:
  - eleventy
  - drafts
  - workflow
eleventyNavigation:
  key: hide-drafts-production
excerpt: |
  `ELEVENTY_ENV` is now wired into every npm script so drafts stay private in production while remaining easy to preview.
---

## Draft posts stay out of production

We now set `ELEVENTY_ENV` for each npm script that ships with Subspace Builder. When you run `npm run build`, Eleventy filters out any Markdown files marked with `draft: true`. That keeps unfinished stories from leaking onto the live site.

Need to double-check how the site behaves in production? Use the new `npm run prod` command. It spins up Eleventy’s dev server with the production environment, so you can review the published experience locally while still enjoying hot reloads.

## What changed

- Eleventy computes `eleventyExcludeFromCollections` using the current `ELEVENTY_ENV`, skipping draft templates whenever the value is `production`.
- `package.json` scripts now cover the full workflow: `npm run dev` for drafting, `npm run prod` for production previews, and `npm run build` for deployable output.
- The README calls out the new scripts so the environment-driven behaviour is easy to adopt.

This groundwork sets us up for smoother release testing—and it keeps your editorial pipeline tidy.
