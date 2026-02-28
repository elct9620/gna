export type SubscriberStatus = "pending" | "activated";

export interface SubscriberData {
  id: string;
  email: string;
  nickname?: string;
  unsubscribeToken: string;
  createdAt: Date;
  activatedAt: Date | null;
  confirmationToken: string | null;
  confirmationExpiresAt: Date | null;
  magicLinkToken: string | null;
  magicLinkExpiresAt: Date | null;
  pendingEmail: string | null;
}

export class Subscriber {
  readonly id: string;
  readonly email: string;
  readonly nickname?: string;
  readonly unsubscribeToken: string;
  readonly createdAt: Date;
  readonly activatedAt: Date | null;
  readonly confirmationToken: string | null;
  readonly confirmationExpiresAt: Date | null;
  readonly magicLinkToken: string | null;
  readonly magicLinkExpiresAt: Date | null;
  readonly pendingEmail: string | null;

  constructor(data: SubscriberData) {
    this.id = data.id;
    this.email = data.email;
    this.nickname = data.nickname;
    this.unsubscribeToken = data.unsubscribeToken;
    this.createdAt = data.createdAt;
    this.activatedAt = data.activatedAt;
    this.confirmationToken = data.confirmationToken;
    this.confirmationExpiresAt = data.confirmationExpiresAt;
    this.magicLinkToken = data.magicLinkToken;
    this.magicLinkExpiresAt = data.magicLinkExpiresAt;
    this.pendingEmail = data.pendingEmail;
  }

  get status(): SubscriberStatus {
    return this.activatedAt ? "activated" : "pending";
  }

  get isActivated(): boolean {
    return this.status === "activated";
  }

  get isPending(): boolean {
    return this.status === "pending";
  }

  get isConfirmationExpired(): boolean {
    if (!this.confirmationExpiresAt) return true;
    return this.confirmationExpiresAt < new Date();
  }

  get isMagicLinkExpired(): boolean {
    if (!this.magicLinkExpiresAt) return true;
    return this.magicLinkExpiresAt < new Date();
  }

  withUpdated(overrides: Partial<SubscriberData>): Subscriber {
    return new Subscriber({ ...this, ...overrides });
  }
}
