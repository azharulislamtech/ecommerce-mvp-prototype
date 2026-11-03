type StatusBadgeProps = {
  children: React.ReactNode;
  testId?: string;
  tone?: "green" | "amber" | "orange" | "red" | "slate" | "blue";
};

const tones = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  orange: "border-orange-300 bg-orange-50 text-orange-800",
  red: "border-rose-200 bg-rose-50 text-rose-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700"
};

export function StatusBadge({ children, testId, tone = "slate" }: StatusBadgeProps) {
  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
