import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.currentUser).pipe(
    take(1),
    map(user => {
      if (user) {
        return true;
      }

      router.navigate(['/landing']);
      return false;
    })
  );
};

export const publicOnlyGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.currentUser).pipe(
    take(1),
    map(user => {
      if (!user) {
        return true;
      }

      router.navigate(['/']);
      return false;
    })
  );
};

