export default function Card({
  title,
  value,
  hint,
  href,
}: {
  title: string;
  value?: string | number;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <div className="card-surface rounded-xl shadow-sm p-4 hover:shadow-md transition bg-white dark:bg-[var(--surface)]">
      <div className="text-sm text-gray-600 dark:text-white/60">{title}</div>
      {value !== undefined && (
        <div className="text-2xl font-bold text-moj-green dark:text-moj-gold mt-1">{value}</div>
      )}
      {hint && <div className="text-xs text-gray-400 dark:text-white/40 mt-1">{hint}</div>}
    </div>
  );
  if (href) {
    return (
      <a href={href} className="block min-w-0">
        {inner}
      </a>
    );
  }
  return inner;
}
