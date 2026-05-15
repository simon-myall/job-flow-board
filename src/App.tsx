import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { KanbanBoard } from './components/KanbanBoard';
import { JobModal } from './components/JobModal';
import { BaseCVPage } from './pages/BaseCVPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { MigrationBanner } from './components/MigrationBanner';
import { useStore } from './store';
import type { JobApplication, JobStatus } from './types';
import { ALL_STATUSES, COLUMN_CONFIG } from './types';
import {
  Kanban, FileText, Settings, Plus, Search, X,
  Briefcase, CheckCircle2, Key, LogOut, Loader2,
} from 'lucide-react';

type Page = 'board' | 'cv' | 'settings';

const NAV_ITEMS: { page: Page; label: string; Icon: React.ElementType }[] = [
  { page: 'board', label: 'Board', Icon: Kanban },
  { page: 'cv', label: 'CV Manager', Icon: FileText },
  { page: 'settings', label: 'Settings', Icon: Settings },
];

// ── Auth gate wrapper ─────────────────────────────────────────────────────────

export default function App() {
  // undefined = still checking, null = not logged in, Session = logged in
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const { setUserId, loadAll } = useStore();

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  // When session changes, sync userId and load data
  useEffect(() => {
    if (session) {
      setUserId(session.user.id);
      loadAll();
    } else if (session === null) {
      setUserId(null);
    }
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  // Checking auth state
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  // Not logged in
  if (!session) {
    return <LoginPage />;
  }

  // Logged in
  return <MainApp email={session.user.email ?? ''} />;
}

// ── Main application ──────────────────────────────────────────────────────────

function MainApp({ email }: { email: string }) {
  const { jobs, settings, baseCV, loading } = useStore();
  const [page, setPage] = useState<Page>('board');
  const [editingJob, setEditingJob] = useState<JobApplication | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newStatus, setNewStatus] = useState<JobStatus>('shortlist');
  const [search, setSearch] = useState('');

  function openNew(status: JobStatus) {
    setEditingJob(null);
    setNewStatus(status);
    setShowModal(true);
  }

  function openEdit(job: JobApplication) {
    setEditingJob(job);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingJob(null);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const totalJobs = jobs.length;
  const activeJobs = jobs.filter((j) => j.status !== 'rejected').length;
  const interviews = jobs.filter((j) => j.status === 'interview').length;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Briefcase size={16} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm leading-tight">Job Flow Board</h1>
              <p className="text-xs text-gray-400 truncate max-w-[112px]">{email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ page: p, label, Icon }) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${page === p
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <Icon size={16} />
              {label}
              {p === 'settings' && !settings.claudeApiKey && (
                <span title="API key not set" className="ml-auto w-2 h-2 bg-amber-400 rounded-full" />
              )}
              {p === 'cv' && !baseCV && (
                <span title="Base CV not set" className="ml-auto w-2 h-2 bg-amber-400 rounded-full" />
              )}
            </button>
          ))}
        </nav>

        {/* Stats panel */}
        <div className="px-4 py-4 border-t border-gray-100 space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Overview</p>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="text-center bg-gray-50 rounded-lg py-2">
              <div className="text-lg font-bold text-gray-900">{totalJobs}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="text-center bg-sky-50 rounded-lg py-2">
              <div className="text-lg font-bold text-sky-700">{activeJobs}</div>
              <div className="text-xs text-sky-600">Active</div>
            </div>
            <div className="text-center bg-emerald-50 rounded-lg py-2">
              <div className="text-lg font-bold text-emerald-700">{interviews}</div>
              <div className="text-xs text-emerald-600">Intrvws</div>
            </div>
          </div>
          <div className="space-y-1 mt-2">
            {ALL_STATUSES.map((s) => {
              const count = jobs.filter((j) => j.status === s).length;
              const col = COLUMN_CONFIG[s];
              return (
                <div key={s} className="flex items-center justify-between text-xs">
                  <span className={col.color}>{col.label}</span>
                  <span className="font-medium text-gray-700">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Setup reminders + sign out */}
        <div className="px-3 pb-4 space-y-1.5">
          {!settings.claudeApiKey && (
            <button
              onClick={() => setPage('settings')}
              className="w-full flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 hover:bg-amber-100 transition-colors"
            >
              <Key size={12} /> Add API key
            </button>
          )}
          {!baseCV && (
            <button
              onClick={() => setPage('cv')}
              className="w-full flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 hover:bg-amber-100 transition-colors"
            >
              <FileText size={12} /> Add base CV
            </button>
          )}
          {settings.claudeApiKey && baseCV && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700">
              <CheckCircle2 size={12} /> AI features ready
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg px-2.5 py-2 transition-colors"
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shrink-0">
          <div className="flex-1">
            {page === 'board' ? (
              <div className="relative max-w-sm">
                <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  className="input pl-9 pr-8"
                  placeholder="Search jobs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ) : (
              <h2 className="font-semibold text-gray-900">
                {page === 'cv' ? 'CV Manager' : 'Settings'}
              </h2>
            )}
          </div>
          {page === 'board' && (
            <button onClick={() => openNew('shortlist')} className="btn-primary">
              <Plus size={15} /> New Application
            </button>
          )}
        </header>

        {/* One-time migration banner — disappears after migrating */}
        <MigrationBanner />

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 size={28} className="animate-spin text-indigo-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading your applications…</p>
              </div>
            </div>
          ) : (
            <>
              {page === 'board' && (
                <div className="p-6">
                  <KanbanBoard onEditJob={openEdit} onNewJob={openNew} search={search} />
                </div>
              )}
              {page === 'cv' && <BaseCVPage />}
              {page === 'settings' && <SettingsPage />}
            </>
          )}
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <JobModal
          job={editingJob}
          initialStatus={newStatus}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
