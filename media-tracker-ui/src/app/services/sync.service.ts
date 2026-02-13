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
import { MovieSyncService } from './sync/movie-sync.service';
import { MangaSyncService } from './sync/manga-sync.service';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { db } from './database.service';

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
  private movieSync = inject(MovieSyncService);
  private mangaSync = inject(MangaSyncService);
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService).client;

  private isSyncingSubject = new BehaviorSubject<boolean>(false);
  isSyncing$ = this.isSyncingSubject.asObservable();

  async sync() {
    const user = this.authService.currentUser();
    if (!user) return;

    if (this.isSyncingSubject.value) return;
    this.isSyncingSubject.next(true);

    try {
      let localProfile = await db.profiles.get(user.id);
      const { data: remoteProfile, error: profileError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      if (!localProfile && !remoteProfile) {
        localProfile = {
          id: user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        };
        await db.profiles.add(localProfile);
      } else if (!remoteProfile && localProfile) {
        await this.supabase.from('profiles').insert([{
          id: localProfile.id,
          display_name: user.displayName,
          avatar_url: user.avatarUrl,
          version: 1
        }]);
      } else if (remoteProfile && !localProfile) {
        localProfile = {
          id: remoteProfile.id,
          displayName: remoteProfile.display_name,
          avatarUrl: remoteProfile.avatar_url,
          lastSyncedAt: remoteProfile.last_synced_at ? new Date(remoteProfile.last_synced_at) : undefined,
          createdAt: new Date(remoteProfile.created_at),
          updatedAt: new Date(remoteProfile.updated_at),
          version: remoteProfile.version || 1
        };
        await db.profiles.add(localProfile);
      } else if (localProfile && remoteProfile) {
        const remoteVersion = remoteProfile.version || 1;
        
        if (remoteVersion > localProfile.version) {
          await db.profiles.update(user.id, {
            displayName: remoteProfile.display_name,
            avatarUrl: remoteProfile.avatar_url,
            version: remoteVersion,
            updatedAt: new Date(remoteProfile.updated_at)
          });
        } else if (localProfile.version > remoteVersion) {
          const { error: updateError } = await this.supabase
            .from('profiles')
            .update({
              display_name: user.displayName,
              avatar_url: user.avatarUrl,
              version: localProfile.version
            })
            .eq('id', user.id)
            .eq('version', remoteVersion);

          if (updateError) {
            console.warn('Profile sync conflict, pulling remote');
            await db.profiles.update(user.id, {
              displayName: remoteProfile.display_name,
              avatarUrl: remoteProfile.avatar_url,
              version: remoteVersion
            });
          }
        }
      }

      await this.syncServices();

      const now = new Date();
      await db.profiles.update(user.id, { lastSyncedAt: now });
      await this.supabase.from('profiles').update({ 
        last_synced_at: now.toISOString()
      }).eq('id', user.id);

      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Core sync failed:', error);
    } finally {
      this.isSyncingSubject.next(false);
    }
  }

  async syncServices() {
    const profile = await db.profiles.toCollection().first();
    const lastSyncedAt = profile?.lastSyncedAt;

    await this.categorySync.sync(lastSyncedAt);
    await this.watchSourceSync.sync(lastSyncedAt);
    await this.animeSync.sync(lastSyncedAt);
    await this.mangaSync.sync(lastSyncedAt);
    await this.gameSync.sync(lastSyncedAt);
    await this.movieSync.sync(lastSyncedAt);
    await this.runSync.sync(lastSyncedAt);
    await this.sessionSync.sync(lastSyncedAt);
    await this.episodeSync.sync(lastSyncedAt);
    await this.chapterSync.sync(lastSyncedAt);
    await this.listSync.sync(lastSyncedAt);
  }
}
