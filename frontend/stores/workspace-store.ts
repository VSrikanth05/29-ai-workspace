import { create } from 'zustand';

export type WorkspacePanel = 'sources' | 'conversation' | 'studio';

type WorkspaceState = {
  activePanel: WorkspacePanel;
  studioCollapsed: boolean;
  selectedToolId: string | null;
  activeWorkspaceId: string | null;
  selectedSourceIds: string[];
  setActivePanel: (panel: WorkspacePanel) => void;
  setStudioCollapsed: (collapsed: boolean) => void;
  resetSession: () => void;
  selectTool: (toolId: string) => void;
  setActiveWorkspaceId: (workspaceId: string) => void;
  toggleSource: (sourceId: string) => void;
  clearSelectedSources: () => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activePanel: 'conversation',
  studioCollapsed: false,
  selectedToolId: null,
  activeWorkspaceId: null,
  selectedSourceIds: [],
  setActivePanel: (activePanel) => set({ activePanel }),
  setStudioCollapsed: (studioCollapsed) => set({ studioCollapsed }),
  resetSession: () => set({ activeWorkspaceId: null, selectedSourceIds: [], selectedToolId: null, activePanel: 'conversation' }),
  selectTool: (selectedToolId) => set({ selectedToolId }),
  setActiveWorkspaceId: (activeWorkspaceId) => set({ activeWorkspaceId, selectedSourceIds: [] }),
  toggleSource: (sourceId) => set((state) => ({ selectedSourceIds: state.selectedSourceIds.includes(sourceId) ? state.selectedSourceIds.filter((id) => id !== sourceId) : [...state.selectedSourceIds, sourceId] })),
  clearSelectedSources: () => set({ selectedSourceIds: [] }),
}));
