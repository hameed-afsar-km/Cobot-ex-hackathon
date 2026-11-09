// src/app/admin/teams/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Upload, Trash2, Edit, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { getAllTeams, deleteTeam, createTeam, updateTeam } from '@/lib/services/teamService';
import { logActivity } from '@/lib/services/adminService';
import { useAuth } from '@/hooks/useAuth';
import type { Team, TeamMember } from '@/types/team';
import { toast } from 'sonner';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

function TeamRow({
  team,
  onEdit,
  onDelete,
}: {
  team: Team;
  onEdit: (team: Team) => void;
  onDelete: (team: Team) => void;
}) {
  return (
    <tr className="border-b border-[rgba(185,185,185,0.06)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
      <td className="px-4 py-3 text-sm text-[#858585] font-mono">{team.id}</td>
      <td className="px-4 py-3">
        <span className="font-medium text-[#F5F5F5]">{team.teamName}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {team.members.slice(0, 3).map((m, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[#190707] border border-[rgba(229,9,20,0.15)] text-[#B9B9B9]">
              {m.name}
            </span>
          ))}
          {team.members.length > 3 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#111] text-[#858585]">
              +{team.members.length - 3}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-[#858585]">
        {new Date(team.createdAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => onEdit(team)}
            className="p-1.5 rounded text-[#858585] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(team)}
            className="p-1.5 rounded text-[#858585] hover:text-[#E50914] hover:bg-[rgba(229,9,20,0.08)] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function TeamFormDialog({
  open,
  onOpenChange,
  team,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  team?: Team;
  onSave: (id: string, name: string, members: TeamMember[]) => Promise<void>;
}) {
  const [teamId, setTeamId] = useState(team?.id ?? '');
  const [teamName, setTeamName] = useState(team?.teamName ?? '');
  const [membersText, setMembersText] = useState(
    team?.members.map(m => m.name).join('\n') ?? ''
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!teamId.trim() || !teamName.trim()) {
      toast.error('Team ID and name are required');
      return;
    }
    const members: TeamMember[] = membersText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .map(name => ({ name }));

    setSaving(true);
    try {
      await onSave(teamId.trim(), teamName.trim(), members);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111111] border-[rgba(185,185,185,0.12)] text-[#F5F5F5] max-w-md">
        <DialogHeader>
          <DialogTitle>{team ? 'Edit Team' : 'Add Team'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs text-[#858585] mb-1.5 block">Team ID *</Label>
            <Input
              value={teamId}
              onChange={e => setTeamId(e.target.value)}
              disabled={!!team}
              placeholder="e.g. TEAM001"
              className="bg-[#0a0a0a] border-[rgba(185,185,185,0.15)] text-[#F5F5F5] placeholder:text-[#858585]"
            />
          </div>
          <div>
            <Label className="text-xs text-[#858585] mb-1.5 block">Team Name *</Label>
            <Input
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              placeholder="e.g. Team Alpha"
              className="bg-[#0a0a0a] border-[rgba(185,185,185,0.15)] text-[#F5F5F5] placeholder:text-[#858585]"
            />
          </div>
          <div>
            <Label className="text-xs text-[#858585] mb-1.5 block">Members (one per line)</Label>
            <Textarea
              value={membersText}
              onChange={e => setMembersText(e.target.value)}
              placeholder="Alice Smith&#10;Bob Jones&#10;Carol White"
              rows={4}
              className="bg-[#0a0a0a] border-[rgba(185,185,185,0.15)] text-[#F5F5F5] placeholder:text-[#858585] resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-[#E50914] hover:bg-[#FF3028] text-white"
            >
              {saving ? 'Saving...' : team ? 'Save Changes' : 'Add Team'}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[rgba(185,185,185,0.2)] text-[#858585] hover:text-[#F5F5F5]"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TeamsPage() {
  const { adminUser } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Team | undefined>();

  const loadTeams = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllTeams();
      setTeams(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  const filtered = teams.filter(t =>
    t.teamName.toLowerCase().includes(search.toLowerCase()) ||
    t.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (id: string, name: string, members: TeamMember[]) => {
    await createTeam(id, name, members, adminUser!.uid);
    await logActivity(adminUser!.uid, adminUser!.email, 'team_create', {
      affectedRecord: id,
      affectedRecordType: 'team',
      newValue: { teamName: name },
    });
    toast.success(`Team "${name}" added`);
    await loadTeams();
  };

  const handleEdit = async (id: string, name: string, members: TeamMember[]) => {
    await updateTeam(id, { teamName: name, members });
    await logActivity(adminUser!.uid, adminUser!.email, 'team_update', {
      affectedRecord: id,
      affectedRecordType: 'team',
      newValue: { teamName: name },
    });
    toast.success('Team updated');
    await loadTeams();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteTeam(deleteTarget.id);
    await logActivity(adminUser!.uid, adminUser!.email, 'team_delete', {
      affectedRecord: deleteTarget.id,
      affectedRecordType: 'team',
      oldValue: { teamName: deleteTarget.teamName },
    });
    toast.success('Team deleted');
    setDeleteTarget(undefined);
    await loadTeams();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F5]">Teams</h1>
          <p className="text-[#858585] text-sm mt-1">{teams.length} registered teams</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/teams/import">
            <Button variant="outline" className="border-[rgba(185,185,185,0.2)] text-[#858585] hover:text-[#F5F5F5] hover:border-[rgba(229,9,20,0.3)] flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Import
            </Button>
          </Link>
          <Button
            onClick={() => setShowAdd(true)}
            className="bg-[#E50914] hover:bg-[#FF3028] text-white flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Team
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#858585]" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search teams..."
          className="pl-9 bg-[#111111] border-[rgba(185,185,185,0.12)] text-[#F5F5F5] placeholder:text-[#858585]"
        />
      </div>

      {loading ? (
        <div className="card-dark rounded-xl">
          <LoadingState message="Loading teams..." />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-dark rounded-xl">
          <EmptyState
            icon={Users}
            title={search ? 'No teams match your search' : 'No teams registered'}
            description={search ? 'Try a different search term.' : 'Import a CSV/Excel file or add teams manually.'}
            action={
              !search ? (
                <div className="flex gap-3">
                  <Link href="/admin/teams/import">
                    <Button variant="outline" size="sm" className="border-[rgba(229,9,20,0.3)] text-[#E50914]">
                      <Upload className="w-4 h-4 mr-2" /> Import
                    </Button>
                  </Link>
                  <Button size="sm" onClick={() => setShowAdd(true)} className="bg-[#E50914] hover:bg-[#FF3028] text-white">
                    <Plus className="w-4 h-4 mr-2" /> Add Team
                  </Button>
                </div>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="card-dark rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(185,185,185,0.08)] bg-[rgba(255,255,255,0.02)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#858585] uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#858585] uppercase tracking-wider">Team Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#858585] uppercase tracking-wider">Members</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#858585] uppercase tracking-wider">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(team => (
                <TeamRow
                  key={team.id}
                  team={team}
                  onEdit={t => setEditTeam(t)}
                  onDelete={t => setDeleteTarget(t)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TeamFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        onSave={handleAdd}
      />
      {editTeam && (
        <TeamFormDialog
          open={!!editTeam}
          onOpenChange={o => !o && setEditTeam(undefined)}
          team={editTeam}
          onSave={handleEdit}
        />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(undefined)}
        title="Delete Team"
        description={`Are you sure you want to delete "${deleteTarget?.teamName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

