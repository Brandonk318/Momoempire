export default function PageHeader({ eyebrow, title, description, actions, testId }) {
  return (
    <header className="flex items-start justify-between gap-6 mb-8" data-testid={testId}>
      <div>
        {eyebrow && <div className="overline mb-2">{eyebrow}</div>}
        <h1 className="font-display text-3xl md:text-4xl tracking-tight leading-[1.05]">{title}</h1>
        {description && (
          <p className="text-[15px] text-muted-foreground mt-2 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
