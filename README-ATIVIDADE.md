# Movie Explorer — A02 Dashboard HTML, CSS e JavaScript

Projeto com dashboard usando **Chart.js**, **API pública real**, autenticação e **CRUD REST** no Supabase.

## ATENÇÃO ANTES DE COPIAR OS ARQUIVOS

**NÃO substitua o seu `auth-config.js` que já funciona!** O ZIP não inclui esse arquivo de propósito. Preserve o `auth-config.js` existente na sua pasta `HTMLSITE`; ele contém a Project URL e a chave pública do seu Supabase. Para instalar em um projeto novo, crie `auth-config.js` a partir de `auth-config.example.js` e preencha suas próprias credenciais públicas.

## CONFIGURAÇÃO OBRIGATÓRIA: habilitar CRUD no Supabase

1. Abra https://supabase.com/dashboard e selecione o projeto que você **já usa para o login**.
2. No menu lateral, acesse **SQL Editor** > **New query**.
3. Copie todo o conteúdo do arquivo `supabase/diario.sql`, cole no editor e clique em **Run**.
4. Isso cria a tabela `movie_diary` com as permissões **RLS**: o usuário só pode consultar, criar, editar e excluir os **próprios registros**.
5. Confirme se o login por e-mail e a `Site URL` da Vercel continuam configurados no Supabase.
6. Volte ao Movie Explorer, faça login e abra **Diário na nuvem**. Teste as quatro operações.

O Supabase funciona como backend com API REST via biblioteca `supabase-js` (PostgREST), usando a sessão autenticada. A publishable key pode aparecer no JavaScript; **não** exponha chaves `sb_secret_` ou `service_role`.

## O que foi implementado e onde encontrar

| Requisito | Implementação | Onde ver |
|---|---|---|
| Dashboard com 3 gráficos Chart.js e 2+ tipos | Barras, rosca e linha; dados de filmes reais obtidos por HTTP | **Início** > Dados reais do cinema |
| Títulos, rótulos e unidades | Décadas/quantidade de filmes; diretores/filmes; décadas/pontuação (%) | Gráficos do Início |
| Dados reais, não inventados | Studio Ghibli API (filmes, lançamentos, diretores, avaliações RT), sem chave; origem indicada | `catalogo-publico.js` |
| JS interativo | Filtros por diretor e década; atualização da API; pesquisa, gênero, ano e nota | Dashboard e Explorar |
| CRUD integrado ao tema, via REST | Cadastrar/consultar/editar/excluir filmes assistidos com nota, data, comentário | **Diário na nuvem**, `diario-api.js` |
| Back-end com autorização | Supabase Auth + Postgres + RLS por usuário | `supabase/diario.sql` |
| API pública | Studio Ghibli API; TMDB disponível adicionalmente se configurado | `catalogo-publico.js`, `api.js` |
| Layout responsivo | CSS adaptado para celular e desktop, fontes originais | `styles.css` |
| Deploy | GitHub e Vercel | Instruções abaixo |

**Observação:** o catálogo fixo inicial, se aparecer, é **demonstrativo**. O Dashboard de dados reais utiliza apenas os dados retornados pela API externa. Estatísticas pessoais derivam de ações reais do usuário (quando existirem). O Diário é salvo na nuvem; os favoritos e a biblioteca anterior continuam no navegador e agora são separados por conta **nesse navegador**, não sincronizados entre dispositivos.

Se a Studio Ghibli API estiver temporariamente indisponível, aparece uma mensagem honesta em vez de gráficos preenchidos com valores inventados. O botão **Atualizar API** tenta novamente.

## Publicar pelo GitHub / Vercel

1. Extraia o ZIP.
2. Copie os arquivos para sua pasta de trabalho `HTMLSITE`, **preservando seu `auth-config.js` que já está preenchido**, e mantendo também a pasta `.git` do repositório.
3. Abra terminal nessa pasta e execute:

```sh
git add .
git commit -m "Dashboard Chart.js e CRUD Supabase"
git push origin main
```

4. No Vercel, abra **Deployments**. Se o projeto estiver ligado à branch `main`, o novo commit gera novo deploy.
5. Teste o link HTTPS do site. Em `file://` o navegador bloqueia módulos; use a Vercel ou Live Server.

## Testar a atividade (checklist de demonstração)

- [ ] Criar conta e entrar, visualizar iniciais e nome.
- [ ] Em **Início**, observar três gráficos com fontes reais.
- [ ] Filtrar os gráficos por década e diretor e voltar a **Todas**.
- [ ] Em **Diário na nuvem**, criar um registro com filme, data, nota e comentário.
- [ ] Conferir listagem; editar a nota; excluir o registro; recarregar para comprovar persistência.
- [ ] Sair e entrar em outra conta, confirmar que os registros da primeira não aparecem.
- [ ] Demonstrar resposta da API pública sem precisar cadastrar uma chave.
- [ ] Testar responsividade pelo DevTools no celular.
- [ ] Entregar link GitHub, link da Vercel, ZIP e vídeo de até 4 minutos (gravar separadamente).

## Roteiro sugerido para o vídeo (até 4 minutos)

1. **0:00–0:30:** mostrar a página na Vercel e o login Supabase.
2. **0:30–1:30:** abrir Início; explicar API pública, três gráficos e filtrar diretor/década.
3. **1:30–2:45:** demonstrar CRUD completo: criar, listar, editar e excluir um registro no Diário.
4. **2:45–3:25:** visitar Estatísticas, Explorar, biblioteca e mostrar Chart.js com dados pessoais.
5. **3:25–3:55:** mencionar GitHub, responsividade, SQL com RLS e o deploy Vercel.

## Referências técnicas

- Studio Ghibli API: https://ghibliapi.dev/
- Chart.js: https://www.chartjs.org/docs/latest/
- Supabase Data API: https://supabase.com/docs/guides/api
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security

> Aplicativo acadêmico de exemplo. O Supabase precisa estar configurado pelo dono da conta; nenhum dado do seu servidor é criado apenas por extrair o ZIP.
