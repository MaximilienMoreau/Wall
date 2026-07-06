"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { exportEvent } from "@/lib/admin-client";
import { useToast } from "@/components/ui/Toast";

export function ExportPanel({ slug, token }: { slug: string; token: string }) {
  const [downloading, setDownloading] = useState<"md" | "csv" | null>(null);
  const { showToast } = useToast();

  async function handleExport(format: "md" | "csv") {
    setDownloading(format);
    try {
      const { blob, filename } = await exportEvent(slug, token, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Échec de l'export.", "error");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-neutral-800">Export des données</p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" loading={downloading === "md"} onClick={() => handleExport("md")}>
          <FileDown className="h-3.5 w-3.5" aria-hidden /> Markdown
        </Button>
        <Button variant="secondary" size="sm" loading={downloading === "csv"} onClick={() => handleExport("csv")}>
          <FileDown className="h-3.5 w-3.5" aria-hidden /> CSV
        </Button>
      </div>
    </div>
  );
}
