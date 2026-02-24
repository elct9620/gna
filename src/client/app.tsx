import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function App() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-4xl font-bold">Coming Soon</CardTitle>
          <CardDescription>
            A lightweight, self-hosted newsletter platform.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
