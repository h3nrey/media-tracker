import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, X, Search, CheckCircle, ExternalLink, Calendar } from 'lucide-angular';
import { NumberInputComponent } from '../../../ui/number-input/number-input.component';
import { TagInputComponent } from '../../../ui/tag-input/tag-input.component';
import { DatePickerComponent } from '../../../ui/date-picker/date-picker.component';
import { StarRatingInputComponent } from '../../../ui/star-rating-input/star-rating-input.component';
import { SelectComponent } from '../../../ui/select/select';
import { Category } from '../../../../models/status.model';
import { WatchSource } from '../../../../models/watch-source.model';
import { MediaType } from '../../../../models/media-type.model';
import { MediaRun } from '../../../../models/media-run.model';
import { MediaJournalComponent } from '../shared/media-journal/media-journal';

@Component({
  selector: 'app-movie-form',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, NumberInputComponent, TagInputComponent, DatePickerComponent, MediaJournalComponent, StarRatingInputComponent, SelectComponent],
  templateUrl: './movie-form.component.html',
  styleUrl: './movie-form.component.scss'
})
export class MovieFormComponent {
  initialData = input<any>(null);
  categories = input<Category[]>([]);
  sources = input<WatchSource[]>([]);
  isSaving = input<boolean>(false);
  
  save = output<any>();
  cancel = output<void>();
  changeSource = output<void>();

  readonly PlusIcon = Plus;
  readonly XIcon = X;
  readonly ExternalLinkIcon = ExternalLink;
  readonly CalendarIcon = Calendar;
  readonly CheckCircleIcon = CheckCircle;
  readonly SearchIcon = Search;

  get categoryOptions() {
    return this.categories().map(c => ({ value: c.id, label: c.name }));
  }

  title = signal('');
  coverImage = signal('');
  bannerImage = signal('');
  trailerUrl = signal('');
  externalId = signal<number | undefined>(undefined);
  progressCurrent = signal(0); // Minutes watched (usually 0 or total)
  progressTotal = signal(0); // Duration
  selectedCategoryId = signal<number | undefined>(undefined);
  score = signal(0);
  genres = signal<string[]>([]);
  studios = signal<string[]>([]); // Directors
  releaseYear = signal<number | undefined>(undefined);
  notes = signal('');
  activityDates = signal<Date[]>([]);
  runs = signal<MediaRun[]>([]);
  sourceLinks = signal<any[]>([]);

  showDatePicker = signal(false);
  tempDate = signal(new Date());
  newLinkSourceId = signal<number | null>(null);
  newLinkUrl = signal('');
  
  activeTab = signal<'main' | 'journal' | 'details'>('main');

  activeLogPicker = signal<{index: number, field: 'startDate' | 'endDate'} | null>(null);
  today = new Date();

  constructor() {
    effect(() => {
      const data = this.initialData();
      if (data) this.applyData(data);
    });

    effect(() => {
        const cats = this.categories();
        if (cats.length > 0 && this.selectedCategoryId() === undefined) {
            this.selectedCategoryId.set(cats[0].id);
        }
    });
  }

  private applyData(data: any) {
    this.title.set(data.title || '');
    this.coverImage.set(data.coverImage || '');
    this.bannerImage.set(data.bannerImage || '');
    this.trailerUrl.set(data.trailerUrl || '');
    this.externalId.set(data.externalId);
    this.progressCurrent.set(data.progressCurrent || data.progress_current || 0);
    this.progressTotal.set(data.progressTotal || data.progress_total || 0);

    this.selectedCategoryId.set(data.statusId || data.categoryId);
    this.score.set(data.score || 0);
    this.genres.set(data.genres || []);
    this.studios.set(data.studios || []); // Directors
    this.releaseYear.set(data.releaseYear);
    this.notes.set(data.notes || '');
    this.activityDates.set(data.activityDates || []);
    this.runs.set(data.runs || data.logs || []);
    this.sourceLinks.set(data.source_links || data.sourceLinks || []);
  }

  markAsComplete() {
    if (this.progressTotal() > 0) this.progressCurrent.set(this.progressTotal());
  }

  onDateSelect(date: Date) {
    this.activityDates.update(dates => [...dates, date]);
    this.showDatePicker.set(false);
  }

  removeDate(index: number) {
    this.activityDates.update(dates => dates.filter((_, i) => i !== index));
  }

  // Methods handled by MediaJournalComponent now


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
      mediaTypeId: MediaType.MOVIE,
      progressCurrent: this.progressCurrent(),
      progressTotal: this.progressTotal(),

      statusId: this.selectedCategoryId(),
      score: this.score(),
      genres: this.genres(),
      studios: this.studios(),
      releaseYear: this.releaseYear(),
      notes: this.notes(),
      activityDates: this.activityDates(),
      runs: this.runs(),
      sourceLinks: this.sourceLinks()
    };
    this.save.emit(mediaData);
  }
}
