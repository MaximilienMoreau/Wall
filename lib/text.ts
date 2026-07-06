/**
 * Normalise un texte pour la détection de doublons stricts : casse, accents et
 * ponctuation ne comptent pas, mais un mot différent en fait deux questions distinctes.
 */
export function normalizeForDuplicateCheck(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
