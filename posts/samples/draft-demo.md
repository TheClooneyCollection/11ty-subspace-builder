---
title: Draft Workflow Demo
date: 2025-09-28
tags:
  - eleventy
  - drafts
  - workflow
  - testing
draft: true
excerpt: |
  Quick sanity check that the new draft pipeline hides unfinished posts when Eleventy runs in production mode.
---

## Why this post exists

This is a throwaway post meant to prove that `draft: true` entries remain visible during local development while production builds leave them out of every collection.

## What to look for

- During `npm run dev`, the post should appear alongside finished articles.
- When you build with `ELEVENTY_ENV=production`, the post disappears from listings and no standalone HTML file is emitted.

Feel free to delete this file once you have tested the workflow.
