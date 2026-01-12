import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, List as ListIcon } from 'lucide-angular';
import { List } from '../../../../models/list.model';

@Component({
  selector: 'app-game-lists',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterLink],
  templateUrl: './game-lists.component.html',
  styleUrl: './game-lists.component.scss'
})
export class GameListsComponent {
  lists = input<List[]>([]);
  readonly ListIcon = ListIcon;
}
