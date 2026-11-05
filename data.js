// Catálogo demonstrativo. As notas são valores de exemplo, não dados em tempo real.
const seed = [
  [1,'Duna: Parte Dois','Dune: Part Two',2024,'Ficção científica',8.5,'8.4k','2h 46min','Denis Villeneuve','1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg','Paul Atreides se une a Chani e aos Fremen enquanto busca vingança contra os conspiradores que destruíram sua família. Diante da escolha entre o amor de sua vida e o destino do universo, ele tenta evitar um futuro terrível que só ele pode prever.','O destino está escrito nas areias.',['Ficção científica','Aventura']],
  [2,'Oppenheimer','Oppenheimer',2023,'Drama',8.3,'9.1k','3h 00min','Christopher Nolan','ptpr0kGAckfQkJeJIt8st5dglvd.jpg','A história do físico J. Robert Oppenheimer e seu papel no desenvolvimento da bomba atômica durante a Segunda Guerra Mundial.','O mundo para sempre mudou.',['Drama','História']],
  [3,'Pobres Criaturas','Poor Things',2023,'Ficção científica',7.8,'3.2k','2h 21min','Yorgos Lanthimos','kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg','A incrível história e a fantástica evolução de Bella Baxter, uma jovem trazida de volta à vida pelo brilhante e pouco ortodoxo Dr. Godwin Baxter.','Uma história de amor e descoberta.',['Ficção científica','Romance']],
  [4,'Anatomia de uma Queda','Anatomy of a Fall',2023,'Suspense',7.7,'2.6k','2h 31min','Justine Triet','kQs6keheMwCxJxrzV83VUwFtHkB.jpg','A vida de uma mulher vira de cabeça para baixo quando seu marido morre em circunstâncias misteriosas, e ela se torna a principal suspeita.','A verdade nunca é tão simples.',['Suspense','Drama']],
  [5,'Vidas Passadas','Past Lives',2023,'Romance',7.9,'1.8k','1h 46min','Celine Song','k3waqVXSnvCZWfJYNtdamTgTtTA.jpg','Dois amigos de infância se reencontram décadas depois em Nova York e refletem sobre o destino, o amor e as escolhas que moldaram suas vidas.','Algumas vidas se cruzam para sempre.',['Romance','Drama']],
  [6,'Homem-Aranha: Através do Aranhaverso','Spider-Man: Across the Spider-Verse',2023,'Animação',8.6,'6.7k','2h 20min','Joaquim Dos Santos','8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg','Miles Morales embarca em uma aventura épica que atravessa o multiverso ao lado de Gwen Stacy e uma nova equipe de Pessoas-Aranha.','Todo universo tem um começo.',['Animação','Ação']],
  [7,'Barbie','Barbie',2023,'Comédia',7.0,'7.5k','1h 54min','Greta Gerwig','iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg','Depois de ser expulsa da Barbielândia por não ser perfeita o bastante, Barbie parte para o mundo humano em busca da verdadeira felicidade.','Ela é tudo. Ele é só Ken.',['Comédia','Aventura']],
  [8,'Os Rejeitados','The Holdovers',2023,'Comédia',8.0,'1.4k','2h 13min','Alexander Payne','VHSzLwnGvJZV6zE8i8e1JX1xx.jpg','Um professor rabugento de um internato fica para trás durante as férias de Natal e acaba criando um vínculo inesperado com um aluno e a chefe da cozinha.','Às vezes, estar perdido é o começo.',['Comédia','Drama']],
  [9,'Interestelar','Interstellar',2014,'Ficção científica',8.7,'11k','2h 49min','Christopher Nolan','gEU2QniE6E77NI6lCU6MxlNBvIx.jpg','Uma equipe de exploradores viaja além desta galáxia para descobrir se a humanidade tem futuro entre as estrelas.','O amor é a única coisa que transcende o tempo e o espaço.',['Ficção científica','Drama']],
  [10,'O Grande Hotel Budapeste','The Grand Budapest Hotel',2014,'Comédia',8.1,'5.1k','1h 40min','Wes Anderson','eWdyYQreja6JGCzqHWXpWHDrrPo.jpg','As aventuras de Gustave H., lendário concierge de um famoso hotel europeu, e Zero Moustafa, o mensageiro que se torna seu amigo mais confiável.','Uma história de roubo, assassinato e confeitaria.',['Comédia','Aventura']],
  [11,'A Chegada','Arrival',2016,'Ficção científica',7.9,'6.3k','1h 56min','Denis Villeneuve','x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg','Uma linguista é recrutada pelo Exército para se comunicar com formas de vida alienígenas que chegaram à Terra.','Por que eles estão aqui?',['Ficção científica','Drama']],
  [12,'A Viagem de Chihiro','Spirited Away',2001,'Animação',8.5,'6.2k','2h 05min','Hayao Miyazaki','39wmItIWsg5sZMyRUHLkWBcuVCM.jpg','Durante a mudança para uma nova cidade, Chihiro entra em um mundo mágico governado por deuses, bruxas e espíritos.','A jornada de uma vida.',['Animação','Fantasia']],
];
export const movies = seed.map(([id,title,original_title,year,genre,rating,votes,runtime,director,poster,overview,tagline,genres]) => ({
  id,title,original_title,year,genre,rating,votes,runtime,director,
  poster:`https://image.tmdb.org/t/p/w500/${poster}`,overview,tagline,genres,
  ...(id === 1 ? {featured:true,backdrop:'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg'} : {}),
}));
export const activitySeed = [
  {movieId:6,type:'watched',date:'Exemplo',detail:'Marcado como assistido'},
  {movieId:2,type:'rated',date:'Exemplo',detail:'Você avaliou com 5 estrelas'},
  {movieId:5,type:'favorite',date:'Exemplo',detail:'Adicionado aos favoritos'},
];
