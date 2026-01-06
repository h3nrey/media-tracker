import { Component, input, output, signal, effect, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, X, CheckCircle, ExternalLink, Calendar } from 'lucide-angular';
import { NumberInputComponent } from '../../../ui/number-input/number-input.component';
import { TagInputComponent } from '../../../ui/tag-input/tag-input.component';
import { DatePickerComponent } from '../../../ui/date-picker/date-picker.component';
import { Category } from '../../../../models/status.model';
import { WatchSource } from '../../../../models/watch-source.model';
import { MediaType } from '../../../../models/media-type.model';

@Component({
  selector: 'app-anime-form',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, NumberInputComponent, TagInputComponent, DatePickerComponent],
  templateUrl: './anime-form.component.html',
  styleUrl: './anime-form.component.scss'
})
export class AnimeFormComponent {
  // Inputs
  initialData = input<any>(null);
  categories = input<Category[]>([]);
  sources = input<WatchSource[]>([]);
  isSaving = input<boolean>(false);
  
  // Outputs
  save = output<any>();
  cancel = output<void>();

  // Icons
  readonly PlusIcon = Plus;
  readonly XIcon = X;
  readonly CheckCircleIcon = CheckCircle;
  readonly ExternalLinkIcon = ExternalLink;
  readonly CalendarIcon = Calendar;

  // Form Signals
  title = signal('');
  coverImage = signal('');
  bannerImage = signal('');
  trailerUrl = signal('');
  externalId = signal<number | undefined>(undefined);
  progressCurrent = signal(0);
  progressTotal = signal(0);
  selectedCategoryId = signal<number>(1);
  score = signal(0);
  genres = signal<string[]>([]);
  studios = signal<string[]>([]);
  releaseYear = signal<number | undefined>(undefined);
  notes = signal('');
  activityDates = signal<Date[]>([]);
  sourceLinks = signal<any[]>([]);

  // Local UI State
  showDatePicker = signal(false);
  tempDate = signal(new Date());
  newLinkSourceId = signal<number | null>(null);
  newLinkUrl = signal('');

  constructor() {
    effect(() => {
      const data = this.initialData();
      if (data) {
        this.applyData(data);
      }
    });

    effect(() => {
        const cats = this.categories();
        if (cats.length > 0 && !this.selectedCategoryId()) {
            this.selectedCategoryId.set(cats[0].id!);
        }
    });
  }

  private applyData(data: any) {
    this.title.set(data.title || '');
    this.coverImage.set(data.coverImage || '');
    this.bannerImage.set(data.bannerImage || '');
    this.trailerUrl.set(data.trailerUrl || '');
    this.externalId.set(data.externalId);
    this.progressCurrent.set(data.progress_current || 0);
    this.progressTotal.set(data.progress_total || 0);
    this.selectedCategoryId.set(data.statusId || 1);
    this.score.set(data.score || 0);
    this.genres.set(data.genres || []);
    this.studios.set(data.studios || []);
    this.releaseYear.set(data.releaseYear);
    this.notes.set(data.notes || '');
    this.activityDates.set(data.activityDates || []);
    this.sourceLinks.set(data.source_links || data.sourceLinks || []);
  }

  markAsComplete() {
    if (this.progressTotal() > 0) {
      this.progressCurrent.set(this.progressTotal());
    }
  }

  onDateSelect(date: Date) {
    this.activityDates.update(dates => [...dates, date]);
    this.showDatePicker.set(false);
  }

  removeDate(index: number) {
    this.activityDates.update(dates => dates.filter((_, i) => i !== index));
  }

  addLink() {
    if (this.newLinkSourceId() && this.newLinkUrl().trim()) {
      this.sourceLinks.update(links => [...links, {
        sourceId: this.newLinkSourceId()!,
        url: this.newLinkUrl().trim()
      }]);
      this.newLinkUrl.set('');
      this.newLinkSourceId.set(null);
    }
  }

  removeLink(index: number) {
    this.sourceLinks.update(links => links.filter((_, i) => i !== index));
  }

  getLinkSourceName(id: number): string {
    return this.sources().find(s => s.id === id)?.name || 'Unknown';
  }

  submit() {
    const mediaData = {
      title: this.title(),
      coverImage: this.coverImage(),
      bannerImage: this.bannerImage(),
      trailerUrl: this.trailerUrl(),
      externalId: this.externalId(),
      mediaTypeId: MediaType.ANIME,
      progress_current: this.progressCurrent(),
      progress_total: this.progressTotal(),
      statusId: this.selectedCategoryId(),
      score: this.score(),
      genres: this.genres(),
      studios: this.studios(),
      releaseYear: this.releaseYear(),
      notes: this.notes(),
      activityDates: this.activityDates(),
      source_links: this.sourceLinks()
    };
    this.save.emit(mediaData);
  }
}
