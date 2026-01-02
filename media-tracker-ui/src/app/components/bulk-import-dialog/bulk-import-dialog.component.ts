import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, X, Upload, Info, AlertCircle, CheckCircle } from 'lucide-angular';
import { AnimeService } from '../../services/anime.service';
import { CategoryService } from '../../services/status.service';
import { Category } from '../../models/status.model';
import { Anime } from '../../models/anime.model';

@Component({
  selector: 'app-bulk-import-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './bulk-import-dialog.component.html',
  styleUrl: './bulk-import-dialog.component.scss'
})
export class BulkImportDialogComponent {
  private animeService = inject(AnimeService);
  private categoryService = inject(CategoryService);

  isOpen = signal(false);
  categories = signal<Category[]>([]);
  selectedCategoryId = signal<number | null>(null);
  skipFirstX = signal(35);
  importData = '';
  
  status = signal<'idle' | 'processing' | 'success' | 'error'>('idle');
  message = signal('');
  progress = signal(0);

  readonly XIcon = X;
  readonly UploadIcon = Upload;
  readonly InfoIcon = Info;
  readonly AlertIcon = AlertCircle;
  readonly CheckIcon = CheckCircle;

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
    this.skipFirstX.set(35);
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.isOpen.set(false);
    document.body.style.overflow = '';
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.importData = e.target.result;
      this.processImport();
    };
    reader.readAsText(file);
  }

  async processImport() {
    if (!this.importData.trim() || !this.selectedCategoryId()) {
      this.status.set('error');
      this.message.set('Please select a category and provide data.');
      return;
    }

    this.status.set('processing');
    this.message.set('Reading data...');
    
    try {
      const lines = this.importData.split(/\r?\n/).filter(l => l.trim().length > 0);
      let importedCount = 0;
      let skippedCount = 0;
      let alreadySkippedByCounter = 0;
      const total = lines.length;

      const existingAnime = await this.animeService.searchAnimeByTitle('');
      const existingTitles = new Set(existingAnime.map(a => a.title.toLowerCase()));

      for (const line of lines) {
        // Robust CSV/TSV regex
        const regex = /(".*?"|[^,\t\r\n]+)(?=\s*[,|\t]|\s*$)/g;
        const parts = (line.match(regex) || []).map(p => p.trim().replace(/^"|"$/g, ''));
        
        if (parts.length < 1) continue;

        let titleIdx = 0;
        if (!isNaN(Number(parts[0])) && parts[0] !== '') {
            titleIdx = parts[1] === '' ? 2 : 1; 
        }

        const title = parts[titleIdx];
        if (!title || title.toLowerCase() === 'title') continue;

        // Skip logic: Jump over the first X animes as requested
        if (alreadySkippedByCounter < this.skipFirstX()) {
          alreadySkippedByCounter++;
          skippedCount++;
          continue;
        }

        if (existingTitles.has(title.toLowerCase())) {
          skippedCount++;
          continue;
        }

        // Mapping strategy: Title, Genres, Studio, Year, Score
        const genres = parts[titleIdx + 1] ? parts[titleIdx + 1].split(/[;/]/).map(g => g.trim()) : [];
        const studios = parts[titleIdx + 2] ? parts[titleIdx + 2].split(/[;/]/).map(s => s.trim()) : [];
        const yearPart = parts[titleIdx + 3];
        const scorePart = parts[titleIdx + 4];

        const year = yearPart ? parseInt(yearPart.replace(/\D/g, ''), 10) : undefined;
        const score = scorePart ? parseInt(scorePart.replace(/\D/g, ''), 10) : 0;

        await this.animeService.addAnime({
          title,
          genres,
          studios,
          releaseYear: isNaN(Number(year)) ? undefined : year,
          score: isNaN(score) ? 0 : score,
          statusId: this.selectedCategoryId()!,
          episodesWatched: 0,
          totalEpisodes: 0,
          watchLinks: [],
          watchDates: []
        } as any);

        importedCount++;
        existingTitles.add(title.toLowerCase());
        this.progress.set(Math.round(((importedCount + skippedCount) / total) * 100));
        this.message.set(`Progress: ${importedCount} added, ${skippedCount} skipped`);
      }

      this.status.set('success');
      this.message.set(`Success! Added ${importedCount} items, skipped ${skippedCount} duplicates.`);
      this.importData = '';
      this.animeService.triggerFilterUpdate();
    } catch (error) {
      console.error('Import failed:', error);
      this.status.set('error');
      this.message.set('Failed to import. The format might be incorrect.');
    }
  }
}
