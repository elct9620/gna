import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { Button } from "@/components/ui/button";

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <title>Page Not Found - Gna</title>
        <p className="text-8xl font-bold text-muted-foreground">404</p>
        <h1 className="text-2xl font-bold">Page Not Found</h1>
        <p className="text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button asChild>
          <Link to="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <title>Error - Gna</title>
      <p className="text-8xl font-bold text-muted-foreground">500</p>
      <h1 className="text-2xl font-bold">Something Went Wrong</h1>
      <p className="text-muted-foreground">
        An unexpected error occurred. Please try again later.
      </p>
      <Button asChild>
        <Link to="/">Back to Home</Link>
      </Button>
    </div>
  );
}
