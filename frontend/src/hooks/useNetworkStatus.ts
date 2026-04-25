"use client";

import { useState, useEffect, useCallback } from "react";

export interface NetworkHealth {
  status: 'connected' | 'degraded' | 'unreachable';
  lastChecked: Date | null;
  stellarNetwork: boolean;
  backendAPI: boolean;
  latency?: number;
}

const CHECK_INTERVAL = 30000; // 30 seconds
const TIMEOUT = 5000; // 5 seconds

export function useNetworkStatus() {
  const [health, setHealth] = useState<NetworkHealth>({
    status: 'connected',
    lastChecked: null,
    stellarNetwork: false,
    backendAPI: false
  });

  const checkHealth = useCallback(async () => {
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      if (!response.ok) {
        setHealth({
          status: 'degraded',
          lastChecked: new Date(),
          stellarNetwork: false,
          backendAPI: false,
          latency
        });
        return;
      }

      const data = await response.json();
      const stellarReachable = data.checks?.stellar?.reachable || false;
      const dbConnected = data.checks?.database?.connected || false;

      let status: NetworkHealth['status'] = 'connected';
      if (!stellarReachable && !dbConnected) {
        status = 'unreachable';
      } else if (!stellarReachable || !dbConnected) {
        status = 'degraded';
      }

      setHealth({
        status,
        lastChecked: new Date(),
        stellarNetwork: stellarReachable,
        backendAPI: true,
        latency
      });
    } catch (error) {
      setHealth({
        status: 'unreachable',
        lastChecked: new Date(),
        stellarNetwork: false,
        backendAPI: false
      });
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkHealth();

    // Periodic checks
    const intervalId = setInterval(checkHealth, CHECK_INTERVAL);

    return () => clearInterval(intervalId);
  }, [checkHealth]);

  return { health, checkHealth };
}
