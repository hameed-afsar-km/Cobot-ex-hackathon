// src/lib/firebase/firestore.ts
// Firestore collection references and common operations

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  writeBatch,
  type QueryConstraint,
  type DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

// Collection names
export const COLLECTIONS = {
  ADMINS: 'admins',
  COMPETITIONS: 'competitions',
  TEAMS: 'teams',
  SCORES: 'scores',
  SCORE_HISTORY: 'score_history',
  LEADERBOARD_SNAPSHOTS: 'leaderboard_snapshots',
  PUBLIC_LEADERBOARDS: 'public_leaderboards',
  REVEAL: 'reveal',
  ACTIVITY_LOGS: 'activity_logs',
} as const;

// Collection refs
export const adminsCol = () => collection(db, COLLECTIONS.ADMINS);
export const competitionsCol = () => collection(db, COLLECTIONS.COMPETITIONS);
export const teamsCol = () => collection(db, COLLECTIONS.TEAMS);
export const scoresCol = () => collection(db, COLLECTIONS.SCORES);
export const scoreHistoryCol = () => collection(db, COLLECTIONS.SCORE_HISTORY);
export const leaderboardSnapshotsCol = () => collection(db, COLLECTIONS.LEADERBOARD_SNAPSHOTS);
export const publicLeaderboardsCol = () => collection(db, COLLECTIONS.PUBLIC_LEADERBOARDS);
export const revealCol = () => collection(db, COLLECTIONS.REVEAL);
export const activityLogsCol = () => collection(db, COLLECTIONS.ACTIVITY_LOGS);

// Helper to convert Firestore Timestamp to ms
export function toMs(ts: Timestamp | number | null | undefined): number {
  if (!ts) return Date.now();
  if (typeof ts === 'number') return ts;
  return ts.toMillis();
}

export {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  writeBatch,
  db,
};

