import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BoardSwitcherDialog } from './BoardSwitcherDialog';
import { useBoardStore } from '../store';
import type { Project } from '../types';

const now = new Date().toISOString();
const projectA: Project = { id: 'p-1', name: 'Alpha', createdAt: now, updatedAt: now };
const projectB: Project = { id: 'p-2', name: 'Beta', createdAt: now, updatedAt: now };

describe('BoardSwitcherDialog', () => {
  beforeEach(() => {
    useBoardStore.setState({
      projects: [projectA, projectB],
      lists: [],
      cards: [],
      activeProjectId: 'p-1',
      isInitialized: true,
    });
  });

  const renderDialog = (overrides: Partial<React.ComponentProps<typeof BoardSwitcherDialog>> = {}) =>
    render(
      <BoardSwitcherDialog
        isOpen
        onClose={vi.fn()}
        onAddProject={vi.fn()}
        onRenameProject={vi.fn()}
        onDeleteProject={vi.fn()}
        {...overrides}
      />
    );

  it('renders all boards in a vertical list', () => {
    renderDialog();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('selecting a board sets it active and closes the dialog', () => {
    const onClose = vi.fn();
    renderDialog({ onClose });

    fireEvent.click(screen.getByText('Beta'));

    expect(useBoardStore.getState().activeProjectId).toBe('p-2');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('fires onAddProject when "Add board" is clicked', () => {
    const onAddProject = vi.fn();
    renderDialog({ onAddProject });

    fireEvent.click(screen.getByText('Add board'));

    expect(onAddProject).toHaveBeenCalledOnce();
  });

  it('fires rename and delete callbacks with the project id', () => {
    const onRenameProject = vi.fn();
    const onDeleteProject = vi.fn();
    renderDialog({ onRenameProject, onDeleteProject });

    fireEvent.click(screen.getByLabelText('Rename Beta'));
    expect(onRenameProject).toHaveBeenCalledWith('p-2');

    fireEvent.click(screen.getByLabelText('Delete Alpha'));
    expect(onDeleteProject).toHaveBeenCalledWith('p-1');
  });
});
