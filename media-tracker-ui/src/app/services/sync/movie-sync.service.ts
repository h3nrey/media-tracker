import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { db } from '../database.service';
import { MediaItem } from '../../models/media-type.model';

@Injectable({
  providedIn: 'root'
})
export class MovieSyncService {
  private supabase = inject(SupabaseService).client;

  async sync() {
    console.log('Syncing movies...');
    const localMediaItems = await db.mediaItems.where('mediaTypeId').equals(4).toArray();
    const { data: remoteMediaItems, error: mediaError } = await this.supabase
      .from('media_items')
      .select('*')
      .eq('media_type_id', 4);
    
    if (mediaError) throw mediaError;

    const categories = await db.categories.toArray();
    const mapLocalToSupabaseCategory = (localId: number) => categories.find(c => c.id === localId)?.supabaseId;
    const mapSupabaseToLocalCategory = (supabaseId: number) => categories.find(c => c.supabaseId === supabaseId)?.id;

    for (const local of localMediaItems) {
      // 1. Try to find remote by supabaseId or Natural Key (externalId + mediaTypeId)
      let remote = remoteMediaItems?.find(r => r.id === local.supabaseId);
      
      if (!remote && !local.supabaseId && local.externalId) {
        remote = remoteMediaItems?.find(r => r.external_id === local.externalId && r.media_type_id === 4 && !r.is_deleted);
        if (remote) {
          await db.mediaItems.update(local.id!, { supabaseId: remote.id });
          local.supabaseId = remote.id;
        }
      }
      
      const normalizeDate = (d: any) => {
        if (!d) return null;
        const date = new Date(d);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().split('T')[0]; // Store as YYYY-MM-DD
      };

      const supabaseData = {
        media_type_id: 4,
        title: local.title,
        cover_image: local.coverImage,
        banner_image: local.bannerImage,
        external_id: local.externalId,
        external_api: local.externalApi,
        status_id: mapLocalToSupabaseCategory(local.statusId),
        score: local.score,
        genres: local.genres,
        release_year: local.releaseYear,
        start_date: normalizeDate(local.startDate),
        end_date: normalizeDate(local.endDate),
        trailer_url: local.trailerUrl,
        notes: local.notes,
        source_links: local.sourceLinks,
        progress_current: local.progressCurrent,
        progress_total: local.progressTotal,
        is_deleted: !!local.isDeleted,
        updated_at: local.updatedAt.toISOString()
      };

      if (!remote) {
        if (local.supabaseId) {
          // Deleted on remote - remove locally
          console.log(`Movie ${local.title} deleted on remote, removing locally.`);
          await db.mediaItems.delete(local.id!);
          await db.movieMetadata.delete(local.id!);
          continue;
        }

        if (!local.isDeleted) {
          const { data, error: insertError } = await this.supabase
            .from('media_items')
            .insert([{ ...supabaseData, created_at: local.createdAt.toISOString() }])
            .select()
            .single();

          if (insertError) console.error('Error inserting movie (media_items):', insertError);
          else {
            await db.mediaItems.update(local.id!, { 
              supabaseId: data.id, 
              lastSyncedAt: new Date() 
            });
            await this.syncMovieMetadata(local.id!, data.id, 'push');
          }
        }
      } else {
        const remoteUpdatedAt = new Date(remote.updated_at);
        
        // Conflict Resolution: Most recent wins
        const localIsNewer = local.updatedAt > remoteUpdatedAt;
        const remoteIsNewer = remoteUpdatedAt > local.updatedAt;
        const localHasChanges = !local.lastSyncedAt || local.updatedAt > local.lastSyncedAt;
        const remoteHasChanges = !local.lastSyncedAt || remoteUpdatedAt > local.lastSyncedAt;

        const parseRemoteDate = (d: any) => d ? new Date(d) : undefined;

        if (localIsNewer && localHasChanges) {
          // Local wins and pushes
          await this.supabase.from('media_items').update(supabaseData).eq('id', local.supabaseId);
          await db.mediaItems.update(local.id!, { lastSyncedAt: new Date() });
          await this.syncMovieMetadata(local.id!, local.supabaseId!, 'push');
        } else if (remoteIsNewer && remoteHasChanges) {
          // Remote wins and pulls
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
            startDate: parseRemoteDate(remote.start_date),
            endDate: parseRemoteDate(remote.end_date),
            trailerUrl: remote.trailer_url,
            notes: remote.notes,
            sourceLinks: remote.source_links || [],
            progressCurrent: remote.progress_current,
            progressTotal: remote.progress_total,
            isDeleted: remote.is_deleted,
            updatedAt: remoteUpdatedAt,
            lastSyncedAt: new Date(),
          });
          await this.syncMovieMetadata(local.id!, remote.id, 'pull');
        } else if (!localHasChanges && remoteHasChanges) {
          // Local hasn't changed but remote has
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
            startDate: parseRemoteDate(remote.start_date),
            endDate: parseRemoteDate(remote.end_date),
            trailerUrl: remote.trailer_url,
            notes: remote.notes,
            sourceLinks: remote.source_links || [],
            progressCurrent: remote.progress_current,
            progressTotal: remote.progress_total,
            isDeleted: remote.is_deleted,
            updatedAt: remoteUpdatedAt,
            lastSyncedAt: new Date(),
          });
          await this.syncMovieMetadata(local.id!, remote.id, 'pull');
        }
      }
    }

    // Pull new remote movies
    for (const remote of remoteMediaItems || []) {
      const local = localMediaItems.find(l => l.supabaseId === remote.id || (l.externalId === remote.external_id && l.mediaTypeId === 4));
      if (!local) {
        const localId = await db.mediaItems.add({
          supabaseId: remote.id,
          mediaTypeId: 4,
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
          progressCurrent: remote.progress_current || 0,
          progressTotal: remote.progress_total || 0
        });
        await this.syncMovieMetadata(localId as number, remote.id, 'pull');
      }
    }
  }

  private async syncMovieMetadata(localMediaId: number, remoteMediaId: number, direction: 'push' | 'pull' = 'push') {
    const localMeta = await db.movieMetadata.get(localMediaId);
    const { data: remoteMetas, error } = await this.supabase
      .from('movie_metadata')
      .select('*')
      .eq('media_item_id', remoteMediaId)
      .limit(1);

    const remoteMeta = remoteMetas?.[0];
    if (error) throw error;

    if (direction === 'push' && localMeta) {
      const supabaseData = {
        media_item_id: remoteMediaId,
        tmdb_id: localMeta.tmdbId,
        directors: localMeta.directors,
        cast: localMeta.cast,
        studios: localMeta.studios
      };

      if (!remoteMeta) {
        await this.supabase.from('movie_metadata').insert([supabaseData]);
      } else {
        await this.supabase.from('movie_metadata').update(supabaseData).eq('media_item_id', remoteMediaId);
      }
    } else if (direction === 'pull' && remoteMeta) {
      await db.movieMetadata.put({
        mediaItemId: localMediaId,
        tmdbId: remoteMeta.tmdb_id,
        directors: remoteMeta.directors || [],
        cast: remoteMeta.cast || [],
        studios: remoteMeta.studios || [],
        progressTotal: remoteMeta.progress_total
      });
      // Update progress and studios on mediaItem
      await db.mediaItems.update(localMediaId, {
        studios: remoteMeta.directors || [],
      });
    }
  }
}
