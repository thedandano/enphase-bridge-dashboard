export function epochToRfc3339(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toISOString();
}
