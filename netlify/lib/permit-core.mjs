import { createHash, randomBytes, randomUUID } from 'node:crypto';

export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const STATUSES = ['Collecting documents', 'Ready for review', 'Submitted', 'Corrections requested', 'Approved', 'Inspection scheduled', 'Complete'];
export const COUNTIES = ['Alachua','Baker','Bay','Bradford','Brevard','Broward','Calhoun','Charlotte','Citrus','Clay','Collier','Columbia','DeSoto','Dixie','Duval','Escambia','Flagler','Franklin','Gadsden','Gilchrist','Glades','Gulf','Hamilton','Hardee','Hendry','Hernando','Highlands','Hillsborough','Holmes','Indian River','Jackson','Jefferson','Lafayette','Lake','Lee','Leon','Levy','Liberty','Madison','Manatee','Marion','Martin','Miami-Dade','Monroe','Nassau','Okaloosa','Okeechobee','Orange','Osceola','Palm Beach','Pasco','Pinellas','Polk','Putnam','Santa Rosa','Sarasota','Seminole','St. Johns','St. Lucie','Sumter','Suwannee','Taylor','Union','Volusia','Wakulla','Walton','Washington'];
export const hash = value => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(24).toString('hex');
export const cleanCode = value => String(value || '').replace(/[\s-]/g, '').toLowerCase();
export const text = (value, max = 180) => String(value ?? '').trim().slice(0, max);
export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
export const fail = (status, message) => { throw new HttpError(status, message); };

export function addMonths(date, months) {
  const d = new Date(date), day = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last)); return d.toISOString();
}
export function validateJurisdiction(input) {
  const county = text(input.county), municipality = text(input.municipality);
  if (!COUNTIES.includes(county)) fail(400, 'Select a Florida county.');
  if (!['county', 'municipality'].includes(input.authorityType)) fail(400, 'Select the permitting authority type.');
  if (input.authorityType === 'municipality' && !municipality) fail(400, 'Enter the municipality.');
  const name = input.authorityType === 'county' ? `${county} County` : municipality;
  const requirements = (Array.isArray(input.requirements) ? input.requirements : []).map(r => ({ id: randomUUID(), name: text(r.name, 120), instructions: text(r.instructions, 800), required: r.required !== false })).filter(r => r.name).slice(0, 30);
  if (!requirements.length) fail(400, 'Add at least one document requirement.');
  let portalUrl = text(input.portalUrl, 500);
  if (portalUrl) { try { const u = new URL(portalUrl); if (u.protocol !== 'https:') throw 0; } catch { fail(400, 'The jurisdiction website must be an HTTPS address.'); } }
  return { county, municipality: input.authorityType === 'municipality' ? municipality : '', authorityType: input.authorityType, name, portalUrl, requirements, verifiedOn: text(input.verifiedOn, 10) };
}
export function validateFile(name, contentType, bytes) {
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) fail(400, 'Choose a file up to 4 MB.');
  const ext = String(name).split('.').pop().toLowerCase();
  const signatures = {
    pdf: ['application/pdf', b => b.subarray(0, 5).toString() === '%PDF-'],
    jpg: ['image/jpeg', b => b[0] === 255 && b[1] === 216 && b[2] === 255],
    jpeg: ['image/jpeg', b => b[0] === 255 && b[1] === 216 && b[2] === 255],
    png: ['image/png', b => b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))],
    webp: ['image/webp', b => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP']
  };
  const type = signatures[ext];
  if (!type || !type[1](bytes) || (contentType && contentType !== type[0] && contentType !== 'application/octet-stream')) fail(400, 'Use a valid PDF, JPG, PNG, or WebP file.');
  return { name: String(name).replace(/[^\p{L}\p{N} ._()-]/gu, '_').slice(-150), type: type[0] };
}
export function publicCase(c) {
  return { id: c.id, reference: c.reference, clientName: c.clientName, address: c.address, jurisdiction: c.jurisdiction, status: c.status, clientMessage: c.clientMessage, requirements: c.requirements, accessExpiresAt: c.accessExpiresAt, accessEnabled: c.accessEnabled, updatedAt: c.updatedAt, revision: c.revision };
}

export function createPermitHandler({ getStore, getStaff, now = () => new Date() }) {
  const response = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff', ...headers } });
  async function list(store, prefix) { const result = await store.list({ prefix }); return Promise.all(result.blobs.map(b => store.get(b.key, { type: 'json' }))); }
  async function mutate(store, key, update, retries = 0) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const entry = await store.getWithMetadata(key, { type: 'json' });
      if (!entry) fail(404, 'Record not found.');
      const next = update(entry.data);
      const result = await store.setJSON(key, next, { onlyIfMatch: entry.etag });
      if (result.modified) return next;
    }
    fail(409, 'This record changed. Refresh and try again.');
  }
  async function client(store, req) {
    const cookie = (req.headers.get('cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith('__Host-ggs-permits='));
    const raw = cookie?.slice('__Host-ggs-permits='.length);
    if (!raw || !/^[a-f0-9]{48}$/.test(raw)) fail(401, 'Enter your access code to continue.');
    const session = await store.get(`sessions/${hash(raw)}`, { type: 'json' });
    if (!session || !Number.isFinite(Date.parse(session.expiresAt)) || Date.parse(session.expiresAt) <= now().getTime()) fail(401, 'Your session expired. Enter your access code again.');
    const c = await store.get(`cases/${session.caseId}`, { type: 'json' });
    if (!c?.accessEnabled || c.codeHash !== session.codeHash || !Number.isFinite(Date.parse(c.accessExpiresAt)) || Date.parse(c.accessExpiresAt) <= now().getTime()) fail(401, 'Your access code is unavailable. Contact GGS for a new code.');
    return c;
  }
  return async (req, context = {}) => {
    try {
      const url = new URL(req.url), action = url.searchParams.get('action') || 'session';
      if (!['GET', 'POST', 'PATCH'].includes(req.method)) fail(405, 'Method not allowed.');
      if (req.method !== 'GET') {
        if (req.headers.get('origin') !== url.origin || req.headers.get('sec-fetch-site') === 'cross-site') fail(403, 'Open Guardian Permits in the same browser tab and try again.');
        const length = Number(req.headers.get('content-length') || 0);
        if (length > MAX_FILE_BYTES + 32_768) fail(413, 'Choose a file up to 4 MB.');
      }
      const staff = await getStaff(req, context);
      const store = getStore(context);
      const isStaff = Boolean(staff?.id && staff.confirmedAt && staff.roles?.includes('permits-staff'));
      const requireStaff = () => { if (!isStaff) fail(403, 'A Guardian Permits staff account is required.'); };
      const body = async () => {
        const s = await req.text(); if (s.length > 65_536) fail(413, 'Request is too large.');
        try { const value = JSON.parse(s); if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'Request must be an object.'); return value; } catch { fail(400, 'Request could not be read.'); }
      };
      const audit = async (kind, caseId = '') => store.setJSON(`audit/${now().toISOString()}/${randomUUID()}`, { kind, caseId, actor: isStaff ? staff.id : 'client', at: now().toISOString() });
      const newCode = async c => {
        const code = randomBytes(16).toString('hex'); const codeHash = hash(code);
        await store.setJSON(`codes/${codeHash}`, { caseId: c.id });
        return { code, codeHash };
      };
      if (action === 'session' && req.method === 'GET') {
        if (isStaff) {
          let ownCase = null; try { ownCase = publicCase(await client(store, req)); } catch (error) { if (!(error instanceof HttpError && error.status === 401)) throw error; }
          return response({ staff: { email: staff.email }, case: ownCase, statuses: STATUSES, counties: COUNTIES });
        }
        try { return response({ case: publicCase(await client(store, req)) }); }
        catch (error) { if (error instanceof HttpError && error.status === 401) return response({ staff: null, case: null }); throw error; }
      }
      if (action === 'login' && req.method === 'POST') {
        const { code } = await body(); const normalized = cleanCode(code);
        if (!/^[a-f0-9]{32}$/.test(normalized)) fail(401, 'Code unavailable. Check the code or contact GGS.');
        const lookup = await store.get(`codes/${hash(normalized)}`, { type: 'json' });
        const c = lookup && await store.get(`cases/${lookup.caseId}`, { type: 'json' });
        if (!c?.accessEnabled || c.codeHash !== hash(normalized) || !Number.isFinite(Date.parse(c.accessExpiresAt)) || Date.parse(c.accessExpiresAt) <= now().getTime()) fail(401, 'Code unavailable. Check the code or contact GGS.');
        const raw = token(); const expiresAt = new Date(Math.min(now().getTime() + 8 * 3600_000, Date.parse(c.accessExpiresAt))).toISOString();
        await store.setJSON(`sessions/${hash(raw)}`, { caseId: c.id, codeHash: c.codeHash, expiresAt });
        await audit('client-sign-in', c.id);
        return response({ case: publicCase(c) }, 200, { 'Set-Cookie': `__Host-ggs-permits=${raw}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.floor((Date.parse(expiresAt)-now().getTime())/1000)}` });
      }
      if (action === 'logout' && req.method === 'POST') {
        const raw = (req.headers.get('cookie') || '').split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-ggs-permits='))?.slice('__Host-ggs-permits='.length);
        if (raw && /^[a-f0-9]{48}$/.test(raw)) await store.setJSON(`sessions/${hash(raw)}`, { expiresAt: now().toISOString() });
        return response({ ok: true }, 200, { 'Set-Cookie': '__Host-ggs-permits=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0' });
      }
      if (action === 'jurisdictions') {
        requireStaff();
        if (req.method === 'GET') return response({ jurisdictions: (await list(store, 'jurisdictions/')).sort((a,b) => a.county.localeCompare(b.county) || a.name.localeCompare(b.name)) });
        if (req.method === 'POST') { const input = await body(); const j = { ...validateJurisdiction(input), id: randomUUID(), createdAt: now().toISOString() }; await store.setJSON(`jurisdictions/${j.id}`, j); await audit('jurisdiction-created'); return response({ jurisdiction: j }, 201); }
        if (req.method === 'PATCH') {
          const input = await body(); if (!/^[a-f0-9-]{36}$/.test(input.id || '')) fail(400, 'Select a valid jurisdiction.');
          const fields = validateJurisdiction(input);
          const j = await mutate(store, `jurisdictions/${input.id}`, current=>({ ...current, ...fields, updatedAt: now().toISOString() }));
          await audit('jurisdiction-updated'); return response({ jurisdiction: j });
        }
      }
      if (action === 'cases') {
        requireStaff();
        if (req.method === 'GET') return response({ cases: (await list(store, 'cases/')).map(c => ({ ...publicCase(c), internalNotes: c.internalNotes, permitNumber: c.permitNumber, inspectionDate: c.inspectionDate, clientEmail: c.clientEmail, jurisdictionId: c.jurisdictionId })).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)) });
        if (req.method === 'POST') {
          const input = await body(); const j = await store.get(`jurisdictions/${text(input.jurisdictionId)}`, { type: 'json' });
          if (!j) fail(400, 'Select a jurisdiction profile first.');
          const months = Number(input.months ?? 3); if (!Number.isInteger(months) || months < 1 || months > 12) fail(400, 'Choose access lasting 1–12 months.');
          if (!text(input.clientName) || !text(input.address, 300)) fail(400, 'Client name and project address are required.');
          const c = { id: randomUUID(), reference: text(input.reference) || `GP-${now().getUTCFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`, clientName: text(input.clientName), clientEmail: text(input.clientEmail, 254), address: text(input.address, 300), jurisdictionId: j.id, jurisdiction: { name: j.name, county: j.county, municipality: j.municipality, authorityType: j.authorityType, portalUrl: j.portalUrl }, requirements: j.requirements.map(r => ({ ...r, review: 'Requested', staffNote: '' })), status: STATUSES[0], clientMessage: text(input.clientMessage, 1500), internalNotes: '', permitNumber: '', inspectionDate: '', accessEnabled: true, accessExpiresAt: addMonths(now(), months), createdAt: now().toISOString(), updatedAt: now().toISOString(), revision: 1 };
          const code = await newCode(c); c.codeHash = code.codeHash; await store.setJSON(`cases/${c.id}`, c); await audit('case-created', c.id);
          return response({ case: publicCase(c), code: code.code.match(/.{4}/g).join('-') }, 201);
        }
      }
      const caseId = url.searchParams.get('caseId');
      if (caseId && !/^[a-f0-9-]{36}$/.test(caseId)) fail(400, 'Invalid case reference.');
      let c;
      if (isStaff && caseId) { c = await store.get(`cases/${caseId}`, { type: 'json' }); }
      else c = await client(store, req);
      if (!c) fail(404, 'Permit case not found.');
      if (caseId && c.id !== caseId) fail(403, 'This case is not assigned to your access code.');
      if (action === 'case' && req.method === 'PATCH') {
        requireStaff(); const input = await body();
        c = await mutate(store, `cases/${c.id}`, current => {
          if (current.revision !== Number(input.revision)) fail(409, 'This case changed. Refresh before saving.');
          if (!STATUSES.includes(input.status)) fail(400, 'Choose a valid permit stage.');
          return { ...current, status: input.status, clientMessage: text(input.clientMessage, 1500), internalNotes: text(input.internalNotes, 6000), permitNumber: text(input.permitNumber), inspectionDate: text(input.inspectionDate, 10), updatedAt: now().toISOString(), revision: current.revision + 1 };
        }); await audit('case-updated', c.id); return response({ case: publicCase(c) });
      }
      if (action === 'access' && req.method === 'POST') {
        requireStaff(); const input = await body(); let code;
        if (typeof input.enabled !== 'boolean') fail(400, 'Access enabled must be true or false.');
        if (input.enabled) { const months = Number(input.months ?? 3); if (!Number.isInteger(months) || months < 1 || months > 12) fail(400, 'Choose 1–12 months.'); code = await newCode(c); }
        c = await mutate(store, `cases/${c.id}`, current => ({ ...current, accessEnabled: input.enabled, ...(code ? { codeHash: code.codeHash, accessExpiresAt: addMonths(now(), Number(input.months ?? 3)) } : {}), revision: current.revision + 1, updatedAt: now().toISOString() }));
        await audit(code ? 'access-renewed' : 'access-revoked', c.id); return response({ case: publicCase(c), ...(code ? { code: code.code.match(/.{4}/g).join('-') } : {}) });
      }
      if (action === 'files' && req.method === 'GET') return response({ files: (await list(store, `files/${c.id}/`)).sort((a,b) => b.uploadedAt.localeCompare(a.uploadedAt)) });
      if (action === 'upload' && req.method === 'POST') {
        const form = await req.formData(); const file = form.get('file'), itemId = text(form.get('itemId'));
        if (!file || typeof file.arrayBuffer !== 'function') fail(400, 'Choose a document.');
        if (!c.requirements.some(r => r.id === itemId)) fail(400, 'Choose a document from this case’s checklist.');
        if (file.size > MAX_FILE_BYTES) fail(400, 'Choose a file up to 4 MB.');
        const bytes = Buffer.from(await file.arrayBuffer()); const info = validateFile(file.name, file.type, bytes);
        // Unique keys avoid overwriting another file. Contents are never published as static assets.
        const id = randomUUID(); const fileKey = `contents/${c.id}/${id}`;
        const entry = { id, caseId: c.id, itemId, ...info, size: bytes.length, sha256: hash(bytes), uploadedAt: now().toISOString(), uploadedBy: isStaff ? 'GGS staff' : 'Client' };
        const existing = await store.list({ prefix: `files/${c.id}/` }); if (existing.blobs.length >= 100) fail(400, 'This case has reached its file limit. Contact GGS.');
        await store.set(fileKey, bytes); await store.setJSON(`files/${c.id}/${id}`, entry);
        // Every replacement or additional document requires a fresh staff review.
        await mutate(store, `cases/${c.id}`, current => ({ ...current, requirements: current.requirements.map(r => r.id === itemId ? { ...r, review: 'Received' } : r), revision: current.revision + 1, updatedAt: now().toISOString() }), 3);
        await audit('document-uploaded', c.id); return response({ file: entry }, 201);
      }
      if (action === 'download' && req.method === 'GET') {
        const id = url.searchParams.get('fileId'); if (!/^[a-f0-9-]{36}$/.test(id || '')) fail(404, 'Document not found.');
        const file = await store.get(`files/${c.id}/${id}`, { type: 'json' });
        if (!file || file.caseId !== c.id) fail(404, 'Document not found.');
        const data = await store.get(`contents/${c.id}/${id}`, { type: 'arrayBuffer' }); if (!data) fail(404, 'Document not found.');
        await audit('document-downloaded', c.id);
        return new Response(data, { headers: { 'Content-Type': file.type, 'Content-Disposition': `attachment; filename="document.${file.name.split('.').pop()}"; filename*=UTF-8''${encodeURIComponent(file.name)}`, 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'" } });
      }
      if (action === 'review' && req.method === 'POST') {
        requireStaff(); const input = await body();
        if (!['Requested', 'Received', 'Accepted', 'Needs correction'].includes(input.review)) fail(400, 'Choose a review status.');
        c = await mutate(store, `cases/${c.id}`, current => {
          if (current.revision !== Number(input.revision)) fail(409, 'This case changed. Refresh before saving the document review.');
          if (!current.requirements.some(r=>r.id===input.itemId)) fail(400, 'Unknown document requirement.');
          return { ...current, requirements: current.requirements.map(r => r.id === input.itemId ? { ...r, review: input.review, staffNote: text(input.staffNote, 800) } : r), revision: current.revision + 1, updatedAt: now().toISOString() };
        }); await audit('document-reviewed', c.id); return response({ case: publicCase(c) });
      }
      fail(404, 'Action not found.');
    } catch (error) {
      return response({ error: error instanceof HttpError ? error.message : 'Guardian Permits is not available right now. Please try again or contact GGS.' }, error instanceof HttpError ? error.status : 503);
    }
  };
}
