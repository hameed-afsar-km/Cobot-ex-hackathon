// src/lib/services/teamService.ts
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  db,
} from '@/lib/firebase/firestore';
import { COLLECTIONS, teamsCol } from '@/lib/firebase/firestore';
import type { Team, TeamMember } from '@/types/team';

export async function getAllTeams(): Promise<Team[]> {
  const snap = await getDocs(query(teamsCol(), orderBy('teamName', 'asc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Team);
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.TEAMS, teamId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Team;
}

export async function createTeam(
  teamName: string,
  members: TeamMember[],
  createdBy: string
): Promise<Team> {
  const ref = doc(teamsCol());
  const team: Team = {
    id: ref.id,
    teamName,
    members,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy,
  };
  await setDoc(ref, team);
  return team;
}

export async function updateTeam(
  teamId: string,
  updates: Partial<Pick<Team, 'teamName' | 'members'>>
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.TEAMS, teamId), {
    ...updates,
    updatedAt: Date.now(),
  });
}

export async function deleteTeam(teamId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.TEAMS, teamId));
}

export async function teamExists(teamId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, COLLECTIONS.TEAMS, teamId));
  return snap.exists();
}

export async function getExistingTeamNames(): Promise<Set<string>> {
  const teams = await getAllTeams();
  return new Set(teams.map(t => t.teamName.trim().toLowerCase()));
}

export async function batchImportTeams(
  teams: Array<{ teamName: string; members: TeamMember[] }>,
  createdBy: string
): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];

  for (const t of teams) {
    try {
      const team = await createTeam(t.teamName, t.members, createdBy);
      success.push(team.id);
    } catch {
      failed.push(t.teamName);
    }
  }

  return { success, failed };
}

