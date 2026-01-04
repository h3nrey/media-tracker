import { Component, Input, Output, EventEmitter, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, ChevronRight, ChevronLeft } from 'lucide-angular';
import { Anime } from '../../models/anime.model';
import html2canvas from 'html2canvas';

// Slide Components
import { RecapIntroSlideComponent } from './slides/intro/recap-intro-slide';
import { RecapStatsSlideComponent } from './slides/stats/recap-stats-slide';
import { RecapGenresSlideComponent } from './slides/genres/recap-genres-slide';
import { RecapStudiosSlideComponent } from './slides/studios/recap-studios-slide';
import { RecapAnimeTopSlideComponent } from './slides/anime-top/recap-anime-top-slide';
import { RecapHighlightSlideComponent } from './slides/highlight/recap-highlight-slide';
import { RecapSplitSlideComponent } from './slides/split/recap-split-slide';
import { RecapShareSlideComponent } from './slides/share/recap-share-slide';

@Component({
  selector: 'app-year-recap',
  standalone: true,
  imports: [
    CommonModule, 
    LucideAngularModule,
    RecapIntroSlideComponent,
    RecapStatsSlideComponent,
    RecapGenresSlideComponent,
    RecapStudiosSlideComponent,
    RecapAnimeTopSlideComponent,
    RecapHighlightSlideComponent,
    RecapSplitSlideComponent,
    RecapShareSlideComponent
  ],
  templateUrl: './year-recap.component.html',
  styleUrl: './year-recap.component.scss'
})
export class YearRecapComponent {
  @Input({ required: true }) year!: number;
  @Input({ required: true }) anime: Anime[] = [];
  @Output() close = new EventEmitter<void>();

  @ViewChild(RecapShareSlideComponent) shareSlide!: RecapShareSlideComponent;

  currentSlide = signal(0);
  isGeneratingImage = signal(false);

  // Lucide Icons
  readonly XIcon = X;
  readonly ChevronRightIcon = ChevronRight;
  readonly ChevronLeftIcon = ChevronLeft;

  stats = computed(() => {
    const yearAnime = this.anime;
    const totalEpisodes = yearAnime.reduce((acc, a) => acc + (a.episodesWatched || 0), 0);
    
    // Studios
    const studioMap: Record<string, number> = {};
    yearAnime.forEach(a => {
      a.studios?.forEach(s => {
        studioMap[s] = (studioMap[s] || 0) + 1;
      });
    });
    const topStudios = Object.entries(studioMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Genres
    const genreMap: Record<string, number> = {};
    yearAnime.forEach(a => {
      a.genres?.forEach(g => {
        genreMap[g] = (genreMap[g] || 0) + 1;
      });
    });
    const topGenres = Object.entries(genreMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Highest Rated
    const highestRated = [...yearAnime].sort((a, b) => (b.score || 0) - (a.score || 0))[0];

    // Dropped Fastest (Status ID 4 = Dropped)
    const droppedAnime = yearAnime.filter(a => a.statusId === 4);
    const droppedFastest = droppedAnime.sort((a, b) => (a.episodesWatched || 0) - (b.episodesWatched || 0))[0];

    // Surprised Me
    const potentialSurprises = yearAnime.filter(a => a.id !== highestRated?.id);
    const surprisedMe = potentialSurprises.length > 0 
      ? potentialSurprises.sort((a, b) => (b.score || 0) - (a.score || 0))[0]
      : highestRated;

    const animeTop = [...yearAnime].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5);

    return {
      totalAnime: yearAnime.length,
      totalEpisodes,
      topStudios,
      topGenres,
      highestRated,
      animeTop,
      droppedFastest,
      surprisedMe
    };
  });

  nextSlide() {
    if (this.currentSlide() < 6) {
      this.currentSlide.update(s => s + 1);
    }
  }

  prevSlide() {
    if (this.currentSlide() > 0) {
      this.currentSlide.update(s => s - 1);
    }
  }

  async shareRecap() {
    this.isGeneratingImage.set(true);
    try {
      // Small delay to ensure render
      await new Promise(r => setTimeout(r, 100));
      
      const element = this.shareSlide.recapCardRef.nativeElement;
      const canvas = await html2canvas(element, {
        backgroundColor: '#060914',
        scale: 2,
        logging: false,
        useCORS: true
      });
      
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `anime-recap-${this.year}.png`;
      link.href = image;
      link.click();
    } catch (err) {
      console.error('Failed to generate image', err);
    } finally {
      this.isGeneratingImage.set(false);
    }
  }
}
