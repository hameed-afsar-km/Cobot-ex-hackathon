// src/app/admin/settings/page.tsx
'use client';

import { useState } from 'react';
import { useCompetition } from '@/hooks/useCompetition';
import { useAuth } from '@/hooks/useAuth';
import {
  updateCompetitionSettings,
  updateRounds,
  updateTieBreakConfig,
  initializeCompetition,
  DEFAULT_CRITERIA,
  DEFAULT_ROUNDS,
} from '@/lib/services/competitionService';
import { createTeam } from '@/lib/services/teamService';
import { submitScore } from '@/lib/services/scoreService';
import { DEFAULT_COMPETITION_ID, recalculateLeaderboard } from '@/lib/services/leaderboardService';
import { resetCompetitionData, resetRoundProgress, resetScores, resetTeams } from '@/lib/services/resetService';
import { resetReveal } from '@/lib/services/revealService';
import { logActivity } from '@/lib/services/adminService';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { AlertTriangle, Database, Eraser, RotateCcw, Save, Sparkles, Trash2 } from 'lucide-react';
import type { Competition, CompetitionStatus, Round, TieBreakPolicy } from '@/types/competition';
import type { Team } from '@/types/team';

type ResetAction = 'reveal' | 'scores' | 'teams' | 'rounds' | 'all';

const RESET_COPY: Record<
  ResetAction,
  { title: string; description: string; confirmLabel: string }
> = {
  reveal: {
    title: 'Reset Reveal',
    description:
      'This conceals the top three again and recalculates the public leaderboard. Scores and teams are kept. Continue?',
    confirmLabel: 'Conceal Top 3',
  },
  scores: {
    title: 'Reset All Scores',
    description:
      'This permanently deletes every score and score-history entry. Teams and round progress are kept, but the leaderboard will show zero scores and the top three will be concealed. Continue?',
    confirmLabel: 'Reset Scores',
  },
  teams: {
    title: 'Reset Teams',
    description:
      'This permanently deletes every team, score, score-history entry, and leaderboard snapshot. The public leaderboard will be emptied and the reveal reset. Continue?',
    confirmLabel: 'Reset Teams',
  },
  rounds: {
    title: 'Reset Round Progress',
    description:
      'This returns every round to Not Started, clears round timestamps and locks, and sets the competition back to Upcoming. Scores and teams are kept. Continue?',
    confirmLabel: 'Reset Rounds',
  },
  all: {
    title: 'Reset Competition Data',
    description:
      'This permanently deletes all teams, scores, history, snapshots, the public leaderboard, and the reveal state, then reinitializes the competition with default settings. Admin accounts and activity logs are preserved. This cannot be undone. Continue?',
    confirmLabel: 'Reset Everything',
  },
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

const RESET_OPTIONS: Array<{
  action: ResetAction;
  icon: typeof AlertTriangle;
  tone: 'red' | 'amber';
}> = [
  { action: 'reveal', icon: RotateCcw, tone: 'amber' },
  { action: 'scores', icon: Eraser, tone: 'red' },
  { action: 'teams', icon: Trash2, tone: 'red' },
  { action: 'rounds', icon: RotateCcw, tone: 'amber' },
  { action: 'all', icon: AlertTriangle, tone: 'red' },
];

export default function SettingsPage() {
  const { competition, loading } = useCompetition();

  if (loading) return <LoadingState message="Loading settings..." />;

  return (
    <SettingsForm
      key={competition?.updatedAt ?? 'new'}
      competition={competition}
    />
  );
}

function SettingsForm({ competition }: { competition: Competition | null }) {
  const { adminUser } = useAuth();

  const [name, setName] = useState(competition?.name || '');
  const [description, setDescription] = useState(competition?.description || '');
  const [status, setStatus] = useState<CompetitionStatus>(competition?.status || 'upcoming');
  const [allowDecimals, setAllowDecimals] = useState(competition?.allowDecimalScores || false);
  const [tieBreakPolicy, setTieBreakPolicy] = useState<TieBreakPolicy>(
    competition?.tieBreakConfig?.policy || 'shared_position'
  );
  const [rounds, setRounds] = useState<Round[]>(() => {
    const source = competition?.rounds?.length ? competition.rounds : DEFAULT_ROUNDS;
    return source.map(round => ({
      ...round,
      criteria: round.criteria?.length ? round.criteria : competition?.criteria || DEFAULT_CRITERIA,
    }));
  });
  const totalMaxScore = rounds.reduce(
    (sum, round) =>
      sum + (round.criteria?.reduce((roundSum, criterion) => roundSum + criterion.maxMarks, 0) ?? round.maxMarks),
    0
  );
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [resetAction, setResetAction] = useState<ResetAction | null>(null);
  const [resetting, setResetting] = useState<ResetAction | null>(null);

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

      const normalizedRounds: Round[] = rounds.map(round => ({
        ...round,
        maxMarks: round.criteria?.reduce((sum, criterion) => sum + criterion.maxMarks, 0) ?? 0,
      }));
      await updateRounds(normalizedRounds);

      if (adminUser) {
        await logActivity(adminUser.uid, adminUser.email, 'competition_settings_change', {
          affectedRecordType: 'competition',
          newValue: { name, status, allowDecimals, tieBreakPolicy },
        });
      }
      toast.success('Competition settings updated');
    } catch (err) {
      toast.error('Failed to save settings', { description: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const handleCriterionChange = (
    roundIndex: number,
    criterionIndex: number,
    field: 'name' | 'description' | 'maxMarks',
    value: string
  ) => {
    setRounds(prev => {
      const updated = [...prev];
      const round = { ...updated[roundIndex] };
      const criteria = [...(round.criteria ?? [])];
      criteria[criterionIndex] = {
        ...criteria[criterionIndex],
        [field]: field === 'maxMarks' ? Math.max(0, Number(value) || 0) : value,
      };
      round.criteria = criteria;
      round.maxMarks = criteria.reduce((sum, criterion) => sum + criterion.maxMarks, 0);
      updated[roundIndex] = round;
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

      // Add scores for every round, scaled to each round's criteria.
      const performanceFactors = [0.95, 0.9, 0.85, 0.8, 0.75, 0.7];

      for (let i = 0; i < createdTeams.length; i++) {
        const team = createdTeams[i];
        for (const round of comp.rounds) {
          const criteria = round.criteria?.length ? round.criteria : comp.criteria;
          const roundScores = criteria.map(c => ({
            criterionId: c.id,
            value: Math.max(0, Math.round(c.maxMarks * performanceFactors[i])),
          }));
          await submitScore(
            team.id,
            round.id,
            roundScores,
            adminUser?.uid || 'system',
            adminUser?.email || 'admin@demo.com',
            criteria.length
          );
        }
      }

      await recalculateLeaderboard(comp);
      toast.success('Demo competition & scores successfully seeded!');
    } catch (e) {
      toast.error('Failed to seed demo data', { description: errorMessage(e) });
    } finally {
      setSeeding(false);
    }
  };

  const handleReset = async () => {
    if (!competition || !adminUser || !resetAction) return;
    const action = resetAction;
    setResetting(action);

    try {
      switch (action) {
        case 'reveal':
          await resetReveal(DEFAULT_COMPETITION_ID);
          await logActivity(adminUser.uid, adminUser.email, 'reveal_reset', {
            affectedRecordType: 'reveal',
          });
          toast.success('Top three concealed again');
          break;
        case 'scores':
          await resetScores(competition);
          await logActivity(adminUser.uid, adminUser.email, 'scores_reset', {
            affectedRecordType: 'score',
          });
          toast.success('All scores and score history cleared');
          break;
        case 'teams':
          await resetTeams(competition);
          await logActivity(adminUser.uid, adminUser.email, 'teams_reset', {
            affectedRecordType: 'team',
          });
          toast.success('All teams, scores, and snapshots cleared');
          break;
        case 'rounds':
          await resetRoundProgress(competition);
          await logActivity(adminUser.uid, adminUser.email, 'round_progress_reset', {
            affectedRecordType: 'round',
          });
          toast.success('Round progress reset to Not Started');
          break;
        case 'all':
          await resetCompetitionData(competition, adminUser.uid);
          await logActivity(adminUser.uid, adminUser.email, 'competition_reset', {
            affectedRecordType: 'competition',
          });
          toast.success('Competition data reset and reinitialized');
          break;
      }
      setResetAction(null);
    } catch (err) {
      toast.error('Reset failed', { description: errorMessage(err) });
    } finally {
      setResetting(null);
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
            <Select value={status} onValueChange={(v) => setStatus((v as CompetitionStatus) || 'upcoming')}>
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
              Determines how identical final scores out of {totalMaxScore} are represented.
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

      {/* Per-round Marking Criteria Configuration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[#F5F5F5]">Marking Criteria by Round</h2>
          <span className="text-xs text-[#858585]">Combined Total: {totalMaxScore} Marks</span>
        </div>

        {rounds.map((round, roundIndex) => {
          const roundTotal = round.criteria?.reduce((sum, criterion) => sum + criterion.maxMarks, 0) ?? round.maxMarks;
          return (
            <div key={round.id} className="card-dark rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#F5F5F5]">{round.name}</h3>
                <span className="text-xs text-[#858585]">Round Total: {roundTotal} Marks</span>
              </div>

              <div className="space-y-3">
                {(round.criteria ?? []).map((c, criterionIndex) => (
                  <div key={c.id} className="p-3 rounded-lg border border-[rgba(185,185,185,0.08)] bg-[rgba(0,0,0,0.3)] grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                    <div>
                      <Label className="text-xs text-[#858585] block mb-1">Criterion {criterionIndex + 1} Name</Label>
                      <Input
                        value={c.name}
                        onChange={e => handleCriterionChange(roundIndex, criterionIndex, 'name', e.target.value)}
                        className="bg-[#0a0a0a] border-[rgba(185,185,185,0.15)] text-[#F5F5F5] text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-[#858585] block mb-1">Description</Label>
                      <Input
                        value={c.description || ''}
                        onChange={e => handleCriterionChange(roundIndex, criterionIndex, 'description', e.target.value)}
                        placeholder="Focus area"
                        className="bg-[#0a0a0a] border-[rgba(185,185,185,0.15)] text-[#F5F5F5] text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-[#858585] block mb-1">Max Marks</Label>
                      <Input
                        type="number"
                        min={0}
                        value={c.maxMarks}
                        onChange={e => handleCriterionChange(roundIndex, criterionIndex, 'maxMarks', e.target.value)}
                        className="bg-[#0a0a0a] border-[rgba(185,185,185,0.15)] text-[#F5F5F5] text-sm w-24"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
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

      {/* Data & Reset */}
      <div className="rounded-xl border border-[rgba(229,9,20,0.2)] bg-[linear-gradient(180deg,rgba(229,9,20,0.055),rgba(10,10,10,0.98))] p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[rgba(229,9,20,0.3)] bg-[rgba(229,9,20,0.1)]">
            <Database className="h-4 w-4 text-[#E50914]" />
          </div>
          <div>
            <h2 className="font-semibold text-[#F5F5F5]">Data & Reset</h2>
            <p className="text-sm text-[#858585] mt-1">
              Dangerous operations are permanent. Use these to prepare a fresh run or re-hide the podium.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {RESET_OPTIONS.map(({ action, icon: Icon, tone }) => {
            const copy = RESET_COPY[action];
            const busy = resetting === action;
            const red = tone === 'red';

            return (
              <div
                key={action}
                className="flex flex-col gap-3 rounded-lg border border-[rgba(185,185,185,0.08)] bg-[rgba(0,0,0,0.25)] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <Icon
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      red ? 'text-[#E50914]' : 'text-[#D6A84B]'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-[#F5F5F5]">{copy.title}</p>
                    <p className="mt-0.5 text-xs text-[#858585]">{copy.description}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!resetting}
                  onClick={() => setResetAction(action)}
                  className={`shrink-0 ${
                    red
                      ? 'border-[rgba(229,9,20,0.3)] text-[#E50914] hover:bg-[rgba(229,9,20,0.08)]'
                      : 'border-[rgba(214,168,75,0.3)] text-[#D6A84B] hover:bg-[rgba(214,168,75,0.08)]'
                  }`}
                >
                  {busy ? 'Resetting...' : copy.confirmLabel}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={resetAction !== null}
        onOpenChange={open => !open && setResetAction(null)}
        title={resetAction ? RESET_COPY[resetAction].title : 'Reset'}
        description={resetAction ? RESET_COPY[resetAction].description : ''}
        confirmLabel={resetAction ? RESET_COPY[resetAction].confirmLabel : 'Reset'}
        variant="destructive"
        onConfirm={handleReset}
      />
    </div>
  );
}
