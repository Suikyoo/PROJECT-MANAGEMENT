import { createTransport } from "nodemailer";
import { smtpHost, smtpPort, smtpUser, smtpPass } from "../env/index.ts";
import { getUsers, getRolesByUserId } from "../db/getter.ts";
import { computeUrgency } from "./urgency.ts";

const transporter = createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: false,
  auth: { user: smtpUser, pass: smtpPass },
});

export async function sendDailyTaskBreakdown(): Promise<{ sent: number; errors: string[] }> {
  const stats = await computeUrgency();
  const allUsers = await getUsers();

  // Filter to approved insider users (exclude Client role, exclude pending/rejected)
  const insiderUsers: { email: string; name: string }[] = [];
  for (const u of allUsers) {
    if (u.approved !== "approved") continue;
    const roles = await getRolesByUserId(u.id);
    if (roles.includes("Client")) continue; // skip client-only users
    insiderUsers.push({ email: u.email, name: u.name });
  }

  if (insiderUsers.length === 0) {
    return { sent: 0, errors: ["No insider users to send to"] };
  }

  const subject = `📋 Daily Task Breakdown — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`;
  const html = buildEmailHtml(stats);

  let sent = 0;
  const errors: string[] = [];

  for (const user of insiderUsers) {
    try {
      await transporter.sendMail({
        from: `"Orbit" <${smtpUser}>`,
        to: user.email,
        subject,
        html,
      });
      sent++;
    } catch (err: any) {
      errors.push(`${user.email}: ${err.message}`);
    }
  }

  return { sent, errors };
}

function buildEmailHtml(stats: Awaited<ReturnType<typeof computeUrgency>>): string {
  const priorityColor = (p: string) => {
    switch (p) {
      case "critical": return "#ef4444";
      case "high": return "#f97316";
      case "medium": return "#eab308";
      default: return "#9ca3af";
    }
  };

  const urgencyBadge = (u: string) => {
    switch (u) {
      case "missed": return `<span style="background:#9f1239;color:#fda4af;padding:2px 8px;border-radius:4px;font-size:11px">Overdue</span>`;
      case "urgent": return `<span style="background:#78350f;color:#fde68a;padding:2px 8px;border-radius:4px;font-size:11px">Due Today</span>`;
      case "upcoming": return `<span style="background:#155e75;color:#67e8f9;padding:2px 8px;border-radius:4px;font-size:11px">Upcoming</span>`;
    }
  };

  const taskRows = (() => {
    if (stats.tasks.length === 0) {
      return `<tr><td colspan="4" style="padding:24px;text-align:center;color:#6b7280;font-size:13px">No urgent tasks — great job! 🎉</td></tr>`;
    }
    const missedAndUrgent = stats.tasks.filter(t => t.urgency !== 'upcoming');
    const upcoming = stats.tasks.filter(t => t.urgency === 'upcoming');
    const shownUpcoming = upcoming.slice(0, 3);
    const hidden = upcoming.length - shownUpcoming.length;
    const rows = [...missedAndUrgent, ...shownUpcoming].map(t => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #1f2937;font-size:13px;color:#e5e7eb">${t.title}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1f2937;text-align:center">${urgencyBadge(t.urgency)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1f2937;text-align:center"><span style="color:${priorityColor(t.priority)};font-size:12px;font-weight:600">${t.priority.toUpperCase()}</span></td>
        <td style="padding:8px 12px;border-bottom:1px solid #1f2937;text-align:center;font-size:12px;color:#9ca3af">${t.state}</td>
      </tr>`).join("");
    const moreRow = hidden > 0
      ? `<tr><td colspan="4" style="padding:12px;text-align:center;color:#71717a;font-size:12px;font-style:italic">…and ${hidden} more upcoming</td></tr>`
      : "";
    return rows + moreRow;
  })();

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:640px;margin:0 auto;padding:40px 20px">
  <div style="background:#121214;border:1px solid #1f1f23;border-radius:8px;overflow:hidden">
    <div style="background:#18181b;padding:20px 24px;border-bottom:1px solid #1f1f23">
      <h1 style="margin:0;font-size:18px;color:#fff">Orbit — Daily Breakdown</h1>
      <p style="margin:6px 0 0;font-size:12px;color:#71717a">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
    </div>
    <div style="padding:24px">
      <div style="display:flex;gap:16px;margin-bottom:24px">
        <div style="flex:1;background:#121214;border:1px solid #1f1f23;border-radius:6px;padding:16px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#${stats.missed > 0 ? 'e11d48' : '22c55e'}">${stats.missed}</div>
          <div style="font-size:11px;color:#71717a;margin-top:4px">Overdue</div>
        </div>
        <div style="flex:1;background:#121214;border:1px solid #1f1f23;border-radius:6px;padding:16px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#f59e0b">${stats.urgentToday}</div>
          <div style="font-size:11px;color:#71717a;margin-top:4px">Due Today</div>
        </div>
        <div style="flex:1;background:#121214;border:1px solid #1f1f23;border-radius:6px;padding:16px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#06b6d4">${stats.upcoming}</div>
          <div style="font-size:11px;color:#71717a;margin-top:4px">Upcoming</div>
        </div>
        <div style="flex:1;background:#121214;border:1px solid #1f1f23;border-radius:6px;padding:16px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#a3a3a3">${stats.total}</div>
          <div style="font-size:11px;color:#71717a;margin-top:4px">Active Total</div>
        </div>
      </div>
      <h2 style="margin:0 0 12px;font-size:14px;color:#a1a1aa">Task Details</h2>
      <table style="width:100%;border-collapse:collapse;background:#0c0c0e;border:1px solid #1f1f23;border-radius:6px;overflow:hidden">
        <thead>
          <tr style="background:#18181b">
            <th style="padding:10px 12px;text-align:left;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px">Task</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px">Urgency</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px">Priority</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px">State</th>
          </tr>
        </thead>
        <tbody>${taskRows}</tbody>
      </table>
    </div>
    <div style="background:#18181b;padding:16px 24px;border-top:1px solid #1f1f23;text-align:center">
      <p style="margin:0;font-size:11px;color:#52525b">Orbit Project Management — Automated daily breakdown</p>
    </div>
  </div>
</div>
</body>
</html>`;
}
