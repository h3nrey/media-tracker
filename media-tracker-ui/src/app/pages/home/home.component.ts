import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KanbanBoardComponent } from '../../components/kanban-board/kanban-board.component';
import { AddAnimeDialogComponent } from '../../components/add-anime-dialog/add-anime-dialog.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, KanbanBoardComponent, AddAnimeDialogComponent],
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
