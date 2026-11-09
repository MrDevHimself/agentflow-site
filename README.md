# AgentFlow website

Built with [Astro](https://astro.build). Hosted on Netlify. **Every `git push` to `main` goes live automatically.**

## Editing the site

| What | Where |
| --- | --- |
| Home page | `src/pages/index.astro` (the lists at the top of the file hold the services, video and steps) |
| Booking page (Google Calendar embed + WhatsApp) | `src/pages/pitch.astro` |
| Privacy policy / Terms | `src/pages/privacy.astro`, `src/pages/terms.astro` |
| Header / footer | `src/components/Nav.astro`, `src/components/Footer.astro` |
| Logo | `src/components/Logo.astro` and `public/favicon.svg` |
| Icons | `src/components/Icon.astro` |
| Colours & fonts | `src/styles/global.css` (the `:root` block at the top) |

Old links `/services`, `/thank-you` and `/thankyou` redirect in `netlify.toml`.

Most text is either written straight into the HTML or in a small list at the top of each page file.

## Run it on your computer

```bash
npm install      # first time only
npm run dev      # open http://localhost:4321 - changes show instantly
```

## Publish a change

```bash
git add .
git commit -m "Describe what you changed"
git push
```

Netlify sees the push, runs `npm run build`, and publishes in about a minute. If a build fails, the old version stays live and Netlify emails you.

## One-time setup (connect GitHub to Netlify)

1. Create an empty repo on GitHub (e.g. `agentflow-site`), then from this folder:
   ```bash
   git remote add origin https://github.com/<you>/agentflow-site.git
   git push -u origin main
   ```
2. In Netlify: open your existing AgentFlow site → **Site configuration → Build & deploy → Link repository** → choose GitHub → pick the repo.
   (Or **Add new site → Import an existing project** if you'd rather start a fresh site.)
3. Netlify reads `netlify.toml`, so the build settings fill themselves in (build: `npm run build`, publish: `dist`). Click deploy.

Your custom domain stays attached to the Netlify site, so nothing changes for visitors.
