import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { MobileCategoriesComponent } from './pages/mobile-categories/mobile-categories.component';
import { MobileSourcesComponent } from './pages/mobile-sources/mobile-sources.component';
import { authGuard, publicOnlyGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'landing',
    loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent),
    canActivate: [publicOnlyGuard]
  },
  {
    path: '',
    component: HomeComponent,
    canActivate: [authGuard]
  },
  {
    path: 'categories',
    component: MobileCategoriesComponent,
    canActivate: [authGuard]
  },
  {
    path: 'sources',
    component: MobileSourcesComponent,
    canActivate: [authGuard]
  },
  {
    path: 'recommendation',
    loadComponent: () => import('./pages/recommendation/recommendation.component').then(m => m.RecommendationComponent),
    canActivate: [authGuard]
  },
  {
    path: 'browse',
    loadComponent: () => import('./pages/browse/browse.component').then(m => m.BrowseComponent),
    canActivate: [authGuard]
  },
  {
    path: 'lists',
    loadComponent: () => import('./pages/lists/lists').then(m => m.Lists),
    canActivate: [authGuard]
  },
  {
    path: 'list-details/:id',
    loadComponent: () => import('./pages/list-details/list-details').then(m => m.ListDetailsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'media/:id',
    loadComponent: () => import('./pages/animes-details/animes-details').then(m => m.AnimesDetailsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'anime/:id',
    loadComponent: () => import('./pages/animes-details/animes-details').then(m => m.AnimesDetailsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'game/:id',
    loadComponent: () => import('./pages/games-details/game-details').then(m => m.GamesDetailsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'media/:animeId/reviews/:id',
    loadComponent: () => import('./pages/review-detail/review-detail.component').then(m => m.ReviewDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'stats',
    loadComponent: () => import('./pages/stats/stats.component').then(m => m.StatsComponent),
    canActivate: [authGuard]
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

