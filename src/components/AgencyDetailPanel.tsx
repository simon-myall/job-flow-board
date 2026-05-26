import { useState, useEffect } from 'react';
import { useStore } from '../store';
import type { Agency, AgencyStatus } from '../types';
import { AGENCY_STATUS_CONFIG } from '../types';
import { X, Save, Trash2, Building2, Plus, ExternalLink } from 'lucide-react';

type Props = {
  agency: Agency | null;   // null = create new
  onClose: () => void;
};

const EMPTY: Omit<Agency, 'id'> = {
  name: '', contactName: '', contactEmail: '', contactPhone: '',
  website: '', notes: '', status: 'not_contacted',
  dateAdded: new Date().toISOString().slice(0, 10),
};

export function AgencyDetailPanel({ agency, onClose }: Props) {
  const { addAgency, updateAgency, deleteAgency, jobs } = useStore();
  const isNew = !agency;

  const [form, setForm] = useState<Omit<Agency, 'id'>>({ ...EMPTY, ...agency });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({ ...EMPTY, ...agency });
    setSaved(false);
  }, [agency]);

  const linkedCount = agency ? jobs.filter((j) => j.agencyId === agency.id).length : 0;

  function field<K extends keyof Omit<Agency, 'id'>>(key: K, value: Omit<Agency, 'id'>[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    if (!form.name.trim()) return;
    if (isNew) {
      addAgency(form);
      onClose();
    } else {
      updateAgency(agency.id, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  function handleDelete() {
    if (!agency) return;
    if (window.confirm(
      `Delete "${agency.name}"? This will unlink ${linkedCount} job${linkedCount !== 1 ? 's' : ''} from this agency. This cannot be undone.`
    )) {
      deleteAgency(agency.id);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="w-96 bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-indigo-600" />
            <h2 className="font-semibold text-gray-900 text-base">
              {isNew ? 'New Agency' : (agency.name || 'Agency')}
            </h2>
            {!isNew && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                ${form.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                  form.status === 'dormant' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-500'}`}>
                {AGENCY_STATUS_CONFIG[form.status].label}
              </span>
            )}
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Status */}
          <div className="form-group">
            <label className="label">Status</label>
            <select className="input" value={form.status}
              onChange={(e) => field('status', e.target.value as AgencyStatus)}>
              {(Object.entries(AGENCY_STATUS_CONFIG) as [AgencyStatus, { label: string }][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div className="form-group">
            <label className="label">Agency Name *</label>
            <input className="input" placeholder="e.g. Hays Recruitment"
              value={form.name} onChange={(e) => field('name', e.target.value)} autoFocus={isNew} />
          </div>

          {/* Contact */}
          <div className="form-group">
            <label className="label">Contact Name</label>
            <input className="input" placeholder="Your recruiter's name"
              value={form.contactName} onChange={(e) => field('contactName', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="label">Contact Email</label>
            <input type="email" className="input" placeholder="recruiter@agency.com"
              value={form.contactEmail} onChange={(e) => field('contactEmail', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="label">Contact Phone</label>
            <input className="input" placeholder="+61 2 xxxx xxxx"
              value={form.contactPhone} onChange={(e) => field('contactPhone', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="label">Website</label>
            <div className="flex gap-2">
              <input className="input" placeholder="https://…"
                value={form.website} onChange={(e) => field('website', e.target.value)} />
              {form.website && (
                <a href={form.website} target="_blank" rel="noopener noreferrer"
                  className="btn-secondary shrink-0"><ExternalLink size={14} /></a>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="label">Date Added</label>
            <input type="date" className="input" value={form.dateAdded}
              onChange={(e) => field('dateAdded', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="label">Notes</label>
            <textarea className="textarea" rows={5}
              placeholder="Specialisations, industry focus, notes on relationship…"
              value={form.notes} onChange={(e) => field('notes', e.target.value)} />
          </div>

          {/* Linked jobs summary */}
          {!isNew && (
            <div className="text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-3">
              {linkedCount} linked job application{linkedCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 bg-gray-50/50 shrink-0">
          <div>
            {!isNew && (
              <button onClick={handleDelete} className="btn-danger btn-sm">
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={!form.name.trim()} className="btn-primary">
              {saved
                ? '✓ Saved'
                : isNew
                  ? <><Plus size={14} /> Create</>
                  : <><Save size={14} /> Save</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
