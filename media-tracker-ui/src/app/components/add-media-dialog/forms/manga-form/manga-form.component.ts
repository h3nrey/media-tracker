import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, X, CheckCircle, ExternalLink, Calendar } from 'lucide-angular';
import { NumberInputComponent } from '../../../ui/number-input/number-input.component';
import { TagInputComponent } from '../../../ui/tag-input/tag-input.component';
import { DatePickerComponent } from '../../../ui/date-picker/date-picker.component';
import { Category } from '../../../../models/status.model';
import { WatchSource } from '../../../../models/watch-source.model';
import { MediaType } from '../../../../models/media-type.model';
import { MediaLog } from '../../../../models/media-log.model';

@Component({
  selector: 'app-manga-form',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, NumberInputComponent, TagInputComponent, DatePickerComponent],
  templateUrl: './manga-form.component.html',
  styleUrl: './manga-form.component.scss' // Reusing style from Anime if possible or separate
})
export class MangaFormComponent {
  initialData = input<any>(null);
  categories = input<Category[]>([]);
  sources = input<WatchSource[]>([]);
  isSaving = input<boolean>(false);
  
  save = output<any>();
  cancel = output<void>();

  readonly PlusIcon = Plus;
  readonly XIcon = X;
  readonly CheckCircleIcon = CheckCircle;
  readonly ExternalLinkIcon = ExternalLink;
  readonly CalendarIcon = Calendar;

  title = signal('');
  coverImage = signal('');
  bannerImage = signal('');
  trailerUrl = signal('');
  externalId = signal<number | undefined>(undefined);
  progressCurrent = signal(0);
  progressTotal = signal(0);
  selectedCategoryId = signal<number | undefined>(undefined);
  score = signal(0);
  genres = signal<string[]>([]);
  studios = signal<string[]>([]); // Used for Authors
  releaseYear = signal<number | undefined>(undefined);
  notes = signal('');
  activityDates = signal<Date[]>([]);
  logs = signal<MediaLog[]>([]);
  sourceLinks = signal<any[]>([]);

  showDatePicker = signal(false);
  tempDate = signal(new Date());
  newLinkSourceId = signal<number | null>(null);
  newLinkUrl = signal('');

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
            this.selectedCategoryId.set(cats[0].supabaseId);
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

    this.selectedCategoryId.set(data.statusId);
    this.score.set(data.score || 0);
    this.genres.set(data.genres || []);
    this.studios.set(data.studios || []); // Authors
    this.releaseYear.set(data.releaseYear);
    this.notes.set(data.notes || '');
    this.activityDates.set(data.activityDates || []);
    this.logs.set(data.logs || []);
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

  addLog() {
    this.logs.update(logs => [...logs, { mediaItemId: 0, startDate: new Date() }]);
  }

  removeLog(index: number) {
    this.logs.update(logs => logs.filter((_, i) => i !== index));
  }

  updateLogDate(index: number, field: 'startDate' | 'endDate', date: Date | string) {
    this.logs.update(logs => {
      const newLogs = [...logs];
      newLogs[index] = { ...newLogs[index], [field]: date };
      return newLogs;
    });
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
      mediaTypeId: MediaType.MANGA,
      progressCurrent: this.progressCurrent(),
      progressTotal: this.progressTotal(),

      statusId: this.selectedCategoryId(),
      score: this.score(),
      genres: this.genres(),
      studios: this.studios(),
      releaseYear: this.releaseYear(),
      notes: this.notes(),
      activityDates: this.activityDates(),
      logs: this.logs(),
      source_links: this.sourceLinks()
    };
    this.save.emit(mediaData);
  }
}
