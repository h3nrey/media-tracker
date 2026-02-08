import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ChapterProgress } from '../../../models/media-run.model';
import { ChapterProgressService } from '../../../services/chapter-progress.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chapter-progress',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  templateUrl: './chapter-progress.component.html',
  styleUrls: ['./chapter-progress.component.scss']
})
export class ChapterProgressComponent implements OnInit {
  @Input({ required: true }) runId!: number;
  @Input() totalChapters: number = 0;

  private progressService = inject(ChapterProgressService);

  readChapters = signal<number[]>([]);
  showInput = signal(false);
  bulkInput = 0;

  async ngOnInit() {
    await this.loadProgress();
  }

  async loadProgress() {
    const data = await this.progressService.getChaptersForRun(this.runId);
    this.readChapters.set(data.map(c => c.chapterNumber));
    if (this.readChapters().length > 0) {
      this.bulkInput = Math.max(...this.readChapters());
    }
  }

  async setProgress() {
    if (this.bulkInput <= 0) return;
    
    const currentMax = this.readChapters().length > 0 ? Math.max(...this.readChapters()) : 0;
    
    if (this.bulkInput > currentMax) {
      // Mark up to this chapter
      await this.progressService.markChapterRangeRead(this.runId, 1, this.bulkInput);
    } else {
      // Unmark above this chapter
      const toRemove = this.readChapters().filter(c => c > this.bulkInput);
      for (const num of toRemove) {
        await this.progressService.markChapterUnread(this.runId, num);
      }
    }
    
    this.showInput.set(false);
    await this.loadProgress();
  }

  getProgressPercentage(): number {
    if (!this.totalChapters) return 0;
    return (this.readChapters().length / this.totalChapters) * 100;
  }

  getLastRead(): number {
    return this.readChapters().length > 0 ? Math.max(...this.readChapters()) : 0;
  }
}
