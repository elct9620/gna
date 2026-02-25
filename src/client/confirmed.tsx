import { useSearchParams } from "react-router";
import { CenteredCard } from "@/components/centeredCard";

export function Confirmed() {
  const [searchParams] = useSearchParams();
  const error = searchParams.get("error");

  if (error) {
    return (
      <>
        <title>Confirmation Failed - Gna</title>
        <CenteredCard title="Confirmation Failed">
          <p className="text-muted-foreground">
            The confirmation link is invalid or has expired. Please request a
            new one.
          </p>
        </CenteredCard>
      </>
    );
  }

  return (
    <>
      <title>Subscription Confirmed - Gna</title>
      <CenteredCard title="Welcome!">
        <p className="text-muted-foreground">
          Your subscription has been confirmed. You will start receiving our
          newsletter soon.
        </p>
      </CenteredCard>
    </>
  );
}
