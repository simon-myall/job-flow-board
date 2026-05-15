import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useStore } from '../store';
import type { JobApplication } from '../types';
import { Database, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';

const LS_KEY = 'job-tracker-v1';

type OldState = {
  state: {
    jobs?: JobApplication[];
    baseCV?: string;
    settings?: { claudeApiKey?: string; defaultCVModel?: string };
    recruiters?: string[];
  };
};

function readLocalStorageData(): OldState['state'] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OldState;
    const state = parsed?.state;
    if (!state || (!state.jobs?.length && !state.baseCV)) return null;
    return state;
  } catch {
    return null;
  }
}

export function MigrationBanner() {
  const { userId, loadAll } = useStore();
  const [oldData, setOldData] = useState<OldState['state'] | null>(null);
  const [status, setStatus] = useState<'idle' | 'migrating' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only show if there's localStorage data to migrate
    const data = readLocalStorageData();
    setOldData(data);
  }, []);

  // Hide if nothing to migrate or already dismissed
  if (!oldData || dismissed) return null;

  const jobCount = oldData.jobs?.length ?? 0;

  async function handleMigrate() {
    if (!userId || !oldData) return;
    setStatus('migrating');
    setError('');

    try {
      // ── Upload jobs ────────────────────────────────────────────────────────
      if (oldData.jobs && oldData.jobs.length > 0) {
        const rows = oldData.jobs.map((job) => ({
          id: job.id,
          user_id: userId,
          // Ensure newer fields have defaults if missing from old data
          data: { ...job, recruiter: job.recruiter ?? '' } as JobApplication,
          updated_at: new Date().toISOString(),
        }));

        const { error: jobsError } = await supabase
          .from('jobs')
          .upsert(rows, { onConflict: 'id' });

        if (jobsError) throw new Error(`Jobs: ${jobsError.message}`);
      }

      // ── Upload profile ─────────────────────────────────────────────────────
      const profileFields: Record<string, unknown> = {
        user_id: userId,
      };
      if (oldData.baseCV) profileFields.base_cv = oldData.baseCV;
      if (oldData.settings?.claudeApiKey) profileFields.claude_api_key = oldData.settings.claudeApiKey;
      if (oldData.recruiters?.length) profileFields.recruiters = oldData.recruiters;

      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert(profileFields, { onConflict: 'user_id' });

      if (profileError) throw new Error(`Profile: ${profileError.message}`);

      // ── Reload store from Supabase ─────────────────────────────────────────
      await loadAll();

      // ── Clear old localStorage ─────────────────────────────────────────────
      localStorage.removeItem(LS_KEY);

      setStatus('done');
      setTimeout(() => setDismissed(true), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-2.5 rounded-lg mx-6 mt-4">
        <CheckCircle2 size={15} className="shrink-0" />
        <span>Migration complete — all your data is now saved to your account.</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 mx-6 mt-4">
      <Database size={16} className="text-indigo-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-indigo-900">
          Found {jobCount} saved application{jobCount !== 1 ? 's' : ''} from your previous session
        </p>
        <p className="text-xs text-indigo-700 mt-0.5">
          Your old data is stored locally in this browser. Migrate it to your account so it syncs everywhere.
        </p>
        {status === 'error' && (
          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
            <AlertCircle size={11} /> {error}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {status !== 'migrating' && (
          <button
            onClick={() => setDismissed(true)}
            className="text-indigo-400 hover:text-indigo-600"
            title="Dismiss"
          >
            <X size={15} />
          </button>
        )}
        <button
          onClick={handleMigrate}
          disabled={status === 'migrating'}
          className="btn-primary btn-sm"
        >
          {status === 'migrating'
            ? <><Loader2 size={13} className="animate-spin" /> Migrating…</>
            : 'Migrate now'}
        </button>
      </div>
    </div>
  );
}
