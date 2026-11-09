import {
  db,
  getDocs,
  leaderboardSnapshotsCol,
  publicLeaderboardsCol,
  revealCol,
  scoreHistoryCol,
  scoresCol,
  teamsCol,
  writeBatch,
} from '@/lib/firebase/firestore';
import type { Competition, Round } from '@/types/competition';
import { initializeCompetition, updateCompetitionSettings } from './competitionService';
import { recalculateLeaderboard } from './leaderboardService';
import { initRevealDocument, resetReveal } from './revealService';

const DELETE_BATCH_SIZE = 400;

async function deleteAllDocs(
  collectionRef: ReturnType<typeof teamsCol>
): Promise<number> {
  const snap = await getDocs(collectionRef);
  let deleted = 0;

  for (let index = 0; index < snap.docs.length; index += DELETE_BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = snap.docs.slice(index, index + DELETE_BATCH_SIZE);

    for (const document of chunk) {
      batch.delete(document.ref);
    }

    await batch.commit();
    deleted += chunk.length;
  }

  return deleted;
}

export async function resetScores(competition: Competition): Promise<void> {
  await Promise.all([
    deleteAllDocs(scoresCol()),
    deleteAllDocs(scoreHistoryCol()),
  ]);

  // Recalculate the public view with no scores and conceal the podium again.
  await resetReveal(competition.id);
}

export async function resetTeams(competition: Competition): Promise<void> {
  await Promise.all([
    deleteAllDocs(teamsCol()),
    deleteAllDocs(scoresCol()),
    deleteAllDocs(scoreHistoryCol()),
    deleteAllDocs(leaderboardSnapshotsCol()),
  ]);

  // Recalculate the public view with no teams and conceal the podium again.
  await resetReveal(competition.id);
}

export async function resetRoundProgress(competition: Competition): Promise<void> {
  const rounds: Round[] = competition.rounds.map(round => ({
    id: round.id,
    name: round.name,
    status: 'not_started',
    maxMarks: round.maxMarks,
  }));

  const updatedCompetition: Competition = {
    ...competition,
    status: 'upcoming',
    currentRound: null,
    rounds,
    updatedAt: Date.now(),
  };

  await updateCompetitionSettings({
    status: updatedCompetition.status,
    currentRound: updatedCompetition.currentRound,
    rounds,
  });
  await recalculateLeaderboard(updatedCompetition);
}

export async function resetCompetitionData(
  competition: Competition,
  adminUid: string
): Promise<Competition> {
  await Promise.all([
    deleteAllDocs(teamsCol()),
    deleteAllDocs(scoresCol()),
    deleteAllDocs(scoreHistoryCol()),
    deleteAllDocs(leaderboardSnapshotsCol()),
    deleteAllDocs(publicLeaderboardsCol()),
    deleteAllDocs(revealCol()),
  ]);

  const freshCompetition = await initializeCompetition(
    competition.name || 'Cobot-ex Championship 2026',
    adminUid
  );

  await initRevealDocument(freshCompetition.id);
  await recalculateLeaderboard(freshCompetition);

  return freshCompetition;
}
