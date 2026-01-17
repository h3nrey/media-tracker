import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SelectComponent } from '../../../../components/ui/select/select';
import { Anime } from '../../../../models/anime.model';

@Component({
  selector: 'app-stats-header',
  standalone: true,
  imports: [CommonModule, SelectComponent],
  templateUrl: './stats-header.component.html',
  styleUrl: './stats-header.component.scss'
})
export class StatsHeaderComponent {
  selectedYear = input.required<string>();
  yearOptions = input.required<{value: string, label: string}[]>();
  completedMedia = input.required<Anime[]>();
  
  yearChange = output<string>();

  backgroundImages = computed(() => {
    const completed = this.completedMedia();
    
    const withImages = completed.filter(a => a.coverImage && a.coverImage.trim() !== '');
    
    const shuffled = [...withImages].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 20);
    
    return selected.map(a => a.coverImage).filter((img): img is string => !!img);
  });

  onYearChange(year: string) {
    this.yearChange.emit(year);
  }
}
