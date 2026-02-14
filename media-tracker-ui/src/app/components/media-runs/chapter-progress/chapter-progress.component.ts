import { Component, Input, OnInit, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, CheckCheck, X } from 'lucide-angular';
import { ChapterProgress } from '../../../models/media-run.model';
import { ChapterProgressService } from '../../../services/chapter-progress.service';

@Component({
  selector: 'app-chapter-progress',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './chapter-progress.component.html',
  styleUrls: ['./chapter-progress.component.scss']
})
export class ChapterProgressComponent implements OnInit {
  @Input({ required: true }) runId!: number;
  @Input() totalChapters: number = 0;
  
  updated = output<void>();

  private progressService = inject(ChapterProgressService);

  readChapters = signal<number[]>([]);
  showAll = signal(false);

  readonly CheckAllIcon = CheckCheck;
  readonly ClearIcon = X;

  async ngOnInit() {
    await this.loadProgress();
  }

  async loadProgress() {
    const data = await this.progressService.getChaptersForRun(this.runId);
    this.readChapters.set(data.map(c => c.chapterNumber));
  }

  async toggleChapter(chapterNumber: number, event?: MouseEvent) {
    console.log('toggleChapter called:', { chapterNumber, shiftKey: event?.shiftKey, runId: this.runId });

    if (event?.shiftKey) {
      console.log('Shift key detected, marking up to chapter', chapterNumber);
      // Optimistic update for shift+click
      const chapters = Array.from({ length: chapterNumber }, (_, i) => i + 1);
      this.readChapters.set(chapters);
      
      await this.markUpTo(chapterNumber);
      return;
    }

    const isRead = this.readChapters().includes(chapterNumber);
    console.log('Chapter', chapterNumber, 'is currently', isRead ? 'read' : 'unread');

    // Optimistic update - update UI immediately
    if (isRead) {
      console.log('Unmarking chapter', chapterNumber);
      this.readChapters.update(chapters => chapters.filter(c => c !== chapterNumber));
      
      // API call in background
      this.progressService.markChapterUnread(this.runId, chapterNumber).then(() => {
        this.updated.emit();
      });
    } else {
      console.log('Marking chapter', chapterNumber, 'as read');
      this.readChapters.update(chapters => [...chapters, chapterNumber].sort((a, b) => a - b));
      
      // API call in background
      this.progressService.markChapterRead(this.runId, chapterNumber).then(() => {
        this.updated.emit();
      });
    }
  }

  async markUpTo(chapterNumber: number) {
    await this.progressService.markChapterRangeRead(this.runId, 1, chapterNumber);
    await this.loadProgress();
    this.updated.emit();
  }

  async clearAll() {
    if (confirm('Desmarcar todos os capítulos?')) {
      await this.progressService.clearProgress(this.runId);
      await this.loadProgress();
      this.updated.emit();
    }
  }

  async readAll() {
    if (!this.totalChapters) return;
    
    if (confirm(`Marcar todos os ${this.totalChapters} capítulos como lidos?`)) {
      await this.progressService.markChapterRangeRead(this.runId, 1, this.totalChapters);
      await this.loadProgress();
      this.updated.emit();
    }
  }

  getChapterList(): number[] {
    const total = this.totalChapters || Math.max(...this.readChapters(), 0) + 12;
    const list = [];
    for (let i = 1; i <= total; i++) {
      list.push(i);
    }
    return list;
  }

  getVisibleChapters(): number[] {
    const list = this.getChapterList();
    if (this.showAll() || list.length <= 24) return list;
    
    // Show first 24 chapters
    return list.slice(0, 24);
  }

  getProgressPercentage(): number {
    if (!this.totalChapters) return 0;
    return (this.readChapters().length / this.totalChapters) * 100;
  }
}
