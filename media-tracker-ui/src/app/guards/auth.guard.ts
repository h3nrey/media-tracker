import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take, filter } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return combineLatest([
    toObservable(authService.currentUser),
    toObservable(authService.isReady)
  ]).pipe(
    filter(([_, ready]) => ready),
    take(1),
    map(([user]) => {
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

  return combineLatest([
    toObservable(authService.currentUser),
    toObservable(authService.isReady)
  ]).pipe(
    filter(([_, ready]) => ready),
    take(1),
    map(([user]) => {
      if (!user) {
        return true;
      }

      router.navigate(['/']);
      return false;
    })
  );
};

