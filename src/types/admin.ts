// src/types/admin.ts
export type AdminRole = 'super_admin' | 'admin';

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: AdminRole;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;
  addedBy?: string;
}

export type ActivityAction =
  | 'admin_login'
  | 'admin_logout'
  | 'team_import'
  | 'team_create'
  | 'team_update'
  | 'team_delete'
  | 'score_submit'
  | 'score_update'
  | 'round_status_change'
  | 'competition_settings_change'
  | 'criteria_config_change'
  | 'reveal_start'
  | 'reveal_complete'
  | 'reveal_reset'
  | 'scores_reset'
  | 'teams_reset'
  | 'round_progress_reset'
  | 'competition_reset'
  | 'admin_added'
  | 'admin_removed'
  | 'admin_role_changed'
  | 'admin_deactivated'
  | 'admin_activated'
  | 'leaderboard_snapshot';

export interface ActivityLog {
  id: string;
  adminUid: string;
  adminEmail: string;
  adminDisplayName?: string;
  action: ActivityAction;
  affectedRecord?: string;
  affectedRecordType?: 'team' | 'score' | 'admin' | 'competition' | 'reveal' | 'round';
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

