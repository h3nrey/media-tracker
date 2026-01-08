import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CategorySyncService } from './sync/category-sync.service';
import { WatchSourceSyncService } from './sync/watch-source-sync.service';
import { AnimeSyncService } from './sync/anime-sync.service';
import { GameSyncService } from './sync/game-sync.service';
import { ListSyncService } from './sync/list-sync.service';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private categorySync = inject(CategorySyncService);
  private watchSourceSync = inject(WatchSourceSyncService);
  private animeSync = inject(AnimeSyncService);
  private gameSync = inject(GameSyncService);
  private listSync = inject(ListSyncService);

  private isSyncingSubject = new BehaviorSubject<boolean>(false);
  isSyncing$ = this.isSyncingSubject.asObservable();

  async sync() {
    if (this.isSyncingSubject.value) return;
    
    console.log('Starting coordinated sync...');
    this.isSyncingSubject.next(true);
    
    try {
      // Order matters due to foreign keys
      await this.categorySync.sync();
      await this.watchSourceSync.sync();
      await this.animeSync.sync();
      await this.gameSync.sync();
      await this.listSync.sync();
      
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Core sync failed:', error);
    } finally {
      this.isSyncingSubject.next(false);
    }
  }
}
