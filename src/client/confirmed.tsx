import { useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Confirmed() {
  const [searchParams] = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
      {error ? (
        <>
          <title>Confirmation Failed - Gna</title>
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirmation Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                The confirmation link is invalid or has expired. Please request
                a new one.
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <title>Subscription Confirmed - Gna</title>
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Welcome!</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Your subscription has been confirmed. You will start receiving
                our newsletter soon.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
