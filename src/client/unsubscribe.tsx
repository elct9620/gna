import { useSearchParams } from "react-router";
import { CenteredCard } from "@/components/centered-card";

export function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status");

  return (
    <>
      <title>Unsubscribe - Gna</title>
      <CenteredCard title="Unsubscribe">
        {status === "success" ? (
          <p className="text-muted-foreground">
            You have been successfully unsubscribed. You will no longer receive
            our newsletter.
          </p>
        ) : (
          <p className="text-muted-foreground">
            Use the unsubscribe link in your email to manage your subscription.
          </p>
        )}
      </CenteredCard>
    </>
  );
}
