// src/app/admin/administrators/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { getAllAdmins, addAdmin, toggleAdminActive, removeAdmin, logActivity } from '@/lib/services/adminService';
import { useAuth } from '@/hooks/useAuth';
import type { AdminUser, AdminRole } from '@/types/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserCog, Plus, Trash2, Shield, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

export default function AdministratorsPage() {
  const { adminUser, isSuperAdmin } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<AdminUser | undefined>();
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addRole, setAddRole] = useState<AdminRole>('admin');
  const [adding, setAdding] = useState(false);

  const loadAdmins = async () => {
    setLoading(true);
    try { setAdmins(await getAllAdmins()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAdmins(); }, []);

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-[#858585] mx-auto mb-3" />
          <p className="text-[#F5F5F5] font-semibold">Super Admin Only</p>
          <p className="text-[#858585] text-sm">Only Super Admins can manage authorized administrators.</p>
        </div>
      </div>
    );
  }

  const handleAdd = async () => {
    if (!addEmail || !addName) { toast.error('Email and name are required'); return; }
    setAdding(true);
    try {
      await addAdmin(addEmail.trim(), addName.trim(), addRole, adminUser?.uid || 'system');
      if (adminUser) {
        await logActivity(adminUser.uid, adminUser.email, 'admin_added', {
          affectedRecord: addEmail,
          affectedRecordType: 'admin',
          newValue: { email: addEmail, role: addRole },
        });
      }
      toast.success(`${addName} added as ${addRole.replace('_', ' ')}`);
      setShowAdd(false);
      setAddEmail(''); setAddName(''); setAddRole('admin');
      await loadAdmins();
    } catch (err: any) {
      toast.error('Failed to add admin', { description: err?.message });
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (admin: AdminUser, active: boolean) => {
    await toggleAdminActive(admin.uid, active);
    if (adminUser) {
      await logActivity(adminUser.uid, adminUser.email, active ? 'admin_activated' : 'admin_deactivated', {
        affectedRecord: admin.email,
        affectedRecordType: 'admin',
      });
    }
    toast.success(`${admin.displayName} ${active ? 'activated' : 'deactivated'}`);
    await loadAdmins();
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    await removeAdmin(removeTarget.uid);
    if (adminUser) {
      await logActivity(adminUser.uid, adminUser.email, 'admin_removed', {
        affectedRecord: removeTarget.email,
        affectedRecordType: 'admin',
      });
    }
    toast.success(`${removeTarget.displayName} removed`);
    setRemoveTarget(undefined);
    await loadAdmins();
  };

  if (loading) return <LoadingState message="Loading administrators..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F5]">Administrators</h1>
          <p className="text-[#858585] text-sm mt-1">{admins.length} authorized accounts</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-[#E50914] hover:bg-[#FF3028] text-white flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Admin
        </Button>
      </div>

      {admins.length === 0 ? (
        <div className="card-dark rounded-xl">
          <EmptyState icon={UserCog} title="No administrators found" description="Add authorized Google accounts to grant dashboard access." />
        </div>
      ) : (
        <div className="card-dark rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(185,185,185,0.08)] bg-[rgba(255,255,255,0.02)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#858585] uppercase tracking-wider">Admin</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#858585] uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#858585] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#858585] uppercase tracking-wider">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {admins.map(admin => (
                <tr key={admin.uid} className="border-b border-[rgba(185,185,185,0.06)] hover:bg-[rgba(255,255,255,0.01)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {admin.role === 'super_admin' ? <ShieldCheck className="w-4 h-4 text-[#E50914] flex-shrink-0" /> : <Shield className="w-4 h-4 text-[#858585] flex-shrink-0" />}
                      <div>
                        <p className="font-medium text-[#F5F5F5]">{admin.displayName}</p>
                        <p className="text-xs text-[#858585]">{admin.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${
                      admin.role === 'super_admin'
                        ? 'text-[#E50914] border-[rgba(229,9,20,0.3)] bg-[rgba(229,9,20,0.08)]'
                        : 'text-[#858585] border-[rgba(185,185,185,0.2)]'
                    }`}>
                      {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={admin.active}
                        onCheckedChange={v => handleToggle(admin, v)}
                        disabled={admin.uid === adminUser?.uid}
                        className="data-[state=checked]:bg-[#16A34A]"
                      />
                      <span className="text-xs text-[#858585]">{admin.active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#858585]">
                    {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {admin.uid !== adminUser?.uid && (
                      <button
                        onClick={() => setRemoveTarget(admin)}
                        className="p-1.5 rounded text-[#858585] hover:text-[#E50914] hover:bg-[rgba(229,9,20,0.08)] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-[#111111] border-[rgba(185,185,185,0.12)] text-[#F5F5F5] max-w-md">
          <DialogHeader>
            <DialogTitle>Add Authorized Administrator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs text-[#858585] mb-1.5 block">Google Email *</Label>
              <Input
                value={addEmail}
                onChange={e => setAddEmail(e.target.value)}
                placeholder="user@gmail.com"
                className="bg-[#0a0a0a] border-[rgba(185,185,185,0.15)] text-[#F5F5F5] placeholder:text-[#858585]"
              />
            </div>
            <div>
              <Label className="text-xs text-[#858585] mb-1.5 block">Display Name *</Label>
              <Input
                value={addName}
                onChange={e => setAddName(e.target.value)}
                placeholder="First Last"
                className="bg-[#0a0a0a] border-[rgba(185,185,185,0.15)] text-[#F5F5F5] placeholder:text-[#858585]"
              />
            </div>
            <div>
              <Label className="text-xs text-[#858585] mb-1.5 block">Role</Label>
              <Select value={addRole} onValueChange={(v) => setAddRole((v as AdminRole) || 'admin')}>
                <SelectTrigger className="bg-[#0a0a0a] border-[rgba(185,185,185,0.15)] text-[#F5F5F5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-[rgba(185,185,185,0.12)] text-[#F5F5F5]">
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleAdd} disabled={adding} className="flex-1 bg-[#E50914] hover:bg-[#FF3028] text-white">
                {adding ? 'Adding...' : 'Add Administrator'}
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(false)} className="border-[rgba(185,185,185,0.2)] text-[#858585]">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={o => !o && setRemoveTarget(undefined)}
        title="Remove Administrator"
        description={`Remove "${removeTarget?.displayName}" (${removeTarget?.email}) from the administrator allowlist? Access will be revoked immediately.`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleRemove}
      />
    </div>
  );
}
