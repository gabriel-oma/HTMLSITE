// API pública de filmes do Studio Ghibli (sem chave de acesso).
// Fonte: https://ghibliapi.dev/ (GET /films).
const FILMS_ENDPOINT = 'https://ghibliapi.dev/films';

export async function loadPublicFilms() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(FILMS_ENDPOINT, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`API pública respondeu HTTP ${response.status}.`);
    const results = await response.json();
    if (!Array.isArray(results)) throw new Error('Resposta inesperada da API pública.');
    return results.filter(entry => entry?.id && entry.title).map(entry => {
      const score = Number(entry.rt_score);
      const year = Number(entry.release_date);
      const duration = Number(entry.running_time);
      return {
        id: `ghibli-${entry.id}`,
        title: entry.title,
        original_title: entry.original_title || entry.title,
        year: Number.isFinite(year) && year >= 1900 ? year : null,
        genre: 'Animação',
        genres: ['Animação'],
        rating: Number.isFinite(score) ? score / 10 : 0,
        rtScore: Number.isFinite(score) && score >= 0 && score <= 100 ? score : null,
        votes: null,
        overview: entry.description || 'Sinopse indisponível.',
        poster: entry.image || '',
        backdrop: entry.movie_banner || '',
        runtime: Number.isFinite(duration) && duration > 0 ? `${Math.floor(duration / 60)}h ${String(duration % 60).padStart(2, '0')}min` : null,
        director: entry.director || 'Não informado',
        source: 'Studio Ghibli API',
      };
    });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Tempo limite ao carregar dados da API pública.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
