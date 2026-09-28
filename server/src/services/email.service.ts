import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface ManagerNotificationData {
  employeeName: string;
  employeeEmail: string;
  startDate: string;
  endDate: string;
  workdaysCount: number;
  reason?: string;
  requestId: string;
  managerEmail: string;
}

/**
 * Send an email notification to the Manager when a vacation request is submitted.
 */
export async function sendManagerNotification(data: ManagerNotificationData): Promise<void> {
  const appUrl = `http://localhost:4200/requests`;

  await transporter.sendMail({
    from: `"Vacation Planner" <${process.env.SMTP_USER}>`,
    to: data.managerEmail,
    subject: `[Vacation Request] ${data.employeeName} — ${data.startDate} to ${data.endDate}`,
    html: `
      <h2>New Vacation Request</h2>
      <p><strong>Employee:</strong> ${data.employeeName} (${data.employeeEmail})</p>
      <p><strong>Period:</strong> ${data.startDate} → ${data.endDate}</p>
      <p><strong>Working days:</strong> ${data.workdaysCount}</p>
      ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
      <p>
        <a href="${appUrl}" style="background:#1976d2;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;">
          Review in Vacation Planner
        </a>
      </p>
    `,
  });
}

export interface HREmailDraft {
  to: string;
  subject: string;
  body: string;
}

/**
 * Build the HR notification email draft (shown to the employee for review before sending).
 */
function toEU(date: string): string {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

export function buildHREmailDraft(
  data: ManagerNotificationData,
  hrEmail: string,
  hrFirstName: string,
): HREmailDraft {
  return {
    to: hrEmail,
    subject: `[Holiday Approved] ${data.employeeName} — ${toEU(data.startDate)} to ${toEU(data.endDate)}`,
    body: `Dear ${hrFirstName},\n\nPlease be informed that the following holiday request has been approved by the manager:\n\nEmployee: ${data.employeeName} (${data.employeeEmail})\nPeriod: ${toEU(data.startDate)} to ${toEU(data.endDate)}\nWorking days: ${data.workdaysCount}\n${data.reason ? `Reason: ${data.reason}\n` : ''}\nKind regards,`,
  };
}

/**
 * Send the HR notification email (triggered by the employee after reviewing the draft).
 */
export async function sendHRNotification(draft: HREmailDraft, fromName: string): Promise<void> {
  await transporter.sendMail({
    from: `"${fromName}" <${process.env.SMTP_USER}>`,
    to: draft.to,
    subject: draft.subject,
    text: draft.body,
  });
}
