export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}