import { useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Profile() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const emailChanged = searchParams.get("email_changed");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
      <title>Profile - Gna</title>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Subscriber Profile</CardTitle>
        </CardHeader>
        <CardContent>
          {emailChanged === "true" ? (
            <p className="text-muted-foreground">
              Your email address has been updated successfully.
            </p>
          ) : token ? (
            <p className="text-muted-foreground">
              Use this page to manage your subscriber profile.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Request a profile link from the newsletter to manage your
              subscription settings.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
