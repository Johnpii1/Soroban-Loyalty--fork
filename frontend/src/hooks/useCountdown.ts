import { useState, useEffect } from "react";

export interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

export function useCountdown(expirationUnix: number): CountdownResult {
  const calc = (): CountdownResult => {
    const diff = Math.max(0, expirationUnix - Math.floor(Date.now() / 1000));
    return {
      days: Math.floor(diff / 86400),
      hours: Math.floor((diff % 86400) / 3600),
      minutes: Math.floor((diff % 3600) / 60),
      seconds: diff % 60,
      expired: diff === 0,
    };
  };

  const [state, setState] = useState<CountdownResult>(calc);

  useEffect(() => {
    if (state.expired) return;
    const id = setInterval(() => {
      const next = calc();
      setState(next);
      if (next.expired) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expirationUnix, state.expired]);

  return state;
}
