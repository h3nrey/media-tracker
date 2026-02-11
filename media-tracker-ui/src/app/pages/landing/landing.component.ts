import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { LucideAngularModule, Film, TrendingUp, List, BarChart3, Sparkles, CheckCircle2, Users, Shield, Zap } from 'lucide-angular';
import { AuthDialogComponent } from '../../components/auth-dialog/auth-dialog.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent {
  private dialog = inject(Dialog);
  private router = inject(Router);
  authService = inject(AuthService);

  readonly FilmIcon = Film;
  readonly TrendingUpIcon = TrendingUp;
  readonly ListIcon = List;
  readonly BarChartIcon = BarChart3;
  readonly SparklesIcon = Sparkles;
  readonly CheckIcon = CheckCircle2;
  readonly UsersIcon = Users;
  readonly ShieldIcon = Shield;
  readonly ZapIcon = Zap;

  features = [
    {
      icon: this.FilmIcon,
      title: 'Track Your Media',
      description: 'Keep track of all your anime, games, movies, and more in one place'
    },
    {
      icon: this.ListIcon,
      title: 'Custom Lists',
      description: 'Create and organize custom lists to categorize your collection'
    },
    {
      icon: this.BarChartIcon,
      title: 'Statistics & Insights',
      description: 'Get detailed stats and insights about your viewing habits'
    },
    {
      icon: this.SparklesIcon,
      title: 'Smart Recommendations',
      description: 'Discover new content based on your preferences and history'
    },
    {
      icon: this.ShieldIcon,
      title: 'Secure & Private',
      description: 'Your data is encrypted and stored securely with Supabase'
    },
    {
      icon: this.ZapIcon,
      title: 'Sync Across Devices',
      description: 'Access your collection from anywhere, on any device'
    }
  ];

  openAuthDialog() {
    this.dialog.open(AuthDialogComponent, {
      panelClass: 'auth-dialog-panel',
      backdropClass: 'auth-dialog-backdrop',
    });
  }

  ngOnInit() {}
}
