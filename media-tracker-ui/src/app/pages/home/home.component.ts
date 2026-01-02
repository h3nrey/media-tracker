import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KanbanBoardComponent } from '../../components/kanban-board/kanban-board.component';
import { AddAnimeDialogComponent } from '../../components/add-anime-dialog/add-anime-dialog.component';
import { FilterBarComponent } from '../../components/filter-bar/filter-bar.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, KanbanBoardComponent, AddAnimeDialogComponent, FilterBarComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  @ViewChild(AddAnimeDialogComponent) addDialog!: AddAnimeDialogComponent;

  openAddDialog() {
    this.addDialog.open();
  }

  openAddDialogWithCategory(categoryId: number) {
    this.addDialog.openWithCategory(categoryId);
  }
}
