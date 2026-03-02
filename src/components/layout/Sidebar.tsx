import { Building2 } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-muted/40 p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 font-semibold mb-6">
        <Building2 className="h-5 w-5" />
        <span>Organizations</span>
      </div>
      <div className="flex-1 space-y-1">
        {/* Placeholder for Organizations list */}
        <p className="text-sm text-muted-foreground">No organizations loaded yet.</p>
      </div>
    </aside>
  );
}
