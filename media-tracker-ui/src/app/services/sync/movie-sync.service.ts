import { Injectable } from '@angular/core';
import { db } from '../database.service';
import { MediaItem } from '../../models/media-type.model';
import { SyncBaseService } from './sync-base.service';
import { AuthService } from '../auth.service';
import { inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MovieSyncService extends SyncBaseService<MediaItem> {
  protected override tableName = 'media_items';
  protected override entityType = 'Movie';

  async sync(lastSyncedAt?: Date) {
    const localMediaItems = await db.mediaItems.where('mediaTypeId').equals(4).toArray();
    await this.syncEntity(localMediaItems, lastSyncedAt);
  }

  override async syncEntity(localItems: MediaItem[], lastSyncedAt?: Date) {
    console.log(`Syncing ${this.entityType}...`);
    
    const user = this.authService.currentUser();
    if (!user) return;

    const { data: remoteItems, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('media_type_id', 4)
      .eq('user_id', user.id);

    if (error) throw error;

    const categories = await db.categories.toArray();
    const mapLocalToSupabaseCategory = (localId: number) => categories.find(c => c.id === localId)?.supabaseId;
    const mapSupabaseToLocalCategory = (supabaseId: number) => categories.find(c => c.supabaseId === supabaseId)?.id;

    for (const remote of remoteItems || []) {
      const local = localItems.find(l => l.supabaseId === remote.id || (l.externalId === remote.external_id && !!remote.external_id));
      
      if (!local) {
        await this.handleMissingLocal(remote, mapSupabaseToLocalCategory);
      } else {
        if (!local.supabaseId) {
          await db.mediaItems.update(local.id!, { supabaseId: remote.id, version: remote.version });
          local.supabaseId = remote.id;
          local.version = remote.version;
        }

        if (remote.version === local.version) {
          continue;
        } else if (remote.version > local.version) {
          await this.pullRemote(local.id!, remote, mapSupabaseToLocalCategory);
        } else if (local.version > remote.version) {
          await this.pushLocalWithVersionCheck(local, remote, mapLocalToSupabaseCategory);
        }
      }
    }

    const newItems = localItems.filter(l => !l.supabaseId && !l.isDeleted);
    for (const local of newItems) {
      await this.handleNewLocal(local, mapLocalToSupabaseCategory);
    }
  }

  protected override async handleMissingLocal(remote: any, mapSupabaseToLocalCategory?: any) {
    const localId = await db.mediaItems.add({
      supabaseId: remote.id,
      mediaTypeId: 4,
      title: remote.title,
      coverImage: remote.cover_image,
      bannerImage: remote.banner_image,
      externalId: remote.external_id,
      externalApi: remote.external_api,
      statusId: mapSupabaseToLocalCategory?.(remote.status_id) || 0,
      score: remote.score,
      genres: remote.genres || [],
      releaseYear: remote.release_year,
      trailerUrl: remote.trailer_url,
      notes: remote.notes,
      sourceLinks: remote.source_links || [],
      isDeleted: remote.is_deleted,
      version: remote.version,
      createdAt: new Date(remote.created_at),
      updatedAt: new Date(remote.updated_at),
      progressCurrent: remote.progress_current || 0,
      progressTotal: remote.progress_total || 0,
    } as MediaItem);
    await this.syncMovieMetadata(localId as number, remote.id, 'pull');
  }

  protected override async pullRemote(localId: number, remote: any, mapSupabaseToLocalCategory?: any) {
    const parseRemoteDate = (d: any) => d ? new Date(d) : undefined;
    await db.mediaItems.update(localId, {
      title: remote.title,
      coverImage: remote.cover_image,
      bannerImage: remote.banner_image,
      externalId: remote.external_id,
      externalApi: remote.external_api,
      statusId: mapSupabaseToLocalCategory?.(remote.status_id) || 0,
      score: remote.score,
      genres: remote.genres || [],
      releaseYear: remote.release_year,
      startDate: parseRemoteDate(remote.start_date),
      endDate: parseRemoteDate(remote.end_date),
      trailerUrl: remote.trailer_url,
      notes: remote.notes,
      sourceLinks: remote.source_links || [],
      isDeleted: remote.is_deleted,
      version: remote.version,
      updatedAt: new Date(remote.updated_at),
      progressCurrent: remote.progress_current,
      progressTotal: remote.progress_total,
    });
    await this.syncMovieMetadata(localId, remote.id, 'pull');
  }

  protected override mapToSupabase(local: MediaItem, mapLocalToSupabaseCategory?: any) {
    const normalizeDate = (d: any) => {
      if (!d) return null;
      const date = new Date(d);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    };

    return {
      media_type_id: 4,
      title: local.title,
      cover_image: local.coverImage,
      banner_image: local.bannerImage,
      external_id: local.externalId,
      external_api: local.externalApi,
      status_id: mapLocalToSupabaseCategory?.(local.statusId),
      score: local.score,
      genres: local.genres,
      release_year: local.releaseYear,
      start_date: normalizeDate(local.startDate),
      end_date: normalizeDate(local.endDate),
      trailer_url: local.trailerUrl,
      notes: local.notes,
      source_links: local.sourceLinks || [],
      progress_current: local.progressCurrent,
      progress_total: local.progressTotal,
      is_deleted: !!local.isDeleted,
      updated_at: local.updatedAt.toISOString(),
      user_id: this.authService.currentUser()?.id
    };
  }

  protected override async pushLocalWithVersionCheck(local: MediaItem, remote: any, mapLocalToSupabaseCategory?: any) {
    const supabaseData = this.mapToSupabase(local, mapLocalToSupabaseCategory);
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ ...supabaseData, version: local.version })
      .eq('id', local.supabaseId)
      .eq('version', remote.version)
      .select()
      .single();

    if (error || !data) {
      await this.recordConflict(local, remote);
    } else {
      await this.syncMovieMetadata(local.id!, local.supabaseId!, 'push');
    }
  }

  protected override async handleNewLocal(local: MediaItem, mapLocalToSupabaseCategory?: any) {
    const supabaseData = this.mapToSupabase(local, mapLocalToSupabaseCategory);
    
    if (local.externalId) {
      const { data: matchedRemote } = await this.supabase
        .from('media_items')
        .select('*')
        .eq('external_id', local.externalId)
        .eq('media_type_id', 4)
        .eq('user_id', this.authService.currentUser()?.id)
        .maybeSingle();

      if (matchedRemote) {
        await db.mediaItems.update(local.id!, { supabaseId: matchedRemote.id });
        const categories = await db.categories.toArray();
        const mapSupabaseToLocalCategory = (supabaseId: number) => categories.find(c => c.supabaseId === supabaseId)?.id;
        
        if (matchedRemote.is_deleted) {
          // Reactivate the deleted item with local data
          await this.pushLocalWithVersionCheck(local, matchedRemote, mapLocalToSupabaseCategory);
        } else {
          await this.pullRemote(local.id!, matchedRemote, mapSupabaseToLocalCategory);
        }
        return;
      }
    }

    const { data, error } = await this.supabase
      .from('media_items')
      .insert([{
        ...supabaseData,
        version: 1,
        created_at: local.createdAt.toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error inserting movie:', error);
    } else {
      await db.mediaItems.update(local.id!, { supabaseId: data.id, version: data.version });
      await this.syncMovieMetadata(local.id!, data.id, 'push');
    }
  }

  private async syncMovieMetadata(localMediaId: number, remoteMediaId: number, direction: 'push' | 'pull' = 'push') {
    const localMeta = await db.movieMetadata.get(localMediaId);
    const { data: remoteMetas } = await this.supabase
      .from('movie_metadata')
      .select('*')
      .eq('media_item_id', remoteMediaId)
      .limit(1);

    const remoteMeta = remoteMetas?.[0];

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
      await db.mediaItems.update(localMediaId, {
        studios: remoteMeta.directors || [],
      });
    }
  }
}
