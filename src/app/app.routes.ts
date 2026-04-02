import { Routes } from '@angular/router';
import { PublicLayoutComponent } from './layout/public-layout/public-layout.component';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';
import { PortfolioComponent } from './home/portfolio/portfolio.component';
import { LoginComponent } from './admin/auth/login/login.component';
import { DashboardComponent } from './admin/dashboard/dashboard.component';
import { ProjetsComponent } from './admin/projets/projets.component';
import { CompetencesComponent } from './admin/competences/competences.component';
import { AproposComponent } from './admin/apropos/apropos.component';
import { ExperiencesComponent } from './admin/experiences/experiences.component';
import { MessagesComponent } from './admin/messages/messages.component';
import { BlogComponent } from './admin/blog/blog.component';
import { AnalyticsComponent } from './admin/analytics/analytics.component';
import { TemoignagesComponent } from './admin/temoignages/temoignages.component';
import { ParametresComponent } from './admin/parametres/parametres.component';
import { TestimonialFormComponent } from './components/testimonial-form/testimonial-form';
import { AuthGuard } from './guards/auth.guard';

import { NiveauxTech } from './admin/niveaux-tech/niveaux-tech';

export const routes: Routes = [
  // Home Routes
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', component: PortfolioComponent },
      { path: 'home', component: PortfolioComponent },
      { path: 'admin/login', component: LoginComponent },
      { path: 'testimonial/new', component: TestimonialFormComponent },
    ],
  },

  // Admin Routes
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'projets', component: ProjetsComponent },
      { path: 'competences', component: CompetencesComponent },
      { path: 'niveaux-tech', component: NiveauxTech },
      { path: 'apropos', component: AproposComponent },
      { path: 'experiences', component: ExperiencesComponent },
      { path: 'messages', component: MessagesComponent },
      { path: 'blog', component: BlogComponent },
      { path: 'analytics', component: AnalyticsComponent },
      { path: 'temoignages', component: TemoignagesComponent },
      { path: 'parametres', component: ParametresComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // Fallback
  { path: '**', redirectTo: '' },
];
