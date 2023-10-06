export function asRecord<T>(obj: { [key: string]: T }) {
  return obj as Record<string, T>;
}
