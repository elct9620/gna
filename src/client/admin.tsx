import { useEffect, useState } from "react";

import { AppSidebar } from "@/components/appSidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Subscriber {
  email: string;
  nickname?: string;
  subscribedAt: string;
}

export function Admin() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);

  useEffect(() => {
    fetch("/admin/api/subscribers")
      .then((res) => res.json<{ subscribers: Subscriber[] }>())
      .then((data) => setSubscribers(data.subscribers));
  }, []);

  return (
    <SidebarProvider>
      <title>Admin Dashboard - Gna</title>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">Admin Dashboard</h1>
        </header>
        <main className="flex-1 p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Subscribers</h2>
            <p className="text-sm text-muted-foreground">
              {subscribers.length} subscriber
              {subscribers.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nickname</TableHead>
                <TableHead>Subscribed At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground"
                  >
                    No subscribers yet.
                  </TableCell>
                </TableRow>
              ) : (
                subscribers.map((subscriber) => (
                  <TableRow key={subscriber.email}>
                    <TableCell>{subscriber.email}</TableCell>
                    <TableCell>
                      {subscriber.nickname ?? "\u2014"}
                    </TableCell>
                    <TableCell>
                      {new Date(subscriber.subscribedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
