// Identity returns invited staff to the project root. Keep sensitive tokens in the fragment.
if (/^#(?:invite_token|recovery_token|confirmation_token|access_token)=/.test(location.hash)) {
  location.replace('/guardian-permits/staff.html' + location.hash);
}
