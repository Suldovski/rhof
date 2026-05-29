export function toCaps(value: unknown): string {
  return typeof value === "string" ? value.toUpperCase() : "";
}
