import cron from 'node-cron';
import { env } from '../config/env.js';
import { assetRepository } from '../repositories/asset.repository.js';
import { mailService } from '../services/email/mail.service.js';

/**
 * Scheduled jobs — maintenance reminders and future notification work.
 */
export function startJobs(): void {
  if (!cron.validate(env.maintenanceReminderCron)) {
    console.warn(
      `[jobs] Invalid MAINTENANCE_REMINDER_CRON "${env.maintenanceReminderCron}" — skipping`,
    );
    return;
  }

  cron.schedule(env.maintenanceReminderCron, () => {
    void runMaintenanceReminders();
  });

  console.log(`[jobs] Maintenance reminders scheduled (${env.maintenanceReminderCron})`);
}

async function runMaintenanceReminders(): Promise<void> {
  try {
    const dueAssets = await assetRepository.findDueForService(7);
    if (dueAssets.length === 0) {
      console.info('[jobs] No assets due for service in the next 7 days');
      return;
    }

    for (const asset of dueAssets) {
      const tech = asset.assignedTechnicianId as
        | { email?: string; name?: string }
        | null
        | undefined;
      const to = tech?.email;
      if (!to) continue;

      const next = asset.nextServiceDate
        ? new Date(asset.nextServiceDate).toISOString().slice(0, 10)
        : 'soon';

      await mailService.send({
        to,
        subject: `Maintenance reminder · ${asset.assetCode}`,
        text: `Asset ${asset.assetCode} (${asset.name}) at ${asset.location} is due for service by ${next}.`,
        html: `<p>Asset <strong>${asset.assetCode}</strong> (${asset.name}) at ${asset.location} is due for service by <strong>${next}</strong>.</p>`,
      });
    }

    console.info(`[jobs] Sent maintenance reminders for ${dueAssets.length} asset(s)`);
  } catch (error) {
    console.error('[jobs] Maintenance reminder failed', error);
  }
}

export const jobsModule = {
  name: 'jobs',
  status: 'active' as const,
  start: startJobs,
};
