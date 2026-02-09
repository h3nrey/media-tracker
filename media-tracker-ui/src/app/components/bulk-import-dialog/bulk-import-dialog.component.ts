import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, X, Upload, Info, AlertCircle, CheckCircle, Download, Loader2 } from 'lucide-angular';
import { CategoryService } from '../../services/status.service';
import { Category } from '../../models/status.model';
import { MediaType } from '../../models/media-type.model';
import { SelectComponent } from '../ui/select/select';
import { ExcelExportService } from '../../services/excel-export.service';
import { MediaService } from '../../services/media.service';
import { TmdbService } from '../../services/tmdb.service';
import { MovieService } from '../../services/movie.service';
import { AnimeService } from '../../services/anime.service';
import { GameService } from '../../services/game.service';
import { IgdbService } from '../../services/igdb.service';
import { environment } from '../../../environments/environment';
import { MediaItem } from '../../models/media-type.model';

@Component({
  selector: 'app-bulk-import-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, SelectComponent],
  templateUrl: './bulk-import-dialog.component.html',
  styleUrl: './bulk-import-dialog.component.scss'
})
export class BulkImportDialogComponent {
  private categoryService = inject(CategoryService);
  private excelService = inject(ExcelExportService);
  private mediaService = inject(MediaService);
  private tmdbService = inject(TmdbService);
  private movieService = inject(MovieService);
  private animeService = inject(AnimeService);
  private gameService = inject(GameService);
  private igdbService = inject(IgdbService);
  
  MediaType = MediaType;
  selectedMediaType = signal<MediaType>(MediaType.MOVIE);

  isOpen = signal(false);
  categories = signal<Category[]>([]);
  selectedCategoryId = signal<number | null>(null);
  
  mediaTypeOptions = [
    { value: MediaType.ANIME, label: 'Anime' },
    { value: MediaType.MOVIE, label: 'Filme' },
    { value: MediaType.GAME, label: 'Jogo' }
  ];

  categoryOptions = computed(() => {
    return this.categories().map(c => ({
      value: c.id!, 
      label: c.name
    }));
  });

  importData = '';
  
  status = signal<'idle' | 'processing' | 'success' | 'error'>('idle');
  message = signal('');
  progress = signal(0);
  logs = signal<Array<{ message: string; type: 'info' | 'success' | 'error' }>>([]);

  readonly XIcon = X;
  readonly UploadIcon = Upload;
  readonly InfoIcon = Info;
  readonly AlertIcon = AlertCircle;
  readonly CheckIcon = CheckCircle;
  readonly DownloadIcon = Download;
  readonly LoaderIcon = Loader2;

  constructor() {
    this.categoryService.getAllCategories$().subscribe(cats => {
      this.categories.set(cats);
      if (cats.length > 0 && !this.selectedCategoryId()) {
        this.selectedCategoryId.set(cats[0].id!);
      }
    });
  }

  open() {
    this.isOpen.set(true);
    this.status.set('idle');
    this.message.set('');
    this.importData = '';
    this.progress.set(0);
    this.logs.set([]);
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.isOpen.set(false);
    document.body.style.overflow = '';
  }

  getTitleCount(): number {
    if (!this.importData.trim()) return 0;
    return this.importData
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .length;
  }

  addLog(message: string, type: 'info' | 'success' | 'error' = 'info') {
    this.logs.update(logs => [...logs, { message, type }]);
  }

  async exportData() {
    try {
      this.status.set('processing');
      this.message.set('Gerando exportação...');
      
      const mediaItems = await this.mediaService.getAllMedia(this.selectedMediaType());
      
      await this.excelService.exportMedia(
        mediaItems, 
        this.selectedMediaType(), 
        this.categories()
      );
      
      this.status.set('success');
      this.message.set('Exportação concluída com sucesso.');
      
      setTimeout(() => {
        if (this.status() === 'success') {
          this.status.set('idle');
          this.message.set('');
        }
      }, 3000);

    } catch (error) {
      console.error('Export failed:', error);
      this.status.set('error');
      this.message.set('Falha ao exportar dados.');
    }
  }

  async processImport() {
    if (!this.importData.trim() || !this.selectedCategoryId()) {
      this.status.set('error');
      this.message.set('Por favor, selecione uma categoria e forneça os títulos.');
      return;
    }

    const titles = this.importData
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (titles.length === 0) {
      this.status.set('error');
      this.message.set('Nenhum título válido encontrado.');
      return;
    }

    this.status.set('processing');
    this.logs.set([]);
    this.progress.set(0);
    
    const categoryId = this.selectedCategoryId();
    console.log('📋 Starting import with category ID:', categoryId);
    console.log('📋 Available categories:', this.categories());
    
    this.addLog(`Iniciando importação de ${titles.length} título(s)...`, 'info');
    this.addLog(`Categoria selecionada: ID ${categoryId}`, 'info');

    let successCount = 0;
    let failCount = 0;
    const delayMs = 500; // Rate limiting

    for (let i = 0; i < titles.length; i++) {
      const title = titles[i];
      const currentProgress = ((i + 1) / titles.length) * 100;
      this.progress.set(currentProgress);
      this.message.set(`Processando ${i + 1}/${titles.length}: ${title}`);
      
      this.addLog(`[${i + 1}/${titles.length}] Buscando: ${title}`, 'info');

      try {
        if (this.selectedMediaType() === MediaType.MOVIE) {
          await this.importMovie(title);
          successCount++;
          this.addLog(`  ✓ Filme adicionado com sucesso`, 'success');
        } else if (this.selectedMediaType() === MediaType.ANIME) {
          await this.importAnime(title);
          successCount++;
          this.addLog(`  ✓ Anime adicionado com sucesso`, 'success');
        } else if (this.selectedMediaType() === MediaType.GAME) {
          await this.importGame(title);
          successCount++;
          this.addLog(`  ✓ Jogo adicionado com sucesso`, 'success');
        }

        // Rate limiting
        if (i < titles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error: any) {
        failCount++;
        this.addLog(`  ✗ Erro: ${error.message || 'Não encontrado'}`, 'error');
      }
    }

    this.status.set('success');
    this.message.set(`Importação concluída! ${successCount} adicionado(s), ${failCount} falhou(aram).`);
    this.addLog(`\n=== Importação Concluída ===`, 'info');
    this.addLog(`✓ Sucesso: ${successCount}`, 'success');
    if (failCount > 0) {
      this.addLog(`✗ Falhas: ${failCount}`, 'error');
    }
    this.importData = '';
  }

  private async importMovie(title: string): Promise<void> {
    const results = await this.tmdbService.searchMovies(title).toPromise();
    
    if (!results || results.length === 0) {
      throw new Error('Nenhum resultado encontrado no TMDB');
    }

    const movie = results[0];
    this.addLog(`  → Encontrado: ${movie.title} (${movie.release_date?.substring(0, 4) || 'N/A'})`, 'info');
    
    const categoryId = this.selectedCategoryId();
    console.log('🎬 Importing movie with category ID:', categoryId);
    this.addLog(`  → Usando categoria ID: ${categoryId}`, 'info');
    
    await this.movieService.addMovieFromTmdb(movie, categoryId!);
  }

  private async importAnime(title: string): Promise<void> {
    // TMDB doesn't have a separate searchAnime, we search TV shows
    const url = `https://api.themoviedb.org/3/search/tv?api_key=${environment.tmdbApiKey}&query=${encodeURIComponent(title)}&language=pt-BR`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      throw new Error('Nenhum resultado encontrado no TMDB');
    }

    const tvShow = data.results[0];
    this.addLog(`  → Encontrado: ${tvShow.name} (${tvShow.first_air_date?.substring(0, 4) || 'N/A'})`, 'info');
    
    // Create anime object matching the service's expected format
    const animeData: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'> = {
      mediaTypeId: MediaType.ANIME,
      title: tvShow.name,
      coverImage: tvShow.poster_path ? `https://image.tmdb.org/t/p/w500${tvShow.poster_path}` : undefined,
      bannerImage: tvShow.backdrop_path ? `https://image.tmdb.org/t/p/original${tvShow.backdrop_path}` : undefined,
      externalId: tvShow.id,
      externalApi: 'tmdb',
      statusId: this.selectedCategoryId()!,
      score: 0,
      genres: tvShow.genre_ids || [],
      releaseYear: tvShow.first_air_date ? new Date(tvShow.first_air_date).getFullYear() : undefined,
      progressCurrent: 0,
      progressTotal: tvShow.number_of_episodes || 0,
      isDeleted: false
    };
    
    await this.animeService.addAnime(animeData);
  }

  private async importGame(title: string): Promise<void> {
    const results = await this.igdbService.searchGames(title).toPromise();
    
    if (!results || results.length === 0) {
      throw new Error('Nenhum resultado encontrado no IGDB');
    }

    const game = results[0];
    this.addLog(`  → Encontrado: ${game.name} (${game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : 'N/A'})`, 'info');
    
    await this.gameService.addGameFromIgdb(game, this.selectedCategoryId()!);
  }
}
