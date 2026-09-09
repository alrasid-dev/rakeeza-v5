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
    <div className="bg-white rounded-xl border border-moj-green/15 shadow-sm p-4 hover:shadow-md transition">
      <div className="text-sm text-gray-600">{title}</div>
      {value !== undefined && <div className="text-2xl font-bold text-moj-green mt-1">{value}</div>}
      {hint && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
    </div>
  );
  if (href) {
    return (
      <a href={href} className="block">
        {inner}
      </a>
    );
  }
  return inner;
}
