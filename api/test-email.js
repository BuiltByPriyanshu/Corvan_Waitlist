/**
 * CORVAN email test — run with:
 *   node test-email.js your@email.com
 */
require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = process.argv[2];
if (!testEmail) {
  console.error('Usage: node test-email.js your@email.com');
  process.exit(1);
}

async function run() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CORVAN Email Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`From:  ${process.env.GMAIL_USER}`);
  console.log(`To:    ${testEmail}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const t = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  });

  // 1. verify credentials
  console.log('Step 1 — Verifying SMTP credentials...');
  await t.verify();
  console.log('✅ Credentials valid\n');

  // 2. send to the test address
  console.log(`Step 2 — Sending welcome email to ${testEmail}...`);
  const info = await t.sendMail({
    from: `"CORVAN" <${process.env.GMAIL_USER}>`,
    to: testEmail,
    subject: "You're on the list. — CORVAN",
    html: `
      <div style="font-family:'Georgia',serif;background:#0b0a09;color:#ece7da;max-width:560px;margin:0 auto;padding:48px 32px;">
        <p style="font-family:monospace;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#b51e30;margin:0 0 32px">
          CORVAN — AN OLFACTORY COUNTERCULTURE
        </p>
        <h1 style="font-size:38px;line-height:1.05;font-weight:400;margin:0 0 24px;color:#ece7da;">
          You're in<br>before<br><em>everyone else.</em>
        </h1>
        <p style="font-size:15px;line-height:1.7;color:#b8b0a1;margin:0 0 16px;">
          No spam. No noise. One email in mid-August — when the doors open.
        </p>
        <p style="font-size:15px;line-height:1.7;color:#b8b0a1;margin:0 0 40px;">
          You'll hear from us before anyone else gets a chance.
        </p>
        <div style="border-top:1px solid #2a2621;padding-top:28px;">
          <p style="font-family:monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#7d766a;margin:0 0 8px;">Launching</p>
          <p style="font-size:28px;color:#ece7da;margin:0 0 28px;letter-spacing:4px;">MID AUGUST 2026</p>
          <a href="https://instagram.com/houseofcorvan" style="font-family:monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#b51e30;text-decoration:none;">@houseofcorvan ↗</a>
        </div>
        <p style="font-family:monospace;font-size:10px;letter-spacing:2px;color:#7d766a;margin:40px 0 0;text-transform:uppercase;">
          houseofcorvan.com — you're on the list as ${testEmail}
        </p>
        <p style="font-family:monospace;font-size:9px;color:#3a3630;margin:16px 0 0;">
          [TEST EMAIL — sent by test-email.js]
        </p>
      </div>
    `
  });

  console.log(`✅ Sent successfully!`);
  console.log(`   Message ID : ${info.messageId}`);
  console.log(`   Delivered to: ${info.envelope.to.join(', ')}`);
  console.log(`\n📬 Check ${testEmail} inbox (and spam folder)\n`);
}

run().catch(err => {
  console.error('\n❌ FAILED:', err.message);
  console.error('   Code:', err.code);
  if (err.code === 'EAUTH') {
    console.error('\n   → Gmail App Password is wrong or expired.');
    console.error('   → Go to myaccount.google.com/apppasswords and regenerate it.');
  }
  process.exit(1);
});
