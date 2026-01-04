import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ExternalLink } from 'lucide-angular';

@Component({
  selector: 'app-anime-links',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './anime-links.component.html',
  styleUrl: './anime-links.component.scss'
})
export class AnimeLinksComponent {
  watchLinks = input<any[] | undefined>([]);
  readonly ExternalLinkIcon = ExternalLink;
}
