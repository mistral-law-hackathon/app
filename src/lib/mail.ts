import "server-only";
import nodemailer from "nodemailer";

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: { filename: string; content: string }[];
}) {
  let transport;
  if (process.env.SMTP_HOST) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  } else {
    const account = await nodemailer.createTestAccount();
    transport = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: { user: account.user, pass: account.pass },
    });
  }
  const info = await transport.sendMail({
    from: process.env.MAIL_FROM ?? "Clause <no-reply@example.com>",
    ...opts,
  });
  return { previewUrl: nodemailer.getTestMessageUrl(info) || null };
}
