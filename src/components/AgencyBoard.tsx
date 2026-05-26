import { useState } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useStore } from '../store';
import type { Agency, JobApplication, JobStatus } from '../types';
import { AgencyLane } from './AgencyLane';
import { AgencyDetailPanel } from './AgencyDetailPanel';
import { Building2, Plus } from 'lucide-react';

type Props = {
  onEditJob: (job: JobApplication) => void;
  onNewJob: (status: JobStatus, agencyId?: string) => void;
  search?: string;
  showDirect?: boolean;  // show a lane for direct (no-agency) applications
};

const DIRECT_AGENCY: Agency = {
  id: 'direct', name: 'Direct Applications', status: 'active',
  contactName: '', contactEmail: '', contactPhone: '',
  website: '', notes: '', dateAdded: '',
};

export function AgencyBoard({ onEditJob, onNewJob, search = '', showDirect = true }: Props) {
  const { agencies, jobs, settings, updateJob } = useStore();

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [panelAgency, setPanelAgency] = useState<Agency | null>(null);
  const [showNewPanel, setShowNewPanel] = useState(false);

  const today = Date.now();
  const hideDays = settings.rejectedHideDays;

  function isHidden(job: JobApplication) {
    if (job.status !== 'rejected' || !hideDays || !job.rejectedAt) return false;
    return (today - new Date(job.rejectedAt).getTime()) / 86400000 > hideDays;
  }

  function toggleCollapse(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function onDragEnd(result: DropResult) {
    const { draggableId: jobId, source, destination } = result;
    if (!destination) return;

    const [srcAgencyId, srcStatus] = source.droppableId.split('|') as [string, JobStatus];
    const [dstAgencyId, dstStatus] = destination.droppableId.split('|') as [string, JobStatus];

    if (srcAgencyId === dstAgencyId && srcStatus === dstStatus && source.index === destination.index) return;

    const newAgencyId = dstAgencyId === 'direct' ? '' : dstAgencyId;
    const newStatus = dstStatus;

    const targetAgency = agencies.find((a) => a.id === newAgencyId);
    const updates: Partial<JobApplication> = { status: newStatus, agencyId: newAgencyId };
    if (targetAgency) updates.recruiter = targetAgency.name;
    else if (!newAgencyId) updates.recruiter = '';

    updateJob(jobId, updates);
  }

  function jobsForAgency(agencyId: string) {
    return jobs
      .filter((j) => j.agencyId === agencyId)
      .filter((j) => !isHidden(j));
  }

  const directJobs = jobs.filter((j) => !j.agencyId).filter((j) => !isHidden(j));

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4">
        <DragDropContext onDragEnd={onDragEnd}>

          {/* Agency lanes */}
          {agencies.map((agency) => (
            <AgencyLane
              key={agency.id}
              agency={agency}
              jobs={jobsForAgency(agency.id)}
              collapsed={collapsedIds.has(agency.id)}
              onToggleCollapse={() => toggleCollapse(agency.id)}
              onSelectAgency={setPanelAgency}
              onEditJob={onEditJob}
              onNewJob={(agencyId, status) => onNewJob(status, agencyId)}
              search={search}
            />
          ))}

          {/* Direct applications lane */}
          {showDirect && (
            <AgencyLane
              key="direct"
              agency={DIRECT_AGENCY}
              jobs={directJobs}
              collapsed={collapsedIds.has('direct')}
              onToggleCollapse={() => toggleCollapse('direct')}
              onSelectAgency={() => {}}
              onEditJob={onEditJob}
              onNewJob={(_, status) => onNewJob(status)}
              search={search}
            />
          )}

        </DragDropContext>

        {/* Empty state */}
        {agencies.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <Building2 size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-medium text-gray-500 mb-1">No agencies yet</p>
            <p className="text-xs text-gray-400 mb-4">
              Add recruitment agencies to track jobs they've introduced you to.
            </p>
            <button onClick={() => setShowNewPanel(true)} className="btn-primary">
              <Plus size={15} /> Add your first agency
            </button>
          </div>
        )}

        {/* Add agency button */}
        {agencies.length > 0 && (
          <button onClick={() => setShowNewPanel(true)} className="btn-secondary mt-1">
            <Plus size={15} /> Add Agency
          </button>
        )}
      </div>

      {/* Agency detail / edit panel */}
      {(panelAgency || showNewPanel) && (
        <AgencyDetailPanel
          agency={panelAgency}
          onClose={() => { setPanelAgency(null); setShowNewPanel(false); }}
        />
      )}
    </div>
  );
}
