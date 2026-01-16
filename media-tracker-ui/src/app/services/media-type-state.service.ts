import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MediaType } from '../models/media-type.model';

@Injectable({
  providedIn: 'root'
})
export class MediaTypeStateService {
  private readonly STORAGE_KEY = 'selected_media_type';
  private selectedMediaType$ = new BehaviorSubject<number | null>(this.getInitialMediaType());

  constructor() {}

  private getInitialMediaType(): number | null {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored === 'null' || stored === null) return null;
    return parseInt(stored, 10);
  }

  getSelectedMediaType$(): Observable<number | null> {
    return this.selectedMediaType$.asObservable();
  }

  setSelectedMediaType(typeId: number | null): void {
    localStorage.setItem(this.STORAGE_KEY, String(typeId));
    this.selectedMediaType$.next(typeId);
  }

  getCurrentMediaType(): number | null {
    return this.selectedMediaType$.getValue();
  }
}
