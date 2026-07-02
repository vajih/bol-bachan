# 🚀 Deploy Bol Bachan

A 100% static site — no build step. Pick any one path.

## Option A — Vercel CLI (fastest)
```bash
cd bol-bachan
npx vercel --prod
```
Log in once when prompted (browser opens), confirm the project name, and it prints a
public URL like `https://bol-bachan-xxxx.vercel.app`. Framework preset: **Other**, no
build command, output dir `.`.

## Option B — Vercel dashboard (no terminal)
1. Push this repo to GitHub (see below).
2. Go to https://vercel.com/new and import the repo.
3. Framework: **Other**, no build command. Deploy → copy the URL.

## Option C — Netlify drop (zero setup)
Drag the `bol-bachan` folder onto https://app.netlify.com/drop for an instant URL.

---

## First push to GitHub
```bash
cd bol-bachan
git init -b main
git add .
git commit -m "Bol Bachan MVP"
# create the repo (needs GitHub CLI, or make it on github.com first):
gh repo create bol-bachan --public --source=. --remote=origin --push
# ...or, if you made the repo manually on github.com:
# git remote add origin https://github.com/<you>/bol-bachan.git
# git push -u origin main
```
