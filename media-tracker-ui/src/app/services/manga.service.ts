import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { MediaService } from './media.service';
import { MalService } from './mal.service';
import { MediaItem, MediaType } from '../models/media-type.model';
import { MangaMetadata } from '../models/manga-metadata.model';
import { JikanManga } from '../models/jikan-manga.model';
import { db } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class MangaService {
  private mediaService = inject(MediaService);
  private malService = inject(MalService);

  constructor() {}

  getAllManga$(): Observable<MediaItem[]> {
    return this.mediaService.getAllMedia$(MediaType.MANGA);
  }

  getMangaByStatus$(statusId: number): Observable<MediaItem[]> {
    return this.mediaService.getMediaByStatus$(statusId, MediaType.MANGA);
  }

  async getMangaById(id: number): Promise<MediaItem | undefined> {
    return this.mediaService.getMediaById(id);
  }

  async addMangaFromMal(jikanManga: JikanManga, statusId: number): Promise<number> {
    const mediaItem = this.malService.convertJikanToManga(jikanManga, statusId);
    const id = await this.mediaService.addMedia(mediaItem);
    
    const metadata: MangaMetadata = {
      mediaItemId: id,
      authors: jikanManga.authors?.map(a => a.name) || [],
      publishers: jikanManga.serializations?.map(s => s.name) || [],
      malId: jikanManga.mal_id,
      publicationStatus: jikanManga.status
    };
    
    await this.mediaService.saveMangaMetadata(metadata);
    return id;
  }

  async updateManga(id: number, updates: Partial<MediaItem>): Promise<number> {
    return this.mediaService.updateMedia(id, updates);
  }

  async deleteManga(id: number): Promise<void> {
    return this.mediaService.deleteMedia(id);
  }

  async getMangaMetadata(id: number): Promise<MangaMetadata | undefined> {
    return this.mediaService.getMangaMetadata(id);
  }
}
