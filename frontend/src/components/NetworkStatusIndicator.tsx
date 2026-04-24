"use client";

import { NetworkHealth } from "@/hooks/useNetworkStatus";

interface Props {
  health: NetworkHealth;
}

export function NetworkStatusIndicator({ health }: Props) {
  const { status, lastChecked } = health;

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'degraded': return 'Network Issues';
      case 'unreachable': return 'Offline';
    }
  };

  const formatLastChecked = () => {
    if (!lastChecked) return 'Checking...';
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastChecked.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return lastChecked.toLocaleTimeString();
  };

  return (
    <div className="network-status" title={`Last checked: ${formatLastChecked()}`}>
      <span className={`status-dot ${status}`} aria-label={getStatusText()} />
      <span className="status-text">{getStatusText()}</span>
    </div>
  );
}
