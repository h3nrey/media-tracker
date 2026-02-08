import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
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

  private progressService = inject(EpisodeProgressService);

  watchedEpisodes = signal<number[]>([]);
  showAll = signal(false);

  async ngOnInit() {
    await this.loadProgress();
  }

  async loadProgress() {
    const data = await this.progressService.getEpisodesForRun(this.runId);
    this.watchedEpisodes.set(data.map(e => e.episodeNumber));
  }

  async toggleEpisode(episodeNumber: number) {
    if (this.watchedEpisodes().includes(episodeNumber)) {
      await this.progressService.markEpisodeUnwatched(this.runId, episodeNumber);
    } else {
      await this.progressService.markEpisodeWatched(this.runId, episodeNumber);
    }
    await this.loadProgress();
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
