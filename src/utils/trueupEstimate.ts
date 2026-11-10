import { ApiError } from '@/api/client';

// Bridge data lands in 15-minute windows, and every estimate call writes a row
// on the bridge; refreshing more often just re-requests the same numbers.
export const TRUEUP_REFRESH_MS = 15 * 60 * 1000;

export interface ErrorInfo {
  type: 'no_schedule' | 'no_data' | 'generic';
  message: string;
}

export function getErrorMessage(err: unknown): ErrorInfo {
  if (err instanceof ApiError) {
    if (err.code === 'no_tou_schedule') {
      return {
        type: 'no_schedule',
        message:
          'TOU not configured — configure OpenEI in bridge config.toml',
      };
    }
    if (err.code === 'insufficient_data') {
      return { type: 'no_data', message: 'No energy data for the selected period' };
    }
  }
  return {
    type: 'generic',
    message: err instanceof Error ? err.message : 'Unknown error',
  };
}
