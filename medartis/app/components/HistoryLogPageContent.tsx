'use client';

import { useEffect, useState, useTransition } from 'react';
import { fetchHistoryLogsAction, restoreHistoryLogAction } from '../actions/historyLogActions';

type HistoryLog = {
  id: string;
  timestamp: Date | string;
  targetTable: string;
  targetRowId: string;
  actionType: string;
  previousData: string;
  newData: string;
  actorName: string;
  actorEmail?: string | null;
  actorRole?: string | null;
};

function parseJson(value: string) {
  try { return JSON.parse(value); } catch { return value; }
}

function session() {
  if (typeof window === 'undefined') return { name: '', email: '', role: '' };
  try { return JSON.parse(localStorage.getItem('medartis_session_token') || '{}'); } catch { return { name: '', email: '', role: '' }; }
}

export default function HistoryLogPageContent() {
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const user = session();
  const isAdmin = String(user.role || '').toLowerCase() === 'admin';

  const loadLogs = () => startTransition(async () => {
    const formData = new FormData();
    formData.set('currentUserRole', user.role || '');
    const response = await fetchHistoryLogsAction(formData);
    if (response.success) setLogs((response.logs || []) as HistoryLog[]);
    else setError(response.error || 'Could not load history logs.');
  });

  useEffect(() => { loadLogs(); }, []);

  const restore = (logId: string) => startTransition(async () => {
    const formData = new FormData();
    formData.set('logId', logId);
    formData.set('currentUserName', user.name || '');
    formData.set('currentUserEmail', user.email || '');
    formData.set('currentUserRole', user.role || '');
    const response = await restoreHistoryLogAction(formData);
    if (!response.success) setError(response.error || 'Restore failed.');
    else loadLogs();
  });

  if (!isAdmin) return <main className="p-6"><div className="alert alert-error">History Log is available to Admin users only.</div></main>;

  return (
    <main className="p-6 md:ml-60 pb-24">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">History Log</h1>
          <p className="text-sm opacity-70">Admin-only audit trail for row creation, edits, deletes, and restores.</p>
        </div>
        <button className="btn btn-sm" onClick={loadLogs} disabled={isPending}>Refresh</button>
      </div>
      {error && <div className="alert alert-error mb-4">{error}</div>}
      <div className="overflow-x-auto rounded-xl border border-base-300 bg-base-100">
        <table className="table table-zebra table-sm">
          <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Record</th><th>Old value</th><th>New value</th><th /></tr></thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                <td>{log.actorName}<div className="text-xs opacity-60">{log.actorRole || ''} {log.actorEmail || ''}</div></td>
                <td><span className="badge badge-outline">{log.actionType}</span></td>
                <td>{log.targetTable}<div className="font-mono text-xs">{log.targetRowId}</div></td>
                <td><pre className="max-h-32 max-w-xs overflow-auto text-xs">{JSON.stringify(parseJson(log.previousData), null, 2)}</pre></td>
                <td><pre className="max-h-32 max-w-xs overflow-auto text-xs">{JSON.stringify(parseJson(log.newData), null, 2)}</pre></td>
                <td><button className="btn btn-xs btn-warning" onClick={() => restore(log.id)} disabled={isPending || log.actionType === 'CREATE'}>Restore old</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
