"use client";

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { value: T; label: string; badge?: number }[];
  active: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="tablist" className="flex gap-1 rounded-xl bg-neutral-100 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          type="button"
          aria-selected={active === tab.value}
          onClick={() => onChange(tab.value)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            active === tab.value
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          {tab.label}
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className="ml-1.5 rounded-full bg-accent/10 px-1.5 py-0.5 text-xs text-accent">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
