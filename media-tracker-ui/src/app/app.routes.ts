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
    path: '**',
    redirectTo: ''
  }
];
