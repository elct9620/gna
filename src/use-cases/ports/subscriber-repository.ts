import type { Subscriber } from "@/entities/subscriber";

export interface ISubscriberRepository {
  findByEmail(email: string): Promise<Subscriber | undefined>;
  findByConfirmationToken(token: string): Promise<Subscriber | undefined>;
  findByMagicLinkToken(token: string): Promise<Subscriber | undefined>;
  existsByEmail(email: string): Promise<boolean>;
  findAll(): Promise<Subscriber[]>;
  create(data: {
    email: string;
    nickname?: string;
    unsubscribeToken: string;
    confirmationToken: string;
    confirmationExpiresAt: string;
  }): Promise<Subscriber>;
  updateConfirmationToken(
    email: string,
    token: string,
    expiresAt: string,
  ): Promise<void>;
  activate(id: string, activatedAt: string): Promise<void>;
  updateMagicLink(id: string, token: string, expiresAt: string): Promise<void>;
  clearMagicLinkById(id: string): Promise<void>;
  clearMagicLinkByToken(token: string): Promise<void>;
  updateNickname(email: string, nickname: string): Promise<boolean>;
  updatePendingEmail(
    id: string,
    pendingEmail: string,
    token: string,
    expiresAt: string,
  ): Promise<void>;
  commitEmailChange(id: string, newEmail: string): Promise<void>;
  deleteByEmail(email: string): Promise<boolean>;
  deleteByUnsubscribeToken(token: string): Promise<void>;
}
