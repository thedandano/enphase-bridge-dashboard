export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, {
      ...options,
      signal: options?.signal ?? AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new ApiError(0, 'network', err instanceof Error ? err.message : 'Network error');
  }
  if (!res.ok) {
    const body = await res.json().catch(
      (): { error?: string; message?: string } => ({})
    ) as { error?: string; message?: string };
    throw new ApiError(res.status, body.error ?? 'unknown', body.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}
