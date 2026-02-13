import { inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase.service';
import { db } from '../database.service';
import { SyncConflict } from '../../models/sync-conflict.model';
import { AuthService } from '../auth.service';

export abstract class SyncBaseService<T extends { id?: number; supabaseId?: number; version: number; isDeleted?: boolean }> {
  protected supabase = inject(SupabaseService).client;
  protected authService = inject(AuthService);
  protected abstract tableName: string;
  protected abstract entityType: string;

  async syncEntity(localItems: T[], lastSyncedAt?: Date) {
    console.log(`Syncing ${this.entityType}...`);
    
    const user = this.authService.currentUser();
    if (!user) return;

    let query = this.supabase.from(this.tableName)
      .select('*')
      .eq('user_id', user.id);
    
    const { data: remoteItems, error } = await query;

    if (error) throw error;

    for (const remote of remoteItems || []) {
      const local = localItems.find(l => l.supabaseId === remote.id);
      
      if (!local) {
        await this.handleMissingLocal(remote);
      } else {
        if (remote.version === local.version) {
          continue;
        } else if (remote.version > local.version) {
          await this.pullRemote(local.id!, remote);
        } else if (local.version > remote.version) {
          await this.pushLocalWithVersionCheck(local, remote);
        }
      }
    }
    const newItems = localItems.filter(l => !l.supabaseId && !l.isDeleted);
    for (const local of newItems) {
      await this.handleNewLocal(local);
    }
  }

  protected abstract handleMissingLocal(remote: any): Promise<void>;
  protected abstract pullRemote(localId: number, remote: any): Promise<void>;
  protected abstract mapToSupabase(local: T): any;
  protected abstract handleNewLocal(local: T): Promise<void>;

  protected async pushLocalWithVersionCheck(local: T, remote: any) {
    const nextVersion = local.version;
    const supabaseData = this.mapToSupabase(local);
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ 
        ...supabaseData, 
        version: nextVersion 
      })
      .eq('id', local.supabaseId)
      .eq('version', remote.version)
      .select()
      .single();

    if (error || !data) {
      await this.recordConflict(local, remote);
    }
  }

  protected async recordConflict(local: T, remote: any) {
    console.warn(`Conflict detected for ${this.entityType} ID: ${local.id}`);
    await db.syncConflicts.add({
      entityType: this.entityType,
      localPayload: local,
      remotePayload: remote,
      resolved: false,
      createdAt: new Date()
    } as SyncConflict);
    
    await this.pullRemote(local.id!, remote);
  }
}
