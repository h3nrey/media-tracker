import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule, Monitor, Gamepad, BookOpen, Film, ExternalLink, Zap, Play, CheckCheck, Calendar, TrendingUp, Settings, Clock, ArrowRight } from 'lucide-angular';
import { MediaService } from '../../services/media.service';
import { MediaRunService } from '../../services/media-run.service';
import { PortalShortcutService } from '../../services/portal-shortcut.service';
import { GameSessionService } from '../../services/game-session.service';
import { EpisodeProgressService } from '../../services/episode-progress.service';
import { ChapterProgressService } from '../../services/chapter-progress.service';
import { SupabaseService } from '../../services/supabase.service';
import { ManagePortalShortcutsDialogComponent } from '../../components/manage-portal-shortcuts-dialog/manage-portal-shortcuts-dialog.component';
import { PortalShortcut } from '../../models/portal-shortcut.model';
import { MediaItem } from '../../models/media-type.model';
import { MediaRun } from '../../models/media-run.model';
import { ViewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-portal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule, ManagePortalShortcutsDialogComponent],
  templateUrl: './portal.component.html',
  styleUrl: './portal.component.scss'
})
export class PortalComponent implements OnInit {
  @ViewChild(ManagePortalShortcutsDialogComponent) manageShortcutsDialog!: ManagePortalShortcutsDialogComponent;

  private mediaService = inject(MediaService);
  private runService = inject(MediaRunService);
  private shortcutService = inject(PortalShortcutService);
  private sessionService = inject(GameSessionService);
  private episodeService = inject(EpisodeProgressService);
  private chapterService = inject(ChapterProgressService);
  private supabaseService = inject(SupabaseService);
  public router = inject(Router);

  // Icons
  readonly MonitorIcon = Monitor;
  readonly GamepadIcon = Gamepad;
  readonly BookOpenIcon = BookOpen;
  readonly FilmIcon = Film;
  readonly ExternalLinkIcon = ExternalLink;
  readonly ZapIcon = Zap;
  readonly PlayIcon = Play;
  readonly CheckCheckIcon = CheckCheck;
  readonly CalendarIcon = Calendar;
  readonly TrendingUpIcon = TrendingUp;
  readonly SettingsIcon = Settings;
  readonly ClockIcon = Clock;
  readonly ArrowRightIcon = ArrowRight;

  // Data signals (reactive from services)
  mediaList = toSignal(this.mediaService.getAllMedia$(), { initialValue: [] });
  allShortcuts = toSignal(this.shortcutService.getShortcuts$(), { initialValue: [] });
  
  // Computed Signals
  allActiveRuns = computed(() => {
    const media = this.mediaList();
    const runs: (MediaRun & { media: MediaItem })[] = [];
    
    media.forEach(item => {
      if (item.runs) {
        // Last run is the one with highest runNumber or no endDate
        const active = item.runs.find(r => !r.endDate) || 
                      [...item.runs].sort((a,b) => b.runNumber - a.runNumber)[0];
        if (active && !active.endDate) {
          runs.push({ ...active, media: item });
        }
      }
    });
    console.log("runs", runs);
    return runs;
  });
  

  // "Continuar" -> last medias with active run, sorted by latest activity
  continuarRuns = computed(() => {
    const interactions = this.latestInteractions();
    return [...this.allActiveRuns()].sort((a, b) => {
      const timeA = interactions[a.id!] || new Date(a.media.updatedAt).getTime();
      const timeB = interactions[b.id!] || new Date(b.media.updatedAt).getTime();
      return timeB - timeA;
    }).slice(0, 6);
  });

  // "Abandonados" -> active runs with oldest start_date (long time no revisit)
  abandonadosRuns = computed(() => {
    return [...this.allActiveRuns()]
      .filter(r => r.startDate)
      .sort((a, b) => {
        const timeA = new Date(a.startDate!).getTime();
        const timeB = new Date(b.startDate!).getTime();
        return timeA - timeB;
      }).slice(0, 4);
  });

  // "Dê uma chance" -> medias that do not have any run
  deUmaChanceMedia = computed(() => {
    return this.mediaList()
      .filter(m => !m.runs || m.runs.length === 0)
      .slice(0, 6);
  });

  heroRun = computed(() => this.continuarRuns()[0]);

  // Statistics Signal
  portalStats = signal({
    gameHours: 0,
    animeEpisodes: 0,
    moviesCount: 0
  });

  // Maps runId to latest interaction timestamp
  latestInteractions = signal<Record<number, number>>({});

  // Maps runId to real current progress count
  runProgressMap = signal<Record<number, number>>({});

  statsToday = signal(0);
  statsThisWeek = signal(0);

  async ngOnInit() {
    this.calculateRealStats();
  }

  private async calculateRealStats() {
    const media = this.mediaList();
    console.log("media: ", media)
    if (media.length === 0) return;

    // Get the IDs of the last run for each media item to calculate accurate stats
    const lastRunIds = media
      .map(m => [...(m.runs || [])].sort((a,b) => b.runNumber - a.runNumber)[0]?.id)
      .filter(id => !!id) as number[];

    console.log("lastRunIds: ", lastRunIds)
    if (lastRunIds.length === 0) return;

    // 1. Fetch granular progress data for all relevant runs in parallel
    const [sessions, episodes, chapters] = await Promise.all([
      this.supabaseService.client.from('game_sessions').select('run_id, duration_minutes, played_at').in('run_id', lastRunIds),
      this.supabaseService.client.from('episode_progress').select('run_id, watched_at').in('run_id', lastRunIds),
      this.supabaseService.client.from('chapter_progress').select('run_id, read_at').in('run_id', lastRunIds)
    ]);


    // 2. Map progress and interactions per run
    const runStatsMap: Record<number, { current: number; latestInteraction: number }> = {};
    
    (sessions.data || []).forEach((s: any) => {
      const rid = s.run_id;
      if (!runStatsMap[rid]) runStatsMap[rid] = { current: 0, latestInteraction: 0 };
      runStatsMap[rid].current += (s.duration_minutes / 60);
      const time = new Date(s.played_at).getTime();
      if (time > runStatsMap[rid].latestInteraction) runStatsMap[rid].latestInteraction = time;
    });

    (episodes.data || []).forEach((e: any) => {
      const rid = e.run_id;
      if (!runStatsMap[rid]) runStatsMap[rid] = { current: 0, latestInteraction: 0 };
      runStatsMap[rid].current += 1;
      const time = new Date(e.watched_at).getTime();
      if (time > runStatsMap[rid].latestInteraction) runStatsMap[rid].latestInteraction = time;
    });

    (chapters.data || []).forEach((c: any) => {
      const rid = c.run_id;
      if (!runStatsMap[rid]) runStatsMap[rid] = { current: 0, latestInteraction: 0 };
      runStatsMap[rid].current += 1;
      const time = new Date(c.read_at).getTime();
      if (time > runStatsMap[rid].latestInteraction) runStatsMap[rid].latestInteraction = time;
    });

    // 3. Update Progress Map Signal
    const finalProgress: Record<number, number> = {};
    const finalInteractions: Record<number, number> = {};
    
    Object.keys(runStatsMap).forEach(key => {
        const rid = Number(key);
        finalProgress[rid] = runStatsMap[rid].current;
        finalInteractions[rid] = runStatsMap[rid].latestInteraction;
    });

    this.runProgressMap.set(finalProgress);
    this.latestInteractions.set(finalInteractions);

    // 4. Aggregate Portal Stats
    let totalGameHours = 0;
    let totalAnimeEpisodes = 0;
    let totalMoviesWithRuns = 0;

    media.forEach(m => {
      const lastRun = [...(m.runs || [])].sort((a,b) => b.runNumber - a.runNumber)[0];
      if (lastRun && runStatsMap[lastRun.id!]) {
        if (m.mediaTypeId === 3) totalGameHours += runStatsMap[lastRun.id!].current;
        if (m.mediaTypeId === 1) totalAnimeEpisodes += runStatsMap[lastRun.id!].current;
      }
      if (m.mediaTypeId === 4 && m.runs && m.runs.length > 0) {
        totalMoviesWithRuns++;
      }
    });

    this.portalStats.set({
      gameHours: Math.round(totalGameHours),
      animeEpisodes: Math.round(totalAnimeEpisodes),
      moviesCount: totalMoviesWithRuns
    });

    // 5. Daily Stats
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const recentSessions = await this.sessionService.getRecentSessions(100);
    const gameMinutesToday = recentSessions
      .filter(s => new Date(s.playedAt) >= startOfToday)
      .reduce((acc, s) => acc + s.durationMinutes, 0);

    this.statsToday.set(Math.round(gameMinutesToday / 60));
  }

  getShortcutsFor(type: string): PortalShortcut[] {
    const shortcuts = this.allShortcuts();
    const typeIdMap: Record<string, number> = {
      'anime': 1,
      'manga': 2,
      'game': 3,
      'movie': 4
    };
    const targetId = typeIdMap[type];
    return shortcuts.filter(s => s.mediaTypeId === targetId);
  }

  openManage(mediaTypeId?: number) {
    this.manageShortcutsDialog.open(mediaTypeId);
  }

  getProgressPercentage(run: MediaRun & { media: MediaItem }): number {
    const current = this.runProgressMap()[run.id!] ?? run.media.progressCurrent ?? 0;
    const total = run.media.progressTotal || 0;
    if (!total) return 0;
    return Math.min(Math.round((current / total) * 100), 100);
  }

  getProgressLabel(run: MediaRun & { media: MediaItem }): string {
    const current = this.runProgressMap()[run.id!] ?? run.media.progressCurrent ?? 0;
    const total = run.media.progressTotal || '?';
    
    switch(run.media.mediaTypeId) {
      case 1: return `Episódio ${Math.floor(current)} de ${total}`;
      case 2: return `Capítulo ${Math.floor(current)} de ${total}`;
      case 3: return `${current.toFixed(1)} horas jogadas`;
      case 4: return `${Math.floor(current)} de ${total} min`;
      default: return `Progresso: ${current}/${total}`;
    }
  }

  goToMedia(run: MediaRun & { media?: MediaItem }) {
    if (!run.media?.id) return;
    const type = run.media.mediaTypeId;
    if (type === 1) this.router.navigate(['/anime', run.media.id]);
    else if (type === 2) this.router.navigate(['/manga', run.media.id]);
    else if (type === 3) this.router.navigate(['/game', run.media.id]);
    else if (type === 4) this.router.navigate(['/movie', run.media.id]);
    else this.router.navigate(['/media', run.media.id]);
  }
}
