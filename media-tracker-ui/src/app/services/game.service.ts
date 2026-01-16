import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { MediaService } from './media.service';
import { IgdbService, IGDBGame } from './igdb.service';
import { MediaItem, MediaType } from '../models/media-type.model';
import { GameMetadata } from '../models/game-metadata.model';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private mediaService = inject(MediaService);
  private igdbService = inject(IgdbService);

  constructor() {}

  getAllGames$(): Observable<MediaItem[]> {
    return this.mediaService.getAllMedia$(MediaType.GAME);
  }

  getGamesByStatus$(statusId: number): Observable<MediaItem[]> {
    return this.mediaService.getMediaByStatus$(statusId, MediaType.GAME);
  }

  async addGameFromIgdb(igdbGame: IGDBGame, statusId: number): Promise<number> {
    const mediaItem = this.igdbService.convertIGDBToMediaItem(igdbGame, statusId);
    const id = await this.mediaService.addMedia(mediaItem);
    
    const metadata: GameMetadata = {
      mediaItemId: id,
      developers: igdbGame.involved_companies?.filter(c => c.developer).map(c => c.company.name) || [],
      publishers: igdbGame.involved_companies?.filter(c => c.publisher).map(c => c.company.name) || [],
      platforms: igdbGame.platforms?.map(p => p.name) || [],
      igdbId: igdbGame.id
    };
    
    await this.mediaService.saveGameMetadata(metadata);
    return id;
  }

  async updateGame(id: number, updates: Partial<MediaItem>): Promise<number> {
    return this.mediaService.updateMedia(id, updates);
  }

  async deleteGame(id: number): Promise<void> {
    return this.mediaService.deleteMedia(id);
  }
}
