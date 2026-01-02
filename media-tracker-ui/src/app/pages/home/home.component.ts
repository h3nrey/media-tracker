import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KanbanBoardComponent } from '../../components/kanban-board/kanban-board.component';
import { AddAnimeDialogComponent } from '../../components/add-anime-dialog/add-anime-dialog.component';
import { FilterBarComponent } from '../../components/filter-bar/filter-bar.component';
import { ManageCategoriesDialogComponent } from '../../components/manage-categories-dialog/manage-categories-dialog.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, KanbanBoardComponent, AddAnimeDialogComponent, FilterBarComponent, ManageCategoriesDialogComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  @ViewChild(AddAnimeDialogComponent) addDialog!: AddAnimeDialogComponent;
  @ViewChild(ManageCategoriesDialogComponent) manageCategoriesDialog!: ManageCategoriesDialogComponent;

  openAddDialog() {
    this.addDialog.open();
  }

  openAddDialogWithCategory(categoryId: number) {
    this.addDialog.openWithCategory(categoryId);
  }

  openManageCategoriesDialog() {
    this.manageCategoriesDialog.open();
  }
}
