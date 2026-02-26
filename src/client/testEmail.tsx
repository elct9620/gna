import React, { useState } from "react";

import { AdminLayout } from "@/components/adminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { client } from "./api";

const templates = [
  { value: "confirmation", label: "Confirmation" },
  { value: "magic_link", label: "Magic Link" },
  { value: "email_change", label: "Email Change" },
];

export function TestEmail() {
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
    <AdminLayout title="Test Email - Gna" pageTitle="Test Email">
      <div className="max-w-md space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Send Test Email</h2>
          <p className="text-sm text-muted-foreground">
            Send a test email to preview a template.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
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
            <Label htmlFor="email">Recipient Email</Label>
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
    </AdminLayout>
  );
}
