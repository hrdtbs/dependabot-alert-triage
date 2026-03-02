import { Building2, User } from "lucide-react";
import { useOrganizations } from "../../lib/github";
import { useStore, ActiveScope } from "../../store/useStore";
import { cn } from "../../lib/utils";

export function Sidebar() {
  const { user, orgs, isLoading, isError } = useOrganizations();
  const { activeScope, setActiveScope } = useStore();

  const handleSelect = (scope: ActiveScope) => {
    setActiveScope(scope);
  };

  return (
    <aside className="w-64 border-r bg-muted/40 p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 font-semibold mb-6">
        <Building2 className="h-5 w-5" />
        <span>Organizations</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {isError && <p className="text-sm text-destructive">Failed to load scopes.</p>}
        {!isLoading && !isError && (
          <>
            {user && (
              <button
                onClick={() => handleSelect({ type: "user", name: user })}
                className={cn(
                  "flex items-center w-full gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
                  activeScope?.type === "user" && activeScope?.name === user
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                    : "text-muted-foreground"
                )}
              >
                <User className="h-4 w-4" />
                <span>{user}</span>
              </button>
            )}

            {orgs.length > 0 && (
              <div className="pt-4">
                <p className="px-3 text-xs font-semibold text-muted-foreground mb-2">
                  ORGANIZATIONS
                </p>
                <div className="space-y-1">
                  {orgs.map((org) => (
                    <button
                      key={org}
                      onClick={() => handleSelect({ type: "org", name: org })}
                      className={cn(
                        "flex items-center w-full gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
                        activeScope?.type === "org" && activeScope?.name === org
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      <Building2 className="h-4 w-4" />
                      <span className="truncate">{org}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
