# Round Table Masters Pick'em 2026

Short deploy guide for publishing this repo with GitHub + Netlify.

## 1. Initialize git in this folder

From:
`C:\Users\wfpal\OneDrive\Desktop\Non-Work\Codex\BI Dashboard`

```powershell
git init
git add .
git commit -m "Initial commit"
```

## 2. Create a GitHub repo and push this code

1. In GitHub, create a new empty repository.
2. Copy the repo URL.
3. Run:

```powershell
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

If the remote already exists:

```powershell
git remote set-url origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

## 3. Import the repo into Netlify

1. Log in to Netlify.
2. Click `Add new site` > `Import an existing project`.
3. Choose GitHub.
4. Select this repository.
5. Deploy the site.

## 4. Netlify settings already handled by `netlify.toml`

These are already configured:

- Publish directory: `public`
- Functions directory: `netlify/functions`
- Redirect `/api/live-scores` to the Netlify Function
- SPA fallback redirect to `index.html`
- Node version: `20`

In most cases, you can leave the Netlify build settings blank and let `netlify.toml` handle them.

## 5. Test after deploy

After Netlify gives you a public URL:

1. Open the homepage and confirm the UI loads:

```text
https://YOUR-SITE.netlify.app/
```

2. Open the API directly and confirm JSON is returned:

```text
https://YOUR-SITE.netlify.app/api/live-scores
```

3. Back on the homepage, confirm:
- Top 3 Leaders render
- Current Standings render
- Roster Spotlight renders
- The Chart.js graph appears

## 6. Enable password protection in Netlify

In Netlify, go to:

`Team settings` > `Access & security` > `Visitor access`

Then configure:

- `Basic Password Protection`

Apply it to the site/deploy scope you want to protect.

## 7. Important note about password protection

Netlify shared password protection may require a paid Netlify plan, such as Pro. Check your plan and the current Netlify Visitor Access options before relying on it for launch.
