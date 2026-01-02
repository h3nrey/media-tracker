import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { db } from './services/database.service';
import { MobileNavComponent } from './components/mobile-library/mobile-nav/mobile-nav.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MobileNavComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('Anime Tracker');

  async ngOnInit() {
    await db.seedDefaultCategories();
  }
}
