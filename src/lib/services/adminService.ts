// src/lib/services/adminService.ts
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  where,
  db,
} from '@/lib/firebase/firestore';
import { COLLECTIONS, adminsCol, activityLogsCol } from '@/lib/firebase/firestore';
import { getEnvAdminRole } from '@/lib/config/admins';
import type { AdminUser, AdminRole, ActivityLog, ActivityAction } from '@/types/admin';
import type { User } from 'firebase/auth';

// ─── Admin checks ─────────────────────────────────────────────────────────────

export async function getAdminUser(uid: string): Promise<AdminUser | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.ADMINS, uid));
  if (!snap.exists()) return null;
  return snap.data() as AdminUser;
}

export async function checkIsAdmin(uid: string): Promise<boolean> {
  const admin = await getAdminUser(uid);
  return admin !== null && admin.active === true;
}

export async function checkIsSuperAdmin(uid: string): Promise<boolean> {
  const admin = await getAdminUser(uid);
  return admin !== null && admin.active === true && admin.role === 'super_admin';
}

// ─── Admin management ─────────────────────────────────────────────────────────

export async function getAllAdmins(): Promise<AdminUser[]> {
  const snap = await getDocs(query(adminsCol(), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => d.data() as AdminUser);
}

export async function addAdmin(
  email: string,
  displayName: string,
  role: AdminRole,
  addedBy: string
): Promise<AdminUser> {
  // Find UID by email isn't directly possible client-side without Admin SDK
  // So we store the email and they will be matched on first login
  const tempUid = `pending_${email.replace(/[@.]/g, '_')}_${Date.now()}`;
  const admin: AdminUser = {
    uid: tempUid,
    email,
    displayName,
    role,
    active: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    addedBy,
  };
  await setDoc(doc(db, COLLECTIONS.ADMINS, tempUid), admin);
  return admin;
}

export async function updateAdminRole(
  uid: string,
  role: AdminRole,
  updatedBy: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.ADMINS, uid), {
    role,
    updatedAt: Date.now(),
  });
}

export async function toggleAdminActive(
  uid: string,
  active: boolean
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.ADMINS, uid), {
    active,
    updatedAt: Date.now(),
  });
}

export async function removeAdmin(uid: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.ADMINS, uid));
}

// Called on successful Google login — link the user to their admin record
export async function linkAdminOnLogin(user: User): Promise<AdminUser | null> {
  // Check if already registered
  const existing = await getAdminUser(user.uid);
  if (existing) {
    // Update last login
    await updateDoc(doc(db, COLLECTIONS.ADMINS, user.uid), {
      lastLoginAt: Date.now(),
      displayName: user.displayName ?? existing.displayName,
    });
    return { ...existing, lastLoginAt: Date.now() };
  }

  // Bootstrap access for emails configured in the environment allowlist
  const envRole = getEnvAdminRole(user.email);
  if (envRole) {
    const admin: AdminUser = {
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? user.email ?? 'Administrator',
      role: envRole,
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastLoginAt: Date.now(),
      addedBy: 'env',
    };

    try {
      await setDoc(doc(db, COLLECTIONS.ADMINS, user.uid), admin);
    } catch (error) {
      // Firestore rules may block self-provisioning when the allowlist is only
      // in env. Access is still granted from the env allowlist itself.
      console.warn('Could not provision admin record from env allowlist:', error);
    }

    return admin;
  }

  // Check for pending record by email
  const pendingQ = query(adminsCol(), where('email', '==', user.email));
  const pendingSnap = await getDocs(pendingQ);
  
  if (!pendingSnap.empty) {
    const pendingDoc = pendingSnap.docs[0];
    const pendingData = pendingDoc.data() as AdminUser;
    // Create proper record with real UID
    const linked: AdminUser = {
      ...pendingData,
      uid: user.uid,
      displayName: user.displayName ?? pendingData.displayName,
      lastLoginAt: Date.now(),
      updatedAt: Date.now(),
    };
    await setDoc(doc(db, COLLECTIONS.ADMINS, user.uid), linked);
    // Remove pending record
    await deleteDoc(pendingDoc.ref);
    return linked;
  }

  return null; // Not authorized
}

// ─── Activity logging ──────────────────────────────────────────────────────────

export async function logActivity(
  adminUid: string,
  adminEmail: string,
  action: ActivityAction,
  options?: {
    affectedRecord?: string;
    affectedRecordType?: ActivityLog['affectedRecordType'];
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    adminDisplayName?: string;
  }
): Promise<void> {
  const logRef = doc(activityLogsCol());
  const log: ActivityLog = {
    id: logRef.id,
    adminUid,
    adminEmail,
    adminDisplayName: options?.adminDisplayName,
    action,
    affectedRecord: options?.affectedRecord,
    affectedRecordType: options?.affectedRecordType,
    oldValue: options?.oldValue,
    newValue: options?.newValue,
    metadata: options?.metadata,
    timestamp: Date.now(),
  };
  await setDoc(logRef, log);
}

export async function getActivityLogs(options?: {
  adminUid?: string;
  action?: ActivityAction;
  limitCount?: number;
}): Promise<ActivityLog[]> {
  const constraints = [];
  if (options?.adminUid) constraints.push(where('adminUid', '==', options.adminUid));
  if (options?.action) constraints.push(where('action', '==', options.action));
  constraints.push(orderBy('timestamp', 'desc'));
  constraints.push(limit(options?.limitCount ?? 100));

  const snap = await getDocs(query(activityLogsCol(), ...constraints));
  return snap.docs.map(d => d.data() as ActivityLog);
}

