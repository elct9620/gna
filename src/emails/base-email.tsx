import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface BaseEmailProps {
  previewText: string;
  heading: string;
  bodyText: string;
  actionUrl: string;
  actionText: string;
}

export function BaseEmail({
  previewText,
  heading,
  bodyText,
  actionUrl,
  actionText,
}: BaseEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>{heading}</Heading>
          <Text style={textStyle}>{bodyText}</Text>
          <Section style={buttonSectionStyle}>
            <Button style={buttonStyle} href={actionUrl}>
              {actionText}
            </Button>
          </Section>
          <Hr style={hrStyle} />
          <Text style={footerStyle}>
            This email was sent by Gna Newsletter. If you did not expect this
            email, you can safely ignore it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const containerStyle = {
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
};

const headingStyle = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  color: "#1a1a1a",
  marginBottom: "16px",
};

const textStyle = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#4a4a4a",
};

const buttonSectionStyle = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const buttonStyle = {
  backgroundColor: "#0f172a",
  color: "#ffffff",
  padding: "12px 24px",
  borderRadius: "6px",
  fontSize: "16px",
  textDecoration: "none",
};

const hrStyle = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const footerStyle = {
  fontSize: "12px",
  color: "#9ca3af",
};
