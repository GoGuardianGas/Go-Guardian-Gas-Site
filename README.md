# Guardian Gas Solutions — Website

Static multi-page site for Guardian Gas Solutions LLC. Built to deploy on Netlify.

## Structure

```
.
├── index.html          Home
├── services.html       Services (Residential / Agricultural / Commercial)
├── about.html          About + Credentials + Service Area + Company Details
├── contact.html        Contact form (Web3Forms) + direct contact info
├── css/site.css        Site-wide styles
├── js/site.js          Mobile nav, scroll animations
├── images/             Logos and partner badges
├── icons/              SVG icon set
├── netlify.toml        Pretty URLs + caching + security headers
├── robots.txt
└── sitemap.xml
```

## Before going live — required swaps

### 1. Web3Forms access key

Open `contact.html` and find this line:

```html
<input type="hidden" name="access_key" value="YOUR_WEB3FORMS_ACCESS_KEY_HERE">
```

Replace `YOUR_WEB3FORMS_ACCESS_KEY_HERE` with the same Web3Forms access key
already in use on goguardianoutdoors.com (or create a new one at
https://web3forms.com — it's free). The form is wired the same way as the
Outdoors site: AJAX submission, success message inline, no page reload.

### 2. Domain in sitemap.xml

If goguardiangas.com isn't already the live URL, update the `<loc>` values
in `sitemap.xml`.

## Deploy to Netlify

Drag the entire folder onto Netlify's "Deploy" zone, or connect a Git repo.

`netlify.toml` handles:
- Pretty URLs (`/services` instead of `/services.html`)
- Long-term caching of `css/`, `js/`, `images/`, `icons/`
- Basic security headers

## Design system

- **Fonts**: Oswald (display), Manrope (body), JetBrains Mono (technical/accents)
- **Colors**: Near-black foundation, chrome silver type, royal blue accent
- **Aesthetic**: dark, chrome, sleek — matches the v2 Brand Kit
