import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, PlusCircle, Clock, X } from 'lucide-angular';
import { GameSession } from '../../../models/media-run.model';
import { GameSessionService } from '../../../services/game-session.service';
import { FormsModule } from '@angular/forms';
import { GameSessionFormComponent } from './game-session-form/game-session-form.component';

@Component({
  selector: 'app-game-sessions',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule,
    GameSessionFormComponent
  ],
  templateUrl: './game-sessions.component.html',
  styleUrls: ['./game-sessions.component.scss']
})
export class GameSessionsComponent implements OnInit {
  @Input({ required: true }) runId!: number;

  private sessionService = inject(GameSessionService);

  sessions = signal<GameSession[]>([]);
  isAdding = signal(false);
  
  readonly PlusIcon = PlusCircle;
  readonly ClockIcon = Clock;
  readonly XIcon = X;
  
  async ngOnInit() {
    await this.loadSessions();
  }

  async loadSessions() {
    const data = await this.sessionService.getSessionsForRun(this.runId);
    this.sessions.set(data);
  }

  async addSession(data: { playedAt: Date; durationMinutes: number; notes: string }) {
    await this.sessionService.createSession({
      runId: this.runId,
      playedAt: data.playedAt,
      durationMinutes: data.durationMinutes,
      notes: data.notes
    });
    
    this.isAdding.set(false);
    await this.loadSessions();
  }

  async deleteSession(id: number) {
    if (confirm('Delete this play session?')) {
      await this.sessionService.deleteSession(id);
      await this.loadSessions();
    }
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? mins + 'm' : ''}`;
    }
    return `${mins}m`;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }

  getTotalDuration(): string {
    const total = this.sessions().reduce((acc, s) => acc + s.durationMinutes, 0);
    return this.formatDuration(total);
  }
}
