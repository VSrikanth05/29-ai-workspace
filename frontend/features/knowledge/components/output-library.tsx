"use client";
import {
  Copy,
  Download,
  FileOutput,
  History,
  RefreshCw,
  Search,
  Share2,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { downloadText } from "@/features/ai-studio/exports/download";
import {
  usePaginatedAiOutputs,
  useRegenerateOutput,
} from "@/features/ai-studio/hooks/use-ai-outputs";
import type {
  AIOutput,
  AIOutputType,
} from "@/features/ai-studio/ai-studio-types";
import { apiRequest } from "@/lib/api-client";
import { useWorkspaceStore } from "@/stores/workspace-store";
import {
  useFavoriteToggle,
  useFavorites,
  usePreferences,
} from "../hooks/use-knowledge";
import { ShareDialog } from "./share-dialog";
import { VersionHistoryModal } from "./version-history-modal";

const labels: Record<AIOutputType, string> = {
  SUMMARY: "Summary",
  MIND_MAP: "Mind Map",
  REPORT: "Report",
  TRANSLATION: "Translation",
  KEY_POINTS: "Key Points",
  GLOSSARY: "Glossary",
  FLASHCARDS: "Flashcards",
  QUIZ: "Quiz",
  STUDY_GUIDE: "Study Guide",
  ANALYTICS_REPORT: "Analytics",
  CHART: "Charts",
};
export function OutputLibrary() {
  const workspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const outputs = usePaginatedAiOutputs(workspaceId);
  const regenerate = useRegenerateOutput(workspaceId);
  const favorites = useFavorites(workspaceId);
  const favorite = useFavoriteToggle(workspaceId);
  const preferences = usePreferences(workspaceId);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<AIOutputType | "ALL">("ALL");
  const [sort, setSort] = useState<"newest" | "oldest" | "title">("newest");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [open, setOpen] = useState<AIOutput | null>(null);
  const [share, setShare] = useState<AIOutput | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  const favoriteMap = useMemo(
    () =>
      new Map(
        (favorites.data ?? [])
          .filter((item) => item.output)
          .map((item) => [item.output!.id, item.id]),
      ),
    [favorites.data],
  );
  const loadedOutputs = useMemo(
    () => outputs.data?.pages.flatMap((page) => page.items) ?? [],
    [outputs.data],
  );
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const load = () => {
      if (
        outputs.hasNextPage &&
        !outputs.isFetchingNextPage &&
        main.scrollHeight - main.scrollTop - main.clientHeight < 500
      )
        void outputs.fetchNextPage();
    };
    main.addEventListener("scroll", load, { passive: true });
    return () => main.removeEventListener("scroll", load);
  }, [outputs]);
  const rows = useMemo(
    () =>
      loadedOutputs
        .filter(
          (item) =>
            item.title.toLowerCase().includes(query.toLowerCase()) &&
            (type === "ALL" || item.type === type) &&
            (!favoritesOnly || favoriteMap.has(item.id)),
        )
        .sort((a, b) =>
          sort === "title"
            ? a.title.localeCompare(b.title)
            : sort === "oldest"
              ? +new Date(a.createdAt) - +new Date(b.createdAt)
              : +new Date(b.createdAt) - +new Date(a.createdAt),
        ),
    [favoriteMap, favoritesOnly, loadedOutputs, query, sort, type],
  );
  const exportOutput = async (item: AIOutput) => {
    const format = preferences.data?.defaultExportFormat ?? "markdown";
    const file = await apiRequest<{
      filename: string;
      mimeType: string;
      content: string;
    }>(`/ai-studio/outputs/${item.id}/export?format=${format}`);
    downloadText(file.filename, file.content, file.mimeType);
  };
  const duplicate = async (id: string) => {
    await apiRequest(`/outputs/${id}/duplicate`, { method: "POST" });
    await outputs.refetch();
  };
  const remove = async (id: string) => {
    if (!window.confirm("Delete this output?")) return;
    await apiRequest(`/outputs/${id}`, { method: "DELETE" });
    await outputs.refetch();
  };
  return (
    <section
      className="mx-auto min-h-full max-w-7xl p-4 sm:p-6 lg:p-8"
      aria-labelledby="library-title"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">
            Knowledge workspace
          </p>
          <h1
            id="library-title"
            className="mt-2 text-3xl font-semibold tracking-tight"
          >
            Output Library
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search, manage, reuse, and export every AI-generated artifact.
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {rows.length} outputs
        </span>
      </div>
      <div className="grid gap-3 rounded-2xl border border-border bg-panel p-3 md:grid-cols-[1fr_180px_150px_auto]">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <span className="sr-only">Search outputs</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Output Library"
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm"
          />
        </label>
        <select
          aria-label="Filter by output type"
          value={type}
          onChange={(event) =>
            setType(event.target.value as AIOutputType | "ALL")
          }
          className="h-10 rounded-lg border border-border bg-background px-3 text-xs"
        >
          <option value="ALL">All output types</option>
          {Object.entries(labels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort outputs"
          value={sort}
          onChange={(event) => setSort(event.target.value as typeof sort)}
          className="h-10 rounded-lg border border-border bg-background px-3 text-xs"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="title">Title</option>
        </select>
        <Button
          variant={favoritesOnly ? "primary" : "outline"}
          onClick={() => setFavoritesOnly((value) => !value)}
        >
          <Star className="size-4" />
          Favorites
        </Button>
      </div>
      {rows.length ? (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((item) => {
            const favoriteId = favoriteMap.get(item.id);
            return (
              <li
                key={item.id}
                className="group rounded-2xl border border-border bg-panel p-4"
                style={{
                  contentVisibility: 'auto',
                  containIntrinsicSize: '180px',
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <FileOutput className="size-4" />
                  </span>
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setOpen(item)}
                  >
                    <span className="block truncate text-sm font-semibold">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {labels[item.type]} · {item.provider} / {item.model}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={
                      favoriteId
                        ? `Remove ${item.title} from favorites`
                        : `Add ${item.title} to favorites`
                    }
                    onClick={() =>
                      favoriteId
                        ? favorite.remove.mutate(favoriteId)
                        : favorite.add.mutate({ outputId: item.id })
                    }
                  >
                    <Star
                      className={`size-4 ${favoriteId ? "fill-current text-amber-500" : ""}`}
                    />
                  </Button>
                </div>
                <p className="mt-4 text-[11px] text-muted-foreground">
                  Updated {new Date(item.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-3 flex flex-wrap gap-1 border-t border-border pt-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Share ${item.title}`}
                    onClick={() => setShare(item)}
                  >
                    <Share2 className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Version history for ${item.title}`}
                    onClick={() => setHistory(item.id)}
                  >
                    <History className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Duplicate ${item.title}`}
                    onClick={() => void duplicate(item.id)}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Regenerate ${item.title}`}
                    onClick={() => regenerate.mutate(item.id)}
                  >
                    <RefreshCw className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Export ${item.title}`}
                    onClick={() => void exportOutput(item)}
                  >
                    <Download className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${item.title}`}
                    onClick={() => void remove(item.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-5 grid min-h-80 place-items-center rounded-2xl border border-dashed border-border bg-muted/20 text-center">
          <div>
            <FileOutput className="mx-auto size-8 text-primary" />
            <h2 className="mt-3 font-semibold">No matching outputs</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Generated summaries, maps, reports, learning tools, analytics, and
              charts appear here.
            </p>
          </div>
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-[85] grid place-items-center bg-black/45 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="output-preview-title"
            className="max-h-[80dvh] w-full max-w-3xl overflow-auto rounded-2xl border border-border bg-background p-5"
          >
            <div className="sticky top-0 flex items-center justify-between bg-background pb-3">
              <h2 id="output-preview-title" className="font-semibold">
                {open.title}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close output"
                onClick={() => setOpen(null)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <pre className="whitespace-pre-wrap text-sm leading-6">
              {"markdown" in open.content
                ? open.content.markdown
                : JSON.stringify(open.content, null, 2)}
            </pre>
          </section>
        </div>
      )}
      {share && workspaceId && (
        <ShareDialog
          workspaceId={workspaceId}
          outputId={share.id}
          onClose={() => setShare(null)}
        />
      )}{" "}
      {history && (
        <VersionHistoryModal
          outputId={history}
          onClose={() => setHistory(null)}
        />
      )}
    </section>
  );
}
