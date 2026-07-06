// Rate limiting en mémoire (Map), suffisant pour un MVP mono-instance.
// Note : ne survit pas à un redémarrage / ne fonctionne pas en multi-instance,
// acceptable pour ce contexte (meetup, une seule instance de dev/déploiement).

const lastActionAt = new Map<string, number>();

/**
 * Retourne { allowed: true } si la clé n'a pas déclenché d'action dans la fenêtre,
 * sinon { allowed: false, retryAfterMs }. Enregistre l'action si autorisée.
 */
export function checkRateLimit(
  key: string,
  windowMs: number
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  const now = Date.now();
  const last = lastActionAt.get(key);
  if (last !== undefined && now - last < windowMs) {
    return { allowed: false, retryAfterMs: windowMs - (now - last) };
  }
  lastActionAt.set(key, now);
  return { allowed: true };
}

// Purge périodique pour éviter une fuite mémoire sur les longs événements.
setInterval(
  () => {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [key, ts] of lastActionAt) {
      if (ts < cutoff) lastActionAt.delete(key);
    }
  },
  5 * 60 * 1000
).unref();
