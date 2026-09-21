"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search as SearchIcon,
  RefreshCw,
  Database,
  FileText,
  Users,
  LayoutTemplate,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchResult {
  id: string;
  entityType: string;
  title: string;
  content: string;
  rank: number;
}

interface IndexStats {
  totalIndexed: number;
  byType: { type: string; count: number }[];
}

export default function SearchClient({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [indexStats, setIndexStats] = useState<IndexStats>({
    totalIndexed: 0,
    byType: [],
  });
  const [loading, setLoading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [searched, setSearched] = useState(false);
  const didInitialSearch = useRef(false);

  const runSearch = useCallback(async (value: string) => {
    if (!value.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(value)}`
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setIndexStats(
          data.indexStats || { totalIndexed: 0, byType: [] }
        );
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // The admin header submits ?q=<term> to this page; run that search once
  // on mount so the header hand-off actually shows results.
  useEffect(() => {
    if (!didInitialSearch.current && initialQuery.trim()) {
      didInitialSearch.current = true;
      runSearch(initialQuery);
    }
  }, [initialQuery, runSearch]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSearch(query);
  };

  const handleReindex = async () => {
    if (!confirm("This will reindex all entities. Continue?")) return;
    setReindexing(true);
    try {
      await fetch("/api/search/reindex", { method: "POST" });
      if (query.trim()) await runSearch(query);
    } catch (error) {
      console.error("Reindex failed:", error);
    } finally {
      setReindexing(false);
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "document":
        return <FileText className="w-4 h-4 text-blue-400" />;
      case "client":
        return <Users className="w-4 h-4 text-green-400" />;
      case "template":
        return <LayoutTemplate className="w-4 h-4 text-purple-400" />;
      default:
        return <Database className="w-4 h-4 text-[color:var(--a-muted)]" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-[color:var(--a-ink)]">Search</h1>
          <p className="text-sm text-[color:var(--a-muted)] mt-1">
            Full-text search across all entities
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleReindex}
          disabled={reindexing}
        >
          <RefreshCw
            className={`w-4 h-4 ${reindexing ? "animate-spin" : ""}`}
          />
          {reindexing ? "Reindexing..." : "Reindex"}
        </Button>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearch}>
        <div className="bg-[color:var(--a-surface-2)] backdrop-blur-xl border border-[color:var(--a-hairline)] rounded-2xl p-6">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[color:var(--a-faint)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents, clients, templates..."
              className="w-full bg-white border border-[color:var(--a-hairline)] rounded-xl pl-12 pr-4 py-3 text-[color:var(--a-ink)] placeholder:text-[color:var(--a-faint)] focus:outline-none focus:border-[color:var(--a-brand)] focus:ring-1 focus:ring-[color:var(--a-brand)] transition-all"
            />
          </div>
        </div>
      </form>

      {/* Index Stats */}
      <div className="bg-[color:var(--a-surface-2)] backdrop-blur-xl border border-[color:var(--a-hairline)] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold text-[color:var(--a-ink)]">
            Index Statistics
          </h2>
          <div className="flex items-center text-sm text-[color:var(--a-muted)]">
            <TrendingUp className="w-4 h-4 mr-1" />
            {indexStats.totalIndexed} total indexed
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {indexStats.byType.length > 0 ? (
            indexStats.byType.map((item) => (
              <div
                key={item.type}
                className="p-3 bg-white border border-[color:var(--a-hairline)] rounded-xl"
              >
                <div className="flex items-center mb-2">
                  {getEntityIcon(item.type)}
                  <span className="ml-2 text-xs text-[color:var(--a-faint)] uppercase">
                    {item.type}
                  </span>
                </div>
                <div className="text-xl font-bold text-[color:var(--a-ink)]">{item.count}</div>
              </div>
            ))
          ) : (
            <>
              <div className="p-3 bg-white border border-[color:var(--a-hairline)] rounded-xl">
                <div className="flex items-center mb-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="ml-2 text-xs text-[color:var(--a-faint)] uppercase">
                    Documents
                  </span>
                </div>
                <div className="text-xl font-bold text-[color:var(--a-ink)]">-</div>
              </div>
              <div className="p-3 bg-white border border-[color:var(--a-hairline)] rounded-xl">
                <div className="flex items-center mb-2">
                  <Users className="w-4 h-4 text-green-400" />
                  <span className="ml-2 text-xs text-[color:var(--a-faint)] uppercase">
                    Clients
                  </span>
                </div>
                <div className="text-xl font-bold text-[color:var(--a-ink)]">-</div>
              </div>
              <div className="p-3 bg-white border border-[color:var(--a-hairline)] rounded-xl">
                <div className="flex items-center mb-2">
                  <LayoutTemplate className="w-4 h-4 text-purple-400" />
                  <span className="ml-2 text-xs text-[color:var(--a-faint)] uppercase">
                    Templates
                  </span>
                </div>
                <div className="text-xl font-bold text-[color:var(--a-ink)]">-</div>
              </div>
              <div className="p-3 bg-white border border-[color:var(--a-hairline)] rounded-xl">
                <div className="flex items-center mb-2">
                  <Database className="w-4 h-4 text-[color:var(--a-muted)]" />
                  <span className="ml-2 text-xs text-[color:var(--a-faint)] uppercase">
                    Total
                  </span>
                </div>
                <div className="text-xl font-bold text-[color:var(--a-ink)]">
                  {indexStats.totalIndexed}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="bg-[color:var(--a-surface-2)] backdrop-blur-xl border border-[color:var(--a-hairline)] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[color:var(--a-hairline)]">
          <h2 className="text-lg font-display font-semibold text-[color:var(--a-ink)]">
            Search Results
          </h2>
        </div>

        <div className="divide-y divide-[color:var(--a-hairline)]">
          {loading ? (
            <div className="px-6 py-12 text-center text-[color:var(--a-faint)]">
              Searching...
            </div>
          ) : !searched ? (
            <div className="px-6 py-12 text-center text-[color:var(--a-faint)]">
              Enter a search query to find documents, clients, and templates
            </div>
          ) : results.length === 0 ? (
            <div className="px-6 py-12 text-center text-[color:var(--a-faint)]">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            results.map((result) => (
              <div
                key={result.id}
                className="px-6 py-4 hover:bg-black/5 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <div className="p-2 bg-white border border-[color:var(--a-hairline)] rounded-lg mr-4 mt-0.5">
                      {getEntityIcon(result.entityType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-[color:var(--a-ink)]">
                          {result.title}
                        </span>
                        <span className="px-2 py-0.5 text-xs text-[color:var(--a-faint)] bg-white rounded">
                          {result.entityType}
                        </span>
                      </div>
                      <p className="text-sm text-[color:var(--a-muted)] line-clamp-2">
                        {result.content}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-[color:var(--a-faint)]">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {result.rank.toFixed(2)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
