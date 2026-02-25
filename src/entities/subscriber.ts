export type SubscriberStatus = "pending" | "activated";

export interface SubscriberData {
  email: string;
  nickname?: string;
  token: string;
  subscribedAt: Date;
  activatedAt: Date | null;
  confirmationToken: string | null;
  magicLinkToken: string | null;
  magicLinkExpiresAt: Date | null;
  pendingEmail: string | null;
  emailConfirmationToken: string | null;
}

export class Subscriber {
  readonly email: string;
  readonly nickname?: string;
  readonly token: string;
  readonly subscribedAt: Date;
  readonly activatedAt: Date | null;
  readonly confirmationToken: string | null;
  readonly magicLinkToken: string | null;
  readonly magicLinkExpiresAt: Date | null;
  readonly pendingEmail: string | null;
  readonly emailConfirmationToken: string | null;

  constructor(data: SubscriberData) {
    this.email = data.email;
    this.nickname = data.nickname;
    this.token = data.token;
    this.subscribedAt = data.subscribedAt;
    this.activatedAt = data.activatedAt;
    this.confirmationToken = data.confirmationToken;
    this.magicLinkToken = data.magicLinkToken;
    this.magicLinkExpiresAt = data.magicLinkExpiresAt;
    this.pendingEmail = data.pendingEmail;
    this.emailConfirmationToken = data.emailConfirmationToken;
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
}
