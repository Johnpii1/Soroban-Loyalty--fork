"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, Campaign } from "@/lib/api";

const RECENT_KEY = "soroban_recent_searches";
const MAX_RECENT = 5;

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); }
  catch { return []; }
}

function saveRecent(query: string) {
  const prev = getRecent().filter((q) => q !== query);
  localStorage.setItem(RECENT_KEY, JSON.stringify([query, ...prev].slice(0, MAX_RECENT)));
}

function statusLabel(c: Campaign) {
  if (!c.active) return "Inactive";
  if (c.expiration < Date.now() / 1000) return "Expired";
  return "Active";
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Campaign[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [cursor, setCursor] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Focus input when opened; load recent searches
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setCursor(0);
      setRecent(getRecent());
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Lazy-load all campaigns once for client-side search
  useEffect(() => {
    if (open && allCampaigns.length === 0) {
      api.getCampaigns(100, 0)
        .then(({ campaigns }) => setAllCampaigns(campaigns))
        .catch(() => {});
    }
  }, [open, allCampaigns.length]);

  // Filter campaigns as user types
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) { setResults([]); setCursor(0); return; }
    const filtered = allCampaigns.filter(
      (c) =>
        c.merchant.toLowerCase().includes(q) ||
        String(c.id).includes(q)
    );
    setResults(filtered.slice(0, 8));
    setCursor(0);
  }, [query, allCampaigns]);

  const close = useCallback(() => setOpen(false), []);

  function navigate(id: number, q: string) {
    if (q.trim()) saveRecent(q.trim());
    close();
    router.push(`/dashboard?campaign=${id}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const list = results.length ? results : [];
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, list.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && list[cursor]) {
      navigate(list[cursor].id, query);
    } else if (e.key === "Escape") {
      close();
    }
  }

  if (!open) return null;

  const showRecent = !query.trim() && recent.length > 0;

  return (
    <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Global search">
      {/* Backdrop */}
      <div className="search-backdrop" onClick={close} aria-hidden="true" />

      <div className="search-modal">
        <div className="search-input-row">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            className="search-input"
            type="search"
            placeholder="Search campaigns…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Search campaigns"
            aria-autocomplete="list"
            aria-controls="search-results"
            aria-activedescendant={results[cursor] ? `sr-${results[cursor].id}` : undefined}
          />
          <kbd className="search-esc" onClick={close}>Esc</kbd>
        </div>

        <div id="search-results" role="listbox" aria-label="Search results">
          {showRecent && (
            <>
              <p className="search-section-label">Recent searches</p>
              {recent.map((r) => (
                <button
                  key={r}
                  className="search-recent-item"
                  onClick={() => setQuery(r)}
                >
                  <span className="search-recent-icon" aria-hidden="true">↺</span>
                  {r}
                </button>
              ))}
            </>
          )}

          {query.trim() && results.length === 0 && (
            <p className="search-empty">No campaigns found for &ldquo;{query}&rdquo;</p>
          )}

          {results.map((c, i) => (
            <div
              key={c.id}
              id={`sr-${c.id}`}
              role="option"
              aria-selected={i === cursor}
              className={`search-result ${i === cursor ? "search-result-active" : ""}`}
              onClick={() => navigate(c.id, query)}
              onMouseEnter={() => setCursor(i)}
            >
              <div className="search-result-main">
                <span className="search-result-merchant">{c.merchant}</span>
                <span className={`search-result-badge badge-${statusLabel(c).toLowerCase()}`}>
                  {statusLabel(c)}
                </span>
              </div>
              <span className="search-result-meta">{c.reward_amount} LYT · Campaign #{c.id}</span>
            </div>
          ))}
        </div>

        <div className="search-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
