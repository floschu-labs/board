import { Fragment } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { PlusIcon, PencilIcon, TrashIcon, Bars2Icon } from '@heroicons/react/16/solid';
import { useBoardStore } from '../store';
import type { Project } from '../types';

interface BoardSwitcherDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProject: () => void;
  onRenameProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
}

// A single reorderable board row
function SortableBoardRow({
  project,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: {
  project: Project;
  isActive: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 rounded-lg transition-colors ${
        isActive ? 'bg-bg-tertiary' : ''
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${project.name}`}
        className="shrink-0 p-2 text-text-muted hover:text-text-primary cursor-grab active:cursor-grabbing touch-none"
      >
        <Bars2Icon className="w-4 h-4" />
      </button>
      <button
        onClick={onSelect}
        className={`flex-1 min-w-0 text-left px-1 py-2.5 truncate text-sm ${
          isActive
            ? 'text-text-primary font-medium'
            : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        {project.name}
      </button>
      <button
        onClick={onRename}
        aria-label={`Rename ${project.name}`}
        className="shrink-0 p-2 text-text-muted hover:text-text-primary transition-colors"
      >
        <PencilIcon className="w-4 h-4" />
      </button>
      <button
        onClick={onDelete}
        aria-label={`Delete ${project.name}`}
        className="shrink-0 p-2 text-text-muted hover:text-red-400 transition-colors"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </li>
  );
}

export function BoardSwitcherDialog({
  isOpen,
  onClose,
  onAddProject,
  onRenameProject,
  onDeleteProject,
}: BoardSwitcherDialogProps) {
  const projects = useBoardStore((s) => s.projects);
  const activeProjectId = useBoardStore((s) => s.activeProjectId);
  const setActiveProject = useBoardStore((s) => s.setActiveProject);
  const moveProject = useBoardStore((s) => s.moveProject);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = projects.findIndex((p) => p.id === active.id);
      const newIndex = projects.findIndex((p) => p.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        moveProject(active.id as string, newIndex);
      }
    }
  };

  const handleSelect = (projectId: string) => {
    setActiveProject(projectId);
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-6">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-xs transform overflow-hidden rounded-2xl bg-bg-secondary border border-border p-6 shadow-2xl transition-all focus:outline-none">
                <DialogTitle as="h3" className="text-lg font-semibold text-text-primary mb-4">
                  Boards
                </DialogTitle>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={projects.map((p) => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="flex flex-col gap-0.5 -mx-1">
                      {projects.map((project) => (
                        <SortableBoardRow
                          key={project.id}
                          project={project}
                          isActive={project.id === activeProjectId}
                          onSelect={() => handleSelect(project.id)}
                          onRename={() => onRenameProject(project.id)}
                          onDelete={() => onDeleteProject(project.id)}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>

                <button
                  onClick={onAddProject}
                  className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                >
                  <PlusIcon className="w-4 h-4 shrink-0" />
                  Add board
                </button>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
