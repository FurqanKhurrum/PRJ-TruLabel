export default function Button({ children, className = "", disabled, ...props }) {
  return (
    <button
      className={`inline-flex w-full items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold tracking-wide transition duration-200 ${
        disabled
          ? "cursor-not-allowed bg-[color:var(--border)] text-[color:var(--muted)]"
          : "bg-[color:var(--accent)] text-white shadow-[0_12px_30px_rgba(15,118,110,0.3)] hover:-translate-y-0.5 hover:bg-[color:var(--accent-strong)]"
      } ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
