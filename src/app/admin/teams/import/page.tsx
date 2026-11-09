// src/app/admin/teams/import/page.tsx
'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import { validateAndMapRows, summarizeImportResults } from '@/lib/utils/importValidation';
import { getExistingTeamIds, batchImportTeams } from '@/lib/services/teamService';
import { logActivity } from '@/lib/services/adminService';
import { useAuth } from '@/hooks/useAuth';
import type { ImportedTeamRow, ImportSummary } from '@/types/team';
import { toast } from 'sonner';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type ImportStep = 'upload' | 'map' | 'preview' | 'complete';

export default function ImportTeamsPage() {
  const { adminUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [teamIdCol, setTeamIdCol] = useState('');
  const [teamNameCol, setTeamNameCol] = useState('');
  const [results, setResults] = useState<ImportedTeamRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const workbook = xlsxRead(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsxUtils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
    if (rows.length === 0) {
      toast.error('The file appears to be empty.');
      return;
    }
    const cols = Object.keys(rows[0]);
    setColumns(cols);
    setRawRows(rows);
    setTeamIdCol(cols.find(c => /id/i.test(c)) ?? cols[0]);
    setTeamNameCol(cols.find(c => /name/i.test(c)) ?? cols[1] ?? cols[0]);
    setStep('map');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handlePreview = async () => {
    if (!teamIdCol || !teamNameCol) {
      toast.error('Please select Team ID and Team Name columns');
      return;
    }
    const existingIds = await getExistingTeamIds();
    const { results: mapped } = validateAndMapRows(rawRows, {
      teamId: teamIdCol,
      teamName: teamNameCol,
      memberFields: [],
    }, existingIds);
    setResults(mapped);
    setSummary(summarizeImportResults(mapped));
    setStep('preview');
  };

  const handleImport = async () => {
    const validRows = results.filter(r => r.status === 'valid');
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }
    setImporting(true);
    try {
      const { success, failed } = await batchImportTeams(
        validRows.map(r => ({ teamId: r.teamId, teamName: r.teamName, members: r.members })),
        adminUser!.uid
      );
      await logActivity(adminUser!.uid, adminUser!.email, 'team_import', {
        affectedRecordType: 'team',
        metadata: { imported: success.length, failed: failed.length, file: fileName },
      });
      setSummary(s => s ? { ...s, valid: success.length, failed: failed.length } : s);
      setStep('complete');
      toast.success(`Successfully imported ${success.length} teams`);
    } catch (err: any) {
      toast.error('Import failed', { description: err?.message });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/teams">
          <Button variant="ghost" size="sm" className="text-[#858585] hover:text-[#F5F5F5]">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Teams
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F5]">Import Teams</h1>
          <p className="text-[#858585] text-sm">Upload CSV or Excel file</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(['upload', 'map', 'preview', 'complete'] as ImportStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step === s ? 'bg-[#E50914] text-white' :
              ['upload', 'map', 'preview', 'complete'].indexOf(step) > i
                ? 'bg-[#16A34A] text-white'
                : 'bg-[#1a1a1a] text-[#858585]'
            }`}>{i + 1}</div>
            {i < 3 && <div className="flex-1 h-px bg-[rgba(185,185,185,0.1)] w-8" />}
          </div>
        ))}
        <span className="ml-2 text-xs text-[#858585] capitalize">{step}</span>
      </div>

      {step === 'upload' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#E50914] bg-[rgba(229,9,20,0.05)]'
                : 'border-[rgba(185,185,185,0.15)] hover:border-[rgba(229,9,20,0.3)] hover:bg-[rgba(229,9,20,0.02)]'
            }`}
          >
            <FileSpreadsheet className="w-12 h-12 text-[#858585] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#F5F5F5] mb-2">
              Drop your CSV or Excel file here
            </h3>
            <p className="text-[#858585] text-sm mb-4">or click to browse</p>
            <div className="flex justify-center gap-3">
              <span className="text-xs px-2 py-1 rounded bg-[#1a1a1a] text-[#858585]">.csv</span>
              <span className="text-xs px-2 py-1 rounded bg-[#1a1a1a] text-[#858585]">.xlsx</span>
              <span className="text-xs px-2 py-1 rounded bg-[#1a1a1a] text-[#858585]">.xls</span>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div className="mt-4 p-4 card-dark rounded-xl text-sm text-[#858585]">
            <p className="font-medium text-[#B9B9B9] mb-2">Expected format:</p>
            <code className="text-xs">Team ID | Team Name | Member 1 | Member 2 | Member 3 | ...</code>
          </div>
        </motion.div>
      )}

      {step === 'map' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="card-dark rounded-xl p-6">
            <h2 className="font-semibold text-[#F5F5F5] mb-1">Map Columns</h2>
            <p className="text-sm text-[#858585] mb-6">File: {fileName} · {rawRows.length} rows detected</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-[#858585] mb-2 block">Team ID Column *</Label>
                <Select value={teamIdCol} onValueChange={(val) => setTeamIdCol(val ?? '')}>
                  <SelectTrigger className="bg-[#0a0a0a] border-[rgba(185,185,185,0.15)] text-[#F5F5F5]">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-[rgba(185,185,185,0.12)] text-[#F5F5F5]">
                    {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-[#858585] mb-2 block">Team Name Column *</Label>
                <Select value={teamNameCol} onValueChange={(val) => setTeamNameCol(val ?? '')}>
                  <SelectTrigger className="bg-[#0a0a0a] border-[rgba(185,185,185,0.15)] text-[#F5F5F5]">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-[rgba(185,185,185,0.12)] text-[#F5F5F5]">
                    {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-[#858585] mt-4">
              Member columns will be auto-detected (Member 1, Member 2, etc.)
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handlePreview} className="bg-[#E50914] hover:bg-[#FF3028] text-white">
              Preview Import
            </Button>
            <Button variant="outline" onClick={() => setStep('upload')} className="border-[rgba(185,185,185,0.2)] text-[#858585]">
              Back
            </Button>
          </div>
        </motion.div>
      )}

      {step === 'preview' && summary && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total', value: summary.totalRows, color: 'silver' },
              { label: 'Valid', value: summary.valid, color: 'green' },
              { label: 'Duplicates', value: summary.duplicates, color: 'amber' },
              { label: 'Invalid', value: summary.invalid, color: 'red' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`card-dark rounded-lg p-4 text-center border ${
                color === 'green' ? 'border-[rgba(22,163,74,0.2)]' :
                color === 'amber' ? 'border-[rgba(214,168,75,0.2)]' :
                color === 'red' ? 'border-[rgba(229,9,20,0.2)]' :
                'border-[rgba(185,185,185,0.1)]'
              }`}>
                <p className="text-2xl font-bold text-[#F5F5F5] rank-number">{value}</p>
                <p className="text-xs text-[#858585] mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="card-dark rounded-xl overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#111]">
                <tr className="border-b border-[rgba(185,185,185,0.08)]">
                  <th className="px-3 py-2 text-left text-[#858585]">Status</th>
                  <th className="px-3 py-2 text-left text-[#858585]">Team ID</th>
                  <th className="px-3 py-2 text-left text-[#858585]">Team Name</th>
                  <th className="px-3 py-2 text-left text-[#858585]">Members</th>
                  <th className="px-3 py-2 text-left text-[#858585]">Issues</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-[rgba(185,185,185,0.05)]">
                    <td className="px-3 py-2">
                      {r.status === 'valid' && <CheckCircle className="w-3.5 h-3.5 text-[#16A34A]" />}
                      {r.status === 'duplicate' && <AlertTriangle className="w-3.5 h-3.5 text-[#D6A84B]" />}
                      {r.status === 'invalid' && <XCircle className="w-3.5 h-3.5 text-[#E50914]" />}
                    </td>
                    <td className="px-3 py-2 font-mono text-[#B9B9B9]">{r.teamId || '—'}</td>
                    <td className="px-3 py-2 text-[#F5F5F5]">{r.teamName || '—'}</td>
                    <td className="px-3 py-2 text-[#858585]">{r.members.length}</td>
                    <td className="px-3 py-2 text-[#E50914]">{r.errors.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleImport}
              disabled={importing || summary.valid === 0}
              className="bg-[#E50914] hover:bg-[#FF3028] text-white"
            >
              {importing ? 'Importing...' : `Import ${summary.valid} Valid Teams`}
            </Button>
            <Button variant="outline" onClick={() => setStep('map')} className="border-[rgba(185,185,185,0.2)] text-[#858585]">
              Back
            </Button>
          </div>
        </motion.div>
      )}

      {step === 'complete' && summary && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-[rgba(22,163,74,0.1)] border border-[rgba(22,163,74,0.3)] flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-[#16A34A]" />
          </div>
          <h2 className="text-2xl font-bold text-[#F5F5F5] mb-2">Import Complete</h2>
          <p className="text-[#858585]">{summary.valid} teams imported successfully</p>
          {summary.failed > 0 && <p className="text-[#E50914] text-sm mt-1">{summary.failed} failed</p>}
          <div className="flex gap-3 justify-center mt-8">
            <Link href="/admin/teams">
              <Button className="bg-[#E50914] hover:bg-[#FF3028] text-white">
                View Teams
              </Button>
            </Link>
            <Button variant="outline" onClick={() => { setStep('upload'); setFileName(''); }} className="border-[rgba(185,185,185,0.2)] text-[#858585]">
              Import More
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
