# Guardian Gas Solutions — Deploy Guide

Repo name: **Go-Guardian-Gas-Site**
Host: Netlify · Domain: goguardiangas.com · Form: Web3Forms (free)

---

## 1. Put the site on GitHub

### Option A — GitHub website (no command line)
1. Go to https://github.com/new
2. Repository name: `Go-Guardian-Gas-Site`
3. Set to **Private** (or Public, your call). Do NOT add a README/gitignore — the zip already has files.
4. Click **Create repository**.
5. On the next screen, click **uploading an existing file**.
6. Unzip the site on your computer, then drag the CONTENTS of the `website` folder
   (index.html, css/, js/, images/, etc.) into the upload box — not the `website`
   folder itself, the files inside it.
7. Commit directly to `main`.

### Option B — command line
```bash
cd path/to/website          # the folder that contains index.html
git init
git add .
git commit -m "Initial Guardian Gas site"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/Go-Guardian-Gas-Site.git
git push -u origin main
```

---

## 2. Connect Netlify to the repo
1. Netlify → **Add new site** → **Import an existing project** → **GitHub**.
2. Pick `Go-Guardian-Gas-Site`.
3. Build settings: leave **build command blank**, set **publish directory** to `.`
   (a single dot — the files are at the repo root). Click **Deploy**.
4. After it deploys, Netlify gives you a temporary URL like `random-name.netlify.app`.
   Test everything there first.

---

## 3. Point the domain (goguardiangas.com)
In Netlify → Domain settings → Add `goguardiangas.com`.
At your DNS provider (Wix), set:
- A record: `@` → `75.2.60.5`
- CNAME: `www` → `apex-loadbalancer.netlify.com`
SSL provisions automatically once DNS propagates (can take up to ~24h).

---

## 4. Make the contact form actually deliver — IMPORTANT
The form is already wired to Web3Forms with the access key in `contact.html`.
For leads to reach the right inbox:

1. Log in at https://web3forms.com (the account that owns the access key
   `37a62898-d0de-4f44-8d34-5fbc5a4a3934`).
2. Confirm the **email on that key is `Info@GoGuardianGas.com`**.
   If it shows a different address, leads are going there instead — fix it in the
   Web3Forms dashboard.
3. If you don't have access to that key's account, generate a NEW free key on
   web3forms.com using Info@GoGuardianGas.com, then replace the value in
   `contact.html` (search for `access_key`) and re-commit.

### Test it (after deploy)
- Open the live Contact page, fill the form with your own email, submit.
- You should see the green "message sent" box on the page.
- Check that the email lands at Info@GoGuardianGas.com (check spam first time).
- The first Web3Forms submission per account sometimes needs a one-time email
  confirmation — watch for a verification email and click it.

---

## 5. Still to do (polish)
- favicon (icons/ folder exists — add favicon.ico + apple-touch-icon)
- Google Analytics 4 tag
- Real product photography to replace placeholders
