export function average(numbers: number[]) {
  if (!numbers.length) return 0;
  return Math.floor(numbers.reduce((t, c) => t + c, 0) / numbers.length);
}

export function sum(numbers: number[]) {
  return numbers.reduce((a, b) => a + b, 0);
}

export function sumValues(object: { [key: string]: number }) {
  return sum(Object.values(object));
}
