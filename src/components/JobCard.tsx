import { Draggable } from '@hello-pangea/dnd';
import type { JobApplication } from '../types';
import { PRIORITY_COLORS } from '../types';
import {
  Building2, MapPin, DollarSign, ExternalLink, Calendar,
  AlertCircle, Star,
} from 'lucide-react';

type Props = {
  job: JobApplication;
  index: number;
  onEdit: (job: JobApplication) => void;
};

const SOURCE_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn', seek: 'Seek', indeed: 'Indeed', company: 'Company', other: 'Direct',
};

export function JobCard({ job, index, onEdit }: Props) {
  const hasDeadline = !!job.deadline;
  const deadlineSoon = hasDeadline && new Date(job.deadline) <= new Date(Date.now() + 3 * 86400000);

  return (
    <Draggable draggableId={job.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onEdit(job)}
          className={`card p-3 mb-2 select-none transition-shadow cursor-pointer
            ${snapshot.isDragging ? 'shadow-lg rotate-1 scale-105' : 'hover:shadow-md hover:ring-2 hover:ring-indigo-200'}`}
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-gray-900 truncate leading-tight">{job.title || 'Untitled Role'}</h3>
              {job.company && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Building2 size={11} className="text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-600 truncate">{job.company}</span>
                </div>
              )}
            </div>
            <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLORS[job.priority]}`}>
              {job.priority}
            </span>
          </div>

          {/* Meta tags */}
          <div className="flex flex-wrap gap-1 mb-2">
            {job.location && (
              <span className="inline-flex items-center gap-0.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                <MapPin size={10} /> {job.location}
              </span>
            )}
            {job.salary && (
              <span className="inline-flex items-center gap-0.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                <DollarSign size={10} /> {job.salary}
              </span>
            )}
            {job.source !== 'other' && (
              <span className="inline-flex items-center gap-0.5 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded px-1.5 py-0.5">
                {SOURCE_LABELS[job.source]}
              </span>
            )}
            {job.recruiter && (
              <span className="inline-flex items-center gap-0.5 text-xs bg-violet-50 text-violet-600 border border-violet-200 rounded px-1.5 py-0.5 max-w-[120px] truncate">
                {job.recruiter}
              </span>
            )}
          </div>

          {/* Deadline */}
          {hasDeadline && (
            <div className={`flex items-center gap-1 text-xs mb-2 ${deadlineSoon ? 'text-red-600' : 'text-gray-500'}`}>
              {deadlineSoon && <AlertCircle size={11} />}
              <Calendar size={11} />
              <span>Deadline: {job.deadline}</span>
            </div>
          )}

          {/* Interview dates */}
          {job.interviewDates.length > 0 && (
            <div className="text-xs text-sky-600 bg-sky-50 rounded px-2 py-1 mb-2">
              <Star size={10} className="inline mr-1" />
              Interview: {job.interviewDates[0]}
              {job.interviewDates.length > 1 && ` +${job.interviewDates.length - 1}`}
            </div>
          )}

          {/* Indicators */}
          <div className="flex gap-1.5 mb-2">
            {job.coverLetter && (
              <span title="Has cover letter" className="text-xs bg-purple-50 text-purple-600 border border-purple-200 rounded px-1.5 py-0.5">CL ✓</span>
            )}
            {job.customCV && (
              <span title="Has tailored CV" className="text-xs bg-teal-50 text-teal-600 border border-teal-200 rounded px-1.5 py-0.5">CV ✓</span>
            )}
          </div>

          {/* Tags */}
          {job.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {job.tags.slice(0, 3).map((t) => (
                <span key={t} className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{t}</span>
              ))}
              {job.tags.length > 3 && <span className="text-xs text-gray-400">+{job.tags.length - 3}</span>}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-1">
            <span className="text-xs text-gray-400">{job.dateAdded}</span>
            {job.jobUrl && (
              <a
                href={job.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="btn-ghost btn-sm p-1 text-gray-400 hover:text-indigo-600"
                title="Open job posting"
              >
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
