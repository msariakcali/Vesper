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
  onNavigate: (pageIndex: number) => void;
}

export const TextSearch = forwardRef<HTMLInputElement, Props>(function TextSearch(
  { model, currentPageIndex, onNavigate },
  ref,
) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [busy, setBusy] = useState(false);

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
          if (!cancelled) setResults(items.filter(Boolean) as SearchResult[]);
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
  }, [model, query]);

  const activeResult = useMemo(() => {
    if (results.length === 0) return -1;
    const exact = results.findIndex((result) => result.pageIndex === currentPageIndex);
    return exact >= 0 ? exact : 0;
  }, [currentPageIndex, results]);

  const navigate = (delta: number) => {
    if (results.length === 0) return;
    const next = (activeResult + delta + results.length) % results.length;
    onNavigate(results[next].pageIndex);
  };

  return (
    <div className="flex items-center gap-1">
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-text-dim"
        />
        <input
          ref={ref}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Metinde ara"
          className="h-8 w-56 rounded-md border border-border bg-surface-2 pl-7 pr-7 text-sm text-text"
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
            disabled={results.length === 0}
            onClick={() => navigate(-1)}
            aria-label="Önceki arama sonucu"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="min-w-10 text-center text-xs text-text-dim tabular-nums">
            {results.length === 0 ? "0/0" : `${activeResult + 1}/${results.length}`}
          </span>
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded text-text-dim hover:bg-surface-2 hover:text-text disabled:opacity-40"
            disabled={results.length === 0}
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
