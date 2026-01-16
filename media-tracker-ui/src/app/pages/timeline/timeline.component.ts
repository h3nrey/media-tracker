import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Calendar, ChevronLeft, ChevronRight, Info, Star, Play, Plus, Award } from 'lucide-angular';
import { AnimeService } from '../../services/anime.service';
import { Anime } from '../../models/anime.model';
import { HeaderComponent } from '../../components/header/header.component';
import { DialogService } from '../../services/dialog.service';
import { getScoreColorClass } from '../../utils/anime-utils';
import { TimelineYearSectionComponent } from './components/timeline-year-section/timeline-year-section';
import { YearRecapComponent } from '../../components/year-recap/year-recap.component';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, TimelineYearSectionComponent, YearRecapComponent],
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.scss'
})
export class TimelineComponent implements OnInit {
  private animeService = inject(AnimeService);
  private dialogService = inject(DialogService);
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  @ViewChild('sidebarContainer') sidebarContainer!: ElementRef;
  
  allAnime = signal<Anime[]>([]);
  activeYear = signal<number | null>(null);
  heroRotation = signal(0);
  selectedYearRecap = signal<number | null>(null);
  showRecap = signal(false);

  constructor() {
    // Effect to sync sidebar scroll when active year changes
    effect(() => {
      const year = this.activeYear();
      if (year && this.sidebarContainer) {
        this.syncSidebar(year);
      }
    });
  }

  onScroll() {
    this.updateActiveYear();
  }

  private updateActiveYear() {
    if (!this.scrollContainer) return;
    const container = this.scrollContainer.nativeElement;
    const sections = container.querySelectorAll('.year-section');
    
    // Find section that occupies the 'focus' point (roughly 30% from the top of the container)
    const containerRect = container.getBoundingClientRect();
    const focusPoint = containerRect.top + (containerRect.height * 0.3);

    let currentActive = null;

    for (let i = 0; i < sections.length; i++) {
        const section = sections[i] as HTMLElement;
        const rect = section.getBoundingClientRect();
        
        // If the focus point is within this section's bounds
        if (focusPoint >= rect.top && focusPoint <= rect.bottom) {
            currentActive = parseInt(section.getAttribute('data-year') || '0', 10);
            break;
        }
    }

    if (currentActive && currentActive !== this.activeYear()) {
      this.activeYear.set(currentActive);
    }
  }

  private syncSidebar(year: number) {
    if (!this.sidebarContainer) return;
    const sidebar = this.sidebarContainer.nativeElement;
    const activeEl = sidebar.querySelector(`.nav-year[data-year="${year}"]`) as HTMLElement;
    
    if (activeEl) {
      // Calculate scroll to center the element
      const containerHeight = sidebar.clientHeight;
      const elementOffset = activeEl.offsetTop;
      const elementHeight = activeEl.offsetHeight;
      
      const targetScroll = elementOffset - (containerHeight / 2) + (elementHeight / 2);
      
      sidebar.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
    }
  }

  scrollToYear(year: number) {
    const element = document.getElementById(`year-${year}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  readonly CalendarIcon = Calendar;
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly InfoIcon = Info;
  readonly StarIcon = Star;
  readonly PlayIcon = Play;
  readonly PlusIcon = Plus;
  readonly AwardIcon = Award;

  openTrailer(url: string | undefined) {
    if (url) window.open(url, '_blank');
  }

  timelineGroups = computed(() => {
    const groups: Map<number, Anime[]> = new Map();
    const seenInYear = new Map<number, Set<string>>();

    this.allAnime().forEach(anime => {
      // if (!anime.watchDates || anime.watchDates.length === 0) return;

      // anime.watchDates.forEach((dateValue:any) => {
      //   const date = new Date(dateValue);
      //   if (isNaN(date.getTime())) return;
        
      //   const year = date.getFullYear();
      //   if (year < 1900) return;

      //   if (!groups.has(year)) {
      //     groups.set(year, []);
      //     seenInYear.set(year, new Set());
      //   }

      //   const uniqueKey = anime.malId ? `mal-${anime.malId}` : (anime.id ? `id-${anime.id}` : anime.title);
      //   if (seenInYear.get(year)!.has(uniqueKey)) return;
      //   seenInYear.get(year)!.add(uniqueKey);

      //   groups.get(year)!.push(anime);
      // });
    });

    return Array.from(groups.entries())
      .map(([year, anime]) => ({ 
        year, 
        anime: anime.sort((a, b) => (b.score || 0) - (a.score || 0))
      }))
      .sort((a, b) => b.year - a.year);
  });

  ngOnInit() {
    this.animeService.getAllAnime$().subscribe(anime => {
      // this.allAnime.set(anime);
      setTimeout(() => this.updateActiveYear(), 100);
    });

    setInterval(() => {
      this.heroRotation.update(n => n + 1);
    }, 6000);
  }

  onAnimeClick(anime: Anime) {
    this.dialogService.openAnimeDetails(anime);
  }

  openRecap(year: number) {
    this.selectedYearRecap.set(year);
    this.showRecap.set(true);
  }

  getRecapAnime(year: number): Anime[] {
    return this.timelineGroups().find(g => g.year === year)?.anime || [];
  }

  getScoreColorClass(score: number): string {
    return getScoreColorClass(score);
  }
}
