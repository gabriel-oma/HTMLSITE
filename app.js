import { movies, activitySeed } from './data.js';
import { library } from './biblioteca.js';
import { createTmdbClient } from './api.js';
import { loadPublicFilms } from './catalogo-publico.js';
import { listDiaryEntries, createDiaryEntry, updateDiaryEntry, deleteDiaryEntry } from './diario-api.js';
import { getActiveUser } from './auth.js';

const page = document.querySelector('#pageContent');

const dialog = document.querySelector('#movieDialog');

const dialogContent = document.querySelector('#dialogContent');

const routeNames = {
  dashboard: 'Dashboard',
  explorar: 'Explorar',
  biblioteca: 'Minha biblioteca',
  favoritos: 'Favoritos',
  avaliacoes: 'Avaliações',
  estatisticas: 'Estatísticas',
  diario: 'Diário na nuvem',
  configuracoes: 'Configurações',
};

const state = {
  route: 'dashboard',
  query: '',
  year: '',
  genre: '',
  minRating: '',
  sort: 'popular',
  source: 'local',
  remoteMovies: [],
  loading: false,
  publicFilms: [],
  publicLoading: true,
  publicError: '',
  publicDecade: '',
  publicDirector: '',
  diaryEntries: [],
  diaryError: '',
  diaryLoading: false,
  editingDiaryId: null,
};

const allMovies = () =>
  [...state.remoteMovies, ...state.publicFilms, ...movies].filter(
    (movie, index, array) =>
      array.findIndex(item => String(item.id) === String(movie.id)) === index,
  );

const esc = value =>
  String(value ?? '').replace(/[&<>"']/g, char => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return entities[char];
  });

const safeImage = value => {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href.replace(/[\'\"()\\]/g, '') : ''; } catch { return ''; }
};

const fmtDate = () =>
  new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  })
    .format(new Date())
    .replace(',', '');

const setRoute = route => {
  state.route = routeNames[route] ? route : 'dashboard';
  location.hash = state.route;
  render();
};

const toast = (message, kind = 'success') => {
  const region=document.querySelector('#toastRegion');
  const el=document.createElement('div');
  el.className=`toast ${kind === 'error' ? 'toast-error' : ''}`;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.innerHTML=`<i data-lucide="${kind === 'error' ? 'alert-circle' : 'check-circle-2'}">\
    </i>\
    <span>${esc(message)}</span>`;
  region.append(el);
  icons();
  setTimeout(()=>el.remove(), 3000);
};

const icons = () =>
  window.lucide?.createIcons({
    attrs: {
      'stroke-width': 1.8,
    },
  });

const film = id => allMovies().find(movie=>String(movie.id)===String(id)) || library.getAll().find(movie=>String(movie.id)===String(id)) || library.get('favorites').find(movie=>String(movie.id)===String(id)) || library.get('watched').find(movie=>String(movie.id)===String(id));

function filteredMovies(source=allMovies()) {
  const query = state.query.trim().toLocaleLowerCase('pt-BR');
  let list = source.filter(movie => {
    const searchableText = (
      `${movie.title} ${movie.original_title} ${movie.director || ''} ${movie.genre}`
    ).toLocaleLowerCase('pt-BR');

    return (
      (!query || searchableText.includes(query)) &&
      (!state.year || String(movie.year) === state.year) &&
      (!state.genre || (movie.genres || [movie.genre]).includes(state.genre)) &&
      (!state.minRating || movie.rating >= Number(state.minRating))
    );
  });

  if (state.sort === 'rating') {
    list.sort((a, b) => b.rating - a.rating);
  } else if (state.sort === 'year') {
    list.sort((a, b) => (b.year || 0) - (a.year || 0));
  } else if (state.sort === 'title') {
    list.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  }

  return list;
}

function movieCard(movie, index = 0) {
  const favorite = library.has('favorites', movie.id);
  const watched = library.has('watched', movie.id);
  const poster = movie.poster || '';
  return `<article class="movie-card" style="--card-delay:${Math.min(index,8)*45}ms">\
    <button class="poster-button" data-open="${esc(movie.id)}" aria-label="Ver detalhes de ${esc(movie.title)}">\
    <div class="poster-wrap">${poster?`<img class="poster" src="${esc(poster)}" alt="Pôster de ${esc(movie.title)}" loading="lazy" onerror="this.outerHTML='<div class=&quot;poster-placeholder&quot;>\
    <i data-lucide=&quot;clapperboard&quot;>\
    </i>\
    </div>'">`:`<div class="poster-placeholder">\
    <i data-lucide="clapperboard">\
    </i>\
    </div>`}<span class="poster-year">${esc(movie.year||'—')}</span>\
    <span class="poster-overlay">\
    <span>Ver detalhes</span>\
    <i data-lucide="arrow-up-right">\
    </i>\
    </span>${watched?'<span class="watched-chip">\
    <i data-lucide="check">\
    </i> Visto</span>':''}</div>\
    </button>\
    <div class="movie-meta">\
    <div class="movie-title-line">\
    <button class="movie-title" data-open="${esc(movie.id)}">${esc(movie.title)}</button>\
    <button class="favorite-button ${favorite?'is-favorite':''}" data-favorite="${esc(movie.id)}" aria-label="${favorite?'Remover dos':'Adicionar aos'} favoritos">\
    <i data-lucide="heart">\
    </i>\
    </button>\
    </div>\
    <div class="movie-subline">\
    <span>${esc(movie.genre)}</span>\
    <span class="sub-dot">·</span>\
    <span>${esc(movie.year||'')}</span>\
    <span class="rating">\
    <i data-lucide="star">\
    </i>${Number(movie.rating||0).toFixed(1)}</span>\
    </div>\
    </div>\
    </article>`;
}

function sectionHeader(title, action = '', route = 'explorar') {
  return `<div class="section-heading">\
    <div>\
    <h2>${title}</h2>\
    </div>${action?`<button class="text-link" data-route="${route}">${
    action
  }<i data-lucide="arrow-right">\
    </i>\
    </button>`:''}</div>`;
}

function toolbar() {
  const years = [...new Set(allMovies().map(movie => movie.year).filter(Boolean))]
    .sort((a, b) => b - a);
  const genres = [...new Set(
    allMovies().flatMap(movie => movie.genres || [movie.genre]).filter(Boolean),
  )].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return `<div class="filter-toolbar">\
    <label class="filter-select">\
    <i data-lucide="calendar-days">\
    </i>\
    <select id="filterYear">\
    <option value="">Todos os anos</option>${years.map(year=>`<option ${
    String(year)===state.year?'selected':''
  }>${
    year
  }</option>`).join('')}</select>\
    <i data-lucide="chevron-down">\
    </i>\
    </label>\
    <label class="filter-select">\
    <i data-lucide="tags">\
    </i>\
    <select id="filterGenre">\
    <option value="">Todos os gêneros</option>${genres.map(genre=>`<option ${
    genre===state.genre?'selected':''
  }>${
    esc(genre)
  }</option>`).join('')}</select>\
    <i data-lucide="chevron-down">\
    </i>\
    </label>\
    <label class="filter-select">\
    <i data-lucide="star">\
    </i>\
    <select id="filterRating">\
    <option value="">Qualquer nota</option>\
    <option value="7" ${state.minRating==='7'?'selected':''}>7.0 ou mais</option>\
    <option value="8" ${state.minRating==='8'?'selected':''}>8.0 ou mais</option>\
    <option value="8.5" ${state.minRating==='8.5'?'selected':''}>8.5 ou mais</option>\
    </select>\
    <i data-lucide="chevron-down">\
    </i>\
    </label>\
    <span class="filter-spacer">\
    </span>\
    <label class="sort-select">\
    <span>Ordenar:</span>\
    <select id="sortMovies">\
    <option value="popular" ${state.sort==='popular'?'selected':''}>Em destaque</option>\
    <option value="rating" ${state.sort==='rating'?'selected':''}>Melhor nota</option>\
    <option value="year" ${state.sort==='year'?'selected':''}>Mais recentes</option>\
    <option value="title" ${state.sort==='title'?'selected':''}>Nome A–Z</option>\
    </select>\
    <i data-lucide="chevron-down">\
    </i>\
    </label>\
    <button class="icon-button clear-filters" id="clearFilters" title="Limpar filtros">\
    <i data-lucide="rotate-ccw">\
    </i>\
    </button>\
    </div>`;
}

function emptyState(title, copy, icon = 'film') {
  return `<div class="empty-state">\
    <span>\
    <i data-lucide="${icon}">\
    </i>\
    </span>\
    <h3>${title}</h3>\
    <p>${copy}</p>\
    <button class="button button-secondary" data-route="explorar">Explorar filmes<i data-lucide="arrow-right">\
    </i>\
    </button>\
    </div>`;
}

function dashboard() {
  const featured = allMovies().find(movie => movie.featured) || movies[0];
  const list = filteredMovies().filter(movie => movie.id !== featured.id);
  const activity = library.getActivity();
  const recent = (activity.length ? activity : activitySeed).slice(0, 3);
  const fav = library.get('favorites').length;
  const watched = library.get('watched').length;
  const ratingCount = Object.keys(library.getRatings()).length;
  return `<div class="page-head">\
    <div>\
    <div class="eyebrow">\
    <span class="eyebrow-line">\
    </span> ${fmtDate().toLocaleUpperCase('pt-BR')}</div>\
    <h1>Seu cinema, <span>em um só lugar.</span>\
    </h1>\
    <p>Descubra histórias, organize sua coleção e acompanhe tudo o que você assiste.</p>\
    </div>\
    <button class="button button-primary" data-route="explorar">\
    <i data-lucide="compass">\
    </i> Explorar filmes</button>\
    </div>
    <section class="hero-feature" style="--hero-image:url('${featured.backdrop||featured.poster}')">\
    <div class="hero-shade">\
    </div>\
    <div class="hero-content">\
    <span class="hero-kicker">\
    <i data-lucide="sparkles">\
    </i> DESTAQUE DA SEMANA</span>\
    <h2>${esc(featured.title)}</h2>\
    <p class="hero-facts">\
    <span>${featured.year}</span>\
    <b>·</b>\
    <span>${esc(featured.runtime||'Ficção científica')}</span>\
    <b>·</b>\
    <span class="hero-rating">\
    <i data-lucide="star">\
    </i>${featured.rating}</span>\
    </p>\
    <p class="hero-copy">${esc(featured.overview.slice(0,175))}...</p>\
    <div class="hero-actions">\
    <button class="button button-primary" data-open="${esc(featured.id)}">\
    <i data-lucide="play">\
    </i> Ver detalhes</button>\
    <button class="button button-glass" data-favorite="${esc(featured.id)}">\
    <i data-lucide="heart">\
    </i> ${library.has('favorites',featured.id)?'Nos favoritos':'Adicionar aos favoritos'}</button>\
    </div>\
    </div>\
    <div class="hero-mark">\
    <span>01</span>\
    <i data-lucide="minus">\
    </i>\
    <span>04</span>\
    </div>\
    </section>
    <section class="stats-grid">\
    <div class="stat-card">\
    <span class="stat-icon stat-violet">\
    <i data-lucide="clapperboard">\
    </i>\
    </span>\
    <div class="stat-label">Na biblioteca</div>\
    <strong>${library.getAll().length}<small> filmes</small>\
    </strong>\
    <span class="stat-foot">Sua coleção pessoal</span>\
    </div>\
    <div class="stat-card">\
    <span class="stat-icon stat-rose">\
    <i data-lucide="heart">\
    </i>\
    </span>\
    <div class="stat-label">Favoritos</div>\
    <strong>${fav}<small> filmes</small>\
    </strong>\
    <span class="stat-foot">Os que você mais ama</span>\
    </div>\
    <div class="stat-card">\
    <span class="stat-icon stat-amber">\
    <i data-lucide="circle-check">\
    </i>\
    </span>\
    <div class="stat-label">Assistidos</div>\
    <strong>${watched}<small> filmes</small>\
    </strong>\
    <span class="stat-foot">E contando...</span>\
    </div>\
    <div class="stat-card">\
    <span class="stat-icon stat-blue">\
    <i data-lucide="star">\
    </i>\
    </span>\
    <div class="stat-label">Avaliações</div>\
    <strong>${ratingCount}<small> filmes</small>\
    </strong>\
    <span class="stat-foot">Sua opinião importa</span>\
    </div>\
    </section>
    ${publicDashboard()}
    ${personalDashboard()}
    <section class="panel dashboard-diary-highlight">
      <div><span class="eyebrow">DADOS SALVOS NA NUVEM</span>
      <h2>Diário de filmes</h2>
      <p>Você registrou <strong>${state.diaryEntries.length}</strong> sessões no Supabase. Cadastre, edite ou exclua registros e acompanhe seu histórico.</p></div>
      <button class="button button-secondary" data-route="diario"><i data-lucide="notebook-pen"></i> Abrir diário</button>
    </section>
    <section class="content-section">${sectionHeader('Em destaque','Ver catálogo')}<div class="movie-grid">${list.slice(0,4).map(movieCard).join('')}</div>\
    </section>
    <section class="lower-grid">\
    <div class="recent-activity">${sectionHeader('Atividade recente','Ver tudo','estatisticas')}<div class="activity-list">${recent.map(item=>{const movie=film(item.movieId);return `<div class="activity-item">\
    <span class="activity-icon ${item.type}">\
    <i data-lucide="${item.type==='rated'?'star':item.type==='favorite'?'heart':'circle-check'}">\
    </i>\
    </span>\
    <div>\
    <strong>${
    esc(movie?.title||'Filme')
  }</strong>\
    <small>${
    esc(item.detail)
  }</small>\
    </div>\
    <time>${
    esc(item.date)
  }</time>\
    </div>`}).join('')}</div>\
    </div>\
    <div class="quick-tip">\
    <div class="tip-top">\
    <span class="tip-icon">\
    <i data-lucide="lightbulb">\
    </i>\
    </span>\
    <span>DICA DO DIA</span>\
    </div>\
    <h3>Um mundo de histórias espera por você.</h3>\
    <p>Adicione filmes à sua biblioteca e acompanhe o que já assistiu.</p>\
    <button class="text-link" data-route="biblioteca">Minha biblioteca<i data-lucide="arrow-right">\
    </i>\
    </button>\
    <div class="tip-orbit">\
    </div>\
    </div>\
    </section>`;
}

function catalogPage(route) {
  let source=allMovies(), title='Explore filmes', desc='Encontre sua próxima história favorita.', icon='compass';
  if(route==='biblioteca') {
    source=library.getAll().map(x=>film(x.id)||x);
    title='Minha biblioteca';
    desc='Todos os filmes que você guardou em sua coleção.';
    icon='library'
  }
  if(route==='favoritos') {
    source=library.get('favorites').map(x=>film(x.id)||x);
    title='Seus favoritos';
    desc='As histórias que conquistaram um lugar especial.';
    icon='heart'
  }
  if(route==='avaliacoes') {
    const ratings=library.getRatings();
    source=Object.keys(ratings).map(id=>film(id)).filter(Boolean);
    title='Suas avaliações';
    desc='Sua opinião, organizada filme por filme.';
    icon='star'
  }
  const result=filteredMovies(source);
  const searchToolbar=route==='explorar'?`<div class="explore-search">\
    <i data-lucide="search">\
    </i>\
    <input id="pageSearch" type="search" value="${esc(state.query)}" placeholder="Título, diretor ou gênero...">\
    <kbd>↵</kbd>\
    </div>`:'';
  return `<div class="page-head page-head-compact">\
    <div>\
    <div class="eyebrow">\
    <span class="eyebrow-line">\
    </span> SUA PRÓXIMA DESCOBERTA</div>\
    <h1>${title}</h1>\
    <p>${desc}</p>\
    </div>${route==='explorar'?'<button class="button button-glass api-status" data-route="configuracoes">\
    <span class="status-dot">\
    </span> '+(library.apiKey()?'TMDB conectado':'Catálogo demonstrativo')+'<i data-lucide="arrow-up-right">\
    </i>\
    </button>':''}</div>${searchToolbar}${toolbar()}<div class="result-summary">\
    <span>\
    <strong>${result.length}</strong> ${result.length===1?'filme encontrado':'filmes encontrados'}</span>${state.query?`<button class="text-link" id="clearSearch">Limpar busca <i data-lucide="x">\
    </i>\
    </button>`:''}</div>${result.length?`<div class="movie-grid movie-grid-large">${
    result.map(movieCard).join('')
  }</div>`:emptyState('Nenhum filme por aqui',route==='biblioteca'?'Adicione filmes à sua biblioteca a partir da página Explorar.':'Tente alterar os filtros ou explore o catálogo completo.',icon)}`;
}

function publicMoviesFiltered() {
  return state.publicFilms.filter(movie =>
    (!state.publicDecade || String(Math.floor(movie.year / 10) * 10) === state.publicDecade) &&
    (!state.publicDirector || movie.director === state.publicDirector));
}
function publicDashboard() {
  const decades = [...new Set(state.publicFilms.filter(f => f.year).map(f => Math.floor(f.year / 10) * 10))].sort((a, b) => a - b);
  const directors = [...new Set(state.publicFilms.map(f => f.director).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'pt-BR'));
  const filmCount = publicMoviesFiltered().length;
  const publicPlaceholder = state.publicLoading ? '<div class="chart-placeholder"><span class="loading-spinner" aria-hidden="true"></span><span>Consultando API pública...</span></div>' :
    state.publicError ? '<div class="chart-placeholder">Os gráficos não puderam ser carregados. Tente atualizar a API.</div>' :
    !filmCount ? '<div class="chart-placeholder">Nenhum filme corresponde aos filtros selecionados.</div>' : '';
  return `<section class="content-section public-dashboard" aria-label="Painel de dados públicos sobre cinema">
      <div class="section-heading"><div><h2>Dados reais do cinema</h2>
      <p class="chart-source">Fonte: <a href="https://ghibliapi.dev/" target="_blank" rel="noopener noreferrer">Studio Ghibli API</a> · ${state.publicLoading ? 'Carregando...' : state.publicError ? 'Indisponível' : `${filmCount} filmes no filtro atual`}</p></div>
      <button class="button button-glass" id="reloadPublic" type="button" ${state.publicLoading ? 'disabled' : ''}>
      <i data-lucide="refresh-cw"></i> Atualizar API</button></div>
      ${state.publicError ? `<p class="data-alert" role="status">${esc(state.publicError)}. Confira sua conexão e tente novamente.</p>` : ''}
      <div class="public-chart-toolbar" aria-label="Filtros do dashboard">
        <label>Década
          <select id="publicDecade"><option value="">Todas as décadas</option>${decades.map(d => `<option value="${d}" ${String(d) === state.publicDecade ? 'selected' : ''}>${d}</option>`).join('')}</select>
        </label>
        <label>Diretor
          <select id="publicDirector"><option value="">Todos os diretores</option>${directors.map(d => `<option value="${esc(d)}" ${d === state.publicDirector ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select>
        </label>
        <span class="public-count">${state.publicLoading ? 'Consultando a API...' : `${filmCount} títulos (filmes)`}</span>
      </div>
      <div class="charts-grid public-graphs">
        <section class="panel chart-panel"><div class="panel-heading"><div><h2>Lançamentos por década</h2><p>Eixo X: décadas · Eixo Y: quantidade de filmes</p></div></div>
          <div class="chart-canvas"><canvas id="catalogDecadeChart" aria-label="Gráfico de barras de filmes por década" ${publicPlaceholder ? 'hidden' : ''}></canvas>${publicPlaceholder}</div></section>
        <section class="panel chart-panel"><div class="panel-heading"><div><h2>Filmes por diretor</h2><p>Fatias por diretor · Unidade: filmes</p></div></div>
          <div class="chart-canvas"><canvas id="catalogDirectorChart" aria-label="Gráfico de rosca por diretor" ${publicPlaceholder ? 'hidden' : ''}></canvas>${publicPlaceholder}</div></section>
      </div>
      <section class="panel chart-panel timeline-panel"><div class="panel-heading"><div><h2>Nota crítica média por década</h2><p>Eixo X: décadas · Eixo Y: pontuação Rotten Tomatoes (%)</p></div></div>
        <div class="chart-canvas chart-short"><canvas id="catalogScoreChart" aria-label="Gráfico de linha de nota média por década" ${publicPlaceholder ? 'hidden' : ''}></canvas>${publicPlaceholder}</div></section>
      <p class="chart-source">Os dados representam lançamentos e notas informados pela API pública do Studio Ghibli. Os registros pessoais são exibidos em Estatísticas e Diário na nuvem.</p>
    </section>`;
}

function personalDashboard() {
  const entries = state.diaryEntries;
  const average = entries.length ? (entries.reduce((sum, entry) => sum + Number(entry.score || 0), 0) / entries.length).toFixed(1) : '—';
  const today = new Date();
  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const thisMonth = entries.filter(entry => String(entry.watched_on || '').startsWith(monthKey)).length;
  const isEmpty = !entries.length && !state.diaryLoading && !state.diaryError;
  const unavailable = state.diaryLoading || state.diaryError || isEmpty;
  const placeholder = state.diaryLoading ? '<div class="chart-placeholder"><span class="loading-spinner" aria-hidden="true"></span><span>Carregando seus registros...</span></div>' :
    state.diaryError ? '<div class="chart-placeholder">Não foi possível carregar os dados.</div>' :
    isEmpty ? '<div class="chart-placeholder">Adicione filmes ao Diário para preencher este gráfico.</div>' : '';
  return `<section class="content-section personal-dashboard" aria-label="Estatísticas dos filmes assistidos">
    <div class="section-heading"><div><h2>Seu cinema em números</h2>
      <p class="chart-source">Estatísticas reais dos filmes que você registrou no Diário na nuvem.</p></div>
      <button class="button button-glass" type="button" data-route="diario"><i data-lucide="notebook-pen"></i> Ver diário</button></div>
    ${state.diaryError ? `<div class="data-alert" role="alert">${esc(state.diaryError)} <button type="button" class="inline-retry" id="retryDiaryDashboard">Tentar novamente</button></div>` : ''}
    <div class="personal-metrics">
      <div class="personal-metric"><span>Filmes registrados</span><strong>${state.diaryLoading ? '…' : entries.length}</strong><small>sessões na sua conta</small></div>
      <div class="personal-metric"><span>Sua nota média</span><strong>${state.diaryLoading ? '…' : average}${entries.length ? '<small> / 5</small>' : ''}</strong><small>avaliações do Diário</small></div>
      <div class="personal-metric"><span>Assistidos neste mês</span><strong>${state.diaryLoading ? '…' : thisMonth}</strong><small>pela data registrada</small></div>
    </div>
    <div class="charts-grid personal-graphs">
      <section class="panel chart-panel"><div class="panel-heading"><div><h2>Filmes por mês</h2><p>Eixo X: últimos seis meses · Eixo Y: sessões assistidas</p></div></div>
        <div class="chart-canvas"><canvas id="personalMonthChart" aria-label="Gráfico de barras de filmes assistidos por mês" ${unavailable ? 'hidden' : ''}></canvas>${placeholder}</div></section>
      <section class="panel chart-panel"><div class="panel-heading"><div><h2>Distribuição das suas notas</h2><p>Quantidade de avaliações de 1 a 5 estrelas</p></div></div>
        <div class="chart-canvas"><canvas id="personalScoreChart" aria-label="Gráfico de rosca de notas dos filmes" ${unavailable ? 'hidden' : ''}></canvas>${placeholder}</div></section>
    </div>
    ${isEmpty ? '<p class="personal-empty-action"><i data-lucide="sparkles"></i> Seu painel pessoal começa com o primeiro registro. <button type="button" class="text-link" data-route="diario">Cadastrar um filme <i data-lucide="arrow-right"></i></button></p>' : ''}
  </section>`;
}

function diaryPage() {
  const editing = state.diaryEntries.find(entry => entry.id === state.editingDiaryId);
  const date = editing?.watched_on || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return `<div class="page-head page-head-compact"><div><div class="eyebrow"><span class="eyebrow-line"></span> CRUD REST • SUPABASE</div>
    <h1>Diário na nuvem</h1><p>Registre filmes que assistiu. Seus registros ficam associados à sua conta e podem ser criados, consultados, editados e excluídos.</p></div></div>
    <div class="diary-layout">
      <section class="panel diary-form-panel"><h2>${editing ? 'Editar registro' : 'Novo registro'}</h2>
        <form id="diaryForm" class="diary-form">
          <label for="diaryMovieInput">Filme</label>
          <div class="diary-movie-autocomplete">
            <input id="diaryMovieInput" name="movie_title" type="search" placeholder="Digite o nome do filme..." required maxlength="120"
              autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-haspopup="listbox"
              aria-expanded="false" aria-controls="diaryMovieSuggestions" value="${esc(editing?.movie_title || '')}">
            <div id="diaryMovieSuggestions" class="diary-movie-suggestions" role="listbox" aria-label="Sugestões de filmes" hidden></div>
            <p class="diary-movie-help">Digite pelo menos 2 letras. Selecione uma sugestão para preencher o título, o ano e o pôster.</p>
          </div>
          <div id="diarySelectedMovie" class="diary-selected-movie" ${!editing?.poster_url ? 'hidden' : ''} aria-live="polite">
            <div class="diary-selected-poster">${safeImage(editing?.poster_url) ? `<img src="${esc(safeImage(editing.poster_url))}" alt="Pôster do filme selecionado" loading="lazy">` : '<i data-lucide="film"></i>'}</div>
            <div class="diary-selected-details"><span>FILME SELECIONADO</span><strong id="diarySelectedTitle">${esc(editing?.movie_title || '')}</strong><small id="diarySelectedYear">${esc(editing?.movie_year || 'Ano não informado')}</small></div>
            <button type="button" class="icon-button" id="diaryClearSelection" title="Remover seleção do catálogo" aria-label="Remover seleção do catálogo"><i data-lucide="x"></i></button>
          </div>
          <input type="hidden" name="poster_url" id="diaryPosterUrl" value="${esc(safeImage(editing?.poster_url || ''))}">
          <label for="diaryMovieYear">Ano de lançamento (opcional)
            <input id="diaryMovieYear" type="number" name="movie_year" inputmode="numeric" min="1888" max="2100" placeholder="Preenchido ao selecionar um filme" value="${esc(editing?.movie_year || '')}">
          </label>
          <div class="diary-input-grid"><label>Data em que assistiu <input type="date" name="watched_on" required value="${esc(date)}"></label>
            <label>Sua nota (estrelas) <select name="score" required>${[1,2,3,4,5].map(n => `<option value="${n}" ${n === (editing?.score || 5) ? 'selected' : ''}>${n} de 5</option>`).join('')}</select></label></div>
          <label>Anotação (opcional) <textarea name="note" maxlength="700" rows="4" placeholder="O que achou do filme?">${esc(editing?.note || '')}</textarea></label>
          <div id="diaryFormError" class="data-alert" role="alert" hidden></div>
          <div class="diary-buttons"><button class="button button-primary" type="submit"><i data-lucide="save"></i> <span class="diary-submit-label">${editing ? 'Salvar alterações' : 'Adicionar registro'}</span></button>
            ${editing ? '<button class="button button-secondary" type="button" id="diaryCancel">Cancelar</button>' : ''}</div>
        </form>
        <p class="form-help">Dados armazenados no Supabase com Row Level Security (RLS), separados por usuário.</p>
      </section>
      <section class="panel diary-records"><div class="diary-list-top"><div><h2>Meus registros</h2><p>${state.diaryEntries.length} ${state.diaryEntries.length === 1 ? 'sessão' : 'sessões'} na nuvem</p></div>
        <button class="icon-button" id="diaryRefresh" type="button" aria-label="Recarregar registros" title="Recarregar"><i data-lucide="refresh-cw"></i></button></div>
        ${state.diaryLoading ? '<div class="diary-loading" role="status"><span class="loading-spinner" aria-hidden="true"></span> Carregando seus registros...</div><div class="diary-skeleton"></div><div class="diary-skeleton"></div>' : ''}
        ${state.diaryError ? `<div class="data-alert" role="alert">${esc(state.diaryError)}<button class="inline-retry" type="button" id="diaryRetry">Tentar novamente</button></div>` : ''}
        <div class="diary-entries">${state.diaryEntries.length ? state.diaryEntries.map(entry => {
          const watched = new Date(`${entry.watched_on}T12:00:00`);
          const poster = safeImage(entry.poster_url);
          return `<article class="diary-entry"><div class="diary-entry-cover">${poster ? `<img src="${esc(poster)}" alt="Pôster de ${esc(entry.movie_title)}" loading="lazy">` : '<i data-lucide="film"></i>'}</div><div class="diary-entry-main"><strong>${esc(entry.movie_title)}</strong>
            <small>${entry.movie_year ? `${esc(entry.movie_year)} · ` : ''}${Number.isNaN(watched.getTime()) ? esc(entry.watched_on) : watched.toLocaleDateString('pt-BR')} · ${Number(entry.score)}/5 estrelas</small>
            ${entry.note ? `<p>${esc(entry.note)}</p>` : ''}</div>
            <div class="diary-entry-actions"><button type="button" data-diary-edit="${esc(entry.id)}" aria-label="Editar ${esc(entry.movie_title)}"><i data-lucide="pencil"></i></button>
            <button type="button" data-diary-delete="${esc(entry.id)}" aria-label="Excluir ${esc(entry.movie_title)}"><i data-lucide="trash-2"></i></button></div></article>`;
        }).join('') : (!state.diaryLoading && !state.diaryError ? '<div class="diary-hint diary-empty"><i data-lucide="notebook-pen"></i><strong>Nenhum filme registrado ainda</strong><span>Escolha um filme no formulário e comece a montar seu histórico.</span></div>' : '')}</div>
      </section>
    </div>`;
}

function statsPage() {
  const collection=filteredMovies(library.getAll().map(item=>film(item.id)||item));
  const ids=new Set(collection.map(movie=>String(movie.id)));
  const watched=library.get('watched').filter(movie=>ids.has(String(movie.id))).length;
  const ratings=library.getRatings(), rated=Object.entries(ratings).filter(([id])=>ids.has(String(id))).map(([, value])=>value);
  const avg=rated.length?(rated.reduce((a, b)=>a+b, 0)/rated.length).toFixed(1):'—';
  const favorites=library.get('favorites').filter(movie=>ids.has(String(movie.id))).length;
  return `<div class="page-head page-head-compact">\
    <div>\
    <div class="eyebrow">\
    <span class="eyebrow-line">\
    </span> SEU ANO EM FILMES</div>\
    <h1>Estatísticas</h1>\
    <p>Um retrato da sua jornada pelo mundo do cinema.</p>\
    </div>\
    </div>\
    <div class="stats-filters">${toolbar()}</div>\
    <section class="stats-grid stats-grid-wide">\
    <div class="stat-card">\
    <span class="stat-icon stat-violet">\
    <i data-lucide="circle-check">\
    </i>\
    </span>\
    <div class="stat-label">Filmes assistidos</div>\
    <strong>${watched}<small> filmes</small>\
    </strong>\
    <span class="stat-foot">Registrados na sua coleção</span>\
    </div>\
    <div class="stat-card">\
    <span class="stat-icon stat-amber">\
    <i data-lucide="star">\
    </i>\
    </span>\
    <div class="stat-label">Sua nota média</div>\
    <strong>${avg}<small> / 5</small>\
    </strong>\
    <span class="stat-foot">${rated.length} avaliações registradas</span>\
    </div>\
    <div class="stat-card">\
    <span class="stat-icon stat-rose">\
    <i data-lucide="heart">\
    </i>\
    </span>\
    <div class="stat-label">Favoritos</div>\
    <strong>${favorites}<small> filmes</small>\
    </strong>\
    <span class="stat-foot">Na sua lista especial</span>\
    </div>\
    </section>\
    <div class="charts-grid">\
    <section class="panel chart-panel">\
    <div class="panel-heading">\
    <div>\
    <h2>Filmes por ano</h2>\
    <p>Distribuição na biblioteca filtrada</p>\
    </div>\
    <span class="panel-icon">\
    <i data-lucide="chart-no-axes-column-increasing">\
    </i>\
    </span>\
    </div>\
    <div class="chart-canvas">\
    <canvas id="yearChart">\
    </canvas>\
    </div>\
    </section>\
    <section class="panel chart-panel">\
    <div class="panel-heading">\
    <div>\
    <h2>Por gênero</h2>\
    <p>Seus estilos favoritos</p>\
    </div>\
    <span class="panel-icon">\
    <i data-lucide="chart-pie">\
    </i>\
    </span>\
    </div>\
    <div class="chart-canvas">\
    <canvas id="genreChart">\
    </canvas>\
    </div>\
    </section>\
    </div>\
    <section class="panel chart-panel timeline-panel">\
    <div class="panel-heading">\
    <div>\
    <h2>Sua atividade</h2>\
    <p>Filmes marcados como assistidos</p>\
    </div>\
    </div>\
    <div class="chart-canvas chart-short">\
    <canvas id="activityChart">\
    </canvas>\
    </div>\
    </section>`;
}

function settingsPage() {
  const settings=library.settings();
  return `<div class="page-head page-head-compact">\
    <div>\
    <div class="eyebrow">\
    <span class="eyebrow-line">\
    </span> PERSONALIZE SUA EXPERIÊNCIA</div>\
    <h1>Configurações</h1>\
    <p>Gerencie integrações e preferências da sua conta.</p>\
    </div>\
    </div>\
    <div class="settings-layout">\
    <section class="panel settings-panel">\
    <div class="settings-heading">\
    <span class="settings-icon">\
    <i data-lucide="radio-tower">\
    </i>\
    </span>\
    <div>\
    <h2>Integração com TMDB</h2>\
    <p>Busque milhares de filmes atualizados no The Movie Database.</p>\
    </div>\
    <span class="connection-pill ${library.apiKey()?'connected':''}">\
    <i data-lucide="${library.apiKey()?'circle-check':'circle-dot'}">\
    </i>${library.apiKey()?'Conectado':'Não conectado'}</span>\
    </div>\
    <div class="settings-divider">\
    </div>\
    <form id="settingsForm">\
    <label class="form-label" for="tmdbKey">Chave de API v3 <span>Opcional</span>\
    </label>\
    <div class="key-input-wrap">\
    <input id="tmdbKey" type="password" autocomplete="off" placeholder="Insira sua chave API do TMDB" value="${esc(settings.tmdbKey||'')}">\
    <button type="button" class="icon-button" id="toggleKey" aria-label="Mostrar chave">\
    <i data-lucide="eye">\
    </i>\
    </button>\
    </div>\
    <p class="form-help">Sua chave fica salva apenas neste navegador. <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">Obtenha sua chave no TMDB <i data-lucide="arrow-up-right">\
    </i>\
    </a>\
    </p>\
    <div class="settings-actions">\
    <button class="button button-primary" type="submit">\
    <i data-lucide="plug-zap">\
    </i> Salvar e conectar</button>${library.apiKey()?'<button class="button button-secondary" id="removeKey" type="button">Desconectar</button>':''}</div>\
    </form>\
    </section>\
    <section class="panel info-panel">\
    <span class="info-badge">\
    <i data-lucide="shield-check">\
    </i> PRIVACIDADE</span>\
    <h3>Sua chave, seu controle.</h3>\
    <p>A chave API é armazenada somente no localStorage deste dispositivo. Para uso em produção, recomendamos um backend ou proxy para proteger suas credenciais.</p>\
    </section>\
    <section class="panel data-panel">\
    <div class="panel-heading">\
    <div>\
    <h2>Seus dados</h2>\
    <p>Seus dados locais ficam neste navegador; o diário usa o Supabase com login.</p>\
    </div>\
    <span class="panel-icon">\
    <i data-lucide="database">\
    </i>\
    </span>\
    </div>\
    <div class="data-row">\
    <span>\
    <i data-lucide="hard-drive">\
    </i> Armazenamento local</span>\
    <strong>\
    <span class="status-dot">\
    </span> Ativo</strong>\
    </div>\
    <div class="data-row">\
    <span>\
    <i data-lucide="cloud">\
    </i> Diário Supabase (API REST)</span>\
    <strong class="muted">${state.diaryLoading ? 'Carregando...' : state.diaryError ? 'Verifique o SQL' : 'Ativo'}</strong>\
    </div>\
    <p class="form-help">Para habilitar o CRUD, execute <code>supabase/diario.sql</code> no SQL Editor do Supabase. Cada conta acessa apenas seus próprios registros.</p>\
    </section>\
    </div>`;
}

const chartInstances = [];
function destroyCharts() {
  chartInstances.splice(0).forEach(chart => chart.destroy());
}

function render() {
  destroyCharts();
  document.querySelector('#breadcrumbCurrent').textContent = routeNames[state.route];
  document.querySelectorAll('[data-route]').forEach(link => {
    link.classList.toggle('active', link.dataset.route === state.route);
  });

  const views = {
    dashboard,
    explorar: () => catalogPage('explorar'),
    biblioteca: () => catalogPage('biblioteca'),
    favoritos: () => catalogPage('favoritos'),
    avaliacoes: () => catalogPage('avaliacoes'),
    estatisticas: statsPage,
    diario: diaryPage,
    configuracoes: settingsPage,
  };

  page.innerHTML = views[state.route]();
  bindPageEvents();
  icons();

  if (state.route === 'estatisticas') {
    drawCharts();
  } else if (state.route === 'dashboard') {
    drawPublicCharts();
    drawPersonalCharts();
  }
}

function bindDiaryMovieAutocomplete() {
  const input = page.querySelector('#diaryMovieInput');
  const list = page.querySelector('#diaryMovieSuggestions');
  if (!input || !list) return;

  let timer = null;
  let requestVersion = 0;
  let suggestions = [];
  let activeIndex = -1;
  const yearInput = page.querySelector('#diaryMovieYear');
  const posterInput = page.querySelector('#diaryPosterUrl');
  const selected = page.querySelector('#diarySelectedMovie');
  const selectedTitle = page.querySelector('#diarySelectedTitle');
  const selectedYear = page.querySelector('#diarySelectedYear');
  const selectedPoster = selected?.querySelector('.diary-selected-poster');
  let selectedMovieTitle = posterInput?.value ? input.value.trim() : '';

  const updateSelection = movie => {
    const poster = safeImage(movie?.poster || '');
    posterInput.value = poster;
    yearInput.value = movie?.year && Number(movie.year) >= 1888 && Number(movie.year) <= 2100 ? movie.year : '';
    selectedMovieTitle = movie?.title || '';
    if (!movie) {
      selected.hidden = true;
      return;
    }
    selectedTitle.textContent = movie.title;
    selectedYear.textContent = yearInput.value || 'Ano não informado';
    selectedPoster.replaceChildren();
    if (poster) {
      const img = document.createElement('img');
      img.src = poster;
      img.alt = `Pôster de ${movie.title}`;
      img.loading = 'lazy';
      selectedPoster.append(img);
    } else {
      selectedPoster.innerHTML = '<i data-lucide="film"></i>';
      icons();
    }
    selected.hidden = false;
  };

  page.querySelector('#diaryClearSelection')?.addEventListener('click', () => {
    posterInput.value = '';
    yearInput.value = '';
    selectedMovieTitle = '';
    selected.hidden = true;
    input.focus();
  });

  const normalize = text => String(text || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();

  const localResults = query => {
    const term = normalize(query);
    return allMovies().filter(movie =>
      normalize(movie.title).includes(term) || normalize(movie.original_title).includes(term)
    ).sort((a, b) => {
      const aStarts = normalize(a.title).startsWith(term) ? 0 : 1;
      const bStarts = normalize(b.title).startsWith(term) ? 0 : 1;
      return aStarts - bStarts || String(a.title).localeCompare(String(b.title), 'pt-BR');
    }).slice(0, 8);
  };

  const close = () => {
    list.hidden = true;
    list.replaceChildren();
    suggestions = [];
    activeIndex = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  };

  const setActive = index => {
    activeIndex = index;
    list.querySelectorAll('[role="option"]').forEach((item, i) => {
      const selected = i === index;
      item.setAttribute('aria-selected', String(selected));
      item.classList.toggle('is-active', selected);
      if (selected) item.scrollIntoView({ block: 'nearest' });
    });
    if (index >= 0) input.setAttribute('aria-activedescendant', `diarySuggestion${index}`);
    else input.removeAttribute('aria-activedescendant');
  };

  const choose = index => {
    const movie = suggestions[index];
    if (!movie) return;
    input.value = movie.title;
    updateSelection(movie);
    close();
    input.focus();
  };

  const show = (items, status = '') => {
    if (!input.isConnected || state.route !== 'diario') return;
    const seen = new Set();
    suggestions = items.filter(movie => {
      const key = `${normalize(movie.title)}:${movie.year || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 7);
    activeIndex = -1;

    const options = suggestions.map((movie, index) => {
      const poster = safeImage(movie.poster);
      const source = String(movie.id).startsWith('tmdb-') ? 'TMDB' :
        String(movie.id).startsWith('ghibli-') ? 'Studio Ghibli' : 'Catálogo';
      return `<button type="button" id="diarySuggestion${index}" class="diary-movie-option"
        role="option" aria-selected="false" data-diary-suggestion="${index}">
        <span class="diary-movie-poster">${poster ? `<img src="${esc(poster)}" alt="" loading="lazy">` : '<i data-lucide="film"></i>'}</span>
        <span class="diary-movie-info"><strong>${esc(movie.title)}</strong>
          <small>${esc(movie.year || 'Ano não informado')} · ${esc(source)}</small></span>
        <i data-lucide="corner-down-left" class="diary-movie-select-icon"></i>
      </button>`;
    }).join('');
    list.innerHTML = options + (status ? `<p class="diary-movie-status" role="status">${esc(status)}</p>` : '');
    list.hidden = !options && !status;
    input.setAttribute('aria-expanded', String(!list.hidden));
    if (!list.hidden) icons();
  };

  const search = () => {
    clearTimeout(timer);
    const query = input.value.trim();
    const version = ++requestVersion;
    if (query.length < 2) { close(); return; }
    const local = localResults(query);
    const key = library.apiKey();
    if (!key) {
      show(local, local.length ? 'Para buscar mais filmes, conecte o TMDB em Configurações.' :
        'Nenhum título no catálogo atual. Você pode digitar o nome manualmente ou conectar o TMDB em Configurações.');
      return;
    }
    show(local, 'Buscando mais filmes no TMDB...');
    timer = setTimeout(async () => {
      try {
        const remote = await createTmdbClient(key).searchMovies(query);
        if (version !== requestVersion || !input.isConnected || input.value.trim() !== query) return;
        const merged = [...remote, ...local];
        show(merged, merged.length ? '' : 'Nenhum filme encontrado. Você pode escrever o título manualmente.');
      } catch (error) {
        if (version !== requestVersion || !input.isConnected) return;
        show(local, 'Não foi possível consultar o TMDB. Você pode digitar o título manualmente.');
      }
    }, 300);
  };

  input.addEventListener('input', () => {
    if (selectedMovieTitle && input.value.trim() !== selectedMovieTitle) {
      posterInput.value = '';
      yearInput.value = '';
      selectedMovieTitle = '';
      selected.hidden = true;
    }
    search();
  });
  input.addEventListener('focus', () => { if (input.value.trim().length >= 2) search(); });
  input.addEventListener('keydown', event => {
    if (list.hidden || !suggestions.length) {
      if (event.key === 'Escape') close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((activeIndex + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(activeIndex <= 0 ? suggestions.length - 1 : activeIndex - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(activeIndex < 0 ? 0 : activeIndex);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  });
  list.addEventListener('pointerdown', event => {
    const option = event.target.closest('[data-diary-suggestion]');
    if (!option) return;
    event.preventDefault();
    choose(Number(option.dataset.diarySuggestion));
  });
  list.addEventListener('click', event => {
    const option = event.target.closest('[data-diary-suggestion]');
    if (option) choose(Number(option.dataset.diarySuggestion));
  });
  input.addEventListener('blur', () => setTimeout(() => {
    if (!list.contains(document.activeElement)) close();
  }, 150));
}

function bindPageEvents() {
  page.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click', ()=>setRoute(el.dataset.route)));
  page.querySelectorAll('[data-open]').forEach(el=>el.addEventListener('click', ()=>openMovie(el.dataset.open)));
  page.querySelectorAll('[data-favorite]').forEach(el=>el.addEventListener('click', event=> {
    event.stopPropagation();
    const movie=film(el.dataset.favorite);
    if (!movie) return;
    const added=library.toggle('favorites', movie);
    library.addActivity({
      movieId:movie.id, type:'favorite', date:'Agora', detail:added?'Adicionado aos favoritos':'Removido dos favoritos'
    }
    );
    toast(added?'Adicionado aos favoritos':'Removido dos favoritos');
    render()
  }
  ));
  page.querySelectorAll('[data-watch]').forEach(el=>el.addEventListener('click', ()=>toggleWatched(el.dataset.watch)));
  page.querySelectorAll('[data-rate]').forEach(el=>el.addEventListener('click', ()=> {
    const [id, value]=el.dataset.rate.split('|');
    library.rate(id, Number(value), film(id));
    library.addActivity({
      movieId:id, type:'rated', date:'Agora', detail:`Você avaliou com ${value} estrelas`
    }
    );
    toast('Avaliação salva');
    openMovie(id)
  }
  ));
  const applyFilters=()=> {
    state.year=page.querySelector('#filterYear')?.value||'';
    state.genre=page.querySelector('#filterGenre')?.value||'';
    state.minRating=page.querySelector('#filterRating')?.value||'';
    state.sort=page.querySelector('#sortMovies')?.value||state.sort;
    render()
  };
  ['filterYear', 'filterGenre', 'filterRating', 'sortMovies'].forEach(id=>page.querySelector(`#${id}`)?.addEventListener('change', applyFilters));
  page.querySelector('#clearFilters')?.addEventListener('click', ()=> {
    state.year=state.genre=state.minRating='';
    state.sort='popular';
    render()
  }
  );
  page.querySelector('#clearSearch')?.addEventListener('click', ()=> {
    state.query='';
    render()
  }
  );
  page.querySelector('#pageSearch')?.addEventListener('input', e=> {
    state.query=e.target.value;
    const pos=e.target.selectionStart;
    render();
    const input=page.querySelector('#pageSearch');
    input?.focus();
    input?.setSelectionRange(pos, pos)
  }
  );
  page.querySelector('#settingsForm')?.addEventListener('submit', saveSettings);
  page.querySelector('#publicDecade')?.addEventListener('change', event => {
    state.publicDecade = event.target.value;
    render();
  });
  page.querySelector('#publicDirector')?.addEventListener('change', event => {
    state.publicDirector = event.target.value;
    render();
  });
  page.querySelector('#reloadPublic')?.addEventListener('click', () => refreshPublicFilms());
  bindDiaryMovieAutocomplete();
  page.querySelector('#diaryRefresh')?.addEventListener('click', () => refreshDiary());
  page.querySelector('#diaryRetry')?.addEventListener('click', () => refreshDiary());
  page.querySelector('#retryDiaryDashboard')?.addEventListener('click', () => refreshDiary());
  page.querySelector('#diaryCancel')?.addEventListener('click', () => { state.editingDiaryId = null; render(); });
  page.querySelectorAll('[data-diary-edit]').forEach(button => button.addEventListener('click', () => {
    state.editingDiaryId = button.dataset.diaryEdit;
    render();
    page.querySelector('[name="movie_title"]')?.focus();
  }));
  page.querySelectorAll('[data-diary-delete]').forEach(button => button.addEventListener('click', async () => {
    const item = state.diaryEntries.find(entry => entry.id === button.dataset.diaryDelete);
    if (!item || !window.confirm(`Excluir o registro de "${item.movie_title}"?`)) return;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    try {
      await deleteDiaryEntry(item.id);
      if (state.editingDiaryId === item.id) state.editingDiaryId = null;
      await refreshDiary();
      toast('Registro excluído da nuvem');
    } catch (error) {
      toast(error.message || 'Não foi possível excluir o registro.', 'error');
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  }));
  page.querySelector('#diaryForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const yearText = String(fields.get('movie_year') || '').trim();
    const year = yearText ? Number(yearText) : null;
    const entry = {
      movie_title: String(fields.get('movie_title') || '').trim(),
      movie_year: year,
      poster_url: safeImage(String(fields.get('poster_url') || '')) || null,
      watched_on: String(fields.get('watched_on') || ''),
      score: Number(fields.get('score')),
      note: String(fields.get('note') || '').trim(),
    };
    const errorBox = form.querySelector('#diaryFormError');
    const showFormError = message => {
      errorBox.textContent = message;
      errorBox.hidden = false;
      errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    errorBox.hidden = true;
    if (!entry.movie_title || entry.movie_title.length > 120 || !/^\d{4}-\d{2}-\d{2}$/.test(entry.watched_on) ||
        !Number.isInteger(entry.score) || entry.score < 1 || entry.score > 5 || entry.note.length > 700 ||
        (year !== null && (!Number.isInteger(year) || year < 1888 || year > 2100))) {
      showFormError('Confira o título, o ano, a data, a nota e a anotação antes de salvar.');
      return;
    }
    const submit = form.querySelector('[type="submit"]');
    const label = form.querySelector('.diary-submit-label');
    const originalLabel = label.textContent;
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    label.textContent = 'Salvando...';
    try {
      if (state.editingDiaryId) await updateDiaryEntry(state.editingDiaryId, entry);
      else await createDiaryEntry(entry);
      state.editingDiaryId = null;
      await refreshDiary();
      toast('Registro salvo no Supabase');
    } catch (error) {
      if (form.isConnected) showFormError(error.message || 'Não foi possível salvar. Tente novamente.');
      else toast(error.message || 'Não foi possível salvar.', 'error');
    } finally {
      if (submit.isConnected) {
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
        label.textContent = originalLabel;
      }
    }
  });
  page.querySelector('#toggleKey')?.addEventListener('click', ()=> {
    const input=page.querySelector('#tmdbKey');
    input.type=input.type==='password'?'text':'password'
  }
  );
  page.querySelector('#removeKey')?.addEventListener('click', ()=> {
    library.saveSettings({
      ...library.settings(), tmdbKey:''
    }
    );
    state.remoteMovies = [];
    state.source = 'local';
    toast('Integração desconectada');
    render()
  }
  );
}

function openMovie(id) {
  const movie=film(id);
  if(!movie)return;
  const rating=library.rating(movie.id), favorite=library.has('favorites', movie.id), watched=library.has('watched', movie.id);
  dialogContent.innerHTML=`<div class="detail-backdrop" style="--detail-image:url('${esc(safeImage(movie.backdrop||movie.poster||''))}')">\
    </div>\
    <div class="detail-content">\
    <div class="detail-poster">${movie.poster?`<img src="${esc(movie.poster)}" alt="Pôster de ${esc(movie.title)}">`:'<i data-lucide="clapperboard">\
    </i>'}</div>\
    <div class="detail-main">\
    <div class="eyebrow">\
    <span class="eyebrow-line">\
    </span> ${esc(movie.genre||'FILME').toLocaleUpperCase('pt-BR')}</div>\
    <h2>${esc(movie.title)}</h2>\
    <p class="detail-tagline">${esc(movie.tagline||movie.original_title||'')}</p>\
    <div class="detail-facts">\
    <span>${esc(movie.year||'')}</span>\
    <span>${esc(movie.runtime||'Longa-metragem')}</span>\
    <span class="hero-rating">\
    <i data-lucide="star">\
    </i>${Number(movie.rating||0).toFixed(1)} <small>TMDB</small>\
    </span>\
    </div>\
    <p class="detail-overview">${esc(movie.overview||'Sinopse não disponível.')}</p>\
    <p class="detail-director">${movie.director?`Direção <strong>${
    esc(movie.director)
  }</strong>`:''}</p>\
    <div class="detail-actions">\
    <button class="button button-primary" data-watch="${esc(movie.id)}">\
    <i data-lucide="${watched?'circle-check':'circle-plus'}">\
    </i>${watched?'Já assistido':'Marcar como assistido'}</button>\
    <button class="button button-glass" data-favorite="${esc(movie.id)}">\
    <i data-lucide="heart">\
    </i>${favorite?'Favoritado':'Favoritar'}</button>\
    <button class="button button-glass" data-add-library="${esc(movie.id)}">\
    <i data-lucide="library">\
    </i> Minha biblioteca</button>\
    </div>\
    <div class="rate-movie">\
    <span>SUA AVALIAÇÃO</span>\
    <div class="star-picker">${[1,2,3,4,5].map(n=>`<button data-rate="${esc(movie.id)}|${n}" aria-label="Avaliar ${n} estrelas" class="${n<=rating?'selected':''}">\
    <i data-lucide="star">\
    </i>\
    </button>`).join('')}</div>\
    <small>${rating?`Você deu ${
    rating
  }
  de 5 estrelas`:'Toque para avaliar'}</small>\
    </div>\
    </div>\
    </div>`;
  dialogContent.querySelector('[data-watch]')?.addEventListener('click', ()=>toggleWatched(movie.id));
  dialogContent.querySelector('[data-favorite]')?.addEventListener('click', ()=> {
    if (!movie) return;
    const added=library.toggle('favorites', movie);
    library.addActivity({
      movieId:movie.id, type:'favorite', date:'Agora', detail:added?'Adicionado aos favoritos':'Removido dos favoritos'
    }
    );
    toast(added?'Adicionado aos favoritos':'Removido dos favoritos');
    openMovie(id);
    render()
  }
  );
  dialogContent.querySelector('[data-add-library]')?.addEventListener('click', ()=> {
    library.upsert(movie);
    library.addActivity({
      movieId:movie.id, type:'watched', date:'Agora', detail:'Adicionado à biblioteca'
    }
    );
    toast('Adicionado à biblioteca');
    openMovie(id);
    render()
  }
  );
  dialogContent.querySelectorAll('[data-rate]').forEach(el=>el.addEventListener('click', ()=> {
    const [, value]=el.dataset.rate.split('|');
    library.rate(movie.id, Number(value), movie);
    library.addActivity({
      movieId:movie.id, type:'rated', date:'Agora', detail:`Você avaliou com ${value} estrelas`
    }
    );
    toast('Avaliação salva');
    openMovie(id);
    render()
  }
  ));
  icons();
  if(!dialog.open)dialog.showModal();
}

function toggleWatched(id) {
  const movie=film(id);
  if(!movie)return;
  const added=library.toggle('watched', movie);
  library.upsert(movie);
  library.addActivity({
    movieId:id, type:'watched', date:'Agora', detail:added?'Marcado como assistido':'Removido dos assistidos'
  }
  );
  toast(added?'Marcado como assistido':'Removido dos assistidos');
  if(dialog.open)openMovie(id);
  render();
}

function saveSettings(event) {
  event.preventDefault();
  const tmdbKey=page.querySelector('#tmdbKey').value.trim();
  if(!tmdbKey) {
    toast('Insira uma chave de API v3 do TMDB');
    return
  }
  state.loading=true;
  toast('Testando conexão com o TMDB...');
  createTmdbClient(tmdbKey).popularMovies().then(results=> {
    library.saveSettings({...library.settings(), tmdbKey});
    state.remoteMovies=results;
    state.loading=false;
    toast('TMDB conectado. Catálogo atualizado.');
    render()
  }
  ).catch(error=> {
    state.loading=false;
    toast(error.message);
    render()
  }
  );
}

function drawCharts() {
  if (!window.Chart) return;

  const collection = filteredMovies(
    library.getAll().map(movie => film(movie.id) || movie),
  );
  const years = {};
  const genres = {};

  collection.forEach(movie => {
    const year = movie.year || 'Sem ano';
    years[year] = (years[year] || 0) + 1;

    (movie.genres || [movie.genre]).forEach(genre => {
      genres[genre] = (genres[genre] || 0) + 1;
    });
  });

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#202129',
        titleColor: '#fff',
        bodyColor: '#c4c3ca',
        padding: 12,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        title: { display: true, text: 'Ano / mês', color: '#aaaab2' },
        ticks: { color: '#777984', font: { family: 'DM Sans' } },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Quantidade de filmes', color: '#aaaab2' },
        grid: { color: 'rgba(255,255,255,.055)' },
        ticks: {
          color: '#777984',
          precision: 0,
          font: { family: 'DM Sans' },
        },
      },
    },
  };
  const chartColors = [
    '#b49af7', '#8d9bf4', '#e7a4c6', '#83c4bd', '#eab87d', '#b0bf8a',
  ];

  const yearCanvas = document.querySelector('#yearChart');
  if (yearCanvas) {
    chartInstances.push(new Chart(yearCanvas, {
      type: 'bar',
      data: {
        labels: Object.keys(years),
        datasets: [{
          data: Object.values(years),
          backgroundColor: '#a78bfa',
          borderRadius: 6,
          maxBarThickness: 34,
        }],
      },
      options: commonOptions,
    }));
  }

  const genreCanvas = document.querySelector('#genreChart');
  if (genreCanvas) {
    chartInstances.push(new Chart(genreCanvas, {
      type: 'doughnut',
      data: {
        labels: Object.keys(genres),
        datasets: [{
          data: Object.values(genres),
          backgroundColor: chartColors,
          borderWidth: 0,
          hoverOffset: 5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#aaaab2',
              boxWidth: 8,
              boxHeight: 8,
              usePointStyle: true,
              padding: 16,
              font: { family: 'DM Sans', size: 11 },
            },
          },
        },
      },
    }));
  }

  const activityCanvas = document.querySelector('#activityChart');
  if (activityCanvas) {
    const now = new Date();
    const months = Array.from({length:6}, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1); return {key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label:d.toLocaleDateString('pt-BR',{month:'short'})}; });
    const watchedByMonth = Object.fromEntries(months.map(m => [m.key, 0]));
    library.getActivity().filter(entry => entry.type === 'watched' && /Marcado como assistido/i.test(entry.detail || '') && entry.createdAt).forEach(entry => {
      const date = new Date(entry.createdAt);
      if (!Number.isNaN(date.getTime())) { const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`; if (key in watchedByMonth) watchedByMonth[key]++; }
    });
    chartInstances.push(new Chart(activityCanvas, {
      type: 'line',
      data: {
        labels: months.map(m => m.label),
        datasets: [{
          label: 'Assistidos',
          data: months.map(m => watchedByMonth[m.key]),
          borderColor: '#a78bfa',
          backgroundColor: 'rgba(167,139,250,.12)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#c4b5fd',
          pointRadius: 4,
        }],
      },
      options: commonOptions,
    }));
  }
}

async function searchRemote(query) {
  const key=library.apiKey();
  if(!key||!query.trim())return;
  try {
    const result=await createTmdbClient(key).searchMovies(query);
    state.remoteMovies=result;
    state.source='remote';
    if(state.route==='dashboard')setRoute('explorar');
    else render()
  } catch(error) {
    toast(error.message)
  }
}

function drawPersonalCharts() {
  if (!window.Chart || !state.diaryEntries.length || state.diaryLoading || state.diaryError) return;
  const entries = state.diaryEntries;
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', ''),
    };
  });
  const monthly = new Map(months.map(month => [month.key, 0]));
  const scores = [0, 0, 0, 0, 0];
  entries.forEach(entry => {
    const month = String(entry.watched_on || '').slice(0, 7);
    if (monthly.has(month)) monthly.set(month, monthly.get(month) + 1);
    const score = Number(entry.score);
    if (Number.isInteger(score) && score >= 1 && score <= 5) scores[score - 1] += 1;
  });
  const monthlyCanvas = page.querySelector('#personalMonthChart');
  if (monthlyCanvas) chartInstances.push(new Chart(monthlyCanvas, {
    type: 'bar',
    data: {
      labels: months.map(month => month.label),
      datasets: [{ label: 'Filmes assistidos', data: months.map(month => monthly.get(month.key)), backgroundColor: '#a78bfa', borderRadius: 7, maxBarThickness: 45 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#24212d', titleColor: '#fff', bodyColor: '#ddd4ee' } },
      scales: {
        x: { title: { display: true, text: 'Mês em que assistiu', color: '#a9a3b8' }, ticks: { color: '#b8b2c4' }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: '#b8b2c4', precision: 0 }, title: { display: true, text: 'Quantidade de sessões', color: '#a9a3b8' }, grid: { color: 'rgba(255,255,255,.07)' } },
      },
    },
  }));
  const scoresCanvas = page.querySelector('#personalScoreChart');
  if (scoresCanvas) chartInstances.push(new Chart(scoresCanvas, {
    type: 'doughnut',
    data: {
      labels: ['1 estrela', '2 estrelas', '3 estrelas', '4 estrelas', '5 estrelas'],
      datasets: [{ label: 'Filmes avaliados', data: scores, backgroundColor: ['#8d9bf4', '#7dd3fc', '#83c4bd', '#e7a4c6', '#a78bfa'], borderWidth: 0, hoverOffset: 6 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '68%',
      plugins: {
        legend: { position: 'right', labels: { color: '#c5bbd7', font: { family: 'DM Sans', size: 11 }, usePointStyle: true, boxWidth: 9, padding: 14 } },
        tooltip: { callbacks: { label: context => `${context.label}: ${context.parsed} filme(s)` } },
      },
    },
  }));
}

function drawPublicCharts() {
  if (!window.Chart || state.publicLoading || state.publicError || !publicMoviesFiltered().length) return;
  const films = publicMoviesFiltered();
  const byDecade = new Map();
  const byDirector = new Map();
  const scoreByDecade = new Map();
  films.forEach(movie => {
    if (movie.year) {
      const key = Math.floor(movie.year / 10) * 10;
      byDecade.set(key, (byDecade.get(key) || 0) + 1);
      if (movie.rtScore !== null) {
        const scores = scoreByDecade.get(key) || [];
        scores.push(movie.rtScore);
        scoreByDecade.set(key, scores);
      }
    }
    const director = movie.director || 'Não informado';
    byDirector.set(director, (byDirector.get(director) || 0) + 1);
  });
  const decades = [...byDecade.keys()].sort((a,b) => a-b);
  const directors = [...byDirector.entries()].sort((a,b) => b[1] - a[1]);
  const colors = ['#a78bfa','#7dd3fc','#f0abcf','#86efac','#fbbf24','#c4b5fd','#fca5a5','#67e8f9'];
  const baseOptions = (yTitle, xTitle, max) => ({
    responsive:true, maintainAspectRatio:false,
    plugins: { legend:{display:false}, tooltip:{backgroundColor:'#23232e', titleColor:'#fff', bodyColor:'#d6d2e0'} },
    scales: {
      x:{ title:{display:true,text:xTitle,color:'#aba7b8'}, ticks:{color:'#aaa5b4'}, grid:{display:false}},
      y:{ beginAtZero:true, ...(max ? {max} : {}), title:{display:true,text:yTitle,color:'#aba7b8'}, ticks:{color:'#aaa5b4', precision: max ? undefined : 0}, grid:{color:'rgba(255,255,255,.07)'}}
    }
  });
  const yearChart = document.getElementById('catalogDecadeChart');
  if (yearChart) chartInstances.push(new Chart(yearChart, {
    type:'bar',
    data:{ labels:decades.map(d => `${d}s`), datasets:[{label:'Filmes',data:decades.map(d=>byDecade.get(d)),backgroundColor:'#a78bfa',borderRadius:7,maxBarThickness:48}] },
    options: baseOptions('Quantidade de filmes','Década de lançamento'),
  }));
  const directorChart = document.getElementById('catalogDirectorChart');
  if (directorChart) chartInstances.push(new Chart(directorChart, {
    type:'doughnut',
    data:{labels:directors.map(d=>d[0]),datasets:[{label:'Filmes',data:directors.map(d=>d[1]),backgroundColor:directors.map((_,i)=>colors[i % colors.length]),borderWidth:0}]},
    options:{ responsive:true, maintainAspectRatio:false, cutout:'65%',plugins:{
      legend:{position:'right',labels:{color:'#b8b2c4',font:{family:'DM Sans',size:11},usePointStyle:true,boxWidth:8}},
      tooltip:{callbacks:{label:context => `${context.label}: ${context.parsed} filme(s)`}},
    }},
  }));
  const scoreChart = document.getElementById('catalogScoreChart');
  if (scoreChart) chartInstances.push(new Chart(scoreChart, {
    type:'line',
    data:{ labels:decades.map(d => `${d}s`),datasets:[{
      label:'Nota média (%)',data:decades.map(d => {
        const scores=scoreByDecade.get(d);
        return scores?.length ? Number((scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1)) : null;
      }), borderColor:'#a78bfa', backgroundColor:'rgba(167,139,250,.1)', pointBackgroundColor:'#d8b4fe',pointRadius:4,tension:.25,fill:true,spanGaps:false,
    }]},
    options:baseOptions('Pontuação média (%)','Década de lançamento',100),
  }));
}

async function refreshPublicFilms() {
  state.publicLoading = true;
  state.publicError = '';
  render();
  try {
    const films = await loadPublicFilms();
    if (!films.length) throw new Error('A API não retornou filmes');
    state.publicFilms = films;
  } catch (error) {
    state.publicError = error.message || 'Erro ao consultar os filmes públicos';
  } finally { state.publicLoading = false; render(); }
}

async function refreshDiary() {
  const userAtStart = getActiveUser()?.id;
  if (!userAtStart) {
    state.diaryEntries = [];
    state.diaryError = '';
    state.diaryLoading = false;
    state.editingDiaryId = null;
    render();
    return;
  }
  state.diaryLoading = true;
  state.diaryError = '';
  render();
  try {
    const entries = await listDiaryEntries();
    if (getActiveUser()?.id === userAtStart) state.diaryEntries = entries;
  } catch (error) {
    if (getActiveUser()?.id === userAtStart) state.diaryError = error.message || 'Falha ao carregar o diário';
  } finally {
    if (getActiveUser()?.id === userAtStart) { state.diaryLoading = false; render(); }
  }
}
window.addEventListener('movie-auth-changed', () => {
  state.diaryEntries = [];
  state.diaryError = '';
  state.editingDiaryId = null;
  refreshDiary();
});


document.addEventListener('click', event=> {
  const route=event.target.closest('[data-route]');
  if(route&&route.closest('.primary-nav')) {
    event.preventDefault();
    setRoute(route.dataset.route);
    document.querySelector('#sidebar').classList.remove('open')
  }
}
);
document.querySelector('#globalSearch').addEventListener('input', event=> {
  state.query=event.target.value;
  if(state.route!=='explorar')setRoute('explorar');
  else render()
}
);
document.querySelector('#globalSearch').addEventListener('keydown', event=> {
  if(event.key==='Enter')searchRemote(event.currentTarget.value)
}
);

document.addEventListener('keydown', event=> {
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k') {
    event.preventDefault();
    document.querySelector('#globalSearch').focus()
  }
  if(event.key==='Escape'&&dialog.open)dialog.close()
}
);
document.querySelector('#menuToggle').addEventListener('click', ()=>document.querySelector('#sidebar').classList.toggle('open'));
document.querySelector('#dialogClose').addEventListener('click', ()=>dialog.close());
dialog.addEventListener('click', event=> {
  if(event.target===dialog)dialog.close()
}
);
window.addEventListener('hashchange', ()=> {
  const route=location.hash.slice(1);
  if(routeNames[route]&&state.route!==route) {
    state.route=route;
    render()
  }
}
);

const initial=location.hash.slice(1);
if(routeNames[initial])state.route=initial;
render();
refreshPublicFilms();
if (getActiveUser()) refreshDiary();
