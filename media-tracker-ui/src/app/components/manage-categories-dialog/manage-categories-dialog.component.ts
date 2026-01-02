import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { LucideAngularModule, GripVertical, Plus, Trash2, X } from 'lucide-angular';
import { CategoryService } from '../../services/status.service';
import { Category } from '../../models/status.model';

@Component({
  selector: 'app-manage-categories-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, LucideAngularModule],
  templateUrl: './manage-categories-dialog.component.html',
  styleUrl: './manage-categories-dialog.component.scss'
})
export class ManageCategoriesDialogComponent implements OnInit {
  isOpen = signal(false);
  categories = signal<Category[]>([]);
  
  newCategoryName = '';
  newCategoryColor = '#8B5CF6';
  editingId: number | null = null;

  // Lucide icons
  readonly GripVerticalIcon = GripVertical;
  readonly PlusIcon = Plus;
  readonly Trash2Icon = Trash2;
  readonly XIcon = X;

  constructor(private categoryService: CategoryService) {}

  async ngOnInit() {
    await this.loadCategories();
  }

  async loadCategories() {
    const cats = await this.categoryService.getAllCategories();
    this.categories.set(cats);
  }

  open() {
    this.isOpen.set(true);
    document.body.style.overflow = 'hidden';
    this.loadCategories();
  }

  close() {
    this.isOpen.set(false);
    document.body.style.overflow = '';
    this.resetForm();
  }

  resetForm() {
    this.newCategoryName = '';
    this.newCategoryColor = '#8B5CF6';
    this.editingId = null;
  }

  async addCategory() {
    if (!this.newCategoryName.trim()) return;

    const maxOrder = this.categories().reduce((max, cat) => Math.max(max, cat.order), 0);
    
    await this.categoryService.addCategory({
      name: this.newCategoryName.trim(),
      color: this.newCategoryColor,
      order: maxOrder + 1
    });

    this.resetForm();
    await this.loadCategories();
  }

  async updateCategory(category: Category) {
    if (!category.id) return;

    await this.categoryService.updateCategory(category.id, {
      name: category.name,
      color: category.color
    });

    await this.loadCategories();
  }

  async deleteCategory(id: number) {
    if (confirm('Are you sure you want to delete this category? All anime in this category will need to be reassigned.')) {
      await this.categoryService.deleteCategory(id);
      await this.loadCategories();
    }
  }

  async onDrop(event: CdkDragDrop<Category[]>) {
    const cats = [...this.categories()];
    moveItemInArray(cats, event.previousIndex, event.currentIndex);
    
    // Update order for all categories
    for (let i = 0; i < cats.length; i++) {
      cats[i].order = i;
      if (cats[i].id) {
        await this.categoryService.updateCategory(cats[i].id!, { order: i });
      }
    }
    
    this.categories.set(cats);
  }

  trackById(index: number, category: Category): number {
    return category.id || index;
  }
}
