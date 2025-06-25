import sgMail from "@sendgrid/mail";

interface EmailData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export const sendEmail = async ({ to, subject, template, data }: EmailData) => {
  // TODO: replace mock implementation with real SendGrid email once API key is configured
  if (!process.env.SENDGRID_API_KEY || process.env.USE_MOCK_EMAIL === "true") {
    console.log("[MOCK-EMAIL] To:", to);
    console.log("Subject:", subject);
    console.log("Template:", template);
    console.log("Data:", data);
    return Promise.resolve({ mocked: true });
  }

  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject,
      templateId: (
        JSON.parse(process.env.SENDGRID_TEMPLATE_IDS ?? "{}") as Record<
          string,
          string
        >
      )[template],
      dynamicTemplateData: data,
    };

    await sgMail.send(msg);
  } catch (error) {
    console.error("Error sending email via SendGrid", error);
    // Swallow the error in mock/dev mode so flow continues
  }
};
