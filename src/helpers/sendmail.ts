import nodemailer from "nodemailer";

// Interface
interface EmailData {
  to: string;
  subject: string;
  htmlBody: string;
}

const sendEmail = async ({ to, subject, htmlBody }: EmailData) => {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASSWORD ||
    !process.env.EMAIL_FROM
  ) {
    console.error("Missing SMTP environment variables. Cannot send email.");

    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: to,
    subject: subject,
    html: htmlBody,

    text: htmlBody.replace(/<[^>]*>?/gm, ""),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(
      `Email successfully sent to ${to}. Message ID: ${info.messageId}`
    );
  } catch (error) {
    console.error(`Error sending notification email to ${to}:`, error);

    throw new Error("Failed to dispatch notification email.");
  }
};

export default sendEmail;
