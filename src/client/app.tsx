import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CenteredCard } from "@/components/centeredCard";
import { client } from "./api";

export function App() {
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await client.api.subscribe.$post({
        json: { email, nickname: nickname || undefined },
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const body = await res.json();
        setError("error" in body ? body.error : "Something went wrong");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <>
        <title>Check Your Inbox - Gna</title>
        <CenteredCard title="Check Your Inbox">
          <p className="text-muted-foreground">
            We've sent a confirmation email to your inbox. Please click the link
            in the email to complete your subscription.
          </p>
        </CenteredCard>
      </>
    );
  }

  return (
    <>
      <title>Gna Newsletter</title>
      <CenteredCard
        title="Subscribe to Newsletter"
        description="A lightweight, self-hosted newsletter platform."
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nickname">Nickname (optional)</Label>
            <Input
              id="nickname"
              type="text"
              placeholder="Your name"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Subscribing..." : "Subscribe"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </CenteredCard>
    </>
  );
}
