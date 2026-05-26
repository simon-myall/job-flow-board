import { Droppable } from '@hello-pangea/dnd';
import type { Agency, JobApplication, JobStatus } from '../types';
import { ALL_STATUSES, COLUMN_CONFIG, AGENCY_STATUS_CONFIG } from '../types';
import { JobCard } from './JobCard';
import { ChevronRight, ChevronDown, Plus } from 'lucide-react';

type Props = {
  agency: Agency;
  jobs: JobApplication[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectAgency: (agency: Agency) => void;
  onEditJob: (job: JobApplication) => void;
  onNewJob: (agencyId: string, status: JobStatus) => void;
  search?: string;
};

export function AgencyLane({
  agency, jobs, collapsed, onToggleCollapse, onSelectAgency,
  onEditJob, onNewJob, search = '',
}: Props) {
  const q = search.toLowerCase().trim();

  function jobsForStatus(status: JobStatus) {
    return jobs
      .filter((j) => j.status === status)
      .filter((j) =>
        !q ||
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.recruiter.toLowerCase().includes(q) ||
        j.tags.some((t) => t.toLowerCase().includes(q))
      );
  }

  const isDirect = agency.id === 'direct';
  const statusCfg = isDirect ? null : AGENCY_STATUS_CONFIG[agency.status];

  return (
    <div className="mb-3 rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
      {/* Lane header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 bg-white hover:bg-gray-50 cursor-pointer transition-colors select-none"
        onClick={onToggleCollapse}
      >
        {/* Collapse toggle */}
        <span className="text-gray-400 shrink-0">
          {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
        </span>

        {/* Agency name — click opens detail panel */}
        {!isDirect ? (
          <button
            className="font-semibold text-sm text-gray-900 hover:text-indigo-700 transition-colors text-left truncate max-w-[200px]"
            onClick={(e) => { e.stopPropagation(); onSelectAgency(agency); }}
            title={`Edit ${agency.name}`}
          >
            {agency.name}
          </button>
        ) : (
          <span className="font-semibold text-sm text-gray-600 truncate max-w-[200px]">
            Direct Applications
          </span>
        )}

        {/* Status dot */}
        {statusCfg && (
          <span className={`w-2 h-2 rounded-full shrink-0 ${statusCfg.dot}`} title={statusCfg.label} />
        )}

        {/* Per-status pill counts */}
        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          {ALL_STATUSES.map((status) => {
            const count = jobsForStatus(status).length;
            if (!count) return null;
            const col = COLUMN_CONFIG[status];
            return (
              <span key={status}
                className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${col.color} ${col.bg} border ${col.border}`}>
                {col.label.slice(0, 3)}: {count}
              </span>
            );
          })}
          <span className="text-xs text-gray-400 ml-1 shrink-0">
            {jobs.length} total
          </span>
        </div>
      </div>

      {/* Lane body */}
      {!collapsed && (
        <div className="flex border-t border-gray-200 overflow-x-auto">
          {ALL_STATUSES.map((status) => {
            const col = COLUMN_CONFIG[status];
            const colJobs = jobsForStatus(status);
            const droppableId = `${agency.id}|${status}`;

            return (
              <div key={status} className="flex flex-col min-w-[180px] flex-1 border-r border-gray-100 last:border-r-0">
                {/* Column label */}
                <div className={`px-2 py-1.5 text-center border-b border-gray-100 ${col.bg}`}>
                  <span className={`text-xs font-semibold ${col.color}`}>{col.label}</span>
                  {colJobs.length > 0 && (
                    <span className={`ml-1 text-xs font-medium ${col.color} opacity-70`}>
                      ({colJobs.length})
                    </span>
                  )}
                </div>

                <Droppable droppableId={droppableId}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-1.5 min-h-[100px] transition-colors
                        ${snapshot.isDraggingOver ? `${col.bg} ${col.border}` : 'bg-gray-50/20'}`}
                    >
                      {colJobs.map((job, idx) => (
                        <JobCard
                          key={job.id}
                          job={job}
                          index={idx}
                          onEdit={onEditJob}
                        />
                      ))}
                      {provided.placeholder}
                      {colJobs.length === 0 && !snapshot.isDraggingOver && (
                        <button
                          onClick={() => onNewJob(agency.id, status)}
                          className="w-full mt-1 py-3 text-xs text-gray-300 border border-dashed border-gray-200 rounded hover:border-gray-300 hover:text-gray-400 transition-colors"
                        >
                          <Plus size={12} className="inline" />
                        </button>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
