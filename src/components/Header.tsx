import { useEffect } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { fetchHealth } from '@/api/health';
import type { HealthResponse } from '@/api/types';
import { formatUptime, tokenStatus } from '@/utils/formatters';
import type { TokenStatus } from '@/utils/formatters';
import styles from './Header.module.css';

function tokenLabel(expiresAt: number, status: TokenStatus): string {
  if (status === 'expired') return 'Token expired';
  const daysLeft = Math.floor((expiresAt * 1000 - Date.now()) / (86400 * 1000));
  return `Token life: ${daysLeft}d`;
}

function formatLastWindow(epoch: number | null): string {
  if (epoch === null) return 'No data yet';
  return new Date(epoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
      <span className={styles.dotWrap}>
        <span
          className={`${styles.statusDot}${!isOffline && !isStale ? ` ${styles.pulse}` : ''}`}
          style={{
            background: isOffline
              ? 'var(--red)'
              : isStale
              ? 'var(--orange)'
              : 'var(--green)',
          }}
        />
        <span className={styles.dotTooltip}>
          {data && (
            <>
              <span className={styles.tooltipRow}>
                Uptime: {formatUptime(data.uptime_seconds)}
              </span>
              <span
                className={styles.tooltipRow}
                style={{
                  color:
                    tokStatus === 'expired'
                      ? 'var(--red)'
                      : tokStatus === 'warning'
                      ? 'var(--orange)'
                      : undefined,
                }}
              >
                {tokenLabel(data.token_expires_at, tokStatus)}
              </span>
              <span className={styles.tooltipRow}>
                Data at: {formatLastWindow(data.last_window_start)}
              </span>
            </>
          )}
          <span className={styles.tooltipRow} style={{ color: 'var(--fg-muted)' }}>
            ↻ {secondsUntilRefresh}s
          </span>
        </span>
      </span>
      <span
        className={styles.statusLabel}
        style={{
          color: isOffline
            ? 'var(--red)'
            : isStale
            ? 'var(--orange)'
            : 'var(--green)',
        }}
      >
        {isOffline ? 'OFFLINE' : isStale ? 'STALE' : 'ONLINE'}
      </span>
    </div>
  );
}
