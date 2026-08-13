import { forwardRef, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { DocumentModel } from "../../core/model/types";
import { getPageText } from "../../core/render/textCache";

interface SearchResult {
  pageIndex: number;
  matchCount: number;
}

interface Props {
  model: DocumentModel;
  currentPageIndex: number;
  onNavigate: (pageIndex: number, matchIndex: number) => void;
  query: string;
  onQueryChange: (query: string) => void;
}

export const TextSearch = forwardRef<HTMLInputElement, Props>(function TextSearch(
  { model, currentPageIndex, onNavigate, query, onQueryChange },
  ref,
) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [activeOccurrence, setActiveOccurrence] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const normalized = query.trim().toLocaleLowerCase("tr-TR");
    if (!normalized) {
      setResults([]);
      setBusy(false);
      return;
    }

    setBusy(true);
    const timer = window.setTimeout(() => {
      void Promise.all(
        model.pages.map(async (page, pageIndex) => {
          const source = model.sources[page.sourceId];
          if (!source) return null;
          const text = (await getPageText(source.id, source.bytes, page.sourceIndex)).toLocaleLowerCase(
            "tr-TR",
          );
          let count = 0;
          let offset = 0;
          while ((offset = text.indexOf(normalized, offset)) !== -1) {
            count += 1;
            offset += normalized.length;
          }
          return count > 0 ? { pageIndex, matchCount: count } : null;
        }),
      )
        .then((items) => {
          if (cancelled) return;
          const nextResults = items.filter(Boolean) as SearchResult[];
          setResults(nextResults);
          setActiveOccurrence(0);
          if (nextResults[0]) onNavigate(nextResults[0].pageIndex, 0);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setBusy(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [model, onNavigate, query]);

  const occurrences = useMemo(
    () => results.flatMap((result) =>
      Array.from({ length: result.matchCount }, (_, matchIndex) => ({
        pageIndex: result.pageIndex,
        matchIndex,
      })),
    ),
    [results],
  );

  const activeResult = useMemo(() => {
    if (occurrences.length === 0) return -1;
    const active = occurrences[activeOccurrence];
    if (active?.pageIndex === currentPageIndex) return activeOccurrence;
    const exact = occurrences.findIndex((result) => result.pageIndex === currentPageIndex);
    return exact >= 0 ? exact : Math.min(activeOccurrence, occurrences.length - 1);
  }, [activeOccurrence, currentPageIndex, occurrences]);

  const totalMatches = occurrences.length;

  const navigate = (delta: number) => {
    if (occurrences.length === 0) return;
    const next = (activeResult + delta + occurrences.length) % occurrences.length;
    setActiveOccurrence(next);
    onNavigate(occurrences[next].pageIndex, occurrences[next].matchIndex);
  };

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-2/90 p-1 shadow-sm">
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-text-dim"
        />
        <input
          ref={ref}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Metinde ara"
          className="h-7 w-32 rounded-lg border-0 bg-transparent pl-7 pr-6 text-[11px] text-text shadow-none sm:w-48"
          aria-label="PDF metninde ara"
        />
        {busy && (
          <span className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-border border-t-accent [animation:spin_700ms_linear_infinite]" />
        )}
      </div>
      {query.trim() && (
        <>
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded text-text-dim hover:bg-surface-2 hover:text-text disabled:opacity-40"
            disabled={occurrences.length === 0}
            onClick={() => navigate(-1)}
            aria-label="Önceki arama sonucu"
          >
            <ChevronLeft size={14} />
          </button>
          <span
            className="min-w-12 text-center text-[10px] text-text-dim tabular-nums"
            title={`${totalMatches} eşleşme`}
          >
            {occurrences.length === 0 ? "0/0" : `${activeResult + 1}/${occurrences.length}`}
          </span>
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded text-text-dim hover:bg-surface-2 hover:text-text disabled:opacity-40"
            disabled={occurrences.length === 0}
            onClick={() => navigate(1)}
            aria-label="Sonraki arama sonucu"
          >
            <ChevronRight size={14} />
          </button>
        </>
      )}
    </div>
  );
});
