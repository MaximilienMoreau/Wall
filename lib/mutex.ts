// Mutex en mémoire par clé, pour sérialiser une section critique (check-then-act)
// sur un même process. Suffisant pour un MVP mono-instance (cf. lib/rate-limit.ts).

const queues = new Map<string, Promise<unknown>>();

/** Exécute `fn` après que tout appel précédent avec la même `key` se soit terminé. */
export function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve();
  const run = previous.then(fn, fn);
  const tail = run.catch(() => undefined);
  queues.set(key, tail);
  tail.finally(() => {
    if (queues.get(key) === tail) queues.delete(key);
  });
  return run;
}
