import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubscriptionService } from "@/services/subscriptionService";

describe("SubscriptionService", () => {
  let service: SubscriptionService;

  beforeEach(() => {
    service = new SubscriptionService();
  });

  describe("subscribe", () => {
    it("should create a new pending subscriber", () => {
      const result = service.subscribe("test@example.com", "Test");

      expect(result.action).toBe("created");
      expect(result.subscriber.email).toBe("test@example.com");
      expect(result.subscriber.nickname).toBe("Test");
      expect(result.subscriber.isPending).toBe(true);
      expect(result.subscriber.status).toBe("pending");
      expect(result.subscriber.confirmationToken).toBeTruthy();
    });

    it("should resend for duplicate pending subscriber", () => {
      const first = service.subscribe("test@example.com");
      const oldToken = first.subscriber.confirmationToken;

      const second = service.subscribe("test@example.com");

      expect(second.action).toBe("resend");
      expect(second.subscriber.confirmationToken).not.toBe(oldToken);
    });

    it("should return none for already active subscriber", () => {
      const { subscriber } = service.subscribe("test@example.com");
      service.confirmSubscription(subscriber.confirmationToken!);

      const result = service.subscribe("test@example.com");
      expect(result.action).toBe("none");
    });

    it("should throw for invalid email", () => {
      expect(() => service.subscribe("")).toThrow("Invalid email address");
      expect(() => service.subscribe("not-an-email")).toThrow(
        "Invalid email address",
      );
    });
  });

  describe("confirmSubscription", () => {
    it("should activate a pending subscriber", () => {
      const { subscriber } = service.subscribe("test@example.com");
      const result = service.confirmSubscription(subscriber.confirmationToken!);

      expect(result).not.toBeNull();
      expect(result!.isActivated).toBe(true);
      expect(result!.status).toBe("activated");
      expect(result!.confirmationToken).toBeNull();
    });

    it("should return null for invalid token", () => {
      expect(service.confirmSubscription("invalid-token")).toBeNull();
    });

    it("should return null if token already consumed", () => {
      const { subscriber } = service.subscribe("test@example.com");
      const token = subscriber.confirmationToken!;
      service.confirmSubscription(token);

      expect(service.confirmSubscription(token)).toBeNull();
    });
  });

  describe("requestMagicLink", () => {
    it("should generate a magic link token for active subscriber", () => {
      const { subscriber } = service.subscribe("test@example.com");
      service.confirmSubscription(subscriber.confirmationToken!);

      const token = service.requestMagicLink("test@example.com");
      expect(token).toBeTruthy();
    });

    it("should return null for inactive subscriber", () => {
      service.subscribe("test@example.com");
      expect(service.requestMagicLink("test@example.com")).toBeNull();
    });

    it("should return null for non-existent subscriber", () => {
      expect(service.requestMagicLink("nope@example.com")).toBeNull();
    });

    it("should replace previous magic link token", () => {
      const { subscriber } = service.subscribe("test@example.com");
      service.confirmSubscription(subscriber.confirmationToken!);

      const first = service.requestMagicLink("test@example.com");
      const second = service.requestMagicLink("test@example.com");

      expect(first).not.toBe(second);
      expect(service.validateMagicLink(first!)).toBeNull();
      expect(service.validateMagicLink(second!)).not.toBeNull();
    });
  });

  describe("validateMagicLink", () => {
    it("should return subscriber for valid token", () => {
      const { subscriber } = service.subscribe("test@example.com");
      service.confirmSubscription(subscriber.confirmationToken!);
      const token = service.requestMagicLink("test@example.com")!;

      const result = service.validateMagicLink(token);
      expect(result).not.toBeNull();
      expect(result!.email).toBe("test@example.com");
    });

    it("should return null for expired token", () => {
      const { subscriber } = service.subscribe("test@example.com");
      service.confirmSubscription(subscriber.confirmationToken!);
      const token = service.requestMagicLink("test@example.com")!;

      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.now() + 16 * 60 * 1000));

      expect(service.validateMagicLink(token)).toBeNull();

      vi.useRealTimers();
    });

    it("should return null for invalid token", () => {
      expect(service.validateMagicLink("invalid-token")).toBeNull();
    });
  });

  describe("consumeMagicLink", () => {
    it("should invalidate the token", () => {
      const { subscriber } = service.subscribe("test@example.com");
      service.confirmSubscription(subscriber.confirmationToken!);
      const token = service.requestMagicLink("test@example.com")!;

      service.consumeMagicLink(token);
      expect(service.validateMagicLink(token)).toBeNull();
    });

    it("should do nothing for invalid token", () => {
      expect(() => service.consumeMagicLink("invalid")).not.toThrow();
    });
  });

  describe("updateNickname", () => {
    it("should update the nickname", () => {
      service.subscribe("test@example.com", "Old");
      const updated = service.updateNickname("test@example.com", "New");

      expect(updated).toBe(true);
      const subscribers = service.listSubscribers();
      expect(subscribers[0].nickname).toBe("New");
    });

    it("should return false for non-existent subscriber", () => {
      expect(service.updateNickname("nope@example.com", "Name")).toBe(false);
    });
  });

  describe("requestEmailChange", () => {
    it("should set pending email and token", () => {
      service.subscribe("old@example.com");
      const token = service.requestEmailChange(
        "old@example.com",
        "new@example.com",
      );

      expect(token).toBeTruthy();
      const subscribers = service.listSubscribers();
      expect(subscribers[0].pendingEmail).toBe("new@example.com");
    });

    it("should return null for non-existent subscriber", () => {
      expect(
        service.requestEmailChange("nope@example.com", "new@example.com"),
      ).toBeNull();
    });

    it("should replace previous email confirmation token", () => {
      service.subscribe("old@example.com");
      const first = service.requestEmailChange(
        "old@example.com",
        "new1@example.com",
      );
      const second = service.requestEmailChange(
        "old@example.com",
        "new2@example.com",
      );

      expect(first).not.toBe(second);
      expect(service.confirmEmailChange(first!)).toBeNull();
    });
  });

  describe("confirmEmailChange", () => {
    it("should update the email address", () => {
      service.subscribe("old@example.com");
      const token = service.requestEmailChange(
        "old@example.com",
        "new@example.com",
      )!;

      const result = service.confirmEmailChange(token);

      expect(result).not.toBeNull();
      expect(result!.email).toBe("new@example.com");
      expect(result!.pendingEmail).toBeNull();
      expect(result!.emailConfirmationToken).toBeNull();
    });

    it("should return null for invalid token", () => {
      expect(service.confirmEmailChange("invalid-token")).toBeNull();
    });

    it("should update subscriber index", () => {
      service.subscribe("old@example.com");
      const token = service.requestEmailChange(
        "old@example.com",
        "new@example.com",
      )!;
      service.confirmEmailChange(token);

      expect(service.isEmailTaken("new@example.com")).toBe(true);
      expect(service.isEmailTaken("old@example.com")).toBe(false);
    });
  });

  describe("isEmailTaken", () => {
    it("should return true for existing email", () => {
      service.subscribe("test@example.com");
      expect(service.isEmailTaken("test@example.com")).toBe(true);
    });

    it("should return false for non-existing email", () => {
      expect(service.isEmailTaken("nope@example.com")).toBe(false);
    });
  });

  describe("unsubscribe", () => {
    it("should clean up all related indexes", () => {
      const { subscriber } = service.subscribe("test@example.com");
      service.confirmSubscription(subscriber.confirmationToken!);
      service.requestMagicLink("test@example.com");
      service.requestEmailChange("test@example.com", "new@example.com");

      service.unsubscribe(subscriber.token);

      expect(service.listSubscribers()).toHaveLength(0);
      expect(service.isEmailTaken("test@example.com")).toBe(false);
    });
  });

  describe("removeSubscriber", () => {
    it("should clean up all related indexes", () => {
      const { subscriber } = service.subscribe("test@example.com");
      service.confirmSubscription(subscriber.confirmationToken!);
      service.requestMagicLink("test@example.com");

      expect(service.removeSubscriber("test@example.com")).toBe(true);
      expect(service.listSubscribers()).toHaveLength(0);
    });
  });
});
