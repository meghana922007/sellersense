import nodemailer from 'nodemailer';
import { generatePdfReport } from './report.service';
import prisma from '../config/database';

/**
 * Helper to accumulate a PDFKit document stream into a memory Buffer.
 */
function streamToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err) => reject(err));
  });
}

/**
 * Configures the SMTP transporter. Auto-fallbacks to a fake test SMTP account
 * if no environmental variables are provided.
 */
async function getTransporter(): Promise<nodemailer.Transporter> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  // Auto-provision a mock SMTP configuration for local sandbox testing
  console.log('📬 No SMTP credentials configured. Creating mock testing transport...');
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

export async function sendWeeklyReportEmail(userId: string, targetEmail: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // Compile dynamic PDFKit document and convert to Buffer
    const pdfDoc = await generatePdfReport(userId);
    const pdfBuffer = await streamToBuffer(pdfDoc);

    const transporter = await getTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"SellerSense Reports" <reports@sellersense.app>',
      to: targetEmail,
      subject: `Your Weekly SellerSense Business Digest - ${new Date().toLocaleDateString('en-IN')}`,
      html: `
        <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #3b62f6; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">Weekly Business Summary</h2>
          <p>Hello ${user.name || 'Seller'},</p>
          <p>Attached is your consolidated performance report showing your multi-channel sales margins across Amazon, Flipkart, and Meesho.</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; font-weight: bold; color: #64748b;">Quick Action Items:</p>
            <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px;">
              <li>Log in to inspect your updated profit statistics.</li>
              <li>Input cost prices for newly imported SKUs to maintain correct bookkeeping.</li>
            </ul>
          </div>
          <p style="font-size: 13px; color: #94a3b8; margin-top: 30px;">
            This email was sent automatically because you have weekly reports enabled. To disable, log in to your dashboard settings.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: 'Weekly_SellerSense_Report.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);

    // If using Ethereal mock, print out the test inbox URL so the developer can click it!
    if (info.messageId && !process.env.SMTP_HOST) {
      console.log(`✉️ Test Email sent successfully! Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    } else {
      console.log(`✉️ Email report delivered to ${targetEmail}`);
    }
  } catch (error) {
    console.error(`Failed to dispatch email digest to ${targetEmail}:`, error);
  }
}
