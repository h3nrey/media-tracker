import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, X, ExternalLink, Calendar, Search } from 'lucide-angular';
import { NumberInputComponent } from '../../../ui/number-input/number-input.component';
import { TagInputComponent } from '../../../ui/tag-input/tag-input.component';
import { DatePickerComponent } from '../../../ui/date-picker/date-picker.component';
import { StarRatingInputComponent } from '../../../ui/star-rating-input/star-rating-input.component';
import { SelectComponent } from '../../../ui/select/select';
import { Category } from '../../../../models/status.model';
import { WatchSource } from '../../../../models/watch-source.model';
import { MediaItem, MediaType, MediaGalleryImage } from '../../../../models/media-type.model';
import { MediaLog } from '../../../../models/media-log.model';

import { MediaJournalComponent } from '../shared/media-journal/media-journal';
import { MediaGalleryFormComponent } from '../shared/media-gallery-form/media-gallery-form';

@Component({
  selector: 'app-game-form',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, NumberInputComponent, TagInputComponent, StarRatingInputComponent, SelectComponent, MediaJournalComponent, MediaGalleryFormComponent],
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
  changeSource = output<void>();

  readonly PlusIcon = Plus;
  readonly XIcon = X;
  readonly ExternalLinkIcon = ExternalLink;
  readonly CalendarIcon = Calendar;
  readonly SearchIcon = Search;
  
  get categoryOptions() {
    return this.categories().map(c => ({ value: c.supabaseId || c.id, label: c.name }));
  }

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
  screenshots = signal<MediaGalleryImage[]>([]);

  showDatePicker = signal(false);
  tempDate = signal(new Date());
  newLinkSourceId = signal<number | null>(null);
  newLinkUrl = signal('');

  activeTab = signal<'main' | 'journal' | 'details' | 'screenshots'>('main');

  constructor() {
    effect(() => {
      const data = this.initialData();
      console.log("initial data", data)
      if (data) this.applyData(data);
    });

    effect(() => {
        const cats = this.categories();
        if (cats.length > 0 && this.selectedCategoryId() === undefined) {
            this.selectedCategoryId.set(cats[0].supabaseId || cats[0].id);
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
    this.progressCurrent.set(data.progressCurrent || data.progress_current || 0);

    this.selectedCategoryId.set(data.statusId || data.categoryId);
    this.score.set(data.score || 0);
    this.genres.set(data.genres || []);
    this.studios.set(data.studios || []); // Developers
    this.releaseYear.set(data.releaseYear);
    this.notes.set(data.notes || '');
    this.activityDates.set(data.activityDates || []);
    this.sourceLinks.set(data.source_links || data.sourceLinks || []);
    this.platforms.set(data.platforms || []);
    this.screenshots.set(data.screenshots || []);
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
      mediaTypeId: MediaType.GAME,
      progressCurrent: this.progressCurrent(),

      score: this.score(),
      genres: this.genres(),
      studios: this.studios(),
      releaseYear: this.releaseYear(),
      statusId: this.selectedCategoryId(),
      notes: this.notes(),
      activityDates: this.activityDates(),
      logs: this.logs(),
      source_links: this.sourceLinks(),
      platforms: this.platforms(),
      screenshots: this.screenshots()
    };

    console.log("selected category id", this.selectedCategoryId());

    console.log(mediaData);
    this.save.emit(mediaData);
  }
}
