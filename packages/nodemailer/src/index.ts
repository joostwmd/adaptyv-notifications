import { env } from "@notify/env/server";
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendMail(input: SendMailInput) {
  const info = await transporter.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    ...(input.text !== undefined ? { text: input.text } : {}),
  });
  return info;
}
