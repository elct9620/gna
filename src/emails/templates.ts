export interface EmailTemplateConfig {
  subject: string;
  previewText: string;
  heading: string;
  bodyText: string;
  actionText: string;
  actionPath: string;
}

export const EMAIL_TEMPLATES: Record<string, EmailTemplateConfig> = {
  confirmation: {
    subject: "Confirm your subscription",
    previewText: "Please confirm your newsletter subscription",
    heading: "Confirm Your Subscription",
    bodyText:
      "Thank you for subscribing! Click the button below to confirm your subscription.",
    actionText: "Confirm Subscription",
    actionPath: "/confirm",
  },
  magic_link: {
    subject: "Your profile access link",
    previewText: "Access your subscriber profile",
    heading: "Your Profile Access Link",
    bodyText:
      "Click the button below to access your subscriber profile. This link expires in 15 minutes.",
    actionText: "Access Profile",
    actionPath: "/profile",
  },
  email_change: {
    subject: "Confirm your email change",
    previewText: "Confirm your email address change",
    heading: "Confirm Email Change",
    bodyText:
      "Click the button below to confirm your new email address for the newsletter.",
    actionText: "Confirm Email Change",
    actionPath: "/confirm",
  },
};

export const VALID_TEMPLATE_NAMES = Object.keys(EMAIL_TEMPLATES);
