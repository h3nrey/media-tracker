import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TmdbService } from '../../services/tmdb.service';
import { MovieService } from '../../services/movie.service';
import { BulkMovieImporter, movies } from '../../utils/bulk-movie-importer';
import { LucideAngularModule, Upload, CheckCircle, XCircle, Loader } from 'lucide-angular';

@Component({
  selector: 'app-bulk-import',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="bulk-import-container">
      <div class="header">
        <h2>Importação em Massa de Filmes</h2>
        <p>Importar {{totalMovies}} filmes para sua biblioteca</p>
      </div>

      <div class="status-card">
        @if (!isImporting() && !isComplete()) {
          <div class="ready-state">
            <lucide-icon [img]="UploadIcon" [size]="48"></lucide-icon>
            <p>Pronto para importar {{totalMovies}} filmes</p>
            <button class="import-btn" (click)="startImport()">
              Iniciar Importação
            </button>
          </div>
        }

        @if (isImporting()) {
          <div class="importing-state">
            <lucide-icon [img]="LoaderIcon" [size]="48" class="spinner"></lucide-icon>
            <h3>Importando...</h3>
            <div class="progress">
              <div class="progress-bar" [style.width.%]="progress()"></div>
            </div>
            <p>{{currentIndex()}} / {{totalMovies}}</p>
            @if (currentMovie()) {
              <p class="current-movie">{{currentMovie()}}</p>
            }
          </div>
        }

        @if (isComplete()) {
          <div class="complete-state">
            <lucide-icon [img]="CheckCircleIcon" [size]="48" class="success"></lucide-icon>
            <h3>Importação Concluída!</h3>
            <div class="stats">
              <div class="stat success">
                <lucide-icon [img]="CheckCircleIcon" [size]="20"></lucide-icon>
                <span>{{successCount()}} adicionados</span>
              </div>
              <div class="stat error">
                <lucide-icon [img]="XCircleIcon" [size]="20"></lucide-icon>
                <span>{{failCount()}} falharam</span>
              </div>
            </div>
            
            @if (failedMovies().length > 0) {
              <details class="failed-list">
                <summary>Ver filmes que falharam ({{failedMovies().length}})</summary>
                <ul>
                  @for (movie of failedMovies(); track movie) {
                    <li>{{movie}}</li>
                  }
                </ul>
              </details>
            }

            <button class="reset-btn" (click)="reset()">
              Fechar
            </button>
          </div>
        }
      </div>

      <div class="log-container">
        <h3>Log de Importação</h3>
        <div class="log-content">
          @for (log of logs(); track $index) {
            <div class="log-entry" [class.error]="log.type === 'error'" [class.success]="log.type === 'success'">
              {{log.message}}
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bulk-import-container {
      max-width: 800px;
      margin: 2rem auto;
      padding: 2rem;
    }

    .header {
      text-align: center;
      margin-bottom: 2rem;

      h2 {
        font-size: 2rem;
        font-weight: 800;
        color: var(--app-text-primary);
        margin: 0 0 0.5rem 0;
      }

      p {
        color: var(--app-text-secondary);
        font-size: 1rem;
      }
    }

    .status-card {
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: 16px;
      padding: 3rem;
      text-align: center;
      margin-bottom: 2rem;
    }

    .ready-state, .importing-state, .complete-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;

      lucide-icon {
        color: var(--app-primary);
      }

      p {
        color: var(--app-text-secondary);
        margin: 0;
      }
    }

    .import-btn, .reset-btn {
      background: var(--app-primary);
      color: var(--app-bg);
      border: none;
      padding: 1rem 2rem;
      border-radius: 12px;
      font-weight: 700;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(var(--app-primary-rgb), 0.3);
      }
    }

    .reset-btn {
      background: var(--app-surface-light);
      color: var(--app-text-primary);
      border: 1px solid var(--app-border);
    }

    .spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .progress {
      width: 100%;
      height: 8px;
      background: var(--app-surface-light);
      border-radius: 4px;
      overflow: hidden;

      .progress-bar {
        height: 100%;
        background: var(--app-primary);
        transition: width 0.3s ease;
      }
    }

    .current-movie {
      font-size: 0.9rem;
      color: var(--app-text-muted);
      font-style: italic;
    }

    .stats {
      display: flex;
      gap: 2rem;
      justify-content: center;

      .stat {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;

        &.success {
          color: var(--app-success, #4ade80);
        }

        &.error {
          color: var(--app-error, #f87171);
        }
      }
    }

    .failed-list {
      margin-top: 1rem;
      text-align: left;
      width: 100%;

      summary {
        cursor: pointer;
        color: var(--app-text-secondary);
        font-weight: 600;
        padding: 0.5rem;

        &:hover {
          color: var(--app-primary);
        }
      }

      ul {
        list-style: none;
        padding: 1rem;
        margin: 0.5rem 0 0 0;
        background: var(--app-bg);
        border-radius: 8px;
        max-height: 200px;
        overflow-y: auto;

        li {
          padding: 0.5rem;
          color: var(--app-text-secondary);
          font-size: 0.9rem;
        }
      }
    }

    .log-container {
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: 16px;
      padding: 1.5rem;

      h3 {
        margin: 0 0 1rem 0;
        font-size: 1rem;
        font-weight: 700;
        color: var(--app-text-primary);
      }
    }

    .log-content {
      background: var(--app-bg);
      border-radius: 8px;
      padding: 1rem;
      max-height: 400px;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
    }

    .log-entry {
      padding: 0.25rem 0;
      color: var(--app-text-secondary);

      &.success {
        color: var(--app-success, #4ade80);
      }

      &.error {
        color: var(--app-error, #f87171);
      }
    }
  `]
})
export class BulkImportComponent {
  private tmdbService = inject(TmdbService);
  private movieService = inject(MovieService);

  readonly UploadIcon = Upload;
  readonly CheckCircleIcon = CheckCircle;
  readonly XCircleIcon = XCircle;
  readonly LoaderIcon = Loader;

  totalMovies = movies.length;
  isImporting = signal(false);
  isComplete = signal(false);
  currentIndex = signal(0);
  currentMovie = signal('');
  successCount = signal(0);
  failCount = signal(0);
  failedMovies = signal<string[]>([]);
  logs = signal<Array<{ message: string; type: 'info' | 'success' | 'error' }>>([]);

  progress() {
    return (this.currentIndex() / this.totalMovies) * 100;
  }

  addLog(message: string, type: 'info' | 'success' | 'error' = 'info') {
    this.logs.update(logs => [...logs, { message, type }]);
  }

  async startImport() {
    this.isImporting.set(true);
    this.isComplete.set(false);
    this.currentIndex.set(0);
    this.successCount.set(0);
    this.failCount.set(0);
    this.failedMovies.set([]);
    this.logs.set([]);

    this.addLog(`Iniciando importação de ${this.totalMovies} filmes...`, 'info');

    const statusId = 1; // Backlog
    const delayMs = 500;

    for (let i = 0; i < movies.length; i++) {
      const movieTitle = movies[i];
      this.currentIndex.set(i + 1);
      this.currentMovie.set(movieTitle);
      
      this.addLog(`[${i + 1}/${movies.length}] Buscando: ${movieTitle}`, 'info');

      try {
        const results = await this.tmdbService.searchMovies(movieTitle).toPromise();
        
        if (results && results.length > 0) {
          const firstResult = results[0];
          this.addLog(`  ✓ Encontrado: ${firstResult.title} (${firstResult.release_date?.substring(0, 4) || 'N/A'})`, 'success');
          
          await this.movieService.addMovieFromTmdb(firstResult, statusId);
          this.successCount.update(c => c + 1);
          this.addLog(`  ✓ Adicionado à biblioteca`, 'success');
        } else {
          this.addLog(`  ✗ Nenhum resultado encontrado`, 'error');
          this.failCount.update(c => c + 1);
          this.failedMovies.update(f => [...f, movieTitle]);
        }

        if (i < movies.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        this.addLog(`  ✗ Erro ao adicionar ${movieTitle}: ${error}`, 'error');
        this.failCount.update(c => c + 1);
        this.failedMovies.update(f => [...f, movieTitle]);
      }
    }

    this.isImporting.set(false);
    this.isComplete.set(true);
    this.currentMovie.set('');
    this.addLog(`\n=== Importação Concluída ===`, 'info');
    this.addLog(`✓ Adicionados com sucesso: ${this.successCount()}`, 'success');
    this.addLog(`✗ Falharam: ${this.failCount()}`, 'error');
  }

  reset() {
    this.isComplete.set(false);
    this.currentIndex.set(0);
    this.successCount.set(0);
    this.failCount.set(0);
    this.failedMovies.set([]);
    this.logs.set([]);
  }
}
