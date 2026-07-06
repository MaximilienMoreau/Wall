import { randomBytes } from "crypto";

/** Normalise un titre en slug ASCII minuscule séparé par des tirets. */
function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function randomSuffix(length = 4): string {
  return randomBytes(length)
    .toString("base64url")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
    .slice(0, length);
}

/** Génère un slug lisible et court à partir d'un titre, avec un suffixe aléatoire anti-collision. */
export function generateSlug(title: string): string {
  const base = slugify(title) || "event";
  return `${base}-${randomSuffix()}`;
}
