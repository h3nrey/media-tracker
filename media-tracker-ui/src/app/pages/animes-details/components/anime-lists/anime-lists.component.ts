import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, List as ListIcon } from 'lucide-angular';
import { List } from '../../../../models/list.model';

@Component({
  selector: 'app-anime-lists',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterLink],
  templateUrl: './anime-lists.component.html',
  styleUrl: './anime-lists.component.scss'
})
export class AnimeListsComponent {
  lists = input<List[]>([]);
  readonly ListIcon = ListIcon;
}
