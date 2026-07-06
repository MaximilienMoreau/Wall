"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function QrCodePanel({ slug }: { slug: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [participateUrl, setParticipateUrl] = useState("");

  useEffect(() => {
    const url = `${window.location.origin}/e/${slug}`;
    QRCode.toDataURL(url, { width: 480, margin: 2, color: { dark: "#171717", light: "#ffffff" } })
      .then((generated) => {
        setParticipateUrl(url);
        setDataUrl(generated);
      })
      .catch(() => {
        setParticipateUrl(url);
        setDataUrl(null);
      });
  }, [slug]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-center shadow-sm">
      <p className="text-sm font-medium text-neutral-800">QR code de participation</p>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt={`QR code vers ${participateUrl}`} className="h-40 w-40" />
      ) : (
        <div className="h-40 w-40 animate-pulse rounded-lg bg-neutral-100" />
      )}
      <p className="max-w-[16rem] break-all text-xs text-neutral-400">{participateUrl}</p>
      <a href={dataUrl ?? undefined} download={`wall-${slug}-qrcode.png`}>
        <Button variant="secondary" size="sm" disabled={!dataUrl}>
          <Download className="h-3.5 w-3.5" aria-hidden />
          Télécharger le PNG
        </Button>
      </a>
    </div>
  );
}
