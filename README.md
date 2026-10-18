# parthiv. portfolio

A static, dependency-free personal site: plain HTML, CSS and JS. There's no build step.

```
index.html        all content (edit text here)
css/style.css     design tokens at the top (colors, fonts, spacing)
js/main.js        animations & interactions
assets/           photo, résumé PDF, favicon, social image, project screenshots (assets/work)
```

## Run locally

```bash
cd ~/Downloads/Parthiv/parthiv-portfolio && python3 -m http.server 4321
```

Then open http://localhost:4321.

## Deploy (Vercel)

```bash
cd ~/Downloads/Parthiv/parthiv-portfolio && npx vercel --prod
```

Or push this folder to a GitHub repo and import it in Vercel. Pick the "Other" framework preset and leave the build command empty.

## Updating

- **New résumé:** replace `assets/Parthiv_Abhani_Resume.pdf` (keep the filename).
- **New project:** copy one `<article class="project">` block in `index.html`, bump `style="--i:N"`, and add a 1440×900 screenshot to `assets/work/`.
- **Accent color:** change `--accent` in `css/style.css`.
- **Waitless launch:** swap the "Coming soon" meta line and add the App Store link in the Waitless card.
