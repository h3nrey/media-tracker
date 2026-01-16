import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { MediaItem, MediaType } from '../models/media-type.model';
import { Category } from '../models/status.model';

@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {

  // Colors from styles.scss
  private readonly COLORS = {
    primary: '64f65c', // #64f65c (User's primary)
    surface: '161B22', // #161B22 (Dark surface)
    text: 'F0F6FC',    // #F0F6FC (Light text)
    border: '30363D'   // #30363D
  };

  constructor() { }

  async exportMedia(
    mediaItems: MediaItem[], 
    mediaType: MediaType, 
    categories: Category[]
  ): Promise<void> {

    const workbook = new ExcelJS.Workbook();
    const sheetName = mediaType === MediaType.ANIME ? 'Anime List' : 'Game List';
    const worksheet = workbook.addWorksheet(sheetName);

    const categoryMap = new Map<number, string>();
    categories.forEach(c => {
       if (c.id) categoryMap.set(c.id, c.name);
       if (c.supabaseId) categoryMap.set(c.supabaseId, c.name);
    });

    // Define Columns
    if (mediaType === MediaType.ANIME) {
      worksheet.columns = [
        { header: 'Title', key: 'title', width: 40 },
        { header: 'Genres', key: 'genres', width: 30 },
        { header: 'Studios', key: 'studios', width: 25 },
        { header: 'Year', key: 'year', width: 10 },
        { header: 'Score', key: 'score', width: 10 },
        { header: 'Status', key: 'status', width: 20 },
        { header: 'Episodes Watched', key: 'progress', width: 20 }
      ];
    } else {
      worksheet.columns = [
        { header: 'Title', key: 'title', width: 40 },
        { header: 'Platform', key: 'platform', width: 25 },
        { header: 'Genres', key: 'genres', width: 30 },
        { header: 'Year', key: 'year', width: 10 },
        { header: 'Playtime Hours', key: 'playtime', width: 20 },
        { header: 'Score', key: 'score', width: 10 },
        { header: 'Status', key: 'status', width: 20 }
      ];
    }

    // specific parsing for column styling
    const headerRow = worksheet.getRow(1);
    headerRow.height = 30;
    
    headerRow.eachCell((cell) => {
      cell.font = { 
        bold: true, 
        size: 12, 
        color: { argb: 'FF' + this.COLORS.primary.toUpperCase() } 
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF' + this.COLORS.surface.toUpperCase() }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF' + this.COLORS.primary.toUpperCase() } }
      };
    });

    // Add Data
    for (const item of mediaItems) {
      const status = categoryMap.get(item.statusId) || 'Unknown';
      
      let rowValues = {};
      
      if (mediaType === MediaType.ANIME) {
           rowValues = {
             title: item.title,
             genres: item.genres?.join(', ') || '',
             studios: item.studios?.join(', ') || '',
             year: item.releaseYear,
             score: item.score,
             status: status,
             progress: item.progressCurrent || 0
           };
      } else {
           rowValues = {
             title: item.title,
             platform: item.platforms?.join(', ') || '',
             genres: item.genres?.join(', ') || '',
             year: item.releaseYear,
             playtime: item.progressCurrent || 0,
             score: item.score,
             status: status
           };
      }
      worksheet.addRow(rowValues);
    }

    // General Styling for data rows
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.alignment = { vertical: 'middle', wrapText: true };
        row.eachCell((cell) => {
            cell.border = {
                bottom: { style: 'thin', color: { argb: 'FF' + this.COLORS.border.toUpperCase() } }
            };
        });
    });

    // Generate Buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Save File
    const typeName = mediaType === MediaType.ANIME ? 'anime' : 'games';
    const fileName = `media_tracker_${typeName}_export_${new Date().toISOString().slice(0,10)}.xlsx`;
    
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, fileName);
  }
}
