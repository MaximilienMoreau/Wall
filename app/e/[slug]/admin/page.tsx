"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ExternalLink, Presentation } from "lucide-react";
import { usePolling } from "@/hooks/usePolling";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { getStoredAdminToken, storeAdminToken } from "@/lib/client-storage";
import {
  AdminApiError,
  deleteEvent,
  deleteGroup,
  fetchAdminState,
  moderateQuestion,
  triggerCluster,
  updateEventSettings,
  updateGroup,
  type AdminState,
} from "@/lib/admin-client";
import { StatsRow } from "@/components/admin/StatsRow";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import { ClusterPanel } from "@/components/admin/ClusterPanel";
import { QuestionsList } from "@/components/admin/QuestionsList";
import { GroupsPanel } from "@/components/admin/GroupsPanel";
import { QrCodePanel } from "@/components/admin/QrCodePanel";
import { ExportPanel } from "@/components/admin/ExportPanel";
import { DangerZone } from "@/components/admin/DangerZone";

const POLL_INTERVAL_MS = 4000;
const AUTO_CLUSTER_INTERVAL_MS = 2 * 60 * 1000;

export default function AdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [clustering, setClustering] = useState(false);

  // Le token arrive une fois via ?token=..., puis on le persiste en cookie et on nettoie
  // l'URL. Lecture de cookie/URL : ne peut se faire qu'après montage côté client, d'où
  // l'effet (le rendu serveur initial doit rester identique au premier rendu client).
  useEffect(() => {
    const fromQuery = searchParams.get("token");
    if (fromQuery) {
      storeAdminToken(slug, fromQuery);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToken(fromQuery);
      router.replace(`/e/${slug}/admin`);
      return;
    }
    setToken(getStoredAdminToken(slug));
  }, [slug, searchParams, router]);

  const fetcher = useCallback(async (): Promise<AdminState> => {
    if (!token) throw new AdminApiError("Token manquant", 401);
    return fetchAdminState(slug, token);
  }, [slug, token]);

  const { data, error, loading, refetch, setData } = usePolling(fetcher, POLL_INTERVAL_MS, [token]);

  // Regroupement automatique périodique tant que le toggle est actif et la page ouverte.
  useEffect(() => {
    if (!token || !data?.event.autoClusterEnabled) return;
    const id = setInterval(async () => {
      try {
        await triggerCluster(slug, token);
        refetch();
      } catch {
        // silencieux : le prochain cycle réessaiera
      }
    }, AUTO_CLUSTER_INTERVAL_MS);
    return () => clearInterval(id);
  }, [token, data?.event.autoClusterEnabled, slug, refetch]);

  if (!token) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <p className="font-medium text-neutral-800">Accès administrateur requis</p>
        <p className="text-sm text-neutral-500">
          Colle le token admin reçu à la création de l&apos;événement.
        </p>
        <form
          className="flex w-full flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!tokenInput.trim()) return;
            storeAdminToken(slug, tokenInput.trim());
            setToken(tokenInput.trim());
          }}
        >
          <input
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Token admin"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <Button type="submit">Valider</Button>
        </form>
      </main>
    );
  }

  if (error instanceof AdminApiError && error.status === 401) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <p className="font-medium text-neutral-800">Token invalide</p>
        <p className="text-sm text-neutral-500">Vérifie le lien admin qui t&apos;a été communiqué.</p>
      </main>
    );
  }

  if (loading && !data) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-4">
        <p className="text-neutral-400">Chargement…</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-4">
        <p className="text-neutral-400">Événement introuvable.</p>
      </main>
    );
  }

  const { event, questions, groups, stats } = data;

  async function handleSettingsChange(patch: Partial<typeof event>) {
    setData((prev) => (prev ? { ...prev, event: { ...prev.event, ...patch } } : prev));
    try {
      await updateEventSettings(slug, token!, patch);
    } catch {
      showToast("Échec de la mise à jour des réglages.", "error");
      refetch();
    }
  }

  async function handleStatusChange(id: string, status: (typeof questions)[number]["status"]) {
    setData((prev) =>
      prev
        ? { ...prev, questions: prev.questions.map((q) => (q.id === id ? { ...q, status } : q)) }
        : prev
    );
    try {
      await moderateQuestion(id, token!, { status });
    } catch {
      showToast("Échec de la modération.", "error");
      refetch();
    }
  }

  async function handleGroupChange(id: string, groupId: string | null) {
    setData((prev) =>
      prev
        ? { ...prev, questions: prev.questions.map((q) => (q.id === id ? { ...q, groupId } : q)) }
        : prev
    );
    try {
      await moderateQuestion(id, token!, { groupId });
    } catch {
      showToast("Échec du changement de thème.", "error");
      refetch();
    }
  }

  async function handleRenameGroup(id: string, label: string) {
    try {
      await updateGroup(id, token!, { label });
      refetch();
    } catch {
      showToast("Échec du renommage.", "error");
    }
  }

  async function handleEditSynthesis(id: string, synthesizedQuestion: string) {
    try {
      await updateGroup(id, token!, { synthesizedQuestion });
      refetch();
    } catch {
      showToast("Échec de la modification.", "error");
    }
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    const sorted = [...groups].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((g) => g.id === id);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= sorted.length) return;
    const a = sorted[index];
    const b = sorted[swapWith];
    try {
      await Promise.all([
        updateGroup(a.id, token!, { order: b.order }),
        updateGroup(b.id, token!, { order: a.order }),
      ]);
      refetch();
    } catch {
      showToast("Échec du réordonnancement.", "error");
      // L'un des deux appels a pu passer et pas l'autre : on resynchronise sur l'état
      // serveur réel plutôt que de laisser l'UI locale désynchronisée.
      refetch();
    }
  }

  async function handleDeleteGroup(id: string) {
    try {
      await deleteGroup(id, token!);
      showToast("Thème supprimé.", "success");
      refetch();
    } catch {
      showToast("Échec de la suppression du thème.", "error");
    }
  }

  async function handleCluster() {
    setClustering(true);
    try {
      const result = await triggerCluster(slug, token!);
      showToast(
        result.groupCount !== undefined
          ? `Regroupement terminé : ${result.groupCount} thème(s).`
          : "Regroupement terminé.",
        "success"
      );
      refetch();
    } catch {
      showToast("Échec du regroupement IA.", "error");
    } finally {
      setClustering(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteEvent(slug, token!);
      showToast("Événement supprimé.", "success");
      router.push("/");
    } catch {
      showToast("Échec de la suppression.", "error");
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{event.title}</h1>
          <p className="text-sm text-neutral-500">Dashboard organisateur</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/e/${slug}`} target="_blank">
            <Button variant="secondary" size="sm">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Page participant
            </Button>
          </Link>
          <Link href={`/e/${slug}/wall`} target="_blank">
            <Button variant="secondary" size="sm">
              <Presentation className="h-3.5 w-3.5" aria-hidden /> Mode wall
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-6">
        <StatsRow stats={stats} />
        <SettingsPanel event={event} onChange={handleSettingsChange} />
        <ClusterPanel onCluster={handleCluster} clustering={clustering} autoEnabled={event.autoClusterEnabled} />

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Modération
          </h2>
          <QuestionsList
            questions={questions}
            groups={groups}
            onStatusChange={handleStatusChange}
            onGroupChange={handleGroupChange}
          />
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Thèmes
          </h2>
          <GroupsPanel
            groups={groups}
            onRename={handleRenameGroup}
            onEditSynthesis={handleEditSynthesis}
            onReorder={handleReorder}
            onDelete={handleDeleteGroup}
          />
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <QrCodePanel slug={slug} />
          <ExportPanel slug={slug} token={token} />
        </div>

        <DangerZone onDelete={handleDelete} />
      </div>
    </main>
  );
}
