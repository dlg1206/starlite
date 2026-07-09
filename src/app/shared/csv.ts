/** Splits a comma-separated user input string into a trimmed, non-empty list. */
export function csvToList(value: string): string[] | undefined {
  const items = value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return items.length ? items : undefined;
}

export function csvToNumberList(value: string): number[] | undefined {
  const items = (csvToList(value) ?? [])
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
  return items.length ? items : undefined;
}
