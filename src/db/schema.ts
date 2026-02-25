import { sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { uuidv7 } from "@/lib/uuidv7";

export const subscribers = sqliteTable(
  "subscribers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    email: text("email").notNull(),
    nickname: text("nickname"),
    unsubscribeToken: text("unsubscribe_token").notNull(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    activatedAt: text("activated_at"),
    confirmationToken: text("confirmation_token"),
    confirmationExpiresAt: text("confirmation_expires_at"),
    magicLinkToken: text("magic_link_token"),
    magicLinkExpiresAt: text("magic_link_expires_at"),
    pendingEmail: text("pending_email"),
  },
  (table) => [
    uniqueIndex("idx_subscribers_email").on(table.email),
    uniqueIndex("idx_subscribers_unsubscribe_token").on(table.unsubscribeToken),
    index("idx_subscribers_confirmation_token").on(table.confirmationToken),
    index("idx_subscribers_magic_link_token").on(table.magicLinkToken),
  ],
);
