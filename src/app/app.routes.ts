import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Home Routes
  {
    path: '',
    loadComponent: () =>
      import('./layout/public-layout/public-layout.component').then((m) => m.PublicLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./home/portfolio/portfolio.component').then((m) => m.PortfolioComponent),
      },
      { path: 'home', redirectTo: '', pathMatch: 'full' },
      {
        path: 'dossier-numerique-cs-sno',
        loadComponent: () =>
          import('./home/digital-folder/digital-folder.component').then((m) => m.DigitalFolderComponent),
      },
      {
        path: 'admin/login',
        loadComponent: () => import('./admin/auth/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'testimonial/new',
        loadComponent: () =>
          import('./components/testimonial-form/testimonial-form').then((m) => m.TestimonialFormComponent),
      },
    ],
  },

  // Admin Routes
  {
    path: 'admin',
    loadComponent: () =>
      import('./layout/admin-layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./admin/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'projets',
        loadComponent: () => import('./admin/projets/projets.component').then((m) => m.ProjetsComponent),
      },
      {
        path: 'competences',
        loadComponent: () => import('./admin/competences/competences.component').then((m) => m.CompetencesComponent),
      },
      {
        path: 'niveaux-tech',
        loadComponent: () => import('./admin/niveaux-tech/niveaux-tech').then((m) => m.NiveauxTech),
      },
      {
        path: 'apropos',
        loadComponent: () => import('./admin/apropos/apropos.component').then((m) => m.AproposComponent),
      },
      {
        path: 'experiences',
        loadComponent: () => import('./admin/experiences/experiences.component').then((m) => m.ExperiencesComponent),
      },
      {
        path: 'messages',
        loadComponent: () => import('./admin/messages/messages.component').then((m) => m.MessagesComponent),
      },
      {
        path: 'blog',
        loadComponent: () => import('./admin/blog/blog.component').then((m) => m.BlogComponent),
      },
      {
        path: 'analytics',
        loadComponent: () => import('./admin/analytics/analytics.component').then((m) => m.AnalyticsComponent),
      },
      {
        path: 'temoignages',
        loadComponent: () => import('./admin/temoignages/temoignages.component').then((m) => m.TemoignagesComponent),
      },
      {
        path: 'parametres',
        loadComponent: () => import('./admin/parametres/parametres.component').then((m) => m.ParametresComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // Fallback
  { path: '**', redirectTo: '' },
];
