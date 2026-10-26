export function newId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // crypto.randomUUID is only available in secure contexts (https, localhost).
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
