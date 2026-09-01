"use client";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  FilePlus2,
  FileText,
  LoaderCircle,
  RefreshCw,
  Search,
  Share2,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { uploadSource } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store";
import {
  useHasSession,
  useSourceActions,
  useSources,
  useWorkspaces,
} from "../hooks/use-sources";
import type { Source, UploadItem } from "../source-types";
import {
  useFavoriteToggle,
  useFavorites,
} from "@/features/knowledge/hooks/use-knowledge";
import { useCollections } from "@/features/knowledge/hooks/use-knowledge";
import { ShareDialog } from "@/features/knowledge/components/share-dialog";

const ACCEPTED_SOURCES = ".pdf,.docx,.pptx,.xlsx,.csv,.md,.markdown,.txt";
const MAX_BYTES = 20 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusIcon({ status }: { status: Source["status"] }) {
  if (status === "FAILED")
    return (
      <AlertCircle aria-label="Failed" className="size-3.5 text-red-500" />
    );
  if (status === "PROCESSED")
    return (
      <CheckCircle2 aria-label="Ready" className="size-3.5 text-emerald-500" />
    );
  return (
    <LoaderCircle
      aria-label="Processing"
      className="size-3.5 animate-spin text-primary"
    />
  );
}

export function SourcesPanel() {
  const inputId = useId();
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [search, setSearch] = useState("");
  const [dragging, setDragging] = useState(false);
  const [sharingSourceId, setSharingSourceId] = useState<string | null>(null);
  const cancelers = useRef(new Map<string, () => void>());
  const activeWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspaceId,
  );
  const setActiveWorkspaceId = useWorkspaceStore(
    (state) => state.setActiveWorkspaceId,
  );
  const selectedSourceIds = useWorkspaceStore(
    (state) => state.selectedSourceIds,
  );
  const toggleSource = useWorkspaceStore((state) => state.toggleSource);
  const hasSession = useHasSession();
  const workspaces = useWorkspaces();
  const sources = useSources(activeWorkspaceId, search);
  const actions = useSourceActions(activeWorkspaceId);
  const favorites = useFavorites(activeWorkspaceId);
  const collections = useCollections(activeWorkspaceId);
  const favorite = useFavoriteToggle(activeWorkspaceId);
  const favoriteMap = new Map(
    (favorites.data ?? [])
      .filter((item) => item.source)
      .map((item) => [item.source!.id, item.id]),
  );

  useEffect(() => {
    if (!activeWorkspaceId && workspaces.data?.[0])
      setActiveWorkspaceId(workspaces.data[0].id);
  }, [activeWorkspaceId, setActiveWorkspaceId, workspaces.data]);

  useEffect(() => {
    const open = () => document.getElementById(inputId)?.click();
    window.addEventListener("29ai:upload", open);
    return () => window.removeEventListener("29ai:upload", open);
  }, [inputId]);

  const uploadSingleFile = async (item: UploadItem, workspaceId: string) => {
    setUploads((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, state: "uploading" } : entry,
      ),
    );
    const task = uploadSource(workspaceId, item.file, (progress) =>
      setUploads((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, progress } : entry,
        ),
      ),
    );
    cancelers.current.set(item.id, task.cancel);
    try {
      await task.promise;
      setUploads((current) =>
        current.filter((entry) => entry.id !== item.id),
      );
      await actions.invalidate();
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "AbortError"
          ? "Upload cancelled"
          : error instanceof Error
            ? error.message
            : "Upload failed";
      setUploads((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, state: "failed", error: message }
            : entry,
        ),
      );
    } finally {
      cancelers.current.delete(item.id);
    }
  };

  const queueFiles = (files: FileList | File[]) => {
    const accepted = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      progress: 0,
      state: file.size > MAX_BYTES ? ("failed" as const) : ("queued" as const),
      ...(file.size > MAX_BYTES
        ? { error: "File exceeds the 20 MB limit" }
        : {}),
    }));
    setUploads((current) => [
      ...current,
      ...accepted.filter(
        (next) => !current.some((item) => item.id === next.id),
      ),
    ]);

    if (activeWorkspaceId) {
      accepted
        .filter((item) => item.state === "queued")
        .forEach((item) => {
          uploadSingleFile(item, activeWorkspaceId);
        });
    }
  };

  const startUploads = async () => {
    if (!activeWorkspaceId) return;
    const queued = uploads.filter((item) => item.state === "queued");
    await Promise.all(
      queued.map((item) => uploadSingleFile(item, activeWorkspaceId)),
    );
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    queueFiles(event.dataTransfer.files);
  };

  const sourceItems = sources.data?.items ?? [];
  const queuedCount = uploads.filter((item) => item.state === "queued").length;

  return (
    <section
      className="flex h-full min-h-0 flex-col bg-panel"
      aria-labelledby="sources-title"
    >
      <input
        id={inputId}
        aria-label="Choose files"
        type="file"
        accept={ACCEPTED_SOURCES}
        multiple
        className="sr-only"
        onChange={(event) => queueFiles(event.target.files ?? [])}
      />
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="min-w-0">
          <h2 id="sources-title" className="text-sm font-semibold">
            Sources
          </h2>
          <p className="truncate text-[11px] text-muted-foreground">
            {uploads.length
              ? `${uploads.length} ready to add`
              : sources.data
                ? `${sources.data.total} knowledge sources`
              : "Build your knowledge base"}
          </p>
        </div>
        <Button size="sm" onClick={() => document.getElementById(inputId)?.click()}>
          <FilePlus2 aria-hidden="true" className="size-3.5" /> Upload Source
        </Button>
      </div>

      {workspaces.data && workspaces.data.length > 1 && (
        <div className="border-b border-border px-3 py-2">
          <label
            className="block text-[10px] font-medium text-muted-foreground"
            htmlFor="workspace-source-select"
          >
            Workspace
          </label>
          <select
            id="workspace-source-select"
            value={activeWorkspaceId ?? ""}
            onChange={(event) => setActiveWorkspaceId(event.target.value)}
            className="mt-1 h-8 w-full rounded-lg border border-border bg-background px-2 text-xs"
          >
            {workspaces.data.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </div>
      )}


      <div className="border-b border-border p-3">
        <label className="relative block">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <span className="sr-only">Search sources</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search sources"
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {uploads.length > 0 && (
          <ul
            className="mb-3 space-y-2"
            aria-label="Files ready to add"
            aria-live="polite"
          >
            {uploads.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-border bg-background p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <FileText aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">
                      {item.file.name}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] text-muted-foreground",
                        item.error && "text-red-500",
                      )}
                    >
                      {item.error ?? formatBytes(item.file.size)}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${item.file.name}`}
                    onClick={() => {
                      cancelers.current.get(item.id)?.();
                      setUploads((current) =>
                        current.filter((entry) => entry.id !== item.id),
                      );
                    }}
                    className="rounded p-1 text-muted-foreground hover:bg-accent"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                {item.state === "uploading" && (
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-label={`Uploading ${item.file.name}`}
                    aria-valuenow={item.progress}
                  >
                    <div
                      className="h-full bg-primary transition-[width]"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {sources.isLoading && (
          <div className="grid min-h-44 place-items-center text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <LoaderCircle className="size-4 animate-spin" /> Loading sources
            </span>
          </div>
        )}
        {sources.isError && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 text-xs"
          >
            <p>Sources could not be loaded.</p>
            <Button
              className="mt-3"
              size="sm"
              variant="outline"
              onClick={() => sources.refetch()}
            >
              <RefreshCw className="size-3.5" /> Retry
            </Button>
          </div>
        )}
        {!sources.isLoading && sourceItems.length > 0 && (
          <ul className="space-y-2" aria-label="Workspace sources">
            {sourceItems.map((source) => (
              <li
                key={source.id}
                className="group rounded-xl border border-border bg-background p-3"
                style={{
                  contentVisibility: 'auto',
                  containIntrinsicSize: '110px',
                }}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-2 size-4 accent-primary"
                    aria-label={`Use ${source.originalName} in chat`}
                    checked={selectedSourceIds.includes(source.id)}
                    disabled={source.status !== "PROCESSED"}
                    onChange={() => toggleSource(source.id)}
                  />
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <FileText aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-xs font-medium"
                      title={source.originalName}
                    >
                      {source.originalName}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <StatusIcon status={source.status} />
                      {source.status === "PROCESSED"
                        ? "Ready"
                        : source.status.toLowerCase()}{" "}
                      · {formatBytes(source.size)}
                    </span>
                    {source.processingError && (
                      <span className="mt-1 block text-[10px] text-red-500">
                        {source.processingError}
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-2 flex justify-end gap-1 opacity-70 group-hover:opacity-100 group-focus-within:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`${favoriteMap.has(source.id) ? "Remove" : "Add"} ${source.originalName} ${favoriteMap.has(source.id) ? "from" : "to"} favorites`}
                    onClick={() => {
                      const id = favoriteMap.get(source.id);
                      if (id) favorite.remove.mutate(id);
                      else favorite.add.mutate({ sourceId: source.id });
                    }}
                  >
                    <Star
                      className={`size-3.5 ${favoriteMap.has(source.id) ? "fill-current text-amber-500" : ""}`}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Share ${source.originalName}`}
                    onClick={() => setSharingSourceId(source.id)}
                  >
                    <Share2 className="size-3.5" />
                  </Button>
                  {source.status === "FAILED" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Retry ${source.originalName}`}
                      onClick={() => actions.retry.mutate(source.id)}
                    >
                      <RefreshCw className="size-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Download ${source.originalName}`}
                    onClick={() => void actions.download(source.id)}
                  >
                    <Download className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${source.originalName}`}
                    onClick={() => actions.remove.mutate(source.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!sources.isLoading &&
          sourceItems.length === 0 &&
          uploads.length === 0 && (
            <div
              onDragEnter={() => setDragging(true)}
              onDragLeave={() => setDragging(false)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
              className={cn(
                "flex h-full min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/50 p-5 text-center transition-colors",
                dragging && "border-primary bg-primary/5",
              )}
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                <UploadCloud aria-hidden="true" className="size-5" />
              </span>
              <h3 className="mt-3 text-sm font-semibold">
                {search ? "No matching sources" : "Start with a source"}
              </h3>
              <p className="mt-1 max-w-48 text-xs leading-5 text-muted-foreground">
                {hasSession
                  ? "Drop a file here or use Upload Source to ground your workspace."
                  : "Sign in to upload documents, spreadsheets, presentations, Markdown, and text."}
              </p>
            </div>
          )}
      </div>

      {queuedCount > 0 && <div className="flex items-center justify-between gap-3 border-t border-border p-3"><p className="text-xs text-muted-foreground">{queuedCount} source{queuedCount === 1 ? "" : "s"} ready</p><Button size="sm" disabled={!activeWorkspaceId} onClick={() => void startUploads()}><UploadCloud aria-hidden="true" className="size-3.5" /> Upload {queuedCount} source{queuedCount === 1 ? "" : "s"}</Button></div>}
      {sharingSourceId && activeWorkspaceId && (
        <ShareDialog
          workspaceId={activeWorkspaceId}
          sourceId={sharingSourceId}
          onClose={() => setSharingSourceId(null)}
        />
      )}
    </section>
  );
}
