import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './auth-config.js';

const configured = Boolean(SUPABASE_URL.trim() && SUPABASE_PUBLISHABLE_KEY.trim());
let client = null;
let currentUser = null;
const overlay = document.getElementById('authScreen');
const form = document.getElementById('authForm');
const title = document.getElementById('authTitle');
const subtitle = document.getElementById('authSubtitle');
const submit = document.getElementById('authSubmit');
const toggle = document.getElementById('authToggle');
const nameField = document.getElementById('authNameField');
const nameInput = document.getElementById('authName');
const errorBox = document.getElementById('authMessage');
const profileName = document.getElementById('profileName');
const profileAvatar = document.getElementById('profileAvatar');
const topAvatar = document.getElementById('topAvatar');
const profileMenu = document.getElementById('profileMenu');
let signup = false;

const initials = name => String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toLocaleUpperCase('pt-BR')).join('') || 'ME';
function showMessage(message, success = false) {
  errorBox.textContent = message;
  errorBox.classList.toggle('success', success);
  errorBox.hidden = !message;
}
function displayUser(user) {
  currentUser = user;
  const name = user?.user_metadata?.display_name?.trim() || user?.email?.split('@')[0] || 'Meu perfil';
  profileName.textContent = name;
  profileAvatar.textContent = initials(name);
  topAvatar.textContent = initials(name);
  overlay.hidden = Boolean(user);
  document.body.classList.toggle('auth-locked', !user);
  profileMenu.hidden = true;
}
function setMode(register) {
  signup = register;
  title.textContent = signup ? 'Crie sua conta' : 'Bem-vindo de volta';
  subtitle.textContent = signup ? 'Organize seu cinema em um só lugar.' : 'Entre para acessar seu espaço de filmes.';
  submit.textContent = signup ? 'Criar conta' : 'Entrar';
  toggle.textContent = signup ? 'Já tem uma conta? Entrar' : 'Ainda não tem conta? Criar conta';
  nameField.hidden = !signup;
  nameInput.required = signup;
  document.getElementById('authPassword').autocomplete = signup ? 'new-password' : 'current-password';
  showMessage('');
}
toggle.addEventListener('click', () => setMode(!signup));
document.getElementById('profileMore').addEventListener('click', event => {
  event.stopPropagation();
  profileMenu.hidden = !profileMenu.hidden;
});
document.addEventListener('click', event => {
  if (!event.target.closest('.profile')) profileMenu.hidden = true;
});
document.getElementById('logoutButton').addEventListener('click', async () => {
  profileMenu.hidden = true;
  if (client) await client.auth.signOut();
  displayUser(null);
  form.reset();
  setMode(false);
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!client) return showMessage('Configure o Supabase em auth-config.js para ativar o login.');
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  if (password.length < 6) return showMessage('A senha deve ter pelo menos 6 caracteres.');
  submit.disabled = true;
  submit.textContent = 'Aguarde...';
  showMessage('');
  try {
    if (signup) {
      const name = nameInput.value.trim();
      if (name.length < 2) throw new Error('Informe seu nome com pelo menos 2 caracteres.');
      const { data, error } = await client.auth.signUp({ email, password, options: { data: { display_name: name } } });
      if (error) throw error;
      if (!data.session) showMessage('Conta criada! Verifique seu e-mail para confirmar o cadastro e depois entre.', true);
    } else {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (error) { showMessage(error.message || 'Não foi possível concluir a operação.'); }
  finally { submit.disabled = false; submit.textContent = signup ? 'Criar conta' : 'Entrar'; }
});

export async function initializeAuth() {
  displayUser(null);
  if (!configured) {
    showMessage('Login ainda não configurado: preencha SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY em auth-config.js.');
    submit.disabled = true;
    return;
  }
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    displayUser(session?.user || null);
    client.auth.onAuthStateChange((_event, sessionNext) => displayUser(sessionNext?.user || null));
  } catch (error) { showMessage('Não foi possível iniciar o login: ' + error.message); }
}

initializeAuth();
