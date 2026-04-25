import React from "react";

interface EmptyStateProps {
  illustration: "campaigns" | "rewards" | "transactions";
  title: string;
  description: string;
  cta?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

const illustrations: Record<EmptyStateProps["illustration"], React.ReactNode> = {
  campaigns: (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="10" y="20" width="60" height="44" rx="8" fill="#1a1d27" stroke="#2d3148" strokeWidth="2" />
      <rect x="18" y="30" width="28" height="4" rx="2" fill="#3a3f5c" />
      <rect x="18" y="38" width="20" height="3" rx="1.5" fill="#2d3148" />
      <rect x="18" y="44" width="24" height="3" rx="1.5" fill="#2d3148" />
      <circle cx="56" cy="38" r="10" fill="#7c6af7" opacity="0.15" stroke="#7c6af7" strokeWidth="1.5" />
      <path d="M52 38h8M56 34v8" stroke="#7c6af7" strokeWidth="2" strokeLinecap="round" />
      <path d="M28 16l4-4 4 4" stroke="#7c6af7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="32" y1="12" x2="32" y2="20" stroke="#7c6af7" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  rewards: (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="40" cy="40" r="26" fill="#1a1d27" stroke="#2d3148" strokeWidth="2" />
      <path
        d="M40 26l3.09 6.26L50 33.27l-5 4.87 1.18 6.86L40 41.77l-6.18 3.23L35 38.14l-5-4.87 6.91-1.01L40 26z"
        fill="#7c6af7"
        opacity="0.3"
        stroke="#7c6af7"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="40" cy="40" r="6" fill="#7c6af7" opacity="0.15" />
      <circle cx="40" cy="40" r="3" fill="#7c6af7" />
    </svg>
  ),
  transactions: (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="12" y="18" width="56" height="44" rx="6" fill="#1a1d27" stroke="#2d3148" strokeWidth="2" />
      <rect x="12" y="18" width="56" height="12" rx="6" fill="#2d3148" />
      <rect x="20" y="22" width="12" height="4" rx="2" fill="#3a3f5c" />
      <rect x="36" y="22" width="8" height="4" rx="2" fill="#3a3f5c" />
      <rect x="20" y="38" width="40" height="2" rx="1" fill="#2d3148" />
      <rect x="20" y="44" width="32" height="2" rx="1" fill="#2d3148" />
      <rect x="20" y="50" width="36" height="2" rx="1" fill="#2d3148" />
      <circle cx="60" cy="56" r="10" fill="#0f1117" stroke="#2d3148" strokeWidth="1.5" />
      <path d="M56 56h8M60 52v8" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

export function EmptyState({ illustration, title, description, cta }: EmptyStateProps) {
  return (
    <div className="empty-state-container" role="status" aria-label={title}>
      <div className="empty-state-illustration">{illustrations[illustration]}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {cta && (
        cta.href ? (
          <a href={cta.href} className="btn btn-primary empty-state-cta">
            {cta.label}
          </a>
        ) : (
          <button onClick={cta.onClick} className="btn btn-primary empty-state-cta">
            {cta.label}
          </button>
        )
      )}
    </div>
  );
}
