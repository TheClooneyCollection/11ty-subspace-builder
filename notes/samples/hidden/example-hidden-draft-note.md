---
title: Example Hidden Draft Note
date: 2026-05-02
draft: true
tags:
  - workflow
excerpt: A draft note that proves hidden notes stay off the main notes page.
---

This is an example hidden draft note.

It lives under `notes/hidden/`, so it inherits `hidden: true`. In local development it appears on `/notes/hidden/`, but it stays off the public `/notes/` index. In production builds, this repo's draft handling keeps it out of collections, but the page can still render at its direct URL.
