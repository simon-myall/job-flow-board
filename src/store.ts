import { create } from 'zustand';
import { supabase } from './supabase';
import type { JobApplication, JobStatus, AppSettings, Agency } from './types';

function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const DEFAULT_RECRUITERS = [
  'Adecco', 'Ambition', 'Beaumont People', 'Bluefin Resources', 'Davidson',
  'Drake International', 'Finite Recruitment', 'Frazer Jones', 'Hays', 'Hudson',
  'Ignite', 'Insight Recruitment', 'Kelly Services', 'Lotus People', 'Manpower',
  'Michael Page', 'Morgan McKinley', 'Peoplecorp', 'Randstad', 'Robert Half',
  'Robert Walters', 'Six Degrees Executive', 'Talent International', 'Talenza',
  'TRS Resourcing', 'u&u Recruitment Partners', 'Veritas Recruitment',
];

type Store = {
  jobs: JobApplication[];
  agencies: Agency[];
  baseCV: string;
  settings: AppSettings;
  recruiters: string[];
  userId: string | null;
  loading: boolean;

  setUserId: (id: string | null) => void;
  loadAll: () => Promise<void>;

  // Jobs
  addJob: (partial: Partial<JobApplication>) => JobApplication;
  updateJob: (id: string, updates: Partial<JobApplication>) => void;
  deleteJob: (id: string) => void;
  moveJob: (id: string, status: JobStatus) => void;
  reorderJob: (sourceStatus: JobStatus, sourceIndex: number, destStatus: JobStatus, destIndex: number) => void;

  // Agencies
  addAgency: (partial: Partial<Agency>) => Agency;
  updateAgency: (id: string, updates: Partial<Agency>) => void;
  deleteAgency: (id: string) => void;

  // Profile
  setBaseCV: (cv: string) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  addRecruiter: (name: string) => void;
};

const defaultJob = (): Omit<JobApplication, 'id'> => ({
  status: 'shortlist',
  title: '', company: '', location: '', salary: '',
  jobUrl: '', source: 'other', recruiter: '', agencyId: '',
  jobDescription: '', contactName: '', contactEmail: '',
  deadline: '', dateAdded: new Date().toISOString().slice(0, 10),
  rejectedAt: '', notes: '', coverLetter: '', customCV: '',
  interviewDates: [], tags: [], priority: 'medium',
});

const defaultAgency = (): Omit<Agency, 'id'> => ({
  name: '', contactName: '', contactEmail: '', contactPhone: '',
  website: '', notes: '', dateAdded: new Date().toISOString().slice(0, 10),
  status: 'not_contacted',
});

// ── Supabase sync helpers ─────────────────────────────────────────────────────

function syncJob(userId: string, job: JobApplication) {
  supabase.from('jobs')
    .upsert({ id: job.id, user_id: userId, data: job, updated_at: new Date().toISOString() })
    .then(({ error }) => { if (error) console.error('[store] job sync:', error.message); });
}

function deleteJobRemote(userId: string, id: string) {
  supabase.from('jobs').delete().eq('id', id).eq('user_id', userId)
    .then(({ error }) => { if (error) console.error('[store] job delete:', error.message); });
}

function syncAgency(userId: string, agency: Agency) {
  supabase.from('agencies')
    .upsert({ id: agency.id, user_id: userId, data: agency, updated_at: new Date().toISOString() })
    .then(({ error }) => { if (error) console.error('[store] agency sync:', error.message); });
}

function deleteAgencyRemote(userId: string, id: string) {
  supabase.from('agencies').delete().eq('id', id).eq('user_id', userId)
    .then(({ error }) => { if (error) console.error('[store] agency delete:', error.message); });
}

function syncProfile(userId: string, fields: {
  claude_api_key?: string; base_cv?: string; recruiters?: string[];
  rejected_hide_days?: number;
}) {
  supabase.from('user_profiles').upsert({ user_id: userId, ...fields })
    .then(({ error }) => { if (error) console.error('[store] profile sync:', error.message); });
}

// ── Rejected date tracking ────────────────────────────────────────────────────

function withRejectedAt(updates: Partial<JobApplication>, currentStatus?: JobStatus): Partial<JobApplication> {
  if (!updates.status) return updates;
  if (updates.status === 'rejected' && currentStatus !== 'rejected') {
    return { ...updates, rejectedAt: new Date().toISOString().slice(0, 10) };
  }
  if (updates.status !== 'rejected' && currentStatus === 'rejected') {
    return { ...updates, rejectedAt: '' };
  }
  return updates;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useStore = create<Store>()((set, get) => ({
  jobs: [],
  agencies: [],
  baseCV: '',
  settings: { claudeApiKey: '', defaultCVModel: 'claude-opus-4-7', rejectedHideDays: 5 },
  recruiters: [...DEFAULT_RECRUITERS],
  userId: null,
  loading: false,

  setUserId: (id) => set({ userId: id }),

  loadAll: async () => {
    const { userId } = get();
    if (!userId) return;
    set({ loading: true });

    const [jobsRes, agenciesRes, profileRes] = await Promise.all([
      supabase.from('jobs').select('data').eq('user_id', userId),
      supabase.from('agencies').select('data').eq('user_id', userId),
      supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    const jobs: JobApplication[] = (jobsRes.data ?? []).map(
      (r: { data: Partial<JobApplication> }) => ({
        agencyId: '', rejectedAt: '', // defaults for old records without these fields
        ...r.data,
      } as JobApplication)
    );
    const agencies: Agency[] = (agenciesRes.data ?? []).map(
      (r: { data: Agency }) => r.data
    );

    if (!profileRes.data) {
      await supabase.from('user_profiles').insert({
        user_id: userId, claude_api_key: '', base_cv: '',
        recruiters: DEFAULT_RECRUITERS, rejected_hide_days: 5,
      });
      set({ jobs, agencies, recruiters: [...DEFAULT_RECRUITERS], loading: false });
    } else {
      const p = profileRes.data as {
        claude_api_key: string; base_cv: string;
        recruiters: string[]; rejected_hide_days?: number;
      };
      const merged = [...new Set([...DEFAULT_RECRUITERS, ...(p.recruiters ?? [])])]
        .sort((a, b) => a.localeCompare(b));
      set({
        jobs, agencies, loading: false,
        baseCV: p.base_cv ?? '',
        settings: {
          claudeApiKey: p.claude_api_key ?? '',
          defaultCVModel: 'claude-opus-4-7',
          rejectedHideDays: p.rejected_hide_days ?? 5,
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
    const current = get().jobs.find((j) => j.id === id);
    const finalUpdates = withRejectedAt(updates, current?.status);
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...finalUpdates } : j)),
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
    const current = get().jobs.find((j) => j.id === id);
    const updates = withRejectedAt({ status }, current?.status);
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...updates } : j)),
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
      const finalUpdates = withRejectedAt({ status: destStatus }, moved.status);
      Object.assign(moved, finalUpdates);
      const destItems = all.filter((j) => j.status === destStatus && j.id !== moved.id);
      destItems.splice(destIndex, 0, moved);
      const newJobs = s.jobs
        .filter((j) => j.status !== sourceStatus && j.status !== destStatus)
        .concat(destStatus === sourceStatus ? destItems : [...sourceItems, ...destItems]);
      return { jobs: newJobs };
    });
    const { userId, jobs } = get();
    if (userId) {
      jobs.filter((j) => j.status === sourceStatus || j.status === destStatus)
        .forEach((j) => syncJob(userId, j));
    }
  },

  // ── Agencies ─────────────────────────────────────────────────────────────────

  addAgency: (partial) => {
    const agency: Agency = { ...defaultAgency(), ...partial, id: newId() };
    set((s) => ({ agencies: [...s.agencies, agency] }));
    const { userId } = get();
    if (userId) syncAgency(userId, agency);
    return agency;
  },

  updateAgency: (id, updates) => {
    set((s) => ({
      agencies: s.agencies.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }));
    const { userId, agencies } = get();
    const updated = agencies.find((a) => a.id === id);
    if (userId && updated) syncAgency(userId, updated);
  },

  deleteAgency: (id) => {
    // Unlink any jobs belonging to this agency
    set((s) => ({
      agencies: s.agencies.filter((a) => a.id !== id),
      jobs: s.jobs.map((j) => j.agencyId === id ? { ...j, agencyId: '', recruiter: '' } : j),
    }));
    const { userId, jobs } = get();
    if (userId) {
      deleteAgencyRemote(userId, id);
      jobs.filter((j) => j.agencyId === '').forEach((j) => syncJob(userId, j));
    }
  },

  // ── Profile ──────────────────────────────────────────────────────────────────

  setBaseCV: (cv) => {
    set({ baseCV: cv });
    const { userId } = get();
    if (userId) syncProfile(userId, { base_cv: cv });
  },

  updateSettings: (updates) => {
    set((s) => ({ settings: { ...s.settings, ...updates } }));
    const { userId, settings } = get();
    if (userId) syncProfile(userId, {
      claude_api_key: settings.claudeApiKey,
      rejected_hide_days: settings.rejectedHideDays,
    });
  },

  addRecruiter: (name) => {
    set((s) => ({
      recruiters: [...new Set([...s.recruiters, name])].sort((a, b) => a.localeCompare(b)),
    }));
    const { userId, recruiters } = get();
    if (userId) syncProfile(userId, { recruiters });
  },
}));
