import { describe, it, expect, vi, beforeEach } from "vitest";
import nodemailer from "nodemailer";

const mockSendMail = vi.fn().mockResolvedValue({ messageId: "mock-id-123" });
const mockCreateTransport = vi.fn(() => ({
  sendMail: mockSendMail,
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}));

const setupEnv = (host, user, pass, from, port = "587") => {
  process.env.SMTP_HOST = host;
  process.env.SMTP_USER = user;
  process.env.SMTP_PASSWORD = pass;
  process.env.EMAIL_FROM = from;
  process.env.SMTP_PORT = port;
};

const sendEmail = async ({ to, subject, htmlBody }) => {
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
    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw new Error("Failed to dispatch notification email.");
  }
};

describe("sendEmail", () => {
  const emailData = {
    to: "recipient@example.com",
    subject: "Test Subject",
    htmlBody: "<p>Test Body</p>",
  };

  const envConfig = {
    host: "smtp.mailtrap.io",
    user: "mockuser",
    pass: "mockpass",
    from: "no-reply@app.com",
    port: "2525",
  };

  const consoleErrorSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    setupEnv(
      envConfig.host,
      envConfig.user,
      envConfig.pass,
      envConfig.from,
      envConfig.port
    );
  });

  it("should successfully create transporter and send mail", async () => {
    await sendEmail(emailData);

    expect(mockCreateTransport).toHaveBeenCalledTimes(1);
    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: envConfig.host,
      port: 2525,
      secure: false,
      auth: {
        user: envConfig.user,
        pass: envConfig.pass,
      },
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith({
      from: envConfig.from,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.htmlBody,
      text: "Test Body",
    });
  });

  it("should use default port 587 if SMTP_PORT is not set", async () => {
    setupEnv(
      envConfig.host,
      envConfig.user,
      envConfig.pass,
      envConfig.from,
      undefined
    );

    await sendEmail(emailData);

    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 587,
      })
    );
  });

  it("should log an error and return if environment variables are missing", async () => {
    setupEnv(undefined, "user", "pass", "from");

    const result = await sendEmail(emailData);

    expect(result).toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Missing SMTP environment variables. Cannot send email."
    );
    expect(mockCreateTransport).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("should throw a generic error if sendMail fails", async () => {
    mockSendMail.mockRejectedValue(new Error("SMTP connection timed out"));

    await expect(sendEmail(emailData)).rejects.toThrow(
      "Failed to dispatch notification email."
    );

    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });
});
