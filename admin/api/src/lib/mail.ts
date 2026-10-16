import { EmailMessage } from 'cloudflare:email';
import type { Env } from '../env';

/**
 * Plain-text emails to the owner, through Cloudflare Email Routing's send
 * binding: it delivers only to addresses verified in Email Routing, which is
 * exactly the owner's inbox. Nothing here writes to customers; the panel's
 * Reply opens the owner's own mail app.
 */

const SAFE_ADDRESS = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/** RFC 2047, so a name with ₹ or Tamil letters survives a subject line. */
const encodeHeader = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${base64(s)}?=`);

function base64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Header values never carry a line break: nothing can be smuggled into the message's head. */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').slice(0, 200);

export function buildMime(o: { from: string; to: string; subject: string; text: string; replyTo?: string }): string {
  const domain = o.from.split('@')[1] ?? 'localhost';
  const head = [
    `From: VEE.BUILD <${o.from}>`,
    `To: <${o.to}>`,
    o.replyTo && SAFE_ADDRESS.test(o.replyTo) ? `Reply-To: <${o.replyTo}>` : null,
    `Subject: ${encodeHeader(oneLine(o.subject))}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ].filter(Boolean);
  const body = base64(o.text).replace(/.{76}/g, '$&\r\n');
  return `${head.join('\r\n')}\r\n\r\n${body}\r\n`;
}

/** Sends one email to the owner. Never throws: a failed email must not fail the enquiry or the sign-in. */
export async function notifyOwner(env: Env, subject: string, text: string, replyTo?: string): Promise<void> {
  const from = env.NOTIFY_FROM?.trim();
  const to = env.NOTIFY_TO?.trim();
  if (!env.MAIL || !from || !to) return;
  if (!SAFE_ADDRESS.test(from) || !SAFE_ADDRESS.test(to)) {
    console.error('NOTIFY_FROM or NOTIFY_TO is not a plain address; no email sent.');
    return;
  }
  try {
    await env.MAIL.send(new EmailMessage(from, to, buildMime({ from, to, subject, text, replyTo })));
  } catch (e) {
    console.error('Notification email failed', e);
  }
}
