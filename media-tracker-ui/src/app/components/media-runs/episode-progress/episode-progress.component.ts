import { Component, Input, OnInit, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, CheckCheck, X } from 'lucide-angular';
import { EpisodeProgress } from '../../../models/media-run.model';
import { EpisodeProgressService } from '../../../services/episode-progress.service';

@Component({
  selector: 'app-episode-progress',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './episode-progress.component.html',
  styleUrls: ['./episode-progress.component.scss']
})
export class EpisodeProgressComponent implements OnInit {
  @Input({ required: true }) runId!: number;
  @Input() totalEpisodes: number = 0;
  
  updated = output<void>();

  private progressService = inject(EpisodeProgressService);

  watchedEpisodes = signal<number[]>([]);
  showAll = signal(false);

  readonly CheckAllIcon = CheckCheck;
  readonly ClearIcon = X;

  async ngOnInit() {
    await this.loadProgress();
  }

  async loadProgress() {
    const data = await this.progressService.getEpisodesForRun(this.runId);
    this.watchedEpisodes.set(data.map(e => e.episodeNumber));
  }

  async toggleEpisode(episodeNumber: number, event?: MouseEvent) {
    console.log('toggleEpisode called:', { episodeNumber, shiftKey: event?.shiftKey, runId: this.runId });

    if (event?.shiftKey) {
      console.log('Shift key detected, marking up to episode', episodeNumber);
      await this.markUpTo(episodeNumber);
      return;
    }

    const isWatched = this.watchedEpisodes().includes(episodeNumber);
    console.log('Episode', episodeNumber, 'is currently', isWatched ? 'watched' : 'unwatched');

    if (isWatched) {
      console.log('Unmarking episode', episodeNumber);
      await this.progressService.markEpisodeUnwatched(this.runId, episodeNumber);
    } else {
      console.log('Marking episode', episodeNumber, 'as watched');
      await this.progressService.markEpisodeWatched(this.runId, episodeNumber);
    }
    
    await this.loadProgress();
    this.updated.emit();
    console.log('After reload, watched episodes:', this.watchedEpisodes());
  }

  async markUpTo(episodeNumber: number) {
    const episodes = Array.from({ length: episodeNumber }, (_, i) => i + 1);
    await this.progressService.markEpisodesWatched(this.runId, episodes);
    await this.loadProgress();
    this.updated.emit();
  }

  async clearAll() {
    if (confirm('Desmarcar todos os episódios?')) {
      await this.progressService.clearProgress(this.runId);
      await this.loadProgress();
      this.updated.emit();
    }
  }

  async watchAll() {
    if (!this.totalEpisodes) return;
    
    if (confirm(`Marcar todos os ${this.totalEpisodes} episódios como assistidos?`)) {
      const episodes = Array.from({ length: this.totalEpisodes }, (_, i) => i + 1);
      await this.progressService.markEpisodesWatched(this.runId, episodes);
      await this.loadProgress();
      this.updated.emit();
    }
  }

  getEpisodeList(): number[] {
    const total = this.totalEpisodes || Math.max(...this.watchedEpisodes(), 0) + 12;
    const list = [];
    for (let i = 1; i <= total; i++) {
      list.push(i);
    }
    return list;
  }

  getVisibleEpisodes(): number[] {
    const list = this.getEpisodeList();
    if (this.showAll() || list.length <= 24) return list;
    
    // Show first 12 and last 12 or something similar
    return list.slice(0, 24);
  }

  getProgressPercentage(): number {
    if (!this.totalEpisodes) return 0;
    return (this.watchedEpisodes().length / this.totalEpisodes) * 100;
  }
}
