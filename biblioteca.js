const PREFIX = 'movie-explorer:';
let activeUser = 'visitor';
const fallbackMemory = new Map();
const storageKey = key => `${PREFIX}account:${activeUser}:${key}`;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(storageKey(key));
    return raw === null ? (fallbackMemory.has(storageKey(key)) ? fallbackMemory.get(storageKey(key)) : fallback) : JSON.parse(raw);
  } catch { return fallbackMemory.has(storageKey(key)) ? fallbackMemory.get(storageKey(key)) : fallback; }
}
function write(key, value) {
  fallbackMemory.set(storageKey(key), value);
  try { localStorage.setItem(storageKey(key), JSON.stringify(value)); }
  catch {  }
}
const sameId = (a, b) => String(a) === String(b);
const list = key => { const data = read(key, []); return Array.isArray(data) ? data : []; };
const settings = () => { const data = read('settings', {}); return data && typeof data === 'object' && !Array.isArray(data) ? data : {}; };

export const library = {
  setActiveUser(id) { activeUser = id ? String(id) : 'visitor'; },
  getAll: () => list('library'),
  get: key => list(key),
  set: (key, value) => write(key, value),
  toggle(key, movie) {
    if (!movie || movie.id == null) return false;
    const items = list(key);
    const exists = items.some(item => sameId(item.id, movie.id));
    write(key, exists ? items.filter(item => !sameId(item.id, movie.id)) : [movie, ...items]);
    return !exists;
  },
  has(key, id) { return list(key).some(item => sameId(item.id, id)); },
  upsert(movie) {
    if (!movie || movie.id == null) return list('library');
    const next = [movie, ...list('library').filter(item => !sameId(item.id, movie.id))];
    write('library', next);
    return next;
  },
  remove(id) {
    const next = list('library').filter(item => !sameId(item.id, id));
    write('library', next);
    return next;
  },
  rating(id) { return Number(this.getRatings()[id]) || 0; },
  rate(id, value, movie = null) {
    const rating = Number(value);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return;
    if (movie) this.upsert(movie);
    const ratings = this.getRatings();
    ratings[id] = rating;
    write('ratings', ratings);
  },
  getRatings() {
    const data = read('ratings', {});
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  },
  getActivity: () => list('activity'),
  getNotificationReadAt: () => Number(read('notificationReadAt', 0)) || 0,
  markNotificationsRead: () => write('notificationReadAt', Date.now()),
  addActivity(entry) {
    if (!entry) return;
    const createdAt = entry.createdAt || new Date().toISOString();
    write('activity', [{...entry, createdAt}, ...list('activity')].slice(0, 100));
    window.dispatchEvent(new Event('movie-activity-changed'));
  },
  apiKey: () => settings().tmdbKey || '',
  settings,
  saveSettings(value) { write('settings', value); },
};
