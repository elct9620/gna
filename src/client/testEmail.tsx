import React, { useState } from "react";
import { useLocation } from "react-router";

import { AppSidebar } from "@/components/appSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { client } from "./api";

const templates = [
  { value: "confirmation", label: "Confirmation" },
  { value: "magic_link", label: "Magic Link" },
  { value: "email_change", label: "Email Change" },
];

export function TestEmail() {
  const { pathname } = useLocation();
  const [template, setTemplate] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);

    try {
      const res = await client.admin.api["test-email"].template.$post({
        json: { template, to: email },
      });

      if (res.ok) {
        setResult({ type: "success", message: "Test email sent successfully" });
      } else {
        const data = await res.json();
        setResult({
          type: "error",
          message: "error" in data ? data.error : "Failed to send test email",
        });
      }
    } catch {
      setResult({ type: "error", message: "Failed to send test email" });
    } finally {
      setSending(false);
    }
  };

  return (
    <SidebarProvider>
      <title>Test Email - Gna</title>
      <AppSidebar pathname={pathname} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">Test Email</h1>
        </header>
        <main className="flex-1 p-4">
          <div className="max-w-md space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Send Test Email</h2>
              <p className="text-sm text-muted-foreground">
                Send a test email to preview a template.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="template"
                  className="text-sm font-medium leading-none"
                >
                  Template
                </label>
                <Select value={template} onValueChange={setTemplate}>
                  <SelectTrigger id="template" className="w-full">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium leading-none"
                >
                  Recipient Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="test@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={sending || !template || !email}>
                {sending ? "Sending..." : "Send Test Email"}
              </Button>
            </form>
            {result && (
              <p
                className={
                  result.type === "success"
                    ? "text-sm text-green-600"
                    : "text-sm text-destructive"
                }
              >
                {result.message}
              </p>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
