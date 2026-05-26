import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useStore } from '../store';
import type { JobApplication, JobStatus } from '../types';
import { ALL_STATUSES, COLUMN_CONFIG } from '../types';
import { JobCard } from './JobCard';
import { Plus } from 'lucide-react';

type Props = {
  onEditJob: (job: JobApplication) => void;
  onNewJob: (status: JobStatus) => void;
  search?: string;
  directOnly?: boolean;  // show only direct (no-agency) applications
};

export function KanbanBoard({ onEditJob, onNewJob, search = '', directOnly = false }: Props) {
  const { jobs, settings, reorderJob } = useStore();

  const q = search.toLowerCase().trim();
  const hideDays = settings.rejectedHideDays;
  const today = Date.now();

  function isAutoHidden(job: JobApplication) {
    if (job.status !== 'rejected' || !hideDays || !job.rejectedAt) return false;
    return (today - new Date(job.rejectedAt).getTime()) / 86400000 > hideDays;
  }

  function onDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    reorderJob(
      source.droppableId as JobStatus,
      source.index,
      destination.droppableId as JobStatus,
      destination.index
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-80px)]">
        {ALL_STATUSES.map((status) => {
          const col = COLUMN_CONFIG[status];
          const colJobs = jobs
            .filter((j) => j.status === status)
            .filter((j) => !directOnly || !j.agencyId)
            .filter((j) => !isAutoHidden(j))
            .filter((j) =>
              !q ||
              j.title.toLowerCase().includes(q) ||
              j.company.toLowerCase().includes(q) ||
              j.recruiter.toLowerCase().includes(q) ||
              j.tags.some((t) => t.toLowerCase().includes(q))
            );

          return (
            <div key={status} className="flex flex-col w-72 shrink-0">
              {/* Column header */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl border-2 ${col.border} ${col.bg}`}>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold text-sm ${col.color}`}>{col.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${col.color} ${col.bg} border ${col.border}`}>
                    {colJobs.length}
                  </span>
                </div>
                <button
                  onClick={() => onNewJob(status)}
                  className={`btn-ghost btn-sm ${col.color} hover:${col.bg} p-1`}
                  title={`Add to ${col.label}`}
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Droppable column body */}
              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 p-2 rounded-b-xl border-2 border-t-0 min-h-[200px] transition-colors
                      ${snapshot.isDraggingOver ? `${col.bg} ${col.border}` : 'bg-gray-100/60 border-gray-200'}`}
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
                        onClick={() => onNewJob(status)}
                        className="w-full mt-1 py-4 text-xs text-gray-400 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:text-gray-500 transition-colors"
                      >
                        + Add application
                      </button>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
