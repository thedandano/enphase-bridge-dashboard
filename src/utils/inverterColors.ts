export const PALETTE: readonly string[] = [
  '#8AFF80',
  '#FFCA80',
  '#80FFEA',
  '#FF9580',
  '#9580FF',
  '#FF80BF',
  '#FFFF80',
  '#80D4FF',
  '#D4FF80',
  '#FF80D4',
];

export function colorFor(index: number): string {
  return PALETTE[index % PALETTE.length];
}
