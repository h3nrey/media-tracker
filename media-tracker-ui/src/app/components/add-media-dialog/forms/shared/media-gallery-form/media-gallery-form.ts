import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Image, X, Plus, Trash2 } from 'lucide-angular';
import { MediaGalleryImage } from '../../../../../models/media-type.model';

@Component({
  selector: 'app-media-gallery-form',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './media-gallery-form.html',
  styleUrl: './media-gallery-form.scss'
})
export class MediaGalleryFormComponent {
  images = input<MediaGalleryImage[]>([]);
  imagesChange = output<MediaGalleryImage[]>();

  readonly ImageIcon = Image;
  readonly XIcon = X;
  readonly PlusIcon = Plus;
  readonly TrashIcon = Trash2;

  newImageUrl = signal('');
  newImageDescription = signal('');

  addImage() {
    if (this.newImageUrl().trim()) {
      const currentImages = [...this.images()];
      currentImages.push({
        mediaItemId: 0,
        url: this.newImageUrl().trim(),
        description: this.newImageDescription().trim() || undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      } as MediaGalleryImage);
      this.imagesChange.emit(currentImages);
      this.newImageUrl.set('');
      this.newImageDescription.set('');
    }
  }

  removeImage(index: number) {
    const currentImages = this.images().filter((_, i) => i !== index);
    this.imagesChange.emit(currentImages);
  }

  updateDescription(index: number, description: string) {
    const currentImages = [...this.images()];
    currentImages[index] = { ...currentImages[index], description, updatedAt: new Date() };
    this.imagesChange.emit(currentImages);
  }
}
