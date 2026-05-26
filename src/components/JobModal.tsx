import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import type { JobApplication, JobStatus } from '../types';
import { ALL_STATUSES, COLUMN_CONFIG } from '../types';
import { generateCoverLetter, generateCustomCV, extractJobDetails, fetchJobDescription } from '../claudeService';
import {
  X, Wand2, Loader2, ExternalLink, Plus, Trash2,
  Copy, Check, ChevronDown, AlertCircle, Link, RefreshCw,
} from 'lucide-react';

type Props = {
  job: JobApplication | null;
  initialStatus?: JobStatus;
  initialAgencyId?: string;
  onClose: () => void;
};

const TABS = ['Details', 'Job Description', 'Cover Letter', 'Tailored CV', 'Notes & Interviews'] as const;
type Tab = typeof TABS[number];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn-ghost btn-sm"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      title="Copy to clipboard"
    >
      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
    </button>
  );
}

// Agency selector — links a job to an agency entity
function AgencySelect({
  agencyId,
  onChange,
}: {
  agencyId: string;
  onChange: (agencyId: string, recruiter: string) => void;
}) {
  const { agencies } = useStore();
  const [showContactHint, setShowContactHint] = useState(false);

  function handleSelect(value: string) {
    if (value === '') {
      // Direct application
      onChange('', '');
      setShowContactHint(false);
    } else {
      const agency = agencies.find((a) => a.id === value);
      if (agency) {
        onChange(agency.id, agency.name);
        setShowContactHint(!!(agency.contactName || agency.contactEmail));
      }
    }
  }

  const selectedAgency = agencies.find((a) => a.id === agencyId);

  return (
    <div className="space-y-2">
      <select
        className="input"
        value={agencyId || ''}
        onChange={(e) => handleSelect(e.target.value)}
      >
        <option value="">— Direct application —</option>
        {agencies.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>

      {/* Agency contact hint */}
      {selectedAgency && showContactHint && (
        <div className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-2 border border-gray-200">
          {selectedAgency.contactName && <span className="mr-2">👤 {selectedAgency.contactName}</span>}
          {selectedAgency.contactEmail && <span>✉ {selectedAgency.contactEmail}</span>}
        </div>
      )}

      {/* No agencies hint */}
      {agencies.length === 0 && (
        <p className="text-xs text-gray-400">
          No agencies added yet. Add agencies in the Agency Board view.
        </p>
      )}
    </div>
  );
}

export function JobModal({ job, initialStatus = 'shortlist', initialAgencyId = '', onClose }: Props) {
  const { addJob, updateJob, deleteJob, settings, baseCV, agencies } = useStore();
  const isNew = !job;

  const [form, setForm] = useState<JobApplication>(() => {
    const initialAgency = agencies.find((a) => a.id === initialAgencyId);
    return {
      id: '',
      status: initialStatus,
      title: '',
      company: '',
      location: '',
      salary: '',
      jobUrl: '',
      source: 'other',
      recruiter: initialAgency ? initialAgency.name : '',
      agencyId: initialAgencyId,
      jobDescription: '',
      contactName: '',
      contactEmail: '',
      deadline: '',
      dateAdded: new Date().toISOString().slice(0, 10),
      rejectedAt: '',
      notes: '',
      coverLetter: '',
      customCV: '',
      interviewDates: [],
      tags: [],
      priority: 'medium',
      ...job,
    };
  });

  const [tab, setTab] = useState<Tab>('Details');
  const [tagInput, setTagInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [generating, setGenerating] = useState<'cover' | 'cv' | null>(null);
  const [genError, setGenError] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [unsaved, setUnsaved] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setUnsaved(false); }, [job]);

  function set<K extends keyof JobApplication>(key: K, val: JobApplication[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    setUnsaved(true);
  }

  function save() {
    if (isNew) {
      addJob({ ...form });
    } else {
      updateJob(form.id, form);
    }
    setUnsaved(false);
    onClose();
  }

  function handleDelete() {
    if (!job) return;
    if (window.confirm(`Delete "${form.title || 'this application'}" at ${form.company || 'this company'}? This cannot be undone.`)) {
      deleteJob(job.id);
      onClose();
    }
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagInput('');
  }

  function addInterviewDate() {
    const d = dateInput.trim();
    if (d && !form.interviewDates.includes(d)) set('interviewDates', [...form.interviewDates, d]);
    setDateInput('');
  }

  async function handleFetchFromUrl(url: string) {
    if (!url.trim()) return;
    setFetchingUrl(true);
    setFetchError('');
    const result = await fetchJobDescription(url);
    setFetchingUrl(false);

    if (result.error) {
      setFetchError(result.error);
      return;
    }

    const text = result.text;
    setForm((f) => ({ ...f, jobDescription: text }));
    setUnsaved(true);

    // Auto-extract details if API key is set and fields are empty
    if (settings.claudeApiKey && text) {
      setExtracting(true);
      const details = await extractJobDetails(settings.claudeApiKey, text);
      setExtracting(false);
      setForm((f) => ({
        ...f,
        title: details.title || f.title,
        company: details.company || f.company,
        location: details.location || f.location,
        salary: details.salary || f.salary,
      }));
    }
  }

  async function handleExtract() {
    if (!form.jobDescription.trim()) return;
    setExtracting(true);
    const details = await extractJobDetails(settings.claudeApiKey, form.jobDescription);
    setExtracting(false);
    setForm((f) => ({
      ...f,
      title: details.title || f.title,
      company: details.company || f.company,
      location: details.location || f.location,
      salary: details.salary || f.salary,
    }));
    setUnsaved(true);
  }

  async function handleGenerateCover() {
    setGenerating('cover');
    setGenError('');
    set('coverLetter', '');
    setTab('Cover Letter');

    let accumulated = '';
    const result = await generateCoverLetter(
      settings.claudeApiKey,
      form.title,
      form.company,
      form.jobDescription,
      baseCV,
      (chunk) => {
        accumulated += chunk;
        setForm((f) => ({ ...f, coverLetter: accumulated }));
        if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
      }
    );

    if (result.error) setGenError(result.error);
    setGenerating(null);
    setUnsaved(true);
  }

  async function handleGenerateCV() {
    setGenerating('cv');
    setGenError('');
    set('customCV', '');
    setTab('Tailored CV');

    let accumulated = '';
    const result = await generateCustomCV(
      settings.claudeApiKey,
      form.title,
      form.company,
      form.jobDescription,
      baseCV,
      (chunk) => {
        accumulated += chunk;
        setForm((f) => ({ ...f, customCV: accumulated }));
        if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
      }
    );

    if (result.error) setGenError(result.error);
    setGenerating(null);
    setUnsaved(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4 flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                {isNew ? 'New Application' : (form.title || 'Edit Application')}
              </h2>
              {!isNew && form.company && (
                <p className="text-sm text-gray-500">{form.company}</p>
              )}
            </div>
            {unsaved && <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">Unsaved</span>}
          </div>
          <div className="flex items-center gap-2">
            {/* Status selector */}
            <div className="relative">
              <select
                className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                value={form.status}
                onChange={(e) => set('status', e.target.value as JobStatus)}
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{COLUMN_CONFIG[s].label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-2.5 pointer-events-none text-gray-400" />
            </div>
            <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-100 px-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${tab === t
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t}
              {t === 'Cover Letter' && form.coverLetter && (
                <span className="ml-1.5 text-xs text-emerald-600">✓</span>
              )}
              {t === 'Tailored CV' && form.customCV && (
                <span className="ml-1.5 text-xs text-emerald-600">✓</span>
              )}
              {t === 'Job Description' && form.jobDescription && (
                <span className="ml-1.5 text-xs text-emerald-600">✓</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={streamRef}>

          {/* ── Details Tab ── */}
          {tab === 'Details' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group col-span-2 sm:col-span-1">
                <label className="label">Job Title *</label>
                <input className="input" placeholder="e.g. Senior Product Designer" value={form.title}
                  onChange={(e) => set('title', e.target.value)} />
              </div>
              <div className="form-group col-span-2 sm:col-span-1">
                <label className="label">Company *</label>
                <input className="input" placeholder="e.g. Acme Corp" value={form.company}
                  onChange={(e) => set('company', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Location</label>
                <input className="input" placeholder="e.g. Sydney, NSW (Remote)" value={form.location}
                  onChange={(e) => set('location', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Salary / Package</label>
                <input className="input" placeholder="e.g. $120k–$140k" value={form.salary}
                  onChange={(e) => set('salary', e.target.value)} />
              </div>

              {/* Job URL with auto-fetch */}
              <div className="form-group col-span-2">
                <label className="label">Job Ad URL</label>
                <div className="flex gap-2">
                  <input
                    className="input"
                    placeholder="https://…"
                    value={form.jobUrl}
                    onChange={(e) => set('jobUrl', e.target.value)}
                    onBlur={(e) => {
                      const url = e.target.value.trim();
                      if (url && !form.jobDescription) {
                        handleFetchFromUrl(url);
                      }
                    }}
                  />
                  {form.jobUrl && (
                    <>
                      <button
                        onClick={() => handleFetchFromUrl(form.jobUrl)}
                        disabled={fetchingUrl || extracting}
                        className="btn-secondary shrink-0"
                        title="Fetch job description from this URL"
                      >
                        {fetchingUrl || extracting
                          ? <Loader2 size={14} className="animate-spin" />
                          : <RefreshCw size={14} />}
                      </button>
                      <a href={form.jobUrl} target="_blank" rel="noopener noreferrer"
                        className="btn-secondary shrink-0">
                        <ExternalLink size={14} />
                      </a>
                    </>
                  )}
                </div>
                {fetchingUrl && (
                  <p className="text-xs text-indigo-600 mt-1.5 flex items-center gap-1">
                    <Loader2 size={11} className="animate-spin" />
                    Fetching job description from URL…
                    {extracting && ' Then extracting details with AI…'}
                  </p>
                )}
                {!fetchingUrl && extracting && (
                  <p className="text-xs text-indigo-600 mt-1.5 flex items-center gap-1">
                    <Loader2 size={11} className="animate-spin" />
                    Extracting title, company and salary with AI…
                  </p>
                )}
                {fetchError && (
                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle size={11} /> {fetchError}
                    {form.jobUrl.includes('linkedin.com') && (
                      <span> LinkedIn requires login — paste the description manually.</span>
                    )}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="label">Source</label>
                <select className="input" value={form.source}
                  onChange={(e) => set('source', e.target.value as JobApplication['source'])}>
                  <option value="linkedin">LinkedIn</option>
                  <option value="seek">Seek</option>
                  <option value="indeed">Indeed</option>
                  <option value="company">Company Website</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Priority</label>
                <select className="input" value={form.priority}
                  onChange={(e) => set('priority', e.target.value as JobApplication['priority'])}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Agency selector */}
              <div className="form-group col-span-2">
                <label className="label">Via Agency</label>
                <AgencySelect
                  agencyId={form.agencyId}
                  onChange={(agencyId, recruiter) => {
                    setForm((f) => ({ ...f, agencyId, recruiter }));
                    setUnsaved(true);
                  }}
                />
              </div>

              {/* Recruiter contact name (free text, shown when agency selected or direct) */}
              <div className="form-group col-span-2">
                <label className="label">
                  {form.agencyId ? 'Your contact at this agency' : 'Recruiter / Contact name'}
                </label>
                <input
                  className="input"
                  placeholder={form.agencyId ? 'Specific recruiter name (optional)' : 'e.g. Jane Smith at Hays'}
                  value={form.recruiter}
                  onChange={(e) => set('recruiter', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="label">Application Deadline</label>
                <input type="date" className="input" value={form.deadline}
                  onChange={(e) => set('deadline', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Date Added</label>
                <input type="date" className="input" value={form.dateAdded}
                  onChange={(e) => set('dateAdded', e.target.value)} />
              </div>
              <div className="form-group col-span-2">
                <label className="label">Contact Name</label>
                <input className="input" placeholder="Hiring Manager name" value={form.contactName}
                  onChange={(e) => set('contactName', e.target.value)} />
              </div>
              <div className="form-group col-span-2">
                <label className="label">Contact Email</label>
                <input type="email" className="input" placeholder="contact@company.com" value={form.contactEmail}
                  onChange={(e) => set('contactEmail', e.target.value)} />
              </div>

              {/* Tags */}
              <div className="form-group col-span-2">
                <label className="label">Tags</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {form.tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1">
                      {t}
                      <button onClick={() => set('tags', form.tags.filter((x) => x !== t))}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input className="input" placeholder="Add tag…" value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
                  <button onClick={addTag} className="btn-secondary shrink-0"><Plus size={14} /></button>
                </div>
              </div>
            </div>
          )}

          {/* ── Job Description Tab ── */}
          {tab === 'Job Description' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-600">
                  {form.jobUrl
                    ? 'Auto-fetched from the job URL. Edit if needed.'
                    : 'Paste the job description here, or add a URL in Details to auto-fetch.'}
                </p>
                <div className="flex gap-2 shrink-0">
                  {form.jobUrl && (
                    <button
                      onClick={() => handleFetchFromUrl(form.jobUrl)}
                      disabled={fetchingUrl || extracting}
                      className="btn-secondary btn-sm"
                      title="Re-fetch from URL"
                    >
                      {fetchingUrl ? <Loader2 size={14} className="animate-spin" /> : <Link size={14} />}
                      Re-fetch
                    </button>
                  )}
                  <button
                    onClick={handleExtract}
                    disabled={extracting || !form.jobDescription.trim()}
                    className="btn-secondary btn-sm"
                    title="Auto-fill title, company, location, salary from job description"
                  >
                    {extracting ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                    Extract details
                  </button>
                </div>
              </div>
              {fetchError && (
                <div className="flex gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{fetchError}{form.jobUrl.includes('linkedin.com') && ' LinkedIn requires login — paste the description manually instead.'}</span>
                </div>
              )}
              <textarea
                className="textarea font-mono text-xs"
                rows={22}
                placeholder="Paste the full job description here, or add a URL in the Details tab to auto-fetch…"
                value={form.jobDescription}
                onChange={(e) => set('jobDescription', e.target.value)}
              />
            </div>
          )}

          {/* ── Cover Letter Tab ── */}
          {tab === 'Cover Letter' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Write or generate a tailored cover letter.</p>
                  {!settings.claudeApiKey && (
                    <p className="text-xs text-amber-600 mt-0.5">Add your Claude API key in Settings to enable AI generation.</p>
                  )}
                  {!baseCV && (
                    <p className="text-xs text-amber-600 mt-0.5">Add your base CV in CV Manager to enable AI generation.</p>
                  )}
                </div>
                <button
                  onClick={handleGenerateCover}
                  disabled={generating !== null || !settings.claudeApiKey || !baseCV}
                  className="btn-primary btn-sm shrink-0"
                >
                  {generating === 'cover'
                    ? <><Loader2 size={14} className="animate-spin" /> Generating…</>
                    : <><Wand2 size={14} /> Generate with AI</>}
                </button>
              </div>
              {genError && tab === 'Cover Letter' && (
                <div className="flex gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  {genError}
                </div>
              )}
              <div className="relative">
                <textarea
                  className="textarea"
                  rows={20}
                  placeholder="Your cover letter will appear here…"
                  value={form.coverLetter}
                  onChange={(e) => set('coverLetter', e.target.value)}
                />
                {form.coverLetter && (
                  <div className="absolute top-2 right-2">
                    <CopyButton text={form.coverLetter} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tailored CV Tab ── */}
          {tab === 'Tailored CV' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Generate a tailored version of your CV for this role.</p>
                  {!settings.claudeApiKey && (
                    <p className="text-xs text-amber-600 mt-0.5">Add your Claude API key in Settings to enable AI generation.</p>
                  )}
                </div>
                <button
                  onClick={handleGenerateCV}
                  disabled={generating !== null || !settings.claudeApiKey || !baseCV}
                  className="btn-primary btn-sm shrink-0"
                >
                  {generating === 'cv'
                    ? <><Loader2 size={14} className="animate-spin" /> Generating…</>
                    : <><Wand2 size={14} /> Generate with AI</>}
                </button>
              </div>
              {genError && tab === 'Tailored CV' && (
                <div className="flex gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  {genError}
                </div>
              )}
              <div className="relative">
                <textarea
                  className="textarea font-mono text-xs"
                  rows={24}
                  placeholder="Your tailored CV will appear here in Markdown format…"
                  value={form.customCV}
                  onChange={(e) => set('customCV', e.target.value)}
                />
                {form.customCV && (
                  <div className="absolute top-2 right-2">
                    <CopyButton text={form.customCV} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Notes & Interviews Tab ── */}
          {tab === 'Notes & Interviews' && (
            <div className="space-y-5">
              <div className="form-group">
                <label className="label">Notes</label>
                <textarea
                  className="textarea"
                  rows={8}
                  placeholder="Research notes, impressions, things to mention, salary negotiation notes…"
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="label">Interview Dates</label>
                <div className="space-y-2 mb-3">
                  {form.interviewDates.map((d, i) => (
                    <div key={i} className="flex items-center justify-between bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
                      <span className="text-sm text-sky-800">{d}</span>
                      <button
                        onClick={() => set('interviewDates', form.interviewDates.filter((_, j) => j !== i))}
                        className="text-sky-500 hover:text-red-500"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="input"
                    type="datetime-local"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                  />
                  <button onClick={addInterviewDate} className="btn-secondary shrink-0">
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            {!isNew && (
              <button
                onClick={handleDelete}
                className="btn-danger btn-sm"
                title="Delete this application"
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {/* Quick AI actions */}
            {tab !== 'Cover Letter' && tab !== 'Tailored CV' && (
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateCover}
                  disabled={generating !== null || !settings.claudeApiKey || !baseCV}
                  className="btn-secondary btn-sm"
                  title={!settings.claudeApiKey ? 'Add API key in Settings' : !baseCV ? 'Add base CV first' : 'Generate cover letter'}
                >
                  {generating === 'cover' ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                  Cover Letter
                </button>
                <button
                  onClick={handleGenerateCV}
                  disabled={generating !== null || !settings.claudeApiKey || !baseCV}
                  className="btn-secondary btn-sm"
                  title={!settings.claudeApiKey ? 'Add API key in Settings' : !baseCV ? 'Add base CV first' : 'Generate tailored CV'}
                >
                  {generating === 'cv' ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                  Tailor CV
                </button>
              </div>
            )}
            <button onClick={save} className="btn-primary">
              {isNew ? 'Add Application' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
