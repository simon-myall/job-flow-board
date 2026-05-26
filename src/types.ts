export type JobStatus =
  | 'shortlist'
  | 'applied'
  | 'responded'
  | 'interview'
  | 'offer'
  | 'rejected';

export type AgencyStatus = 'active' | 'dormant' | 'not_contacted';

export type Agency = {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  notes: string;
  dateAdded: string;
  status: AgencyStatus;
};

export type JobApplication = {
  id: string;
  status: JobStatus;
  title: string;
  company: string;
  location: string;
  salary: string;
  jobUrl: string;
  source: 'linkedin' | 'seek' | 'indeed' | 'company' | 'other';
  recruiter: string;       // display name, kept for backward compat
  agencyId: string;        // '' = direct application
  jobDescription: string;
  contactName: string;
  contactEmail: string;
  deadline: string;
  dateAdded: string;
  rejectedAt: string;      // ISO date when moved to rejected, '' otherwise
  notes: string;
  coverLetter: string;
  customCV: string;
  interviewDates: string[];
  tags: string[];
  priority: 'low' | 'medium' | 'high';
};

export type AppSettings = {
  claudeApiKey: string;
  defaultCVModel: string;
  rejectedHideDays: number;  // 0 = never hide
};

export const COLUMN_CONFIG: Record<JobStatus, { label: string; color: string; bg: string; border: string }> = {
  shortlist: { label: 'Shortlist', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-300' },
  applied:   { label: 'Applied',   color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300' },
  responded: { label: 'Responded', color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-300' },
  interview: { label: 'Interview', color: 'text-sky-700',    bg: 'bg-sky-50',    border: 'border-sky-300' },
  offer:     { label: 'Offer',     color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300' },
  rejected:  { label: 'Rejected',  color: 'text-rose-700',   bg: 'bg-rose-50',   border: 'border-rose-300' },
};

export const ALL_STATUSES: JobStatus[] = ['shortlist', 'applied', 'responded', 'interview', 'offer', 'rejected'];

export const AGENCY_STATUS_CONFIG: Record<AgencyStatus, { label: string; color: string; dot: string }> = {
  active:        { label: 'Active',         color: 'text-emerald-700', dot: 'bg-emerald-500' },
  dormant:       { label: 'Dormant',        color: 'text-amber-700',   dot: 'bg-amber-400' },
  not_contacted: { label: 'Not contacted',  color: 'text-gray-500',    dot: 'bg-gray-400' },
};

export const PRIORITY_COLORS = {
  low:    'bg-gray-100 text-gray-600',
  medium: 'bg-amber-100 text-amber-700',
  high:   'bg-red-100 text-red-700',
};
