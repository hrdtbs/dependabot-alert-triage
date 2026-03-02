import { Sidebar } from "./Sidebar";
import { MainContent } from "./MainContent";
import { SettingsDialog } from "../SettingsDialog";

export function Shell() {
  return (
    <div className="flex h-screen w-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col relative h-full w-full">
        {/* Header/Top Bar */}
        <header className="h-14 border-b flex items-center justify-between px-6 bg-card shrink-0">
          <div className="font-semibold text-sm">Dependabot AI Triage</div>
          <SettingsDialog />
        </header>
        <MainContent />
      </div>
    </div>
  );
}
