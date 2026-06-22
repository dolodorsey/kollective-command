export const OPS_BRANDS = [
  "the-kollective",
  "help-911",
  "good-times",
  "casper",
  "dr-dorsey",
  "khg",
];

export const SOCIAL_TABS = [
  "calendar",
  "brand-lanes",
  "upload",
  "needs-graphic",
  "needs-caption",
  "needs-approval",
  "scheduled",
  "posted",
  "failed",
  "recycle",
  "accounts",
  "performance",
];

export const MARKETING_CHANNELS = [
  "email",
  "sms",
  "evite",
  "eventbrite",
  "seo",
  "ads",
  "retargeting",
  "landing_page",
  "engagement",
  "other",
];

export const APPROVAL_TYPES = [
  "graphic",
  "caption",
  "email",
  "sms",
  "ad",
  "event_flyer",
  "budget",
  "website_change",
  "automation",
  "revenue_offer",
  "other",
];

export const REVENUE_LANES = [
  "HELP 911 BOH",
  "Good Times BOH",
  "Casper BOH",
  "Sponsors",
  "Products",
  "Consultations",
  "Courses",
  "Events",
  "Collections",
];

export const TASK_DEPARTMENTS = [
  "daily_ops",
  "social",
  "marketing",
  "content_studio",
  "approvals",
  "events",
  "revenue",
  "tasks",
];

export function statusLabel(value?: string) {
  return (value || "open").replaceAll("_", " ");
}

export function toKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Unscheduled";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
