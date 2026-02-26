import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CenteredCard } from "@/components/centeredCard";
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

  const title = <title>Profile - Gna</title>;

  if (emailChanged === "true") {
    return (
      <>
        {title}
        <CenteredCard title="Email Updated">
          <p className="text-muted-foreground">
            Your email address has been updated successfully.
          </p>
        </CenteredCard>
      </>
    );
  }

  if (state.status === "idle") {
    return (
      <>
        {title}
        <CenteredCard title="Subscriber Profile">
          <p className="text-muted-foreground">
            Request a profile link from the newsletter to manage your
            subscription settings.
          </p>
        </CenteredCard>
      </>
    );
  }

  if (state.status === "loading") {
    return (
      <>
        {title}
        <CenteredCard title="Subscriber Profile">
          <p className="text-muted-foreground">Loading your profile...</p>
        </CenteredCard>
      </>
    );
  }

  if (state.status === "error") {
    return (
      <>
        {title}
        <CenteredCard title="Profile Link Invalid">
          <p className="text-muted-foreground">
            {state.message} Please request a new profile link from the
            newsletter.
          </p>
        </CenteredCard>
      </>
    );
  }

  if (state.status === "updated") {
    return (
      <>
        {title}
        <CenteredCard title="Profile Updated">
          <p className="text-muted-foreground">
            Your profile has been updated successfully.
          </p>
        </CenteredCard>
      </>
    );
  }

  return (
    <>
      <CenteredCard
        title="Subscriber Profile"
        description="Update your subscription settings."
      >
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
      </CenteredCard>
    </>
  );
}
