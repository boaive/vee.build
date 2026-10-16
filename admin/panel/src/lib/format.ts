const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
/** "₹14,62,000", as the public site writes it. */
export const formatInr = (v: number) => inr.format(Math.round(v));

/** The business is in India: times are shown in India's time. */
const TZ = 'Asia/Kolkata';
const day = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
const plainDay = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const time = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: TZ });

/** "16 Oct 2026". A bare "YYYY-MM-DD" (a quote's validity) is that calendar day as written. */
export const formatDate = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? plainDay.format(new Date(`${v}T00:00:00Z`)) : day.format(new Date(v)));

/** "16 Oct 2026, 4:20 pm". */
export const formatDateTime = (iso: string) => time.format(new Date(iso));

/** "3 h ago", "2 d ago", "just now". */
export function formatAgo(iso: string, now: string | number | Date = Date.now()): string {
  const s = Math.round((new Date(now).getTime() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return d < 60 ? `${d} d ago` : formatDate(iso);
}

/** "2.4 MB". */
export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
