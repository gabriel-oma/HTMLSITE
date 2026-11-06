import { getSupabaseClient, getActiveUser } from './auth.js';

function sessionClient() {
  const client = getSupabaseClient();
  const user = getActiveUser();
  if (!client || !user) throw new Error('Faça login para usar o diário de filmes.');
  return { client, user };
}

function failIfError({ error }) {
  if (error) {
    if (error.code === 'PGRST204' || error.code === '42703' || /movie_year|poster_url/i.test(error.message || '')) {
      throw new Error('Faltam as colunas de ano e pôster. Execute supabase/atualizar-diario.sql no SQL Editor do Supabase.');
    }
    if (error.code === '42P01' || error.code === 'PGRST205') {
      throw new Error('A tabela movie_diary ainda não existe. Execute supabase/diario.sql no SQL Editor do Supabase.');
    }
    throw new Error(error.message || 'Não foi possível acessar seu diário.');
  }
}

export async function listDiaryEntries() {
  const { client, user } = sessionClient();
  const response = await client.from('movie_diary')
    .select('id,movie_title,movie_year,poster_url,watched_on,score,note,created_at')
    .eq('user_id', user.id)
    .order('watched_on', { ascending: false })
    .limit(150);
  failIfError(response);
  return response.data || [];
}

export async function createDiaryEntry(entry) {
  const { client, user } = sessionClient();
  const response = await client.from('movie_diary').insert({
    user_id: user.id,
    movie_title: entry.movie_title,
    movie_year: entry.movie_year,
    poster_url: entry.poster_url,
    watched_on: entry.watched_on,
    score: entry.score,
    note: entry.note,
  });
  failIfError(response);
}

export async function updateDiaryEntry(id, entry) {
  const { client, user } = sessionClient();
  const response = await client.from('movie_diary')
    .update({ movie_title: entry.movie_title, movie_year: entry.movie_year, poster_url: entry.poster_url, watched_on: entry.watched_on, score: entry.score, note: entry.note })
    .eq('id', id)
    .eq('user_id', user.id);
  failIfError(response);
}

export async function deleteDiaryEntry(id) {
  const { client, user } = sessionClient();
  const response = await client.from('movie_diary')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  failIfError(response);
}
