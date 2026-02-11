import { Component, input, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, X, Plus } from 'lucide-angular';
import { List } from '../../../../models/list.model';
import { Category } from '../../../../models/status.model';

@Component({
  selector: 'app-browse-list-popover',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './browse-list-popover.component.html',
  styleUrl: './browse-list-popover.component.scss'
})
export class BrowseListPopoverComponent implements OnInit {
  availableLists = input.required<List[]>();
  categories = input<Category[]>([]);
  initialView = input<'lists' | 'status'>('lists');
  
  close = output<void>();
  selectList = output<List>();
  createList = output<string>();
  selectCategory = output<Category>();

  readonly XIcon = X;
  readonly PlusIcon = Plus;

  activeTab = signal<'lists' | 'status'>('lists');
  isCreatingList = signal(false);
  newListName = signal('');

  ngOnInit() {
    this.activeTab.set(this.initialView());
  }

  onSelectList(list: List) {
    this.selectList.emit(list);
  }

  onSelectCategory(category: Category) {
    this.selectCategory.emit(category);
  }

  onCreateToggle() {
    this.isCreatingList.set(true);
  }

  onCancelCreate() {
    this.isCreatingList.set(false);
    this.newListName.set('');
  }

  async onCreateSubmit() {
    const name = this.newListName().trim();
    if (!name) return;

    this.createList.emit(name);
    this.isCreatingList.set(false);
    this.newListName.set('');
  }

  onClose() {
    this.close.emit();
  }
}
