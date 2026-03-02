export function MainContent() {
  return (
    <main className="flex-1 p-6 h-full overflow-auto">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Triage Dashboard</h1>
        <p className="text-muted-foreground">
          Select an organization from the sidebar to view alerts.
        </p>
        {/* Placeholder for Data Grid */}
      </div>
    </main>
  );
}
