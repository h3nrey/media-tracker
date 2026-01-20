import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { MobileCategoriesComponent } from './pages/mobile-categories/mobile-categories.component';
import { MobileSourcesComponent } from './pages/mobile-sources/mobile-sources.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'categories',
    component: MobileCategoriesComponent
  },
  {
    path: 'sources',
    component: MobileSourcesComponent
  },
  {
    path: 'recommendation',
    loadComponent: () => import('./pages/recommendation/recommendation.component').then(m => m.RecommendationComponent)
  },
  {
    path: 'browse',
    loadComponent: () => import('./pages/browse/browse.component').then(m => m.BrowseComponent)
  },
  {
    path: 'lists',
    loadComponent: () => import('./pages/lists/lists').then(m => m.Lists)
  },
  {
    path: 'list-details/:id',
    loadComponent: () => import('./pages/list-details/list-details').then(m => m.ListDetailsComponent)
  },
  {
    path: 'media/:id',
    loadComponent: () => import('./pages/animes-details/animes-details').then(m => m.AnimesDetailsComponent)
  },
  {
    path: 'anime/:id',
    loadComponent: () => import('./pages/animes-details/animes-details').then(m => m.AnimesDetailsComponent)
  },
  {
    path: 'game/:id',
    loadComponent: () => import('./pages/games-details/game-details').then(m => m.GamesDetailsComponent)
  },
  {
    path: 'media/:animeId/reviews/:id',
    loadComponent: () => import('./pages/review-detail/review-detail.component').then(m => m.ReviewDetailComponent)
  },
  {
    path: 'stats',
    loadComponent: () => import('./pages/stats/stats.component').then(m => m.StatsComponent)
  },
  {
    path: '404',
    loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent)
  },
  {
    path: '**',
    redirectTo: '404'
  }
];
