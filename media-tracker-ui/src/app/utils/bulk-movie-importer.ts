import { MovieService } from '../services/movie.service';
import { TmdbService } from '../services/tmdb.service';
import { inject } from '@angular/core';

export const movies = [
  "Cidade de Deus",
  "Meninas Malvadas",
  "O jogo da imitação",
  "Pulp Fiction",
  "O Auto da Compadecida",
  "Tropa de elite",
  "Que horas ela volta",
  "2 filhos de francisco",
  "Minha mãe é uma peça",
  "Forrest Gump",
  "Clube da luta",
  "Parasita",
  "Tempos modernos",
  "Oldboy",
  "Encantada",
  "Oppenheimer",
  "A Laranja Mecânica",
  "Taxi Driver",
  "O Lobo de Wall Street",
  "The King",
  "O Show de Truman",
  "Monty Python and the Holy Grail",
  "Monty Python Life of Brian",
  "V de Vendetta",
  "Prenda-me se for capaz",
  "Harry Potter and the Philosopher's Stone",
  "Harry Potter and the Chamber of Secrets",
  "Harry Potter and the Prisoner of Azkaban",
  "Harry Potter and the Goblet of Fire",
  "Harry Potter and the Order of the Phoenix",
  "Harry Potter and the Half-Blood Prince",
  "Harry Potter and the Deathly Hallows: Part 1",
  "Harry Potter and the Deathly Hallows: Part 2",
  "Pirates of the Caribbean: The Curse of the Black Pearl",
  "Pirates of the Caribbean: Dead Man's Chest",
  "Pirates of the Caribbean: At World's End",
  "Pirates of the Caribbean: On Stranger Tides",
  "A Rede Social",
  "The Hunger Games",
  "Jumanji",
  "Jumanji: Welcome to the Jungle",
  "Eu sou a lenda",
  "300",
  "Godzilla",
  "2012",
  "Fast & Furious",
  "Fast Five",
  "Fast & Furious 6",
  "Kingsman: The Secret Service",
  "Lucy",
  "Free Guy",
  "The Mask",
  "G-Force",
  "The Karate Kid",
  "The Karate Kid Part II",
  "The Karate Kid",
  "Titanic",
  "Alice in Wonderland",
  "It",
  "The Father",
  "Django Unchained",
  "The Pursuit of Happyness",
  "Jojo Rabbit",
  "The Perks of Being a Wallflower",
  "Bohemian Rhapsody",
  "Marriage Story",
  "Life of Pi",
  "Get Out",
  "Willy Wonka & the Chocolate Factory",
  "Charlie and the Chocolate Factory",
  "Home Alone",
  "The Count of Monte Cristo",
  "The Boy in the Striped Pyjamas",
  "The Theory of Everything",
  "American Psycho",
  "Superbad",
  "Scott Pilgrim vs. the World",
  "The Greatest Showman",
  "Neighbors",
  "Inglourious Basterds",
  "Zombieland",
  "We Need to Talk About Kevin",
  "Juno",
  "Unbreakable",
  "Split",
  "Glass",
  "El Camino: A Breaking Bad Movie",
  "Don't Look Up",
  "A Quiet Place",
  "Scary Movie",
  "The Hangover",
  "Curse of Chucky",
  "Até que a sorte nos separe",
  "World War Z",
  "The Witch",
  "Matilda",
  "The Platform",
  "Jumper",
  "Pacific Rim",
  "Annabelle",
  "The Babysitter",
  "John Carter",
  "Enola Holmes",
  "Hitch",
  "Esposa de Mentirinha",
  "You Don't Mess with the Zohan"
];

export class BulkMovieImporter {
  private tmdbService: TmdbService;
  private movieService: MovieService;

  constructor(tmdbService: TmdbService, movieService: MovieService) {
    this.tmdbService = tmdbService;
    this.movieService = movieService;
  }

  async importAllMovies(statusId: number = 1, delayMs: number = 500): Promise<void> {
    console.log(`Starting bulk import of ${movies.length} movies...`);
    let successCount = 0;
    let failCount = 0;
    const failed: string[] = [];

    for (let i = 0; i < movies.length; i++) {
      const movieTitle = movies[i];
      console.log(`[${i + 1}/${movies.length}] Searching for: ${movieTitle}`);

      try {
        // Search for the movie
        const results = await this.tmdbService.searchMovies(movieTitle).toPromise();
        
        if (results && results.length > 0) {
          const firstResult = results[0];
          console.log(`  ✓ Found: ${firstResult.title} (${firstResult.release_date?.substring(0, 4) || 'N/A'})`);
          
          // Add the movie to the library
          await this.movieService.addMovieFromTmdb(firstResult, statusId);
          successCount++;
          console.log(`  ✓ Added to library`);
        } else {
          console.log(`  ✗ No results found`);
          failCount++;
          failed.push(movieTitle);
        }

        // Add delay to avoid rate limiting
        if (i < movies.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        console.error(`  ✗ Error adding ${movieTitle}:`, error);
        failCount++;
        failed.push(movieTitle);
      }
    }

    console.log('\n=== Import Complete ===');
    console.log(`✓ Successfully added: ${successCount}`);
    console.log(`✗ Failed: ${failCount}`);
    
    if (failed.length > 0) {
      console.log('\nFailed movies:');
      failed.forEach(title => console.log(`  - ${title}`));
    }
  }
}
