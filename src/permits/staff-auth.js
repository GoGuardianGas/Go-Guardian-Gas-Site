import { login, logout, handleAuthCallback, acceptInvite, updateUser } from '@netlify/identity';
const $ = id => document.getElementById(id);
let invitation;
let recovery = false;
const message = value => { $('auth-message').textContent = value; };
const ready = () => window.dispatchEvent(new Event('guardian-staff-auth'));
$('staff-login-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.target.querySelector('button'); button.disabled = true;
  try { await login($('staff-email').value.trim(), $('staff-password').value); $('staff-password').value = ''; message('Signed in. Checking staff access…'); ready(); }
  catch { message('Sign-in could not be completed. Check your invited account and password, or contact GGS.'); }
  finally { button.disabled = false; }
});
$('staff-logout').addEventListener('click', async () => { try { await logout(); } finally { location.reload(); } });
$('invite-form').addEventListener('submit', async event => {
  event.preventDefault(); const button=event.target.querySelector('button');button.disabled=true;
  try { if (invitation) await acceptInvite(invitation, $('new-password').value); else if (recovery) await updateUser({ password: $('new-password').value }); $('new-password').value=''; $('invite-panel').hidden=true; $('staff-login').hidden=false; message('Account updated. Sign in to continue.'); ready(); }
  catch { $('message').hidden=false; $('message').textContent='The invitation or recovery link could not be completed. Please request a new link from GGS.'; }
  finally { button.disabled=false; }
});
try {
  const callback = await handleAuthCallback();
  if (callback?.type === 'invite' && callback.token) { invitation=callback.token; $('invite-panel').hidden=false; $('staff-login').hidden=true; }
  else if (callback?.type === 'recovery') { recovery=true; $('invite-title').textContent='Reset your staff password'; $('invite-panel').hidden=false; $('staff-login').hidden=true; }
  else ready();
} catch { message('This sign-in link may have expired. Please ask GGS for a new invitation.'); }
