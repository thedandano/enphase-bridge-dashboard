import { useEffect } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { fetchHealth } from '@/api/health';
import type { HealthResponse } from '@/api/types';
import { formatUptime, tokenStatus } from '@/utils/formatters';
import type { TokenStatus } from '@/utils/formatters';
import styles from './Header.module.css';

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
