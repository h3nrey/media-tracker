import { Component, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, Calendar, Star, PlayCircle, Tag, FileText, Monitor, Edit, Clock, Plus, ExternalLink } from 'lucide-angular';
import { MediaItem } from '../../models/media-type.model';
import { MediaService } from '../../services/media.service';
import { WatchSourceService } from '../../services/watch-source.service';
import { WatchSource } from '../../models/watch-source.model';
import { DialogService } from '../../services/dialog.service';
import { getScoreColorClass } from '../../utils/anime-utils';
// import { AnimeReviewsComponent } from '../anime-reviews/anime-reviews.component'; // Keep as placeholder if needed

@Component({
  selector: 'app-anime-details-dialog',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './anime-details-dialog.component.html',
  styleUrl: './anime-details-dialog.component.scss'
})
export class AnimeDetailsDialogComponent {
  private dialogService = inject(DialogService);
  private mediaService = inject(MediaService);
  private watchSourceService = inject(WatchSourceService);

  isOpen = signal(false);
  media = signal<MediaItem | null>(null);
  sources = signal<WatchSource[]>([]);
  
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

  constructor() {
    this.loadSources();
    
    // React to global dialog service
    effect(() => {
      const details = this.dialogService.mediaDetails();
      if (details) {
        this.open(details);
      } else {
        this.closeLocal();
      }
    });
  }

  private loadSources() {
    this.watchSourceService.getAllSources$().subscribe(sources => {
      this.sources.set(sources);
    });
  }

  getSourceUrl(source: WatchSource): string {
    const currentMedia = this.media();
    if (!currentMedia || !source.baseUrl) return '#';

    const override = currentMedia.sourceLinks?.find(l => l.sourceId === source.id);
    if (override) return override.url;

    return source.baseUrl + encodeURIComponent(currentMedia.title);
  }

  private open(media: MediaItem) {
    this.media.set(media);
    this.isOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  private closeLocal() {
    this.isOpen.set(false);
    this.media.set(null);
    document.body.style.overflow = '';
  }

  close() {
    this.dialogService.closeMediaDetails();
  }

  onEdit() {
    const currentMedia = this.media();
    if (currentMedia) {
      this.dialogService.openEditMedia(currentMedia);
      this.close(); // Close details when opening edit
    }
  }

  async addWatchDate() {
    const currentMedia = this.media();
    if (!currentMedia || !currentMedia.id) return;

    const newDate = new Date();
    const updatedDates = [...(currentMedia.activityDates || []), newDate];
    
    // Persist
    await this.mediaService.updateMedia(currentMedia.id, { activityDates: updatedDates });
    
    // Update local state
    this.media.update(m => m ? { ...m, activityDates: updatedDates } : null);
  }

  async incrementEpisode() {
    const currentMedia = this.media();
    if (!currentMedia?.id) return;

    const current = currentMedia.progress_current || 0;
    const total = currentMedia.progress_total || 0;
    
    if (total > 0 && current >= total) return; 

    const newCount = current + 1;
    await this.mediaService.updateMedia(currentMedia.id, { progress_current: newCount });
    
    this.media.update(m => m ? { ...m, progress_current: newCount } : null);
  }

  getScoreColorClass(score: number): string {
    return getScoreColorClass(score);
  }
}
