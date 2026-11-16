---
title: Lighting Up GitHub Embeds in My Eleventy Blog
date: 2025-10-03
tags:
  - eleventy
  - github
  - shortcodes
  - code-embeds
eleventyNavigation:
  key: github-embeds
---

For the longest time, sharing code from GitHub meant screenshotting or pasting raw
snippets into Markdown. Both options felt brittle—screenshots hide the text from RSS readers, while copy-pastes drift out of sync the minute the upstream file changes. I wanted the readability of Emgithub, the SEO of server-side rendering, and zero third-party JavaScript.

That mix finally landed this week: a `{% raw %}{% github %}{% endraw %}` shortcode that fetches code at build time, highlights it, numbers each line, and offers a copy button. All it needs is the GitHub blob URL and an optional style flag for light or dark chrome.

[[toc]]

## Goals and Constraints

I set a few guardrails before having GPT Codex write any code:

- **Stay build-time friendly.** Everything should be resolved during the Eleventy
  build so the rendered HTML already contains the code (great for search engines,
  RSS, and offline readers).
- **Cache remote requests.** Fetching raw GitHub files repeatedly would be slow, so
  EleventyFetch handles caching for me.
- **Keep the authoring experience simple.** The shortcode should accept the familiar
  GitHub “blob” URL, including the optional `#L10-L42` hash for ranges.
- **Match the site’s look.** I leaned on Emgithub’s visual language—file metadata
  up top, code lines below—and added my own CSS to blend with the Subspace themes.

## Parsing the GitHub URL

The first building block is a little parser that breaks down GitHub blob URLs into
something we can work with. It extracts the user, repo, branch, file path, and any
line range expressed in the hash.

{% github "https://github.com/TheClooneyCollection/11ty-subspace-builder/blob/5e7ae27a30f04c1d6c2bf281de97b29cdccd602d/eleventy.config.js#L19-L46" %}

If the hash is missing, the shortcode simply renders the entire file. Passing a URL
that includes `#L8-L25` limits the render to those lines, and GitHub’s own permalink
UI makes grabbing that URL trivial.

## Fetching and Highlighting at Build Time

With the metadata in hand, EleventyFetch grabs the raw file contents during the build.
The result is cached for 24 hours so incremental builds stay fast.

{% github "https://github.com/TheClooneyCollection/11ty-subspace-builder/blob/5e7ae27a30f04c1d6c2bf281de97b29cdccd602d/eleventy.config.js#L203-L209" %}

Highlight.js then lights up the code. I detect the language using the file extension
and fall back to plain text when highlight.js doesn’t know the syntax.

{% github "https://github.com/TheClooneyCollection/11ty-subspace-builder/blob/5e7ae27a30f04c1d6c2bf281de97b29cdccd602d/eleventy.config.js#L212-L222" %}

Wrapping each line in an ordered list gives me semantic numbering without resorting to
client-side scripts:

{% github "https://github.com/TheClooneyCollection/11ty-subspace-builder/blob/5e7ae27a30f04c1d6c2bf281de97b29cdccd602d/eleventy.config.js#L224-L234" %}

## Emgithub-Inspired Styling and Clipboard Support

All that HTML feeds into a container that mimics the Emgithub window, but the styles
are now local to the project. A dedicated stylesheet handles light and dark themes via
CSS variables, while a tiny `copy.js` script turns the “Copy” button into a real
clipboard action.

{% github "https://github.com/TheClooneyCollection/11ty-subspace-builder/blob/5e7ae27a30f04c1d6c2bf281de97b29cdccd602d/eleventy.config.js#L242-L255" %}

Clicking the button copies the rendered lines and flashes a “Copied!” label for a
second so readers know it worked.

## Using the Shortcode

Once everything is wired up, embedding a snippet is just a matter of pasting the URL
and picking a theme modifier. The shortcode defaults to the light variant, so the
style argument is entirely optional.

{% raw %}

```njk
{% github "https://github.com/TheClooneyCollection/11ty-subspace-builder/blob/main/index.njk" %}

{% github "https://github.com/TheClooneyCollection/11ty-subspace-builder/blob/main/index.njk#L1-L11" "dark" %}
```

{% endraw %}

Because the HTML is rendered on the server, the code survives RSS feeds, printing, and
readers with JavaScript disabled. I also plan to lean on GitHub’s “Copy permalink”
button whenever I cite code, which locks the URL to a specific commit hash so posts
won’t drift as repositories evolve.

## Testing and Takeaways

The Eleventy build is the main test harness here. Running `npm run build` confirms
that the shortcode can pull remote code, highlight it, and emit valid HTML without
warnings. From there, it’s just a matter of opening the local preview, clicking the
copy button, and skimming the output to make sure the styles line up with the theme.

I loved how small this feature felt once the pieces were in place. Eleventy’s async
shortcodes made it easy to hook into build-time data fetching, and Highlight.js kept
me from hand-maintaining language definitions. Most importantly, the authoring flow is
as simple as pasting a GitHub link—exactly what I wanted when I sketched the idea.

If you try it out or have ideas for auto-detecting the site theme, let me know. I’d
love to keep leveling up how code shows up on the Subspace Builder.
