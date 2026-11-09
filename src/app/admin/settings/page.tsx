// src/app/admin/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useCompetition } from '@/hooks/useCompetition';
import { useAuth } from '@/hooks/useAuth';
import {
  updateCompetitionSettings,
  updateCriteria,
  updateTieBreakConfig,
  initializeCompetition,
  DEFAULT_CRITERIA,
} from '@/lib/services/competitionService';
import { createTeam } from '@/lib/services/teamService';
import { submitScore } from '@/lib/services/scoreService';
import { recalculateLeaderboard } from '@/lib/services/leaderboardService';
import { logActivity } from '@/lib/services/adminService';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Shield, Save, Database, Sparkles } from 'lucide-react';
import type { Criterion, TieBreakPolicy } from '@/types/competition';
import type { Team } from '@/types/team';

export default function SettingsPage() {
  const { competition, loading } = useCompetition();
  const { adminUser, isSuperAdmin } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<any>('upcoming');
  const [allowDecimals, setAllowDecimals] = useState(false);
  const [tieBreakPolicy, setTieBreakPolicy] = useState<TieBreakPolicy>('shared_position');
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (competition) {
      setName(competition.name || '');
      setDescription(competition.description || '');
      setStatus(competition.status || 'upcoming');
      setAllowDecimals(competition.allowDecimalScores || false);
      setTieBreakPolicy(competition.tieBreakConfig?.policy || 'shared_position');
      setCriteria(competition.criteria || DEFAULT_CRITERIA);
    }
  }, [competition]);

  if (loading) return <LoadingState message="Loading settings..." />;

  const handleSaveGeneral = async () => {
    if (!name.trim()) {
      toast.error('Competition name is required');
      return;
    }
    setSaving(true);
    try {
      await updateCompetitionSettings({
        name: name.trim(),
        description: description.trim(),
        status,
        allowDecimalScores: allowDecimals,
      });
      await updateTieBreakConfig({ policy: tieBreakPolicy });
      await updateCriteria(criteria);

      if (adminUser) {
        await logActivity(adminUser.uid, adminUser.email, 'competition_settings_change', {
          affectedRecordType: 'competition',
          newValue: { name, status, allowDecimals, tieBreakPolicy },
        });
      }
      toast.success('Competition settings updated');
    } catch (err: any) {
      toast.error('Failed to save settings', { description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  const handleCriterionChange = (index: number, field: keyof Criterion, val: any) => {
    setCriteria(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleSeedDemoData = async () => {
    if (!confirm('This will populate the database with a competition, 6 demo teams, and scores for rounds 1 and 2. Continue?')) {
      return;
    }
    setSeeding(true);
    try {
      const comp = await initializeCompetition('Cobot-ex Championship 2026', adminUser?.uid || 'system');
      
      const demoTeams = [
        { name: 'CyberTitan Dynamics', members: [{ name: 'Alex Vance' }, { name: 'Elena Rostova' }] },
        { name: 'Nexus Automata', members: [{ name: 'Marcus Chen' }, { name: 'Sarah Connor' }] },
        { name: 'Kinetics Vanguard', members: [{ name: 'David Mercer' }, { name: 'Rachel Tyrell' }] },
        { name: 'Aegis Mechanics', members: [{ name: 'Victor Stone' }, { name: 'Ada Lovelace' }] },
        { name: 'Quantum Bionics', members: [{ name: 'Grace Hopper' }, { name: 'Alan Turing' }] },
        { name: 'Omega Synapse', members: [{ name: 'Nikola Tesla' }, { name: 'Hedy Lamarr' }] },
      ];

      const createdTeams: Team[] = [];
      for (const t of demoTeams) {
        createdTeams.push(await createTeam(t.name, t.members, adminUser?.uid || 'system'));
      }

      // Add scores for Round 1 and Round 2
      const scoresR1 = [
        [9, 9, 8, 9, 9], // 44
        [8, 8, 9, 8, 9], // 42
        [9, 8, 8, 8, 8], // 41
        [7, 8, 8, 8, 7], // 38
        [7, 7, 7, 8, 7], // 36
        [6, 7, 6, 7, 7], // 33
      ];

      const scoresR2 = [
        [10, 9, 9, 9, 9], // 46 -> 90
        [9, 9, 9, 9, 9],  // 45 -> 87
        [8, 9, 8, 8, 9],  // 42 -> 83
        [8, 8, 8, 8, 8],  // 40 -> 78
        [8, 7, 8, 7, 7],  // 37 -> 73
        [7, 7, 7, 7, 6],  // 34 -> 67
      ];

      for (let i = 0; i < createdTeams.length; i++) {
        const team = createdTeams[i];
        const r1Criteria = comp.criteria.map((c, ci) => ({ criterionId: c.id, value: scoresR1[i][ci] }));
        const r2Criteria = comp.criteria.map((c, ci) => ({ criterionId: c.id, value: scoresR2[i][ci] }));

        await submitScore(team.id, 'round1', r1Criteria, adminUser?.uid || 'system', adminUser?.email || 'admin@demo.com');
        await submitScore(team.id, 'round2', r2Criteria, adminUser?.uid || 'system', adminUser?.email || 'admin@demo.com');
      }

      await recalculateLeaderboard(comp);
      toast.success('Demo competition & scores successfully seeded!');
    } catch (e: any) {
      toast.error('Failed to seed demo data', { description: e?.message });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#F5F5F5]">Competition Settings</h1>
        <p className="text-[#858585] text-sm mt-1">Configure competition parameters, marking criteria, and rules</p>
      </div>

      {/* General Settings */}
      <div className="card-dark rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-[#F5F5F5]">General Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-[#858585] mb-1.5 block">Competition Name *</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Cobot-ex Championship"
              className="bg-[#0a0a0a] border-[rgba(185,185,185,0.15)] text-[#F5F5F5]"
            />
          </div>
          <div>
            <Label className="text-xs text-[#858585] mb-1.5 block">Competition Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v || 'upcoming')}>
              <SelectTrigger className="bg-[#0a0a0a] border-[rgba(185,185,185,0.15)] text-[#F5F5F5]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#111] border-[rgba(185,185,185,0.12)] text-[#F5F5F5]">
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="revealed">Revealed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs text-[#858585] mb-1.5 block">Description</Label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            placeholder="Official competition description and spectator instructions"
            className="bg-[#0a0a0a] border-[rgba(185,185,185,0.15)] text-[#F5F5F5] resize-none"
          />
        </div>
      </div>

      {/* Scoring & Rules */}
      <div className="card-dark rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-[#F5F5F5]">Scoring Rules & Tie Breaking</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="text-xs text-[#858585] mb-1.5 block">Tie-Breaking Policy</Label>
            <Select value={tieBreakPolicy} onValueChange={(v) => setTieBreakPolicy((v as TieBreakPolicy) || 'shared_position')}>
              <SelectTrigger className="bg-[#0a0a0a] border-[rgba(185,185,185,0.15)] text-[#F5F5F5]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#111] border-[rgba(185,185,185,0.12)] text-[#F5F5F5]">
                <SelectItem value="shared_position">Shared Position (Equal Rank)</SelectItem>
                <SelectItem value="round_priority">Round Priority (Later Rounds First)</SelectItem>
                <SelectItem value="criteria_priority">Criteria Priority Order</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-[#858585] mt-1.5">
              Determines how identical final scores out of 150 are represented.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-[rgba(185,185,185,0.08)] bg-[rgba(255,255,255,0.01)]">
            <div>
              <p className="text-sm font-medium text-[#F5F5F5]">Decimal Scoring</p>
              <p className="text-xs text-[#858585]">Allow non-integer score inputs (e.g. 8.5)</p>
            </div>
            <Switch
              checked={allowDecimals}
              onCheckedChange={setAllowDecimals}
              className="data-[state=checked]:bg-[#E50914]"
            />
          </div>
        </div>
      </div>

      {/* 5 Marking Criteria Configuration */}
      <div className="card-dark rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[#F5F5F5]">5 Marking Criteria (Max 10 each, Round Max 50)</h2>
          <span className="text-xs text-[#858585]">Total Round Weight: 50 Marks</span>
        </div>

        <div className="space-y-3">
          {criteria.map((c, i) => (
            <div key={c.id} className="p-3 rounded-lg border border-[rgba(185,185,185,0.08)] bg-[rgba(0,0,0,0.3)] grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <div>
                <Label className="text-xs text-[#858585] block mb-1">Criterion {i + 1} Name</Label>
                <Input
                  value={c.name}
                  onChange={e => handleCriterionChange(i, 'name', e.target.value)}
                  className="bg-[#0a0a0a] border-[rgba(185,185,185,0.15)] text-[#F5F5F5] text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-[#858585] block mb-1">Description</Label>
                <Input
                  value={c.description || ''}
                  onChange={e => handleCriterionChange(i, 'description', e.target.value)}
                  placeholder="Focus area"
                  className="bg-[#0a0a0a] border-[rgba(185,185,185,0.15)] text-[#F5F5F5] text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-[#858585] block mb-1">Max Marks</Label>
                <Input
                  type="number"
                  disabled
                  value={c.maxMarks}
                  className="bg-[#111] border-[rgba(185,185,185,0.1)] text-[#858585] text-sm w-24"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-between items-center pt-2">
        <Button
          onClick={handleSeedDemoData}
          disabled={seeding}
          variant="outline"
          className="border-[rgba(214,168,75,0.3)] text-[#D6A84B] hover:bg-[rgba(214,168,75,0.08)] flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {seeding ? 'Seeding...' : 'Seed Sample Teams & Scores'}
        </Button>

        <Button
          onClick={handleSaveGeneral}
          disabled={saving}
          className="bg-[#E50914] hover:bg-[#FF3028] text-white px-6 py-2 flex items-center gap-2 glow-red-sm"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
