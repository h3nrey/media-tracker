import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, X, Upload, Info, AlertCircle, CheckCircle, Download } from 'lucide-angular';
import { CategoryService } from '../../services/status.service';
import { Category } from '../../models/status.model';
import { MediaType } from '../../models/media-type.model';
import { SelectComponent } from '../ui/select/select';
import { ExcelExportService } from '../../services/excel-export.service';
import { ImportProcessorService } from '../../services/import-processor.service';
import { MediaService } from '../../services/media.service';
import { NumberInputComponent } from '../ui/number-input/number-input.component';

@Component({
  selector: 'app-bulk-import-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, SelectComponent, NumberInputComponent],
  templateUrl: './bulk-import-dialog.component.html',
  styleUrl: './bulk-import-dialog.component.scss'
})
export class BulkImportDialogComponent {
  private categoryService = inject(CategoryService);
  private excelService = inject(ExcelExportService);
  private importService = inject(ImportProcessorService);
  private mediaService = inject(MediaService); // Needed for fetching media for export
  
  MediaType = MediaType;
  selectedMediaType = signal<MediaType>(MediaType.ANIME);

  isOpen = signal(false);
  categories = signal<Category[]>([]);
  selectedCategoryId = signal<number | null>(null);
  
  mediaTypeOptions = [
      { value: MediaType.ANIME, label: 'Anime' },
      { value: MediaType.GAME, label: 'Game' }
  ];

  categoryOptions = computed(() => {
      return this.categories().map(c => ({
          value: c.supabaseId ?? c.id!, 
          label: c.name
      }));
  });

  skipFirstX = signal(0);
  importData = '';
  
  status = signal<'idle' | 'processing' | 'success' | 'error'>('idle');
  message = signal('');
  progress = signal(0);

  readonly XIcon = X;
  readonly UploadIcon = Upload;
  readonly InfoIcon = Info;
  readonly AlertIcon = AlertCircle;
  readonly CheckIcon = CheckCircle;
  readonly DownloadIcon = Download;

  constructor() {
    this.categoryService.getAllCategories$().subscribe(cats => {
      this.categories.set(cats);
      if (cats.length > 0 && !this.selectedCategoryId()) {
        const first = cats[0];
        this.selectedCategoryId.set(first.supabaseId ?? first.id!);
      }
    });
  }

  open() {
    this.isOpen.set(true);
    this.status.set('idle');
    this.message.set('');
    this.importData = '';
    this.progress.set(0);
    this.skipFirstX.set(0);
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.isOpen.set(false);
    document.body.style.overflow = '';
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.importData = e.target.result;
      this.processImport();
    };
    reader.readAsText(file);
  }

  async exportData() {
    try {
      this.status.set('processing');
      this.message.set('Generating export...');
      
      const mediaItems = await this.mediaService.getAllMedia(this.selectedMediaType());
      
      await this.excelService.exportMedia(
          mediaItems, 
          this.selectedMediaType(), 
          this.categories()
      );
      
      this.status.set('success');
      this.message.set('Export completed successfully.');
      
      setTimeout(() => {
          if (this.status() === 'success') {
              this.status.set('idle');
              this.message.set('');
          }
      }, 3000);

    } catch (error) {
      console.error('Export failed:', error);
      this.status.set('error');
      this.message.set('Failed to export data.');
    }
  }

  async processImport() {
    if (!this.importData.trim() || !this.selectedCategoryId()) {
      this.status.set('error');
      this.message.set('Please select a category and provide data.');
      return;
    }

    this.status.set('processing');
    this.message.set('Reading data...');
    
    try {
        const result = await this.importService.processImport(
            this.importData,
            this.selectedMediaType(),
            this.selectedCategoryId()!,
            this.skipFirstX(),
            (progress, msg) => {
                this.progress.set(progress);
                this.message.set(msg);
            }
        );

        this.status.set('success');
        this.message.set(`Success! Added ${result.importedCount} items, skipped ${result.skippedCount}.`);
        this.importData = '';
    } catch (error) {
      console.error('Import failed:', error);
      this.status.set('error');
      this.message.set('Failed to import. The format might be incorrect.');
    }
  }


}
