import { env } from "@notify/env/server";

import { createMailer } from "./mailer";

const { transporter, sendMail } = createMailer({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  user: env.SMTP_USER,
  pass: env.SMTP_PASS,
  from: env.SMTP_FROM,
});

export { transporter, sendMail };
export type { SendMailInput } from "./mailer";
