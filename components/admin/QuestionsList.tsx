"use client";

import { useState } from "react";
import { Inbox } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { QuestionRow } from "@/components/admin/QuestionRow";
import type { AdminGroupDTO } from "@/lib/admin-client";
import type { QuestionDTO } from "@/lib/types";

type Filter = "ALL" | QuestionDTO["status"];

export function QuestionsList({
  questions,
  groups,
  onStatusChange,
  onGroupChange,
}: {
  questions: QuestionDTO[];
  groups: AdminGroupDTO[];
  onStatusChange: (id: string, status: QuestionDTO["status"]) => void;
  onGroupChange: (id: string, groupId: string | null) => void;
}) {
  const [filter, setFilter] = useState<Filter>("ALL");

  const filtered = filter === "ALL" ? questions : questions.filter((q) => q.status === filter);
  const pendingCount = questions.filter((q) => q.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-3">
      <Tabs
        active={filter}
        onChange={setFilter}
        tabs={[
          { value: "ALL", label: "Toutes" },
          { value: "PENDING", label: "En attente", badge: pendingCount },
          { value: "APPROVED", label: "Approuvées" },
          { value: "ANSWERED", label: "Répondues" },
          { value: "HIDDEN", label: "Masquées" },
        ]}
      />

      {filtered.length === 0 ? (
        <EmptyState icon={Inbox} title="Aucune question dans ce filtre" />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((q) => (
            <QuestionRow
              key={q.id}
              question={q}
              groups={groups}
              onStatusChange={(status) => onStatusChange(q.id, status)}
              onGroupChange={(groupId) => onGroupChange(q.id, groupId)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
