export default function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-moj-green dark:text-moj-gold break-words">{title}</h1>
        {subtitle && <p className="text-sm text-gray-600 dark:text-white/55 mt-1">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">{actions}</div>
      )}
    </div>
  );
}
