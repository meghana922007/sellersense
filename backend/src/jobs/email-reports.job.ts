import cron from 'node-cron';
import prisma from '../config/database';
import { sendWeeklyReportEmail } from '../services/email.service';

/**
 * Initializes the weekly cron job that emails performance digests to merchants.
 */
export function startEmailReportsCron() {
  console.log('⏰ Initializing weekly email reports cron scheduler...');

  // Run every Monday at 9:00 AM ('0 9 * * 1')
  cron.schedule('0 9 * * 1', async () => {
    console.log('⏳ Running scheduled weekly email reports task...');
    try {
      const activeUsers = await prisma.user.findMany({
        where: {
          emailReports: true,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
        },
      });

      for (const user of activeUsers) {
        await sendWeeklyReportEmail(user.id, user.email);
      }
    } catch (error) {
      console.error('Failed to execute weekly email cron job:', error);
    }
  });
}
