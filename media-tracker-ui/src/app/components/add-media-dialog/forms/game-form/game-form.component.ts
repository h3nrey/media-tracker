import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, X, ExternalLink, Calendar } from 'lucide-angular';
import { NumberInputComponent } from '../../../ui/number-input/number-input.component';
import { TagInputComponent } from '../../../ui/tag-input/tag-input.component';
import { DatePickerComponent } from '../../../ui/date-picker/date-picker.component';
import { Category } from '../../../../models/status.model';
import { WatchSource } from '../../../../models/watch-source.model';
import { MediaType } from '../../../../models/media-type.model';
import { MediaLog } from '../../../../models/media-log.model';

@Component({
  selector: 'app-game-form',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, NumberInputComponent, TagInputComponent, DatePickerComponent],
  templateUrl: './game-form.component.html',
  styleUrl: './game-form.component.scss'
})
export class GameFormComponent {
  initialData = input<any>(null);
  categories = input<Category[]>([]);
  sources = input<WatchSource[]>([]);
  isSaving = input<boolean>(false);
  
  save = output<any>();
  cancel = output<void>();

  readonly PlusIcon = Plus;
  readonly XIcon = X;
  readonly ExternalLinkIcon = ExternalLink;
  readonly CalendarIcon = Calendar;

  title = signal('');
  coverImage = signal('');
  bannerImage = signal('');
  trailerUrl = signal('');
  externalId = signal<number | undefined>(undefined);
  progressCurrent = signal(0); // Hours played
  selectedCategoryId = signal<number | undefined>(undefined);
  score = signal(0);
  genres = signal<string[]>([]);
  studios = signal<string[]>([]); // Developers
  releaseYear = signal<number | undefined>(undefined);
  notes = signal('');
  activityDates = signal<Date[]>([]);
  logs = signal<MediaLog[]>([]);
  sourceLinks = signal<any[]>([]);
  platforms = signal<string[]>([]);

  showDatePicker = signal(false);
  tempDate = signal(new Date());
  newLinkSourceId = signal<number | null>(null);
  newLinkUrl = signal('');

  activeLogPicker = signal<{index: number, field: 'startDate' | 'endDate'} | null>(null);
  today = new Date();

  constructor() {
    effect(() => {
      const data = this.initialData();
      console.log("initial data", data)
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
    console.log("apply data", data);
    this.title.set(data.title || '');
    this.coverImage.set(data.coverImage || '');
    this.bannerImage.set(data.bannerImage || '');
    this.trailerUrl.set(data.trailerUrl || '');
    this.externalId.set(data.externalId);
    this.progressCurrent.set(data.progress_current || 0);
    this.selectedCategoryId.set(data.statusId);
    this.score.set(data.score || 0);
    this.genres.set(data.genres || []);
    this.studios.set(data.studios || []); // Developers
    this.releaseYear.set(data.releaseYear);
    this.notes.set(data.notes || '');
    this.activityDates.set(data.activityDates || []);
    this.sourceLinks.set(data.source_links || data.sourceLinks || []);
    this.platforms.set(data.platforms || []);
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
      mediaTypeId: MediaType.GAME,
      progress_current: this.progressCurrent(),
      score: this.score(),
      genres: this.genres(),
      studios: this.studios(),
      releaseYear: this.releaseYear(),
      statusId: this.selectedCategoryId(),
      notes: this.notes(),
      activityDates: this.activityDates(),
      logs: this.logs(),
      source_links: this.sourceLinks(),
      platforms: this.platforms()
    };

    console.log("selected category id", this.selectedCategoryId());

    console.log(mediaData);
    this.save.emit(mediaData);
  }
}
