import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { MobileCategoriesComponent } from './pages/mobile-categories/mobile-categories.component';
import { MobileSourcesComponent } from './pages/mobile-sources/mobile-sources.component';
import { TimelineComponent } from './pages/timeline/timeline.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'timeline',
    component: TimelineComponent
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
    path: 'lists',
    loadComponent: () => import('./pages/lists/lists').then(m => m.Lists)
  },
  {
    path: 'list-details/:id',
    loadComponent: () => import('./pages/list-details/list-details').then(m => m.ListDetailsComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
