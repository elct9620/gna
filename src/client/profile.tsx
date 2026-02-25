import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { client } from "./api";

type ProfileState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; email: string; nickname: string }
  | { status: "updated" };

export function Profile() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const emailChanged = searchParams.get("email_changed");

  const [state, setState] = useState<ProfileState>(
    token ? { status: "loading" } : { status: "idle" },
  );
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!token) return;

    client.api.profile
      .$get({ query: { token } })
      .then(async (res) => {
        if (!res.ok) {
          setState({ status: "error", message: "Invalid or expired link." });
          return;
        }
        const data = await res.json();
        if ("error" in data) {
          setState({ status: "error", message: "Invalid or expired link." });
          return;
        }
        setState({
          status: "loaded",
          email: data.email,
          nickname: data.nickname ?? "",
        });
        setEmail(data.email);
        setNickname(data.nickname ?? "");
      })
      .catch(() => {
        setState({ status: "error", message: "Something went wrong." });
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;

    setSubmitError("");
    setSubmitting(true);

    try {
      const res = await client.api.profile.update.$post({
        json: { token, nickname: nickname || undefined, email },
      });

      if (res.ok) {
        setState({ status: "updated" });
      } else {
        const body = await res.json();
        setSubmitError("error" in body ? body.error : "Something went wrong");
      }
    } catch {
      setSubmitError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (emailChanged === "true") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <title>Profile - Gna</title>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Email Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your email address has been updated successfully.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.status === "idle") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <title>Profile - Gna</title>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Subscriber Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Request a profile link from the newsletter to manage your
              subscription settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <title>Profile - Gna</title>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Subscriber Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Loading your profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <title>Profile - Gna</title>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Profile Link Invalid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {state.message} Please request a new profile link from the
              newsletter.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.status === "updated") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <title>Profile - Gna</title>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Profile Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your profile has been updated successfully.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
      <title>Profile - Gna</title>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Subscriber Profile</CardTitle>
          <CardDescription>Update your subscription settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                type="text"
                placeholder="Your name"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
