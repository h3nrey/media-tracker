import { Component, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, Calendar, Star, PlayCircle, Tag, FileText, Monitor, Edit, Clock, Plus, ExternalLink } from 'lucide-angular';
import { Anime } from '../../models/anime.model';
import { AnimeService } from '../../services/anime.service';
import { WatchSourceService } from '../../services/watch-source.service';
import { WatchSource } from '../../models/watch-source.model';

@Component({
  selector: 'app-anime-details-dialog',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './anime-details-dialog.component.html',
  styleUrl: './anime-details-dialog.component.scss'
})
export class AnimeDetailsDialogComponent {
  isOpen = signal(false);
  anime = signal<Anime | null>(null);
  sources = signal<WatchSource[]>([]);
  @Output() edit = new EventEmitter<Anime>();
  
  // Lucide icons
  readonly XIcon = X;
  readonly CalendarIcon = Calendar;
  readonly StarIcon = Star;
  readonly PlayCircleIcon = PlayCircle;
  readonly TagIcon = Tag;
  readonly FileTextIcon = FileText;
  readonly MonitorIcon = Monitor;
  readonly EditIcon = Edit;
  readonly ClockIcon = Clock;
  readonly PlusIcon = Plus;
  readonly ExternalLinkIcon = ExternalLink;

  constructor(
    private animeService: AnimeService,
    private watchSourceService: WatchSourceService
  ) {
    this.loadSources();
  }

  private loadSources() {
    this.watchSourceService.getAllSources$().subscribe(sources => {
      this.sources.set(sources);
    });
  }

  getSourceUrl(source: WatchSource): string {
    const currentAnime = this.anime();
    if (!currentAnime || !source.baseUrl) return '#';

    const override = currentAnime.watchLinks?.find(l => l.sourceId === source.id);
    if (override) return override.url;

    return source.baseUrl + encodeURIComponent(currentAnime.title);
  }

  open(anime: Anime) {
    this.anime.set(anime);
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
    this.anime.set(null);
  }

  onEdit() {
    if (this.anime()) {
      this.edit.emit(this.anime()!);
      this.close(); // Close details when opening edit
    }
  }

  async addWatchDate() {
    const currentAnime = this.anime();
    if (!currentAnime || !currentAnime.id) return;

    const newDate = new Date();
    const updatedDates = [...(currentAnime.watchDates || []), newDate];
    
    // Persist
    await this.animeService.updateAnime(currentAnime.id, { watchDates: updatedDates });
    
    // Update local state
    this.anime.update(a => a ? { ...a, watchDates: updatedDates } : null);
  }

  getScoreColorClass(score: number): string {
    if (score >= 1 && score <= 5) return 'score-red';
    if (score >= 6 && score <= 10) return 'score-pink';
    if (score === 11) return 'score-purple';
    return '';
  }
}
