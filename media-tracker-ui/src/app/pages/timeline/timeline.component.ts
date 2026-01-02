import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Calendar, ChevronLeft, ChevronRight, Info, Star, Play } from 'lucide-angular';
import { AnimeService } from '../../services/anime.service';
import { Anime } from '../../models/anime.model';
import { HeaderComponent } from '../../components/header/header.component';
import { AnimeDetailsDialogComponent } from '../../components/anime-details-dialog/anime-details-dialog.component';
import { getScoreColorClass } from '../../utils/anime-utils';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, HeaderComponent, AnimeDetailsDialogComponent],
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.scss'
})
export class TimelineComponent implements OnInit {
  private animeService = inject(AnimeService);
  @ViewChild(AnimeDetailsDialogComponent) detailsDialog!: AnimeDetailsDialogComponent;
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  
  allAnime = signal<Anime[]>([]);
  activeYear = signal<number | null>(null);
  heroRotation = signal(0);

  onScroll() {
    this.updateActiveYear();
  }

  private updateActiveYear() {
    if (!this.scrollContainer) return;
    const container = this.scrollContainer.nativeElement;
    const containerHeight = container.offsetHeight;

    const sections = container.querySelectorAll('.year-section');
    let closestYear = null;
    let minDistance = Infinity;

    sections.forEach((col: any) => {
      const year = parseInt(col.getAttribute('data-year'), 10);
      const rect = col.getBoundingClientRect();
      const colCenterY = rect.top + rect.height / 2;
      const distance = Math.abs((containerHeight / 2) - colCenterY);

      if (distance < minDistance) {
        minDistance = distance;
        closestYear = year;
      }
    });

    if (closestYear !== this.activeYear()) {
      this.activeYear.set(closestYear);
    }
  }

  readonly CalendarIcon = Calendar;
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly InfoIcon = Info;
  readonly StarIcon = Star;
  readonly PlayIcon = Play;

  openTrailer(url: string | undefined) {
    if (url) window.open(url, '_blank');
  }

  timelineGroups = computed(() => {
    const groups: Map<number, Anime[]> = new Map();
    
    // To prevent same anime repeating in the SAME year section
    const seenInYear = new Map<number, Set<string>>();

    this.allAnime().forEach(anime => {
      if (!anime.watchDates || anime.watchDates.length === 0) return;

      anime.watchDates.forEach(dateValue => {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return;
        
        const year = date.getFullYear();
        if (year < 1900) return; // Basic sanity check

        if (!groups.has(year)) {
          groups.set(year, []);
          seenInYear.set(year, new Set());
        }

        // Unique key for deduplication within the year: malId or id or title
        const uniqueKey = anime.malId ? `mal-${anime.malId}` : (anime.id ? `id-${anime.id}` : anime.title);

        if (seenInYear.get(year)!.has(uniqueKey)) return;
        seenInYear.get(year)!.add(uniqueKey);

        groups.get(year)!.push(anime);
      });
    });

    return Array.from(groups.entries())
      .map(([year, anime]) => ({ 
        year, 
        anime: anime.sort((a, b) => (b.score || 0) - (a.score || 0)) // Sort by score within year
      }))
      .sort((a, b) => b.year - a.year);
  });

  ngOnInit() {
    this.animeService.getAllAnime$().subscribe(anime => {
      this.allAnime.set(anime);
      setTimeout(() => this.updateActiveYear(), 100);
    });

    // Slideshow interval
    setInterval(() => {
      this.heroRotation.update(n => n + 1);
    }, 6000);
  }

  onAnimeClick(anime: Anime) {
    this.detailsDialog.open(anime);
  }

  getScoreColorClass(score: number): string {
    return getScoreColorClass(score);
  }
}
