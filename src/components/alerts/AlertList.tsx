import { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { useStore } from "../../store/useStore";
import { useAlerts, AlertTuple } from "../../lib/alerts";
import { RefreshCw, Search, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-black",
  low: "bg-blue-500 text-white",
};

export function AlertList() {
  const { activeScope } = useStore();
  const { data: alerts, isLoading, isSyncing, syncAlerts } = useAlerts(activeScope);

  const [filterText, setFilterText] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState<{
    key: "severity" | "created_at";
    direction: "asc" | "desc";
  }>({ key: "created_at", direction: "desc" });

  useEffect(() => {
    if (activeScope) {
      syncAlerts();
    }
  }, [activeScope, syncAlerts]);

  const filteredAlerts = useMemo(() => {
    const filtered = alerts.filter(([repo, alert]: AlertTuple) => {
      const matchesText =
        repo.toLowerCase().includes(filterText.toLowerCase()) ||
        alert.dependency.package.name.toLowerCase().includes(filterText.toLowerCase());

      const matchesSeverity =
        severityFilter === "all" || alert.security_advisory.severity === severityFilter;

      return matchesText && matchesSeverity;
    });

    return filtered.sort((a: AlertTuple, b: AlertTuple) => {
      if (sortConfig.key === "created_at") {
        const dateA = new Date(a[1].created_at).getTime();
        const dateB = new Date(b[1].created_at).getTime();
        return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
      } else if (sortConfig.key === "severity") {
        const severityOrder: Record<string, number> = {
          critical: 4,
          high: 3,
          medium: 2,
          low: 1,
        };
        const sevA = severityOrder[a[1].security_advisory.severity] || 0;
        const sevB = severityOrder[b[1].security_advisory.severity] || 0;
        return sortConfig.direction === "asc" ? sevA - sevB : sevB - sevA;
      }
      return 0;
    });
  }, [alerts, filterText, severityFilter, sortConfig]);

  const requestSort = (key: "severity" | "created_at") => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  if (!activeScope) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Select an Organization or User from the sidebar to view alerts.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Alerts for {activeScope.name}
          </h2>
          <p className="text-muted-foreground">
            Manage your Dependabot alerts across repositories.
          </p>
        </div>
        <Button
          onClick={() => syncAlerts()}
          disabled={isSyncing}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing..." : "Sync"}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by repo or package..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort("severity")} className="h-8 p-0 hover:bg-transparent font-medium">
                  Severity <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Repository</TableHead>
              <TableHead>State</TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort("created_at")} className="h-8 p-0 hover:bg-transparent font-medium">
                  Created At <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))
            ) : filteredAlerts.length > 0 ? (
              filteredAlerts.map(([repo, alert]: AlertTuple) => (
                <TableRow key={`${repo}-${alert.number}`}>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={SEVERITY_COLORS[alert.security_advisory.severity] || ""}
                    >
                      {alert.security_advisory.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {alert.dependency.package.name}
                  </TableCell>
                  <TableCell>{repo}</TableCell>
                  <TableCell>
                    <Badge variant={alert.state === "open" ? "destructive" : "default"}>
                      {alert.state}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(alert.created_at), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No alerts found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
