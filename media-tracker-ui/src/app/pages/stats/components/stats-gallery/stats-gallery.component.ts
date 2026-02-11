import { Component, input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Image, X } from 'lucide-angular';
import { MediaService } from '../../../../services/media.service';
import { MediaItem, MediaGalleryImage } from '../../../../models/media-type.model';

@Component({
  selector: 'app-stats-gallery',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './stats-gallery.component.html',
  styleUrl: './stats-gallery.component.scss'
})
export class StatsGalleryComponent {
  private mediaService = inject(MediaService);
  
  mediaList = input.required<MediaItem[]>();
  selectedYear = input.required<string>();
  mediaType = input<number | null>(null);
  
  readonly ImageIcon = Image;
  readonly XIcon = X;

  selectedImage = signal<MediaGalleryImage | null>(null);

  galleryImages = computed(() => {
    const list = this.mediaList();
    return list.flatMap(item => (item.screenshots || []).filter(img => !img.isDeleted));
  });

  openImage(img: MediaGalleryImage) {
    this.selectedImage.set(img);
    document.body.style.overflow = 'hidden';
  }

  closeImage() {
    this.selectedImage.set(null);
    document.body.style.overflow = '';
  }
}
