import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const AuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) return true;

  // Redirige vers la page de connexion en gardant l'URL demandée
  // pour pouvoir y revenir automatiquement après le login.
  return router.createUrlTree(['/admin/login'], {
    queryParams: { returnUrl: state.url },
  });
};
