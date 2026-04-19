export function emptyQueryResult<T>(): Promise<{ data: T[]; error: null }> {
  return Promise.resolve({ data: [] as T[], error: null });
}
