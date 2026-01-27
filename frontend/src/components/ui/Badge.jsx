const badgeStyles = {
  success: "bg-emerald-100 text-emerald-700",
  info: "bg-sky-100 text-sky-700",
  warn: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
};

export default function Badge({ tone = "info", className = "", children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
        badgeStyles[tone]
      } ${className}`}
    >
      {children}
    </span>
  );
}
