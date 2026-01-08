import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { db } from '../database.service';
import { MediaItem } from '../../models/media-type.model';

@Injectable({
  providedIn: 'root'
})
export class GameSyncService {
  private supabase = inject(SupabaseService).client;

  async sync() {
    console.log('Syncing games...');
    const localMediaItems = await db.mediaItems.where('mediaTypeId').equals(3).toArray();
    const { data: remoteMediaItems, error: mediaError } = await this.supabase
      .from('media_items')
      .select('*')
      .eq('media_type_id', 3);
    
    if (mediaError) throw mediaError;

    const categories = await db.categories.toArray();
    const mapLocalToSupabaseCategory = (localId: number) => categories.find(c => c.id === localId)?.supabaseId;
    const mapSupabaseToLocalCategory = (supabaseId: number) => categories.find(c => c.supabaseId === supabaseId)?.id;

    for (const local of localMediaItems) {
      const remote = remoteMediaItems?.find(r => r.id === local.supabaseId);
      
      const supabaseData = {
        media_type_id: 3,
        title: local.title,
        cover_image: local.coverImage,
        banner_image: local.bannerImage,
        external_id: local.externalId,
        external_api: local.externalApi,
        status_id: mapLocalToSupabaseCategory(local.statusId),
        score: local.score,
        genres: local.genres,
        release_year: local.releaseYear,
        trailer_url: local.trailerUrl,
        notes: local.notes,
        source_links: local.sourceLinks,
        is_deleted: !!local.isDeleted,
        updated_at: local.updatedAt.toISOString()
      };

      if (!remote) {
        if (!local.isDeleted) {
          const { data, error: insertError } = await this.supabase
            .from('media_items')
            .insert([{ ...supabaseData, created_at: local.createdAt.toISOString() }])
            .select()
            .single();

          if (insertError) console.error('Error inserting game:', insertError);
          else {
            await db.mediaItems.update(local.id!, { 
              supabaseId: data.id, 
              lastSyncedAt: new Date() 
            });
            await this.syncGameMetadata(local.id!, data.id);
          }
        }
      } else {
        const remoteUpdatedAt = new Date(remote.updated_at);
        if (local.updatedAt > remoteUpdatedAt && (!local.lastSyncedAt || local.updatedAt > local.lastSyncedAt)) {
          await this.supabase.from('media_items').update(supabaseData).eq('id', local.supabaseId);
          await db.mediaItems.update(local.id!, { lastSyncedAt: new Date() });
          await this.syncGameMetadata(local.id!, local.supabaseId!);
        } else if (remoteUpdatedAt > (local.lastSyncedAt || local.updatedAt)) {
          await db.mediaItems.update(local.id!, {
            supabaseId: remote.id,
            title: remote.title,
            coverImage: remote.cover_image,
            bannerImage: remote.banner_image,
            externalId: remote.external_id,
            externalApi: remote.external_api,
            statusId: mapSupabaseToLocalCategory(remote.status_id) || local.statusId,
            score: remote.score,
            genres: remote.genres || [],
            releaseYear: remote.release_year,
            trailerUrl: remote.trailer_url,
            notes: remote.notes,
            sourceLinks: remote.source_links || [],
            isDeleted: remote.is_deleted,
            updatedAt: remoteUpdatedAt,
            lastSyncedAt: new Date(),
            progress_current: local.progress_current,
            progress_total: local.progress_total
          });
          await this.syncGameMetadata(local.id!, remote.id);
        }
      }
    }

    // Pull new remote games
    for (const remote of remoteMediaItems || []) {
      const local = localMediaItems.find(l => l.supabaseId === remote.id);
      if (!local) {
        const localId = await db.mediaItems.add({
          supabaseId: remote.id,
          mediaTypeId: 3,
          title: remote.title,
          coverImage: remote.cover_image,
          bannerImage: remote.banner_image,
          externalId: remote.external_id,
          externalApi: remote.external_api,
          statusId: mapSupabaseToLocalCategory(remote.status_id) || 0,
          score: remote.score,
          genres: remote.genres || [],
          releaseYear: remote.release_year,
          trailerUrl: remote.trailer_url,
          notes: remote.notes,
          sourceLinks: remote.source_links || [],
          isDeleted: remote.is_deleted,
          createdAt: new Date(remote.created_at),
          updatedAt: new Date(remote.updated_at),
          lastSyncedAt: new Date(),
          progress_current: 0,
          progress_total: 0
        });
        await this.syncGameMetadata(localId as number, remote.id);
      }
    }
  }

  private async syncGameMetadata(localMediaId: number, remoteMediaId: number) {
    const localMeta = await db.gameMetadata.get(localMediaId);
    const { data: remoteMeta, error } = await this.supabase
      .from('game_metadata')
      .select('*')
      .eq('media_item_id', remoteMediaId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (localMeta) {
      const localItem = await db.mediaItems.get(localMediaId);
      const supabaseData = {
        media_item_id: remoteMediaId,
        igdb_id: localMeta.igdbId,
        developers: localMeta.developers,
        publishers: localMeta.publishers,
        platforms: localMeta.platforms,
        hours_played: localItem?.progress_current || 0
      };

      if (!remoteMeta) {
        await this.supabase.from('game_metadata').insert([supabaseData]);
      } else {
        await this.supabase.from('game_metadata').update(supabaseData).eq('media_item_id', remoteMediaId);
      }
    } else if (remoteMeta) {
      await db.gameMetadata.put({
        mediaItemId: localMediaId,
        igdbId: remoteMeta.igdb_id,
        developers: remoteMeta.developers || [],
        publishers: remoteMeta.publishers || [],
        platforms: remoteMeta.platforms || [],
        playtimeHours: remoteMeta.hours_played,
      });
      // Sync progress and studios (developers) back to media_item
      await db.mediaItems.update(localMediaId, {
        progress_current: remoteMeta.hours_played,
        studios: remoteMeta.developers || [],
        platforms: remoteMeta.platforms || [],
      });
    }
  }
}
