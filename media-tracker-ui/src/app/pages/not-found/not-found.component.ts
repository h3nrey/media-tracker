import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, Home, Search, Ghost } from 'lucide-angular';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss'
})
export class NotFoundComponent {
  private router = inject(Router);

  readonly HomeIcon = Home;
  readonly SearchIcon = Search;
  readonly GhostIcon = Ghost;

  goHome() {
    this.router.navigate(['/']);
  }

  goBrowse() {
    this.router.navigate(['/browse']);
  }
}
