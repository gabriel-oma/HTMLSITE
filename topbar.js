import { library } from './biblioteca.js';
import { getActiveUser, signOut, updateDisplayName } from './auth.js';

const notificationToggle = document.getElementById('notificationToggle');
const notificationPanel = document.getElementById('notificationPanel');
const notificationDot = document.getElementById('notificationDot');
const notificationList = document.getElementById('notificationList');
const notificationMarkRead = document.getElementById('notificationMarkRead');
const avatarToggle = document.getElementById('topAvatar');
const accountPanel = document.getElementById('accountPanel');
const accountName = document.getElementById('accountMenuName');
const accountEmail = document.getElementById('accountMenuEmail');
const accountAvatar = document.getElementById('accountMenuAvatar');
const profileDialog = document.getElementById('profileEditDialog');
const profileForm = document.getElementById('profileEditForm');
const profileInput = document.getElementById('profileEditName');
const profileError = document.getElementById('profileEditError');
const profileSave = document.getElementById('profileEditSave');
let diaryEntries = [];

const initials = name => String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toLocaleUpperCase('pt-BR')).join('') || 'ME';

function userName() {
  const user = getActiveUser();
  return user?.user_metadata?.display_name?.trim() || user?.email?.split('@')[0] || 'Meu perfil';
}

function feedback(message, error = false) {
  const region = document.getElementById('toastRegion');
  if (!region) return;
  const element = document.createElement('div');
  element.className = `toast${error ? ' toast-error' : ''}`;
  element.setAttribute('role', error ? 'alert' : 'status');
  element.textContent = message;
  region.append(element);
  setTimeout(() => element.remove(), 3500);
}

function closePanels() {
  notificationPanel.hidden = true;
  accountPanel.hidden = true;
  notificationToggle.setAttribute('aria-expanded', 'false');
  avatarToggle.setAttribute('aria-expanded', 'false');
}

function togglePanel(panel, trigger) {
  const opening = panel.hidden;
  closePanels();
  if (opening) {
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
  }
}

function recentEvents() {
  if (!getActiveUser()) return [];
  const knownMovies = [...library.getAll(), ...library.get('favorites'), ...library.get('watched')];
  const localEvents = library.getActivity().map(entry => {
    const date = Date.parse(entry.createdAt || '');
    const movie = knownMovies.find(item => String(item.id) === String(entry.movieId));
    const title = entry.movieTitle || movie?.title || 'Filme atualizado';
    const routes = { favorite: 'favoritos', rated: 'avaliacoes', watched: 'biblioteca' };
    return {
      date,
      title,
      description: entry.detail || 'Atualização na sua biblioteca',
      route: routes[entry.type] || 'biblioteca',
      icon: entry.type === 'favorite' ? 'heart' : entry.type === 'rated' ? 'star' : 'check-circle-2',
    };
  });
  const diaryEvents = diaryEntries.map(entry => ({
    date: Date.parse(entry.created_at || ''),
    title: entry.movie_title || 'Filme registrado',
    description: 'Adicionado ao Diário na Nuvem',
    route: 'diario',
    icon: 'notebook-pen',
  }));
  return [...localEvents, ...diaryEvents]
    .filter(item => Number.isFinite(item.date))
    .sort((a, b) => b.date - a.date)
    .slice(0, 20);
}

function renderNotifications() {
  const events = recentEvents();
  const readAt = library.getNotificationReadAt();
  const unread = events.filter(item => item.date > readAt).length;
  notificationDot.hidden = unread === 0;
  notificationToggle.setAttribute('aria-label', unread ? `Notificações: ${unread} não lidas` : 'Abrir notificações');
  notificationMarkRead.disabled = unread === 0;
  notificationList.replaceChildren();
  if (!events.length) {
    const empty = document.createElement('div');
    empty.className = 'notification-empty';
    empty.innerHTML = '<i data-lucide="bell-off"></i><strong>Nenhuma atividade recente</strong><p>Seus registros no diário, favoritos e avaliações aparecerão aqui.</p>';
    notificationList.append(empty);
  } else {
    for (const item of events) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `notification-item${item.date > readAt ? ' notification-unread' : ''}`;
      button.dataset.notificationRoute = item.route;
      const icon = document.createElement('span');
      icon.className = 'notification-item-icon';
      icon.innerHTML = `<i data-lucide="${item.icon}"></i>`;
      const content = document.createElement('span');
      content.className = 'notification-item-content';
      const title = document.createElement('strong');
      title.textContent = item.title;
      const description = document.createElement('span');
      description.textContent = item.description;
      const time = document.createElement('time');
      time.dateTime = new Date(item.date).toISOString();
      time.textContent = new Date(item.date).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      content.append(title, description, time);
      button.append(icon, content);
      notificationList.append(button);
    }
  }
  window.lucide?.createIcons();
}

function renderAccount() {
  const user = getActiveUser();
  const name = userName();
  accountName.textContent = name;
  accountEmail.textContent = user?.email || '';
  accountAvatar.textContent = initials(name);
}

notificationToggle.addEventListener('click', () => {
  renderNotifications();
  togglePanel(notificationPanel, notificationToggle);
});

avatarToggle.addEventListener('click', () => {
  renderAccount();
  togglePanel(accountPanel, avatarToggle);
});

notificationMarkRead.addEventListener('click', () => {
  library.markNotificationsRead();
  renderNotifications();
});

notificationList.addEventListener('click', event => {
  const item = event.target.closest('[data-notification-route]');
  if (!item) return;
  closePanels();
  location.hash = item.dataset.notificationRoute;
});

document.getElementById('accountOpenDiary').addEventListener('click', () => {
  closePanels();
  location.hash = 'diario';
});

document.getElementById('accountLogout').addEventListener('click', async event => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await signOut();
    closePanels();
    diaryEntries = [];
    renderNotifications();
  } catch (error) {
    feedback(error.message || 'Não foi possível sair da conta.', true);
  } finally {
    button.disabled = false;
  }
});

document.getElementById('accountEditName').addEventListener('click', () => {
  closePanels();
  profileInput.value = userName();
  profileError.hidden = true;
  profileError.textContent = '';
  profileDialog.showModal();
  profileInput.focus();
  profileInput.select();
});

document.getElementById('profileEditCancel').addEventListener('click', () => profileDialog.close());
profileDialog.addEventListener('click', event => { if (event.target === profileDialog) profileDialog.close(); });

profileForm.addEventListener('submit', async event => {
  event.preventDefault();
  const name = profileInput.value.trim();
  profileSave.disabled = true;
  profileSave.textContent = 'Salvando...';
  profileError.hidden = true;
  try {
    await updateDisplayName(name);
    renderAccount();
    profileDialog.close();
    feedback('Nome de usuário atualizado');
  } catch (error) {
    profileError.textContent = error.message || 'Não foi possível atualizar seu nome.';
    profileError.hidden = false;
  } finally {
    profileSave.disabled = false;
    profileSave.textContent = 'Salvar alterações';
  }
});

document.addEventListener('click', event => {
  if (!event.target.closest('.top-popover-anchor')) closePanels();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && (!notificationPanel.hidden || !accountPanel.hidden)) {
    const active = notificationPanel.hidden ? avatarToggle : notificationToggle;
    closePanels();
    active.focus();
  }
});

window.addEventListener('movie-auth-changed', () => {
  diaryEntries = [];
  closePanels();
  renderAccount();
  renderNotifications();
});
window.addEventListener('movie-profile-updated', renderAccount);
window.addEventListener('movie-activity-changed', renderNotifications);
window.addEventListener('movie-diary-updated', event => {
  diaryEntries = Array.isArray(event.detail?.entries) ? event.detail.entries : [];
  renderNotifications();
});
window.addEventListener('storage', event => {
  if (event.key?.startsWith('movie-explorer:account:')) renderNotifications();
});

renderAccount();
renderNotifications();
