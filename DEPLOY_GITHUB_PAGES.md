# Guardian Gas Solutions — GitHub Pages Deploy

Repo: **Go-Guardian-Gas-Site** · Domain: goguardiangas.com

GitHub Pages is free with no credit/usage limits for a site this size.

---

## 1. Update your repo with these files
Your repo already exists. Replace its contents with this zip's contents
(everything compressed, plus a new CNAME file and fixed sitemap).

Easiest way on github.com:
1. Open your repo → it's easiest to upload the changed files.
   Changed since last time: the whole `images/` folder (compressed),
   `sitemap.xml`, and a new `CNAME` file.
2. Click **Add file → Upload files**, drag in the updated `images/` folder,
   `sitemap.xml`, and `CNAME`.
3. Commit to `main`.

(If unsure, just delete the repo's files and re-upload everything from this zip.)

---

## 2. Turn on GitHub Pages
1. In your repo → **Settings** → **Pages** (left sidebar).
2. Under "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **main**  /  folder: **/ (root)**
   - Click **Save**.
3. Wait ~1 minute. GitHub shows a green banner with your live URL:
   `https://YOUR-USERNAME.github.io/Go-Guardian-Gas-Site/`
4. Open it and click through all pages. (Internal links use .html so they
   all work on GitHub Pages — no extra config needed.)

---

## 3. Connect goguardiangas.com
The zip includes a `CNAME` file with your domain, so GitHub picks it up
automatically. To finish:

1. Repo → Settings → Pages → **Custom domain** should already show
   `goguardiangas.com` (from the CNAME file). If not, type it and Save.
2. At your DNS provider (Wix), set these records:

   For the apex domain (goguardiangas.com), 4 A records:
   - A  @  185.199.108.153
   - A  @  185.199.109.153
   - A  @  185.199.110.153
   - A  @  185.199.111.153

   For www:
   - CNAME  www  YOUR-USERNAME.github.io

   (Replace YOUR-USERNAME with your actual GitHub username.)

3. Remove the old Netlify A/CNAME records at Wix so they don't conflict.
4. Back in Settings → Pages, once DNS propagates, check
   **Enforce HTTPS** (may take a few hours to become available).

---

## 4. Contact form — make leads deliver
The form posts to Web3Forms, which is independent of your host, so it works
the same on GitHub Pages.

1. Go to web3forms.com → create an access key with **Info@GoGuardianGas.com**.
2. Click the verification link emailed to that address.
3. In your repo, edit `contact.html`, find the old key
   `37a62898-d0de-4f44-8d34-5fbc5a4a3934` and replace it with your new key.
4. Commit. GitHub Pages redeploys automatically.
5. Open the live Contact page, submit the form with your own email, confirm
   it lands at Info@GoGuardianGas.com (check spam the first time).

---

## Notes
- `netlify.toml` is harmless on GitHub Pages (ignored). Left in case you ever
  switch back.
- Images were compressed from 8.2 MB to ~650 KB with no visible quality loss.
  Two unused 8000px logo files were removed.

## Still to do (polish)
- favicon, GA4, real product photography
