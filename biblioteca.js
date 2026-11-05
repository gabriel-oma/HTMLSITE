const PREFIX = 'movie-explorer:';
const fallbackMemory = new Map();

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? (fallbackMemory.has(key) ? fallbackMemory.get(key) : fallback) : JSON.parse(raw);
  } catch { return fallbackMemory.has(key) ? fallbackMemory.get(key) : fallback; }
}
function write(key, value) {
  fallbackMemory.set(key, value);
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); }
  catch { /* A aplicação continua em memória quando o armazenamento está indisponível. */ }
}
const sameId = (a, b) => String(a) === String(b);
const list = key => { const data = read(key, []); return Array.isArray(data) ? data : []; };
const settings = () => { const data = read('settings', {}); return data && typeof data === 'object' && !Array.isArray(data) ? data : {}; };

export const library = {
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
  addActivity(entry) {
    if (!entry) return;
    const createdAt = entry.createdAt || new Date().toISOString();
    write('activity', [{...entry, createdAt}, ...list('activity')].slice(0, 100));
  },
  apiKey: () => settings().tmdbKey || '',
  settings,
  saveSettings(value) { write('settings', value); },
};
