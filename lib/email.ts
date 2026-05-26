import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendOtpEmail(
  to: string,
  otp: string,
  purpose: 'password_reset' | 'email_verification'
) {
  const subject =
    purpose === 'password_reset'
      ? 'Your Adum Culture Password Reset Code'
      : 'Verify Your Adum Culture Account'
  const heading =
    purpose === 'password_reset' ? 'Password Reset Code' : 'Email Verification Code'

  const html = `
    <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:40px 32px;background:#fff;">
      <h1 style="font-size:22px;letter-spacing:4px;text-transform:uppercase;margin:0 0 8px;">ADUM CULTURE</h1>
      <hr style="border:none;border-top:1px solid #222;margin:0 0 32px;" />

      <h2 style="font-size:18px;font-weight:bold;margin:0 0 8px;">${heading}</h2>
      <p style="color:#555;font-size:14px;margin:0 0 24px;">
        ${purpose === 'password_reset'
          ? 'Use the code below to reset your password. It expires in 10 minutes.'
          : 'Use the code below to verify your email address. It expires in 10 minutes.'}
      </p>

      <div style="font-size:40px;font-weight:bold;letter-spacing:14px;padding:24px;background:#f5f5f5;text-align:center;border-radius:4px;margin-bottom:24px;">${otp}</div>

      <p style="color:#888;font-size:12px;margin:0 0 4px;">Do not share this code with anyone.</p>
      <p style="color:#888;font-size:12px;margin:0;">If you did not request this, you can safely ignore this email.</p>

      <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px;" />
      <p style="color:#bbb;font-size:11px;margin:0;">© Adum Culture &nbsp;|&nbsp; adumculture@gmail.com</p>
    </div>
  `

  if (!process.env.GMAIL_APP_PASSWORD) {
    // No credentials set — log OTP to console for local dev/testing
    console.log(`\n[DEV EMAIL] OTP for ${to}: ${otp}  (purpose: ${purpose})\n`)
    return
  }

  await transporter.sendMail({
    from: `"Adum Culture" <${process.env.GMAIL_USER ?? 'adumculture@gmail.com'}>`,
    to,
    subject,
    html,
  })
}
