import { useEffect } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { fetchHealth } from '@/api/health';
import type { HealthResponse } from '@/api/types';
import styles from './Header.module.css';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor(seconds / 60);
  return `${m}m`;
}

type TokenStatus = 'ok' | 'warning' | 'expired';

function tokenStatus(expiresAt: number): TokenStatus {
  const nowMs = Date.now();
  const expiresMs = expiresAt * 1000;
  if (expiresMs <= nowMs) return 'expired';
  if (expiresMs - nowMs <= 7 * 86400 * 1000) return 'warning';
  return 'ok';
}

function tokenLabel(expiresAt: number, status: TokenStatus): string {
  if (status === 'expired') return 'TOKEN EXPIRED';
  const daysLeft = Math.floor((expiresAt * 1000 - Date.now()) / (86400 * 1000));
  return `Token: ${daysLeft}d`;
}

interface Props {
  onFirstRun?: (isFirstRun: boolean) => void;
}

export function Header({ onFirstRun }: Props) {
  const { data, error, secondsUntilRefresh } = useAutoRefresh<HealthResponse>(fetchHealth);

  const isOffline = data === null;
  const isStale = error !== null && data !== null;
  const isFirstRun = data?.last_window_start === null;

  // Notify parent of first-run state for the banner
  useEffect(() => {
    onFirstRun?.(isFirstRun ?? false);
  }, [isFirstRun, onFirstRun]);

  const tokStatus = data ? tokenStatus(data.token_expires_at) : 'ok';

  return (
    <div className={styles.bar}>
      <span
        className={styles.statusDot}
        style={{
          background: isOffline
            ? 'var(--red)'
            : isStale
            ? 'var(--orange)'
            : 'var(--green)',
        }}
        title={isOffline ? 'OFFLINE' : 'ok'}
      />
      {isOffline ? (
        <span className={styles.offline}>OFFLINE</span>
      ) : (
        <>
          <span className={styles.uptime}>{formatUptime(data.uptime_seconds)}</span>
          <span
            className={styles.token}
            style={{
              color:
                tokStatus === 'expired'
                  ? 'var(--red)'
                  : tokStatus === 'warning'
                    ? 'var(--orange)'
                    : 'var(--green)',
            }}
          >
            {tokenLabel(data.token_expires_at, tokStatus)}
          </span>
        </>
      )}
      <span className={styles.countdown}>↻ {secondsUntilRefresh}s</span>
    </div>
  );
}
