import nodemailer from "nodemailer";

async function sendPasswordResetEmail(email, resetLink) {
  console.log("EMAIL SERVICE CALLED");
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP is not configured");
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  await transporter.verify();
  console.log("SMTP connection successful");
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Campus Rescue password reset",
    text: `Use this link to reset your Campus Rescue password: ${resetLink}`,
    html: `<p>Use the link below to reset your Campus Rescue password.</p><p><a href="${resetLink}">Reset password</a></p>`
  });
}

export { sendPasswordResetEmail };
