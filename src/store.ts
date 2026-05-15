import { create } from 'zustand';
import { supabase } from './supabase';
import type { JobApplication, JobStatus, AppSettings } from './types';

function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const DEFAULT_RECRUITERS = [
  'Adecco',
  'Ambition',
  'Beaumont People',
  'Bluefin Resources',
  'Davidson',
  'Drake International',
  'Finite Recruitment',
  'Frazer Jones',
  'Hays',
  'Hudson',
  'Ignite',
  'Insight Recruitment',
  'Kelly Services',
  'Lotus People',
  'Manpower',
  'Michael Page',
  'Morgan McKinley',
  'Peoplecorp',
  'Randstad',
  'Robert Half',
  'Robert Walters',
  'Six Degrees Executive',
  'Talent International',
  'Talenza',
  'TRS Resourcing',
  'u&u Recruitment Partners',
  'Veritas Recruitment',
];

type Store = {
  jobs: JobApplication[];
  baseCV: string;
  settings: AppSettings;
  recruiters: string[];
  userId: string | null;
  loading: boolean;

  // Auth
  setUserId: (id: string | null) => void;

  // Bootstrap — call once after login
  loadAll: () => Promise<void>;

  // Jobs (optimistic: update local state immediately, sync to Supabase in background)
  addJob: (partial: Partial<JobApplication>) => JobApplication;
  updateJob: (id: string, updates: Partial<JobApplication>) => void;
  deleteJob: (id: string) => void;
  moveJob: (id: string, status: JobStatus) => void;
  reorderJob: (
    sourceStatus: JobStatus,
    sourceIndex: number,
    destStatus: JobStatus,
    destIndex: number
  ) => void;

  // Profile
  setBaseCV: (cv: string) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  addRecruiter: (name: string) => void;
};

const defaultJob = (): Omit<JobApplication, 'id'> => ({
  status: 'shortlist',
  title: '',
  company: '',
  location: '',
  salary: '',
  jobUrl: '',
  source: 'other',
  recruiter: '',
  jobDescription: '',
  contactName: '',
  contactEmail: '',
  deadline: '',
  dateAdded: new Date().toISOString().slice(0, 10),
  notes: '',
  coverLetter: '',
  customCV: '',
  interviewDates: [],
  tags: [],
  priority: 'medium',
});

// ── Supabase helpers ──────────────────────────────────────────────────────────

function syncJob(userId: string, job: JobApplication) {
  supabase
    .from('jobs')
    .upsert({ id: job.id, user_id: userId, data: job, updated_at: new Date().toISOString() })
    .then(({ error }) => { if (error) console.error('[store] job sync error:', error.message); });
}

function deleteJobRemote(userId: string, id: string) {
  supabase
    .from('jobs')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .then(({ error }) => { if (error) console.error('[store] job delete error:', error.message); });
}

function syncProfile(userId: string, fields: {
  claude_api_key?: string;
  base_cv?: string;
  recruiters?: string[];
}) {
  supabase
    .from('user_profiles')
    .upsert({ user_id: userId, ...fields })
    .then(({ error }) => { if (error) console.error('[store] profile sync error:', error.message); });
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useStore = create<Store>()((set, get) => ({
  jobs: [],
  baseCV: '',
  settings: { claudeApiKey: '', defaultCVModel: 'claude-opus-4-7' },
  recruiters: [...DEFAULT_RECRUITERS],
  userId: null,
  loading: false,

  setUserId: (id) => set({ userId: id }),

  loadAll: async () => {
    const { userId } = get();
    if (!userId) return;
    set({ loading: true });

    const [jobsRes, profileRes] = await Promise.all([
      supabase.from('jobs').select('data').eq('user_id', userId),
      supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    if (jobsRes.error) console.error('[store] load jobs error:', jobsRes.error.message);
    if (profileRes.error) console.error('[store] load profile error:', profileRes.error.message);

    const jobs: JobApplication[] = (jobsRes.data ?? []).map(
      (row: { data: JobApplication }) => row.data
    );

    if (!profileRes.data) {
      // First login — create profile with default recruiter list
      await supabase.from('user_profiles').insert({
        user_id: userId,
        claude_api_key: '',
        base_cv: '',
        recruiters: DEFAULT_RECRUITERS,
      });
      set({ jobs, recruiters: [...DEFAULT_RECRUITERS], loading: false });
    } else {
      const p = profileRes.data as {
        claude_api_key: string;
        base_cv: string;
        recruiters: string[];
      };
      // Merge stored recruiters with any new defaults added in future releases
      const merged = [
        ...new Set([...DEFAULT_RECRUITERS, ...(p.recruiters ?? [])]),
      ].sort((a, b) => a.localeCompare(b));

      set({
        jobs,
        loading: false,
        baseCV: p.base_cv ?? '',
        settings: {
          claudeApiKey: p.claude_api_key ?? '',
          defaultCVModel: 'claude-opus-4-7',
        },
        recruiters: merged,
      });
    }
  },

  // ── Jobs ────────────────────────────────────────────────────────────────────

  addJob: (partial) => {
    const job: JobApplication = { ...defaultJob(), ...partial, id: newId() };
    set((s) => ({ jobs: [...s.jobs, job] }));
    const { userId } = get();
    if (userId) syncJob(userId, job);
    return job;
  },

  updateJob: (id, updates) => {
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...updates } : j)),
    }));
    const { userId, jobs } = get();
    const updated = jobs.find((j) => j.id === id);
    if (userId && updated) syncJob(userId, updated);
  },

  deleteJob: (id) => {
    set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) }));
    const { userId } = get();
    if (userId) deleteJobRemote(userId, id);
  },

  moveJob: (id, status) => {
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, status } : j)),
    }));
    const { userId, jobs } = get();
    const updated = jobs.find((j) => j.id === id);
    if (userId && updated) syncJob(userId, updated);
  },

  reorderJob: (sourceStatus, sourceIndex, destStatus, destIndex) => {
    set((s) => {
      const all = [...s.jobs];
      const sourceItems = all.filter((j) => j.status === sourceStatus);
      const [moved] = sourceItems.splice(sourceIndex, 1);
      moved.status = destStatus;
      const destItems = all.filter(
        (j) => j.status === destStatus && j.id !== moved.id
      );
      destItems.splice(destIndex, 0, moved);
      const newJobs = s.jobs
        .filter((j) => j.status !== sourceStatus && j.status !== destStatus)
        .concat(
          destStatus === sourceStatus
            ? destItems
            : [...sourceItems, ...destItems]
        );
      return { jobs: newJobs };
    });
    // Sync all jobs whose status may have changed
    const { userId, jobs } = get();
    if (userId) {
      jobs
        .filter((j) => j.status === sourceStatus || j.status === destStatus)
        .forEach((j) => syncJob(userId, j));
    }
  },

  // ── Profile ─────────────────────────────────────────────────────────────────

  setBaseCV: (cv) => {
    set({ baseCV: cv });
    const { userId } = get();
    if (userId) syncProfile(userId, { base_cv: cv });
  },

  updateSettings: (updates) => {
    set((s) => ({ settings: { ...s.settings, ...updates } }));
    const { userId, settings } = get();
    if (userId) syncProfile(userId, { claude_api_key: settings.claudeApiKey });
  },

  addRecruiter: (name) => {
    set((s) => ({
      recruiters: [...new Set([...s.recruiters, name])].sort((a, b) =>
        a.localeCompare(b)
      ),
    }));
    const { userId, recruiters } = get();
    if (userId) syncProfile(userId, { recruiters });
  },
}));
