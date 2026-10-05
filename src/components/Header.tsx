import { useEffect, useState } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { fetchHealth } from '@/api/health';
import type { HealthResponse } from '@/api/types';
import { formatUptime, tokenStatus } from '@/utils/formatters';
import type { TokenStatus } from '@/utils/formatters';
import { useDisplayPrefs } from '@/context/DisplayPrefsContext';
import { SettingsPanel } from './SettingsPanel';
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
  const { tabletMode, toggleTabletMode, isFullscreen } = useDisplayPrefs();
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      <div className={styles.actions}>
        <div className={styles.settingsWrap}>
          <button
            className={styles.iconBtn}
            onClick={() => setSettingsOpen((o) => !o)}
            aria-label="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.6 3h4.8l.6 2.4 1.2.7 2.4-.7 2.4 4.2-1.8 1.7v1.4l1.8 1.7-2.4 4.2-2.4-.7-1.2.7-.6 2.4H9.6L9 18.6l-1.2-.7-2.4.7L3 14.4l1.8-1.7v-1.4L3 9.6l2.4-4.2 2.4.7L9 5.4Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
        </div>
        <button
          className={styles.iconBtn}
          onClick={toggleTabletMode}
          aria-label="Toggle tablet mode"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            {tabletMode && isFullscreen ? (
              <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />
            ) : (
              <>
                <rect x="4" y="3" width="16" height="18" rx="2" />
                {tabletMode ? <path d="M8 12h8m-4-4v8" /> : <circle cx="12" cy="17" r="0.75" fill="currentColor" />}
              </>
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}
