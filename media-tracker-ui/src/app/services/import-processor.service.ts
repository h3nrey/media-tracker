import { Injectable, inject } from '@angular/core';
import { MediaService } from './media.service';
import { MediaType, MediaItem } from '../models/media-type.model';
import { GameMetadata } from '../models/game-metadata.model';
import { AnimeMetadata } from '../models/anime-metadata.model';

export interface ImportResult {
  importedCount: number;
  skippedCount: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class ImportProcessorService {
  private mediaService = inject(MediaService);

  constructor() {}

  async processImport(
    data: string, 
    mediaType: MediaType, 
    categoryId: number,
    skipFirstX: number,
    onProgress: (progress: number, msg: string) => void
  ): Promise<ImportResult> {
    
    // Robust Line Splitting (Handling quoted newlines)
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < data.length; i++) {
        const char = data[i];
        if (char === '"') inQuotes = !inQuotes;

        if (char === '\n' && !inQuotes) {
            if (currentLine.trim().length > 0) lines.push(currentLine);
            currentLine = '';
            continue;
        }
        
        if (char === '\r' && !inQuotes) {
             if (i + 1 < data.length && data[i+1] === '\n') continue;
             if (currentLine.trim().length > 0) lines.push(currentLine);
             currentLine = '';
             continue;
        }
        currentLine += char;
    }
    if (currentLine.trim().length > 0) lines.push(currentLine);

    let importedCount = 0;
    let skippedCount = 0;
    let alreadySkippedByCounter = 0;
    const total = lines.length;

    const existingMedia = await this.mediaService.getAllMedia(mediaType);
    const existingTitles = new Set(existingMedia.map(m => m.title.toLowerCase()));

    for (const line of lines) {
        // Robust CSV/TSV regex
        const regex = /("[\s\S]*?"|[^,\t\r\n]+)(?=\s*[,|\t]|\s*$)/g;
        const parts = (line.match(regex) || []).map(p => p.trim().replace(/^"|"$/g, ''));
        
        if (parts.length < 1) continue;

        // --- TITLE INDEX DETECTION ---
        // Heuristic: "Year" or "Date" is usually 3 columns after Name
        let titleIdx = -1;
        
        for (let i = 0; i <= 2; i++) {
             const targetCol = parts[i+3];
             if (targetCol && /\b(19|20)\d{2}\b/.test(targetCol)) {
                 titleIdx = i;
                 break;
             }
        }

        if (titleIdx === -1) {
            if (!isNaN(Number(parts[0])) && parts[0] !== '') {
                 if (mediaType === MediaType.ANIME) {
                     titleIdx = 2; // Index, Image, Title
                } else {
                    titleIdx = 1; // Index, Title
                }
            } else {
                titleIdx = 0;
            }
        }

        const title = parts[titleIdx];
        if (!title) continue;

        // --- HEADER ROW SKIPPING LOGIC ---
        // Explicitly skip lines that look like headers, even if skipFirstX didn't catch them
        const lowerTitle = title.toLowerCase();
        const forbiddenTitles = [
            'title', 'título', 'name', 'nome', 
            'image', 'img', 'imagem', 
            'cover', 'capa'
        ];
        
        if (forbiddenTitles.includes(lowerTitle)) {
             skippedCount++; // It's a header, skip it effectively
             continue;
        }

        // Also check if any other column strongly suggests a header row
        // e.g. if "Genre" column literally says "Genre"
        if (mediaType === MediaType.ANIME && parts[titleIdx+1] && 
            ['genre', 'gênero', 'genres'].includes(parts[titleIdx+1].toLowerCase())) {
            skippedCount++;
            continue;
        }

        // --- MANUAL SKIP COUNTER ---
        if (alreadySkippedByCounter < skipFirstX) {
          alreadySkippedByCounter++;
          skippedCount++;
          continue;
        }

        if (existingTitles.has(lowerTitle)) {
          skippedCount++;
          continue;
        }

        // --- PARSING ---
        if (mediaType === MediaType.GAME) {
          await this.processGame(parts, titleIdx, title, categoryId);
        } else {
          await this.processAnime(parts, titleIdx, title, categoryId);
        }

        importedCount++;
        existingTitles.add(lowerTitle);
        
        onProgress(Math.round(((importedCount + skippedCount) / total) * 100), 
            `Progress: ${importedCount} added, ${skippedCount} skipped`);
    }

    this.mediaService.triggerFilterUpdate();
    return { importedCount, skippedCount, total };
  }

  private async processGame(parts: string[], titleIdx: number, title: string, categoryId: number) {
      const platformRaw = parts[titleIdx + 1] || '';
      const genreRaw = parts[titleIdx + 2] || '';
      const yearRaw = parts[titleIdx + 3] || '';
      const timeRaw = parts[titleIdx + 4] || '';
      const scoreRaw = parts[titleIdx + 5] || '';
      const commentRaw = parts[titleIdx + 6] || '';

      const platforms = platformRaw ? platformRaw.split(/[;/]/).map(p => p.trim()) : [];
      const genres = genreRaw ? genreRaw.split(/[;/]/).map(g => g.trim()) : [];
      
      let releaseYear: number | undefined;
      const yearMatch = yearRaw.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) releaseYear = parseInt(yearMatch[0], 10);

      let playtimeHours = 0;
      if (timeRaw.includes(':')) {
        const timeParts = timeRaw.split(':').map(Number);
        if (timeParts.length >= 2) playtimeHours = timeParts[0] + (timeParts[1] / 60);
      }
      
      const score = parseInt(scoreRaw.replace(/\D/g, ''), 10) || 0;

      const mediaItem: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'> = {
        mediaTypeId: MediaType.GAME,
        title: title,
        genres,
        platforms,
        releaseYear,
        score,
        statusId: categoryId,
        notes: commentRaw,
        progressCurrent: 0,
        progressTotal: 0,
        sourceLinks: [],
        activityDates: []
      };

      const id = await this.mediaService.addMedia(mediaItem);
      
      const metadata: GameMetadata = {
        mediaItemId: id,
        developers: [],
        publishers: [],
        platforms,
        playtimeHours
      };
      await this.mediaService.saveGameMetadata(metadata);
  }

  private async processAnime(parts: string[], titleIdx: number, title: string, categoryId: number) {
      // Title (0 reference), Genre (+1), Studio (+2), FirstTime (+3), Score (+4)
      const genres = parts[titleIdx + 1] ? parts[titleIdx + 1].split(/[;/]/).map(g => g.trim()) : [];
      const studios = parts[titleIdx + 2] ? parts[titleIdx + 2].split(/[;/]/).map(s => s.trim()) : [];
      const dateRaw = parts[titleIdx + 3];
      const scoreRaw = parts[titleIdx + 4];

      const activityDates: Date[] = [];
      let releaseYear: number | undefined;

       if (dateRaw) {
           const yearMatch = dateRaw.match(/\b(19|20)\d{2}\b/);
           if (yearMatch) {
               const dateMatch = dateRaw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
               if (dateMatch) {
                   const d = new Date(parseInt(dateMatch[3]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1]));
                   activityDates.push(d);
               } else {
                   activityDates.push(new Date(parseInt(yearMatch[0]), 0, 1));
               }
           }
       }
      
      const score = parseInt(scoreRaw?.replace(/\D/g, '') || '0', 10) || 0;

      const mediaItem: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'> = {
        mediaTypeId: MediaType.ANIME,
        title,
        genres,
        studios,
        releaseYear,
        score,
        statusId: categoryId,
        progressCurrent: 0,
        progressTotal: 0,
        sourceLinks: [],
        activityDates
      };

      const id = await this.mediaService.addMedia(mediaItem);

      const metadata: AnimeMetadata = {
          mediaItemId: id,
          studios, 
      };
      await this.mediaService.saveAnimeMetadata(metadata);
  }
}
