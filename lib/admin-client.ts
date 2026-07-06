"use client";

import type { AdminEventDTO, EventStats, QuestionDTO, QuestionGroupDTO } from "@/lib/types";

export type AdminGroupDTO = Omit<QuestionGroupDTO, "questionCount">;

export type AdminState = {
  event: AdminEventDTO;
  questions: QuestionDTO[];
  groups: AdminGroupDTO[];
  stats: EventStats;
};

class AdminApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function adminFetch(url: string, token: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      "x-admin-token": token,
      ...init.headers,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new AdminApiError(data?.error || `Erreur ${res.status}`, res.status);
  }
  return res;
}

export { AdminApiError };

export async function fetchAdminState(slug: string, token: string): Promise<AdminState> {
  const res = await adminFetch(`/api/events/${slug}/admin`, token, { cache: "no-store" });
  return res.json();
}

export async function updateEventSettings(
  slug: string,
  token: string,
  patch: Partial<Pick<AdminEventDTO, "title" | "description" | "isOpen" | "allowAnonymous" | "autoApprove" | "autoClusterEnabled">>
) {
  const res = await adminFetch(`/api/events/${slug}`, token, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return res.json();
}

export async function moderateQuestion(
  id: string,
  token: string,
  patch: { status?: QuestionDTO["status"]; groupId?: string | null }
) {
  const res = await adminFetch(`/api/questions/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return res.json();
}

export async function updateGroup(
  id: string,
  token: string,
  patch: { label?: string; synthesizedQuestion?: string; order?: number }
) {
  const res = await adminFetch(`/api/groups/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return res.json();
}

export async function triggerCluster(slug: string, token: string) {
  const res = await adminFetch(`/api/events/${slug}/cluster`, token, { method: "POST" });
  return res.json();
}

export async function deleteEvent(slug: string, token: string) {
  await adminFetch(`/api/events/${slug}`, token, { method: "DELETE" });
}

export async function exportEvent(
  slug: string,
  token: string,
  format: "md" | "csv"
): Promise<{ blob: Blob; filename: string }> {
  const res = await adminFetch(`/api/events/${slug}/export?format=${format}`, token);
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || `wall-${slug}.${format}`;
  return { blob, filename };
}
