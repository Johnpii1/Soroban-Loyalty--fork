"use client";

import { useEffect, useState } from "react";

interface FaqEntry {
  id: string;
  title: string;
  category: string;
  file: string;
  content?: string;
}

export default function HelpPage() {
  const [items, setItems] = useState<FaqEntry[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    fetch("/faq/index.json")
      .then((r) => r.json())
      .then(async (index: FaqEntry[]) => {
        const loaded = await Promise.all(
          index.map(async (entry) => {
            const res = await fetch(`/faq/${entry.file}`);
            const raw = await res.text();
            // Strip frontmatter
            const content = raw.replace(/^---[\s\S]*?---\n/, "").trim();
            return { ...entry, content };
          })
        );
        setItems(loaded);
      });
  }, []);

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      (item.content ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const toggle = (id: string) => setOpen((prev) => (prev === id ? null : id));

  return (
    <div>
      <h1 className="page-title">Help &amp; FAQ</h1>
      <p style={{ color: "#94a3b8", marginBottom: 24 }}>
        Find answers to common questions about SorobanLoyalty, LYT tokens, and Freighter.
      </p>

      <div className="form-group" style={{ maxWidth: 480, marginBottom: 32 }}>
        <label htmlFor="faq-search">Search FAQ</label>
        <input
          id="faq-search"
          type="search"
          placeholder="e.g. claim, Freighter, LYT…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search FAQ"
        />
      </div>

      {filtered.length === 0 && (
        <p className="empty-state">No results for &ldquo;{query}&rdquo;.</p>
      )}

      <div role="list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((item) => (
          <div key={item.id} role="listitem" className="card" id={item.id}>
            <button
              className="faq-question"
              aria-expanded={open === item.id}
              aria-controls={`faq-answer-${item.id}`}
              onClick={() => toggle(item.id)}
            >
              <span>{item.title}</span>
              <span className="faq-chevron" aria-hidden="true">
                {open === item.id ? "▲" : "▼"}
              </span>
            </button>
            {open === item.id && (
              <div
                id={`faq-answer-${item.id}`}
                className="faq-answer"
                role="region"
              >
                {item.content?.split("\n").map((line, i) =>
                  line.trim() === "" ? (
                    <br key={i} />
                  ) : (
                    <p key={i}>{line}</p>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
