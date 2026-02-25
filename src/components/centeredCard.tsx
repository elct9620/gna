import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CenteredCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function CenteredCard({
  title,
  description,
  children,
}: CenteredCardProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
