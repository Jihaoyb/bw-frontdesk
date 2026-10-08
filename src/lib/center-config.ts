// Center configuration, verbatim from docs/test-inquiries.md.
// Office hours and the contact fallback are configuration, not knowledge
// entries, and copy must not imply live availability or guaranteed replies.

export const centerConfig = {
  name: "Maple Grove Early Learning Center",
  timezone: "America/Los_Angeles",
  careHours: "Monday to Friday, 7:00 a.m. to 6:00 p.m.",
  officeHours: "Monday to Friday, 8:00 a.m. to 5:00 p.m.",
  contactPhone: "(555) 010-0199",
  contactEmail: "office@maplegrove.example",
  staff: [
    { name: "Dana R.", role: "office manager" },
    { name: "Priya S.", role: "director" },
  ],
} as const;

export const SESSION_COOKIE = "fd_session";
export const SESSION_HEADER = "x-fd-session";
