# Guardian Permits

Guardian Permits is the permit case and client-document arm of Guardian Gas Solutions LLC. It uses this existing website repository and Netlify Functions, Identity, and private Blobs storage. It does not import data or credentials from the old Base44 application.

## Routes

- `/guardian-permits/`: client access code, assigned case, document checklist and uploads.
- `/guardian-permits/staff.html`: invited staff login, cases, jurisdiction library, document review, permit progression, code rotation and revocation.
- `/.netlify/functions/guardian-permits`: authenticated API. Files are always downloaded through this function with an authorization check and attachment disposition.

## Activation on Netlify

1. Deploy this branch as a preview and run the tests. Production has its own durable store; preview deployments use separate stores and must use synthetic data only.
2. Enable Netlify Identity on the `goguardiangas` project and set **Invite only** registration. Invite the intended staff account and assign the `permits-staff` role. Only confirmed users with that role can read or change staff records. Do not assign the role to clients. Keep confirmation enabled.
3. Accept the staff invitation, set a password privately, and sign in at the staff route. Root-page invitation/recovery callbacks are routed to the staff page. No signup endpoint or automatic staff-role assignment is provided.
4. Create an actual county or municipality profile using the permitting office’s current checklist. Record when the requirements were checked. Create cases from this profile; each case snapshots the checklist so later library changes cannot silently change a client’s requested documents.
5. Share the generated code privately. It is shown once; only its SHA-256 hash is stored. The default term is three calendar months, configurable from 1–12 months. Rotating/revoking a code immediately invalidates existing client sessions as well as the old code.
6. Verify a complete round trip with a synthetic case and harmless sample PDF before real client documents are accepted. Remove synthetic records from production through a reviewed maintenance procedure if any are used there.

## Hosting and domain

The repository contains legacy GitHub Pages and Netlify deployment guidance. Verify current DNS before changing a custom domain. The Netlify deployment supports the API and private uploads; GitHub Pages alone does not. This change does not move the main website’s domain. Use the Netlify portal URL until a dedicated permit subdomain or a suitable proxy is configured.

## Data and access

`guardian-permits-v1` is the production site-wide store. Preview stores are keyed to the deploy ID. Case records include the county, municipality, actual permitting authority, client details, per-case checklist, status, inspection date, government permit number, client message and internal staff notes. Public/client response fields are allowlisted and exclude internal notes and client email. Files are stored separately under server-constructed case keys, never in Git, the public directory, or an arbitrary client-supplied object path.

Client sessions use random HttpOnly, Secure, SameSite=Strict cookies and last at most eight hours, bounded by code expiry. Every file/list/upload request checks the case and active grant again. Mutation requests require a matching Origin. The function has platform rate limits. Files are checked for allowed extension, MIME and magic bytes, with a 4 MiB maximum; they are forced to download rather than display inline. This is file-type validation, not malware scanning. The upload cap is 100 files per case as an operational guard, not a strict transactional storage quota under concurrent writes. Files and audit records persist after access expires; expiration is not deletion. Define the company’s retention policy before routine production use. No automated government submission, digital-signature service, fee collection, email sending, or records deletion is included.

Staff review labels are internal workflow choices, not approval by the authority having jurisdiction. A client upload does not submit a permit. Staff can record the external submission/reference and progress in the case. Requirements must be checked against each jurisdiction’s current instructions.

## Publication and public demo — November 9, 2026

The owner authorized live publication after adding a dummy access code. `GUARDIAN-DEMO` opens only a fictional browser-local walkthrough. It does not authenticate with the API, grant staff access, accept files, store data, or expose real cases. Sample submission resets on exit. Actual client codes still use server-side case authorization. Deployed staff sign-in and browser download verification remain outstanding before routine real-document use.

## Validation

`npm ci && npm test && npm run build`

All 18 automated tests pass, including rejection of the public demo code by the private API. Browser testing with synthetic local records verified jurisdiction and case creation, progress editing, and preservation of unsaved notes and review feedback. The retried browser file chooser and both client/staff uploads passed, including acceptance reset on a subsequent upload. Browser download verification remains incomplete. The public demo code, sample action, exit and reset were verified in browser. The homepage shield entry uses a semantic link, a decorative sword with hover/focus motion, and a reduced-motion alternative. Local browser testing uses mocked Identity and an in-memory store, so it does not certify Netlify authentication or private Blobs integration.

Regression fixes include preserving unsaved form drafts during review refreshes, rejecting stale document reviews, returning accepted categories to Received on a new upload, rejecting zero-month terms and nonboolean access flags, treating null JSON as bad input, and reporting storage outages accurately.

Tests cover staff authorization, cross-client isolation, expired/revoked/rotated codes and sessions, CSRF, private downloads, upload type spoofing, stale updates and calendar-month expiry, server-side logout, and jurisdiction snapshot isolation. Netlify Identity and Blobs still require a deployed end-to-end check after account activation.

Use the current Netlify documentation for Identity, Functions and Blobs. No provider credentials or staff passwords belong in this repository.

### Local synthetic browser harness

Run `npm run build`, then use the managed Sites preview with `npm run dev` as its command. The harness in `tests/browser-server.mjs` serves `dist`, seeds disposable synthetic records, and mocks staff identity. It must never be deployed as the production handler. For a proxied preview, set its exact origin in ignored `tests/.browser-origin`. Its HTTP cookie adapter is local only; production retains Secure host-only cookies. `tests/fixtures/sample-permit.pdf` contains no client information.
