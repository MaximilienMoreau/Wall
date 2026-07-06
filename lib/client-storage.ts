"use client";

const FINGERPRINT_KEY = "wall_fingerprint";

/**
 * Identifiant anonyme aléatoire stocké en localStorage, pas de fingerprinting
 * navigateur réel, juste un UUID généré une fois par appareil/navigateur.
 */
export function getFingerprint(): string {
  if (typeof window === "undefined") return "";
  let fp = window.localStorage.getItem(FINGERPRINT_KEY);
  if (!fp) {
    fp = crypto.randomUUID();
    window.localStorage.setItem(FINGERPRINT_KEY, fp);
  }
  return fp;
}

function votedKey(eventSlug: string): string {
  return `wall_voted_${eventSlug}`;
}

export function getVotedQuestionIds(eventSlug: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(votedKey(eventSlug));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function markQuestionVoted(eventSlug: string, questionId: string): void {
  if (typeof window === "undefined") return;
  const current = getVotedQuestionIds(eventSlug);
  if (!current.includes(questionId)) {
    window.localStorage.setItem(votedKey(eventSlug), JSON.stringify([...current, questionId]));
  }
}

// Bloc 3 (Poussé) : on peut retirer son soutien, il faut donc pouvoir l'oublier localement aussi.
export function unmarkQuestionVoted(eventSlug: string, questionId: string): void {
  if (typeof window === "undefined") return;
  const current = getVotedQuestionIds(eventSlug).filter((id) => id !== questionId);
  window.localStorage.setItem(votedKey(eventSlug), JSON.stringify(current));
}

// Le token admin est stocké en cookie (accès initial via ?token=... dans l'URL,
// puis persistance en cookie pour ne pas avoir à le remettre dans l'URL à chaque visite).
function adminCookieName(eventSlug: string): string {
  return `wall_admin_${eventSlug}`;
}

export function getStoredAdminToken(eventSlug: string): string | null {
  if (typeof document === "undefined") return null;
  const name = adminCookieName(eventSlug);
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

export function storeAdminToken(eventSlug: string, token: string): void {
  if (typeof document === "undefined") return;
  const maxAgeSeconds = 60 * 60 * 24 * 30; // 30 jours
  document.cookie = `${adminCookieName(eventSlug)}=${encodeURIComponent(
    token
  )}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}
