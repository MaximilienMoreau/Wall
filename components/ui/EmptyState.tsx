import { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-300 px-6 py-12 text-center">
      <Icon className="h-8 w-8 text-neutral-400" aria-hidden />
      <p className="font-medium text-neutral-700">{title}</p>
      {description && <p className="max-w-sm text-sm text-neutral-500">{description}</p>}
    </div>
  );
}
