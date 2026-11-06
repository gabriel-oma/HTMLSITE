const API_ROOT = 'https://api.themoviedb.org/3';
const IMAGE_ROOT = 'https://image.tmdb.org/t/p/';

const GENRES = {28:'Ação',12:'Aventura',16:'Animação',35:'Comédia',80:'Crime',99:'Documentário',18:'Drama',10751:'Família',14:'Fantasia',36:'História',27:'Terror',10402:'Música',9648:'Mistério',10749:'Romance',878:'Ficção científica',10770:'Cinema TV',53:'Suspense',10752:'Guerra',37:'Faroeste'};

export function normalizeMovie(movie) {
  const genreIds = movie.genre_ids || (movie.genres || []).map(genre => genre.id);
  const genres = genreIds.map(id => GENRES[id]).filter(Boolean);
  const director = movie.credits?.crew?.find(person => person.job === 'Director')?.name || null;
  const minutes = Number(movie.runtime);
  return {
    id: `tmdb-${movie.id}`,
    tmdbId: movie.id,
    title: movie.title || movie.name || 'Sem título',
    original_title: movie.original_title || '',
    year: movie.release_date ? Number(movie.release_date.slice(0, 4)) || null : null,
    genre: genres[0] || 'Filme', genres,
    rating: Number(movie.vote_average || 0),
    votes: Number(movie.vote_count || 0),
    overview: movie.overview || 'Sinopse não disponível.',
    tagline: movie.tagline || '',
    poster: movie.poster_path ? `${IMAGE_ROOT}w500${movie.poster_path}` : '',
    backdrop: movie.backdrop_path ? `${IMAGE_ROOT}w1280${movie.backdrop_path}` : '',
    runtime: minutes > 0 ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}min` : null,
    director,
  };
}

export function createTmdbClient(apiKey) {
  if (!apiKey?.trim()) throw new Error('Adicione sua chave TMDB em Configurações para continuar.');
  async function request(path, params = {}) {
    const url = new URL(API_ROOT + path);
    url.searchParams.set('api_key', apiKey.trim());
    url.searchParams.set('language', 'pt-BR');
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    });
    let response;
    try { response = await fetch(url); }
    catch { throw new Error('Não foi possível acessar o TMDB. Verifique sua conexão.'); }
    if (!response.ok) throw new Error(response.status === 401 ? 'Chave TMDB inválida. Confira as Configurações.' : `TMDB respondeu com erro (${response.status}).`);
    return response.json();
  }
  return {
    async searchMovies(query, page = 1) {
      if (!query?.trim()) return [];
      const data = await request('/search/movie', {query:query.trim(), page, include_adult:false});
      return (data.results || []).map(normalizeMovie);
    },
    async popularMovies(page = 1) {
      const data = await request('/movie/popular', {page});
      return (data.results || []).map(normalizeMovie);
    },
    async movieDetails(id) {
      const numericId = String(id).replace(/^tmdb-/, '');
      const data = await request(`/movie/${encodeURIComponent(numericId)}`, {append_to_response:'credits'});
      return normalizeMovie(data);
    },
  };
}

export function createParseClient({serverUrl, appId, javascriptKey}) {
  if (!serverUrl || !appId || !javascriptKey) throw new Error('Configure serverUrl, appId e javascriptKey do Back4App.');
  const baseUrl = serverUrl.replace(/\/$/, '');
  async function request(path, {method = 'GET', body} = {}) {
    const response = await fetch(`${baseUrl}/classes/${path}`, {
      method,
      headers: {'X-Parse-Application-Id':appId, 'X-Parse-Javascript-Key':javascriptKey, 'Content-Type':'application/json'},
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Back4App respondeu com erro (${response.status}).`);
    return response.status === 204 ? null : response.json();
  }
  const cls = value => encodeURIComponent(value);
  return {
    list: (className, where = {}) => request(`${cls(className)}?where=${encodeURIComponent(JSON.stringify(where))}`),
    create: (className, record) => request(cls(className), {method:'POST',body:record}),
    update: (className, id, record) => request(`${cls(className)}/${cls(id)}`, {method:'PUT',body:record}),
    remove: (className, id) => request(`${cls(className)}/${cls(id)}`, {method:'DELETE'}),
  };
}
