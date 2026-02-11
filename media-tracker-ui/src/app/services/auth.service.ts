import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { User, AuthError } from '@supabase/supabase-js';
import { ToastService } from './toast.service';

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  currentUser = signal<AuthUser | null>(null);
  isLoading = signal(false);
  isReady = signal(false);

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService
  ) {
    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      const { data: { session } } = await this.supabase.client.auth.getSession();
      if (session?.user) {
        this.setUser(session.user);
      }

      this.supabase.client.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          this.setUser(session.user);
        } else {
          this.currentUser.set(null);
        }
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      this.isReady.set(true);
    }
  }

  private setUser(user: User) {
    this.currentUser.set({
      id: user.id,
      email: user.email || '',
      displayName: user.user_metadata?.['display_name'] || user.email?.split('@')[0],
      avatarUrl: user.user_metadata?.['avatar_url'],
    });
  }

  async signUp(email: string, password: string, displayName?: string) {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.client.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        this.toast.show('Account created successfully! Please check your email to verify.', { type: 'success' });
        return { success: true, user: data.user };
      }

      return { success: false, error: 'Failed to create account' };
    } catch (error) {
      const authError = error as AuthError;
      this.toast.show(authError.message || 'Failed to sign up', { type: 'error' });
      return { success: false, error: authError.message };
    } finally {
      this.isLoading.set(false);
    }
  }

  async signIn(email: string, password: string) {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        this.toast.show('Welcome back!', { type: 'success' });
        return { success: true, user: data.user };
      }

      return { success: false, error: 'Failed to sign in' };
    } catch (error) {
      const authError = error as AuthError;
      this.toast.show(authError.message || 'Failed to sign in', { type: 'error' });
      return { success: false, error: authError.message };
    } finally {
      this.isLoading.set(false);
    }
  }

  async signOut() {
    this.isLoading.set(true);
    try {
      const { error } = await this.supabase.client.auth.signOut();
      if (error) throw error;

      this.currentUser.set(null);
      this.toast.show('Signed out successfully', { type: 'success' });
      return { success: true };
    } catch (error) {
      const authError = error as AuthError;
      this.toast.show(authError.message || 'Failed to sign out', { type: 'error' });
      return { success: false, error: authError.message };
    } finally {
      this.isLoading.set(false);
    }
  }

  async resetPassword(email: string) {
    this.isLoading.set(true);
    try {
      const { error } = await this.supabase.client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      this.toast.show('Password reset email sent!', { type: 'success' });
      return { success: true };
    } catch (error) {
      const authError = error as AuthError;
      this.toast.show(authError.message || 'Failed to send reset email', { type: 'error' });
      return { success: false, error: authError.message };
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateProfile(displayName: string, avatarUrl?: string) {
    this.isLoading.set(true);
    try {
      const { error } = await this.supabase.client.auth.updateUser({
        data: {
          display_name: displayName,
          avatar_url: avatarUrl,
        },
      });

      if (error) throw error;

      this.toast.show('Profile updated successfully', { type: 'success' });
      return { success: true };
    } catch (error) {
      const authError = error as AuthError;
      this.toast.show(authError.message || 'Failed to update profile', { type: 'error' });
      return { success: false, error: authError.message };
    } finally {
      this.isLoading.set(false);
    }
  }
}
