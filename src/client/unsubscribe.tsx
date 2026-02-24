import { useSearchParams } from "react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
      <title>Unsubscribe - Gna</title>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Unsubscribe</CardTitle>
        </CardHeader>
        <CardContent>
          {status === "success" ? (
            <p className="text-muted-foreground">
              You have been successfully unsubscribed. You will no longer
              receive our newsletter.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Use the unsubscribe link in your email to manage your
              subscription.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
