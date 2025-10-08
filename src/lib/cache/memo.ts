const store = new Map<string, { value: unknown; expiresAt: number }>();

export function memoizeWithTtl<T>(key: string, ttlMs: number, factory: () => Promise<T>) {
  const now = Date.now();
  const cached = store.get(key);
  if (cached && cached.expiresAt > now) {
    return Promise.resolve(cached.value as T);
  }

  return factory().then((value) => {
    store.set(key, { value, expiresAt: now + ttlMs });
    return value;
  });
}

export function clearCache() {
  store.clear();
}
