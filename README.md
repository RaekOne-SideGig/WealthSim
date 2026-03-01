# WealthSim

Personal financial planning app built with React + Recharts.

## Setup

```bash
npm install
npm run dev       # local dev at http://localhost:5173/wealthsim/
```

## Deploy to GitHub Pages

1. Create a GitHub repo named `wealthsim`
2. If your repo has a different name, edit `vite.config.js` and change `base: '/wealthsim/'` to match
3. Run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/wealthsim.git
git push -u origin main
npm run deploy
```

4. In your GitHub repo → Settings → Pages → set Branch to `gh-pages` → Save
5. Live at: `https://YOUR_USERNAME.github.io/wealthsim/`

## Updating

```bash
git add .
git commit -m "Update"
git push
npm run deploy
```
