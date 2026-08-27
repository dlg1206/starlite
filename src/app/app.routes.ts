import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'search' },
  {
    path: 'search',
    loadComponent: () => import('./features/search/search.page').then((m) => m.SearchPage),
    title: 'Starlite · Search Courses',
  },
  {
    path: 'schedule',
    loadComponent: () => import('./features/schedule/schedule.page').then((m) => m.SchedulePage),
    title: 'Starlite · Build Schedule',
  },
  {
    path: 'compare',
    loadComponent: () => import('./features/compare/compare.page').then((m) => m.ComparePage),
    title: 'Starlite · Compare Schedules',
  },
  { path: '**', redirectTo: 'search' },
];
