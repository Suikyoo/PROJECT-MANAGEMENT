import { schedule } from "node-cron";
import { sendDailyTaskBreakdown } from "./email.ts";

let dailyJob: ReturnType<typeof schedule> | null = null;

/**
 * Start the daily 7am task breakdown email scheduler.
 * Uses server's local timezone.
 */
export function startDailyScheduler(): void {
  if (dailyJob) {
    console.log("[scheduler] Already running");
    return;
  }

  // Run at 7:00 AM every day
  dailyJob = schedule("0 7 * * *", async () => {
    console.log("[scheduler] Running daily task breakdown...");
    try {
      const result = await sendDailyTaskBreakdown();
      console.log(`[scheduler] Sent to ${result.sent} users${result.errors.length ? `, ${result.errors.length} errors` : ""}`);
      if (result.errors.length > 0) {
        console.error("[scheduler] Errors:", result.errors);
      }
    } catch (err) {
      console.error("[scheduler] Failed to send daily breakdown:", err);
    }
  }, {
    timezone: "Asia/Manila",
  });

  console.log("[scheduler] Daily breakdown scheduled for 7:00 AM Asia/Manila");
}

/**
 * Stop the daily scheduler (for graceful shutdown)
 */
export function stopDailyScheduler(): void {
  if (dailyJob) {
    dailyJob.stop();
    dailyJob = null;
    console.log("[scheduler] Stopped");
  }
}

/**
 * Trigger a manual send immediately (for testing / admin trigger)
 */
export async function triggerManualSend(): Promise<{ sent: number; errors: string[] }> {
  console.log("[scheduler] Manual trigger — sending daily breakdown...");
  return await sendDailyTaskBreakdown();
}
