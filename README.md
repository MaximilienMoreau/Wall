# Wall

Mur de questions collaboratif pour événements (meetups, conférences, AMA). Les
participants scannent un QR code et posent leurs questions depuis leur
téléphone ; l'IA (Claude) regroupe en temps quasi réel les questions
similaires en thèmes ; l'animateur pilote la session depuis un dashboard admin
et affiche un mode présentateur plein écran.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Composants maison (pas de librairie UI lourde) + `lucide-react` pour les icônes
- Prisma 6 + SQLite en dev (compatible PostgreSQL en prod, changement de provider uniquement)
- `@anthropic-ai/sdk` (`claude-sonnet-4-6`) pour le clustering et la reformulation
- Rafraîchissement temps réel par polling léger (4–5 s, `hooks/usePolling.ts`), pas de WebSocket
- `qrcode` pour la génération de QR codes, Zod pour la validation des inputs API

## Setup

### 1. Variables d'environnement

`.env.example` liste les deux variables nécessaires. Next.js charge automatiquement
`.env` et `.env.local` (les deux sont ignorés par git), tu peux répartir les valeurs
comme tu veux ; par défaut le projet est organisé ainsi :

```bash
cp .env.example .env.local   # puis retire ANTHROPIC_API_KEY de .env.local si tu utilises .env pour la clé
```

```env
# .env.local
DATABASE_URL="file:./dev.db"

# .env
ANTHROPIC_API_KEY="sk-ant-..."
```

Sans `ANTHROPIC_API_KEY`, toute l'application fonctionne normalement (soumission,
vote, modération, mode wall, exports). Seul le bouton « Regrouper avec l'IA »
renverra une erreur explicite (503).

### 2. Installation et base de données

```bash
npm install
npx prisma migrate dev   # crée prisma/dev.db et applique le schéma
npx prisma db seed       # événement de démo "AI FIRST Meetup" avec ~15 questions
```

### 3. Lancer le serveur de dev

```bash
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

### Passer en production avec PostgreSQL

Dans `prisma/schema.prisma`, change simplement le provider :

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Puis mets à jour `DATABASE_URL` avec une URL `postgresql://...` et relance
`npx prisma migrate deploy`.

## Parcours de démo (5 étapes)

Le seed crée un événement `ai-first` avec un token admin fixe
(`demo-admin-token-do-not-use-in-prod`), pratique pour la démo, à ne jamais
utiliser en production (un vrai `POST /api/events` génère un token aléatoire).

1. **Participant** : ouvre [http://localhost:3000/e/ai-first](http://localhost:3000/e/ai-first),
   pose une question, vote (▲) sur une question existante (reclique pour retirer
   ton vote). Repose la même question mot pour mot : elle est refusée comme
   doublon. Onglet « Thèmes » pour voir les regroupements déjà en place.
2. **Admin** : ouvre
   [http://localhost:3000/e/ai-first/admin?token=demo-admin-token-do-not-use-in-prod](http://localhost:3000/e/ai-first/admin?token=demo-admin-token-do-not-use-in-prod).
   Le token se stocke en cookie : les visites suivantes n'ont plus besoin du
   `?token=` dans l'URL.
3. **Modération** : approuve la question en attente, masque/réaffiche une
   question, réassigne une question à un autre thème via le sélecteur.
4. **Clustering IA** : clique sur « Regrouper avec l'IA » (nécessite
   `ANTHROPIC_API_KEY`) : les 3 questions volontairement laissées hors groupe
   par le seed (emploi, compétences, code review) sont regroupées en un
   nouveau thème. Édite le libellé ou la question synthèse d'un groupe,
   réordonne les thèmes.
5. **Mode wall** : ouvre
   [http://localhost:3000/e/ai-first/wall](http://localhost:3000/e/ai-first/wall)
   en plein écran (idéal sur un second écran/projecteur). Navigue avec
   `←`/`→`, appuie sur `Espace` pour marquer le thème affiché comme répondu.

Pour terminer : depuis l'admin, exporte les données (Markdown ou CSV), télécharge
le QR code de participation, ou ferme les soumissions.

## Structure

```
app/
  page.tsx                     landing (créer / rejoindre un événement)
  e/[slug]/page.tsx             page participant
  e/[slug]/wall/page.tsx        mode présentateur plein écran
  e/[slug]/admin/page.tsx       dashboard organisateur
  api/                          route handlers (events, questions, votes, groups, cluster, export)
hooks/
  usePolling.ts                 rafraîchissement périodique côté client (participant, admin, wall)
lib/
  clustering.ts                 appel Claude + parsing défensif + application transactionnelle
  export.ts                     génération des exports Markdown et CSV
  text.ts                       normalisation pour le rejet des questions dupliquées
  prisma.ts, validation.ts, admin-auth.ts, admin-request.ts, admin-client.ts,
  rate-limit.ts, slug.ts, client-storage.ts, types.ts
prisma/
  schema.prisma, seed.ts
components/
  ui/                           composants maison (Button, Toggle, Tabs, Toast, EmptyState)
  participant/, admin/, landing/
```

## Sécurité & confidentialité

- Aucune donnée personnelle obligatoire : prénom optionnel, pas d'email, pas de compte.
- Le fingerprint anti-double-vote est un UUID aléatoire stocké en localStorage
  (pas de fingerprinting navigateur).
- Le token admin est comparé en temps constant (`crypto.timingSafeEqual`) et
  n'est jamais renvoyé par les endpoints publics.
- Rate limiting en mémoire (1 question / 30 s par appareil), suffisant pour
  un MVP mono-instance ; à remplacer par un store partagé (Redis) en cas de
  déploiement multi-instance.
- Suppression définitive d'un événement (et de toutes ses données) disponible
  depuis l'admin.
# Wall
