import { useEffect, useState } from "react";
import type { InferResponseType } from "hono/client";

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
import { AdminLayout } from "@/components/adminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { client } from "./api";

type Subscriber = InferResponseType<
  typeof client.admin.api.subscribers.$get
>["subscribers"][number];

export function Admin() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    client.admin.api.subscribers
      .$get()
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch subscribers");
        return res.json();
      })
      .then((data) => setSubscribers(data.subscribers))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout title="Admin Dashboard - Gna" pageTitle="Admin Dashboard">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Subscribers</h2>
        <p className="text-sm text-muted-foreground">
          {subscribers.length} subscriber
          {subscribers.length !== 1 ? "s" : ""}
        </p>
      </div>
      {error && (
        <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {deleteError && (
        <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {deleteError}
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Nickname</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center text-muted-foreground"
              >
                Loading...
              </TableCell>
            </TableRow>
          ) : subscribers.length === 0 ? (
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
                  <Badge
                    variant={
                      subscriber.status === "activated"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {subscriber.status.charAt(0).toUpperCase() +
                      subscriber.status.slice(1)}
                  </Badge>
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
                        <AlertDialogTitle>Remove subscriber</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove {subscriber.email}?
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            setDeleteError(null);
                            try {
                              const res = await client.admin.api.subscribers[
                                ":email"
                              ].$delete({
                                param: { email: subscriber.email },
                              });

                              if (res.ok) {
                                setSubscribers((prev) =>
                                  prev.filter(
                                    (s) => s.email !== subscriber.email,
                                  ),
                                );
                              } else {
                                setDeleteError(
                                  `Failed to remove ${subscriber.email}`,
                                );
                              }
                            } catch {
                              setDeleteError(
                                `Failed to remove ${subscriber.email}`,
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
    </AdminLayout>
  );
}
