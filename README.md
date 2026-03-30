# HW2 Decoupling Visualization

Interactive visualization project for the question:

**Who Has Truly Decoupled Growth from Carbon Emissions?**

## Repository Structure

```text
.
├─ .github/workflows/        GitHub Pages deployment workflow
├─ data/
│  ├─ raw/                   raw source data used for rebuilding
│  └─ processed/             optional intermediate outputs
├─ public/
│  ├─ data/                  processed JSON used by the site
│  ├─ .nojekyll              GitHub Pages compatibility file
│  └─ HW2_PROJECT_WRITEUP.md copied write-up for static hosting
├─ scripts/
│  ├─ prepare-data.mjs       data preparation pipeline
│  └─ prepare-static.mjs     syncs write-up and Pages static files
├─ src/                      Vue + D3 application source
├─ HW2_PROJECT_WRITEUP.md    standalone course write-up
├─ GITHUB_PAGES_CHECKLIST.md deployment checklist
├─ package.json
├─ package-lock.json
├─ vite.config.ts
└─ README.md
```

## What To Keep In The Final Repo

Keep these directories and files:

- `.github/`
- `data/`
- `public/`
- `scripts/`
- `src/`
- `HW2_PROJECT_WRITEUP.md`
- `GITHUB_PAGES_CHECKLIST.md`
- `package.json`
- `package-lock.json`
- `vite.config.ts`
- `README.md`
- TypeScript config files
- `.gitignore`

Do not commit:

- `node_modules/`
- `dist/`
- editor temp files

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The build process will:

1. regenerate processed data
2. sync `HW2_PROJECT_WRITEUP.md` into `public/`
3. ensure `.nojekyll` exists for GitHub Pages
4. output the final site into `dist/`

## GitHub Pages

This project is already configured for GitHub Pages deployment via GitHub Actions.

### Required GitHub setup

1. Create a GitHub repository.
2. Push this project to the `main` branch.
3. Open repository `Settings` → `Pages`.
4. Set the source to `GitHub Actions`.
5. Push to `main` again or manually run the workflow.

After that, the workflow in `.github/workflows/deploy.yml` will build and publish the site automatically.

## Submission Notes

- The standalone course write-up is in `HW2_PROJECT_WRITEUP.md`.
- After build, the same write-up is also available in `public/HW2_PROJECT_WRITEUP.md`.
- If you want to submit a clean folder directly, use the prepared export directory outside this repo: `D:\\VIS_hw\\webapp_submission`.
