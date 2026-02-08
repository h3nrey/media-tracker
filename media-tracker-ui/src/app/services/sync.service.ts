import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CategorySyncService } from './sync/category-sync.service';
import { WatchSourceSyncService } from './sync/watch-source-sync.service';
import { AnimeSyncService } from './sync/anime-sync.service';
import { GameSyncService } from './sync/game-sync.service';
import { ListSyncService } from './sync/list-sync.service';
import { MediaRunSyncService } from './sync/media-run-sync.service';
import { GameSessionSyncService } from './sync/game-session-sync.service';
import { EpisodeProgressSyncService } from './sync/episode-progress-sync.service';
import { ChapterProgressSyncService } from './sync/chapter-progress-sync.service';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private categorySync = inject(CategorySyncService);
  private watchSourceSync = inject(WatchSourceSyncService);
  private animeSync = inject(AnimeSyncService);
  private gameSync = inject(GameSyncService);
  private listSync = inject(ListSyncService);
  private runSync = inject(MediaRunSyncService);
  private sessionSync = inject(GameSessionSyncService);
  private episodeSync = inject(EpisodeProgressSyncService);
  private chapterSync = inject(ChapterProgressSyncService);
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService).client;

  private isSyncingSubject = new BehaviorSubject<boolean>(false);
  isSyncing$ = this.isSyncingSubject.asObservable();

  async sync() {
    const user = this.authService.currentUser();
    if (!user) return

    if (this.isSyncingSubject.value) return;
    
    this.isSyncingSubject.next(true);
    
    try {
      await this.categorySync.sync();
      await this.watchSourceSync.sync();
      await this.animeSync.sync();
      await this.gameSync.sync();
      // Media Runs system sync
      await this.runSync.sync();
      await this.sessionSync.sync();
      await this.episodeSync.sync();
      await this.chapterSync.sync();
      
      await this.listSync.sync();
      
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Core sync failed:', error);
    } finally {
      this.isSyncingSubject.next(false);
    }
  }
}
