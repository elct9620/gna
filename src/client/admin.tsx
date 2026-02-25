import { useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AppSidebar } from "@/components/appSidebar";
import { Button } from "@/components/ui/button";
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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    No subscribers yet.
                  </TableCell>
                </TableRow>
              ) : (
                subscribers.map((subscriber) => (
                  <TableRow key={subscriber.email}>
                    <TableCell>{subscriber.email}</TableCell>
                    <TableCell>{subscriber.nickname ?? "\u2014"}</TableCell>
                    <TableCell>
                      {new Date(subscriber.subscribedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove subscriber
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {subscriber.email}
                              ? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                const res = await fetch(
                                  `/admin/api/subscribers/${encodeURIComponent(subscriber.email)}`,
                                  { method: "DELETE" },
                                );

                                if (res.ok) {
                                  setSubscribers((prev) =>
                                    prev.filter(
                                      (s) => s.email !== subscriber.email,
                                    ),
                                  );
                                }
                              }}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
