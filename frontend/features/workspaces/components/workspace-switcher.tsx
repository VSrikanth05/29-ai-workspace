'use client';

import { Check, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCreateWorkspace, useDeleteWorkspace, useWorkspaces } from '@/features/sources/hooks/use-sources';
import { useWorkspaceStore } from '@/stores/workspace-store';

export function WorkspaceSwitcher() {
  const workspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const setWorkspaceId = useWorkspaceStore((state) => state.setActiveWorkspaceId);
  const workspaces = useWorkspaces();
  const create = useCreateWorkspace();
  const remove = useDeleteWorkspace();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!workspaceId && workspaces.data?.[0]) {
      setWorkspaceId(workspaces.data[0].id);
    }
  }, [setWorkspaceId, workspaceId, workspaces.data]);

  const submit = async () => {
    const value = name.trim();
    if (!value || create.isPending) return;
    const workspace = await create.mutateAsync(value);
    setWorkspaceId(workspace.id);
    setName('');
    setCreating(false);
  };
  const deleteActiveWorkspace = async () => {
    if (!workspaceId || remove.isPending || !window.confirm('Delete this workspace and all of its sources and conversations?')) return;
    await remove.mutateAsync(workspaceId);
    setWorkspaceId('');
  };

  if (creating) {
    return (
      <form
        className="flex items-center gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className="sr-only" htmlFor="new-workspace-name">Workspace name</label>
        <input
          id="new-workspace-name"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Workspace name"
          className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="submit" size="icon" disabled={!name.trim() || create.isPending} aria-label="Create workspace">
          <Check className="size-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <label className="sr-only" htmlFor="workspace-switcher">Active workspace</label>
      <select
        id="workspace-switcher"
        value={workspaceId ?? ''}
        onChange={(event) => setWorkspaceId(event.target.value)}
        disabled={workspaces.isLoading || !workspaces.data?.length}
        className="min-w-0 flex-1 truncate rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium outline-none focus:ring-2 focus:ring-ring"
      >
        {workspaces.data?.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
      </select>
      <Button type="button" variant="ghost" size="icon" onClick={() => setCreating(true)} aria-label="Create workspace" title="Create workspace">
        <Plus className="size-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={() => void deleteActiveWorkspace()} disabled={!workspaceId || remove.isPending} aria-label="Delete workspace" title="Delete workspace">
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
