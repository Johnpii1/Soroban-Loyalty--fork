"use client";

import { NetworkHealth } from "@/hooks/useNetworkStatus";

interface Props {
  health: NetworkHealth;
}

export function NetworkBanner({ health }: Props) {
  const { status } = health;

  if (status === 'connected') return null;

  const getMessage = () => {
    if (status === 'degraded') {
      return 'Network connection is experiencing issues. Some features may be limited.';
    }
    return 'Unable to connect to the network. Transactions are currently disabled.';
  };

  return (
    <div className={`network-banner ${status === 'unreachable' ? 'error' : ''}`} role="alert">
      <span className="banner-icon" aria-hidden="true">⚠</span>
      <span>{getMessage()}</span>
    </div>
  );
}
