import { AlertList } from "../alerts/AlertList";

export function MainContent() {
  return (
    <main className="flex-1 p-6 h-full overflow-auto">
      <AlertList />
    </main>
  );
}
