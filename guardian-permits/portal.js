const API = '/.netlify/functions/guardian-permits';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = value => value ? new Date(value).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric',timeZone:'America/New_York'}) : 'Not set';
const isStaffPage = document.body.dataset.page === 'staff';
let cases=[], jurisdictions=[], counties=[], statuses=[], activeCase=null, allFiles=[];
const notify = (text, error=false) => { $('message').textContent=text; $('message').hidden=!text; $('message').classList.toggle('error',error); };
async function api(action, {method='GET', data, form, caseId, fileId}={}) {
  const url=new URL(API,location.origin);url.searchParams.set('action',action);
  if(caseId)url.searchParams.set('caseId',caseId);if(fileId)url.searchParams.set('fileId',fileId);
  const res=await fetch(url,{method,credentials:'same-origin',cache:'no-store',headers:data?{'Content-Type':'application/json'}:{},body:form || (data?JSON.stringify(data):undefined)});
  let body;try{body=await res.json();}catch{throw new Error('Guardian Permits is not available on this address yet. Contact GGS for the current portal link.');}
  if(!res.ok)throw new Error(body.error||'Please try again.');return body;
}
function options(values, selected='') { return values.map(v=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(v)}</option>`).join(''); }
function downloadURL(c,f){return `${API}?action=download&caseId=${encodeURIComponent(c.id)}&fileId=${encodeURIComponent(f.id)}`;}
function tag(value){return `<span class="tag ${value==='Accepted'||value==='Complete'?'good':value==='Needs correction'?'warn':''}">${esc(value)}</span>`;}
function codeDialog(code,c) {
  $('dialog-title').textContent='Client access is ready';
  const invitation=`Guardian Permits — Guardian Gas Solutions LLC\n\nHello ${c.clientName},\nYour private permit portal is ready.\n\nPortal: ${location.origin}/guardian-permits/\nAccess code: ${code}\nCode expires: ${date(c.accessExpiresAt)}\nProject: ${c.address}\nJurisdiction: ${c.jurisdiction.name}, ${c.jurisdiction.county} County\n\nKeep this code private. Use the checklist inside your portal to upload the documents requested by GGS.\nQuestions? info@goguardiangas.com | (877) 410-2195`;
  $('dialog-content').innerHTML=`<p>Copy this code now and share it privately with the assigned client. It will not be displayed again.</p><div class="code-card"><span class="fine">PRIVATE CLIENT CODE</span><code>${esc(code)}</code><p class="fine">Expires ${date(c.accessExpiresAt)}. Renewing replaces previous codes and sessions.</p></div><label for="invitation-text">Ready-to-copy invitation</label><textarea id="invitation-text" rows="12" readonly>${esc(invitation)}</textarea><button class="primary" id="copy-invitation">Copy invitation</button><p id="copy-status" class="fine" role="status"></p>`;
  $('copy-invitation').onclick=async()=>{try{await navigator.clipboard.writeText(invitation);$('copy-status').textContent='Invitation copied.';}catch{$('invitation-text').select();$('copy-status').textContent='Select and copy the invitation above.';}};
  if(!$('editor-dialog').open)$('editor-dialog').showModal();
}
function heading(c){return `<div class="case-heading"><div class="workspace-toolbar"><div><p class="eyebrow">${esc(c.reference)}</p><h2>${esc(c.clientName)}</h2><p class="muted">${esc(c.address)}</p></div>${tag(c.status)}</div><div class="case-meta"><div><span>County</span>${esc(c.jurisdiction.county)} County</div><div><span>Permitting authority</span>${esc(c.jurisdiction.name)}</div><div><span>Client access expires</span>${date(c.accessExpiresAt)}${!c.accessEnabled?' · Revoked':''}</div></div></div>`;}
function documentCard(c,r,files,staff){
  const list=files.filter(f=>f.itemId===r.id);
  return `<article class="document"><div class="document-heading"><h3>${esc(r.name)} ${r.required?'':'<span class="fine">(Optional)</span>'}</h3>${tag(r.review)}</div>${r.instructions?`<p>${esc(r.instructions)}</p>`:''}${r.staffNote?`<p class="feedback"><strong>GGS feedback:</strong> ${esc(r.staffNote)}</p>`:''}<ul class="file-list">${list.map(f=>`<li><a href="${downloadURL(c,f)}">${esc(f.name)} <span class="fine">↓</span></a><small>${(f.size/1024).toFixed(0)} KB · ${date(f.uploadedAt)} · ${esc(f.uploadedBy)}</small></li>`).join('')}</ul><form class="upload-zone" data-upload="${esc(r.id)}"><label for="file-${r.id}">${list.length?'Add another document':'Drop a document here or choose a file'}</label><input id="file-${r.id}" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required><span class="fine">PDF, JPG, PNG, or WebP · Up to 4 MB per file</span><button type="submit" class="secondary">Upload document</button><p class="fine upload-status" role="status"></p></form>${staff?`<form class="review-form" data-review="${esc(r.id)}"><label for="review-${r.id}">GGS review</label><select id="review-${r.id}" name="review">${options(['Requested','Received','Accepted','Needs correction'],r.review)}</select><label for="feedback-${r.id}">Feedback visible to the client</label><textarea id="feedback-${r.id}" name="staffNote" maxlength="800">${esc(r.staffNote)}</textarea><button class="ghost">Save review</button></form>`:''}</article>`;
}
function wireDocuments(container,c,staff){
  container.querySelectorAll('[data-upload]').forEach(form=>{
    const input=form.querySelector('input');
    for(const type of ['dragenter','dragover'])form.addEventListener(type,e=>{e.preventDefault();form.classList.add('dragging');});
    for(const type of ['dragleave','drop'])form.addEventListener(type,e=>{e.preventDefault();form.classList.remove('dragging');});
    form.addEventListener('drop',e=>{if(e.dataTransfer.files.length){input.files=e.dataTransfer.files;form.querySelector('.upload-status').textContent='File selected. Select Upload document to send it.';}});
    form.addEventListener('submit',async e=>{
      e.preventDefault();const file=input.files[0],status=form.querySelector('.upload-status'),button=form.querySelector('button');
      if(!file)return;if(file.size>4*1024*1024){status.textContent='This file is larger than 4 MB. Please reduce its size or contact GGS.';return;}
      button.disabled=true;status.textContent='Uploading… Please keep this page open.';
      try{const data=new FormData();data.append('file',file);data.append('itemId',form.dataset.upload);await api('upload',{method:'POST',form:data,caseId:c.id});if(staff)await openCase(c.id);else await loadClient();notify('Document received by GGS. It is awaiting review.');}
      catch(error){status.textContent=error.message;notify(error.message,true);}finally{button.disabled=false;}
    });
  });
  container.querySelectorAll('[data-review]').forEach(form=>form.addEventListener('submit',async e=>{
    e.preventDefault();const button=form.querySelector('button');button.disabled=true;
    try{await api('review',{method:'POST',caseId:c.id,data:{itemId:form.dataset.review,review:form.elements.review.value,staffNote:form.elements.staffNote.value}});await refreshCases();await openCase(c.id);notify('Document review saved.');}
    catch(error){notify(error.message,true);}finally{button.disabled=false;}
  }));
}
async function loadClient(){
  const data=await api('session');if(!data.case){$('client-case').hidden=true;$('login-panel').hidden=false;$('welcome-steps').hidden=false;$('client-logout').hidden=true;document.body.classList.remove('is-authenticated');return;}
  const c=data.case, {files}=await api('files');const accepted=c.requirements.filter(r=>r.review==='Accepted').length;
  $('login-panel').hidden=true;$('welcome-steps').hidden=true;$('client-logout').hidden=false;document.body.classList.add('is-authenticated');
  const container=$('client-case');container.hidden=false;
  container.innerHTML=`${heading(c)}<div class="requirements-summary"><strong>${accepted} of ${c.requirements.length} accepted</strong><div class="progress-track" role="progressbar" aria-label="Documents accepted by GGS" aria-valuemin="0" aria-valuemax="${c.requirements.length}" aria-valuenow="${accepted}"><span style="width:${c.requirements.length?accepted/c.requirements.length*100:0}%"></span></div><p class="fine">Files remain pending until reviewed by GGS.</p></div><div class="case-layout"><div class="documents">${c.requirements.map(r=>documentCard(c,r,files,false)).join('')}</div><aside class="sidebar"><section class="panel client-note"><h3>Your next step</h3><p>${esc(c.clientMessage||'Please upload the documents in your checklist. GGS will review them and let you know if anything needs attention.')}</p></section><section class="panel"><h3>Your access code</h3><p>Access ends on <strong>${date(c.accessExpiresAt)}</strong>. Contact GGS if you need more time.</p><p class="fine">Your documents remain in the GGS permit record after your code expires. Code expiration does not delete the record.</p></section><section class="panel"><h3>Need help with a document?</h3><p>Contact Guardian Gas Solutions LLC and include your case reference: <strong>${esc(c.reference)}</strong>.</p><a href="mailto:info@goguardiangas.com">Email the permit team</a></section></aside></div>`;
  wireDocuments(container,c,false);
}
if(!isStaffPage){
  $('code-form').addEventListener('submit',async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;notify('Checking your access code…');try{await api('login',{method:'POST',data:{code:$('access-code').value}});$('access-code').value='';await loadClient();notify('Your private permit case is open.');$('client-case').scrollIntoView({block:'start',behavior:'instant'});}catch(error){notify(error.message,true);}finally{button.disabled=false;}});
  $('client-logout').onclick=async()=>{try{await api('logout',{method:'POST',data:{}});await loadClient();notify('You have signed out.');}catch(error){notify(error.message,true);}};
  loadClient().catch(error=>notify(error.message,true));
} else {
  $('close-dialog').onclick=()=>$('editor-dialog').close();
  $('editor-dialog').addEventListener('click',e=>{if(e.target===$('editor-dialog'))$('editor-dialog').close();});
  $('cases-tab').onclick=()=>view('cases');$('jurisdictions-tab').onclick=()=>view('jurisdictions');
  for(const id of ['case-search','county-filter','status-filter'])$(id).addEventListener('input',renderCases);
  $('new-jurisdiction').onclick=jurisdictionDialog;$('new-case').onclick=newCaseDialog;
  window.addEventListener('guardian-staff-auth',()=>loadStaff().catch(e=>notify(e.message,true)));
  loadStaff().catch(e=>notify(e.message,true));
}
function view(name){$('cases-view').hidden=name!=='cases';$('jurisdictions-view').hidden=name!=='jurisdictions';for(const value of ['cases','jurisdictions']){$(`${value}-tab`).classList.toggle('selected',value===name);$(`${value}-tab`).setAttribute('aria-pressed',String(value===name));}}
async function loadStaff(){
  const result=await api('session');
  if(!result.staff){$('staff-workspace').hidden=true;$('staff-login').hidden=false;return;}
  counties=result.counties;statuses=result.statuses;$('staff-login').hidden=true;$('staff-logout').hidden=false;$('staff-workspace').hidden=false;$('staff-account').textContent=result.staff.email;
  $('county-filter').innerHTML='<option value="">All counties</option>'+options(counties);$('status-filter').innerHTML='<option value="">All stages</option>'+options(statuses);
  await Promise.all([refreshCases(),refreshJurisdictions()]);
}
async function refreshCases(){cases=(await api('cases')).cases;renderCases();}
function renderCases(){
  const filtered=cases.filter(c=>(!$('county-filter').value||c.jurisdiction.county===$('county-filter').value)&&(!$('status-filter').value||c.status===$('status-filter').value)&&`${c.clientName} ${c.address} ${c.reference}`.toLowerCase().includes($('case-search').value.toLowerCase()));
  $('metrics').innerHTML=[[cases.length,'Total permit cases'],[cases.filter(c=>c.status==='Collecting documents').length,'Collecting documents'],[cases.filter(c=>['Ready for review','Corrections requested'].includes(c.status)).length,'Needs GGS attention'],[cases.filter(c=>c.accessEnabled&&Date.parse(c.accessExpiresAt)>Date.now()).length,'Active client codes']].map(([n,label])=>`<div class="metric"><strong>${n}</strong><span>${esc(label)}</span></div>`).join('');
  $('case-list').innerHTML=filtered.length?filtered.map(c=>`<article class="case-card"><div><span class="reference">${esc(c.reference)}</span><h3>${esc(c.clientName)}</h3><p class="fine">${esc(c.address)}</p><p class="fine">${esc(c.jurisdiction.name)} · ${esc(c.jurisdiction.county)} County</p></div><div><p>${tag(c.status)}</p><p class="fine">Code: ${c.accessEnabled&&Date.parse(c.accessExpiresAt)>Date.now()?`expires ${date(c.accessExpiresAt)}`:'inactive'}</p><button class="ghost" data-case="${esc(c.id)}">Open case →</button></div></article>`).join(''):`<div class="empty"><h3>${cases.length?'No matching cases':'Your permit workspace starts here.'}</h3><p>${cases.length?'Try another search or filter.':'Add a jurisdiction checklist, then create a permit case for your client.'}</p></div>`;
  document.querySelectorAll('[data-case]').forEach(b=>b.onclick=()=>openCase(b.dataset.case).catch(e=>notify(e.message,true)));
}
async function refreshJurisdictions(){jurisdictions=(await api('jurisdictions')).jurisdictions;$('jurisdiction-list').innerHTML=jurisdictions.length?jurisdictions.map(j=>`<article class="panel"><span class="badge">${esc(j.county)} COUNTY</span><h3>${esc(j.name)}</h3><p>${j.authorityType==='county'?'County permitting authority':'Municipal permitting authority'}</p><p>${j.requirements.length} requested document categories</p><p class="fine">Requirements checked: ${j.verifiedOn?esc(j.verifiedOn):'Not recorded'}</p>${j.portalUrl?`<a href="${esc(j.portalUrl)}" target="_blank" rel="noopener noreferrer">Jurisdiction website ↗</a>`:''}</article>`).join(''):'<div class="empty"><h3>No jurisdictions added yet.</h3><p>Create the first GGS checklist using the current requirements from the appropriate permitting office.</p></div>';}
function jurisdictionDialog(){
  $('dialog-title').textContent='Add a jurisdiction checklist';
  $('dialog-content').innerHTML=`<form id="jurisdiction-form"><div class="form-grid"><label>Florida county<select name="county" required><option value="">Select county</option>${options(counties)}</select></label><label>Permitting authority<select name="authorityType"><option value="county">County / unincorporated</option><option value="municipality">City or municipality</option></select></label><label class="wide">Municipality name (for city permits)<input name="municipality" maxlength="180" placeholder="For example, City of Winter Garden"></label><label class="wide">Jurisdiction permit website (optional)<input name="portalUrl" type="url" placeholder="https://…" maxlength="500"></label><label>Requirements checked on<input name="verifiedOn" type="date"></label><label class="wide">Requested documents — one per line<textarea name="requirements" rows="7" required placeholder="Permit application | Instructions for the client\nOwner authorization\nSite plan / gas system layout"></textarea></label></div><p class="fine">Enter only the requirements you have confirmed for this jurisdiction. Each line becomes a separate upload category. Add optional instructions after a | character.</p><button class="primary">Save jurisdiction checklist</button><p class="form-status fine" role="status"></p></form>`;
  $('jurisdiction-form').onsubmit=async e=>{e.preventDefault();const f=e.target,button=f.querySelector('button');button.disabled=true;try{const data=Object.fromEntries(new FormData(f));data.requirements=data.requirements.split('\n').filter(x=>x.trim()).map(line=>{const [name,...instructions]=line.split('|');return {name:name.trim(),instructions:instructions.join('|').trim()};});await api('jurisdictions',{method:'POST',data});await refreshJurisdictions();$('editor-dialog').close();notify('Jurisdiction checklist added. It can now be assigned to a permit case.');}catch(error){f.querySelector('.form-status').textContent=error.message;}finally{button.disabled=false;}};
  $('editor-dialog').showModal();
}
function newCaseDialog(){
  if(!jurisdictions.length){view('jurisdictions');notify('Add a jurisdiction checklist before creating a permit case.');jurisdictionDialog();return;}
  $('dialog-title').textContent='Create a permit case';
  $('dialog-content').innerHTML=`<form id="new-case-form"><div class="form-grid"><label>Client / owner name<input name="clientName" maxlength="180" required></label><label>Client email (optional)<input name="clientEmail" type="email" maxlength="254"></label><label class="wide">Project address<input name="address" maxlength="300" required></label><label class="wide">Permitting jurisdiction<select name="jurisdictionId" required>${jurisdictions.map(j=>`<option value="${j.id}">${esc(j.county)} County — ${esc(j.name)}</option>`).join('')}</select></label><label>Case reference (optional)<input name="reference" maxlength="180" placeholder="Auto-generated if blank"></label><label>Client code duration<select name="months">${[1,2,3,6,12].map(n=>`<option value="${n}" ${n===3?'selected':''}>${n} month${n===1?'':'s'}</option>`).join('')}</select></label><label class="wide">First message to the client<textarea name="clientMessage" maxlength="1500" placeholder="Explain what the client should upload first."></textarea></label></div><p class="fine">The selected jurisdiction checklist is copied into this case. The client code grants access only to this case. You choose how to share it.</p><button class="primary">Create case &amp; generate code</button><p class="form-status fine" role="status"></p></form>`;
  $('new-case-form').onsubmit=async e=>{e.preventDefault();const f=e.target,button=f.querySelector('button');button.disabled=true;try{const result=await api('cases',{method:'POST',data:Object.fromEntries(new FormData(f))});await refreshCases();codeDialog(result.code,result.case);}catch(error){f.querySelector('.form-status').textContent=error.message;}finally{button.disabled=false;}};
  $('editor-dialog').showModal();
}
async function openCase(id){
  activeCase=cases.find(c=>c.id===id);if(!activeCase)throw new Error('Refresh the case list and try again.');const c=activeCase;
  allFiles=(await api('files',{caseId:id})).files;
  const container=$('case-detail');container.hidden=false;
  container.innerHTML=`<div class="actions"><button id="back-to-cases" class="ghost">← Back to cases</button><button id="print-case" class="ghost">Print case summary</button>${c.jurisdiction.portalUrl?`<a class="ghost" href="${esc(c.jurisdiction.portalUrl)}" target="_blank" rel="noopener noreferrer">Open jurisdiction website ↗</a>`:''}</div>${heading(c)}<div class="case-layout"><div class="documents"><h2>Document checklist</h2>${c.requirements.map(r=>documentCard(c,r,allFiles,true)).join('')}</div><aside class="sidebar"><section class="panel"><h3>Permit processing</h3><form id="case-update" class="staff-detail-form"><label>Permit stage<select name="status">${options(statuses,c.status)}</select></label><label>Jurisdiction permit number<input name="permitNumber" maxlength="180" value="${esc(c.permitNumber)}"></label><label>Inspection date<input type="date" name="inspectionDate" value="${esc(c.inspectionDate)}"></label><label>Next step visible to the client<textarea name="clientMessage" maxlength="1500">${esc(c.clientMessage)}</textarea></label><label>Internal GGS notes<textarea name="internalNotes" maxlength="6000">${esc(c.internalNotes)}</textarea></label><p class="fine">Internal notes and permit administration fields are visible only to staff.</p><button class="primary">Save case progress</button></form></section><section class="panel"><h3>Client access</h3><p>${c.accessEnabled?`Code expires ${date(c.accessExpiresAt)}.`:'Client access is revoked.'}</p><label for="renew-months">New code duration</label><select id="renew-months">${[1,2,3,6,12].map(n=>`<option value="${n}" ${n===3?'selected':''}>${n} months</option>`).join('')}</select><button id="renew-code" class="secondary">Renew &amp; replace code</button><p class="fine">Replacing the code ends access from old codes and sessions. Existing documents remain in the case.</p>${c.accessEnabled?'<button id="revoke-code" class="ghost danger">Revoke client access</button>':''}</section></aside></div>`;
  $('case-list').hidden=true;document.querySelector('.filter-row').hidden=true;
  $('back-to-cases').onclick=()=>{container.hidden=true;$('case-list').hidden=false;document.querySelector('.filter-row').hidden=false;};
  $('print-case').onclick=()=>window.print();
  $('case-update').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{await api('case',{method:'PATCH',caseId:id,data:{...Object.fromEntries(new FormData(e.target)),revision:c.revision}});await refreshCases();await openCase(id);notify('Permit progress saved.');}catch(error){notify(error.message,true);}finally{button.disabled=false;}};
  $('renew-code').onclick=async()=>{const button=$('renew-code');button.disabled=true;try{const result=await api('access',{method:'POST',caseId:id,data:{enabled:true,months:Number($('renew-months').value)}});await refreshCases();await openCase(id);codeDialog(result.code,result.case);}catch(error){notify(error.message,true);}finally{button.disabled=false;}};
  if($('revoke-code'))$('revoke-code').onclick=async()=>{const button=$('revoke-code');button.disabled=true;try{await api('access',{method:'POST',caseId:id,data:{enabled:false}});await refreshCases();await openCase(id);notify('Client access revoked. The permit record and documents remain available to staff.');}catch(error){notify(error.message,true);}finally{button.disabled=false;}};
  wireDocuments(container,c,true);
}
