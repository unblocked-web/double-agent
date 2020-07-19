export function average(numbers: number[]) {
  if (!numbers.length) return 0;
  return Math.floor(numbers.reduce((t, c) => t + c, 0) / numbers.length);
}
