// Seed knowledge entries K1–K10, verbatim from docs/test-inquiries.md.
// Deliberate gaps: Veterans Day and Presidents' Day are not mentioned.
// No conflicting entries are seeded.

export const SEED_PUBLISHED_AT = "2026-09-01T00:00:00-07:00";

export type SeedEntry = { key: string; title: string; policyText: string };

export const seedKnowledge: readonly SeedEntry[] = [
  {
    key: "K1",
    title: "Center hours and office contact",
    policyText:
      "The center is open for care Monday through Friday from 7:00 a.m. to 6:00 p.m. The front office answers messages Monday through Friday from 8:00 a.m. to 5:00 p.m. Messages sent outside office hours are read on the next office day. For urgent same-day matters call the front office at (555) 010-0199.",
  },
  {
    key: "K2",
    title: "Holiday closures 2026–2027",
    policyText:
      "The center is closed on these days: Labor Day (September 7, 2026), Thanksgiving Day and the day after (November 26 and 27, 2026), Winter Break (December 24, 2026 through January 1, 2027), Martin Luther King Jr. Day (January 18, 2027), Memorial Day (May 31, 2027), and Independence Day observed (July 5, 2027). Tuition is not reduced for holiday closures.",
  },
  {
    key: "K3",
    title: "Illness and return to care",
    policyText:
      "A child with a temperature of 100.4°F or higher must be picked up within one hour of the center calling. Children may return after being fever-free for 24 hours without fever-reducing medicine. After vomiting or diarrhea, children may return 24 hours after the last episode. Children diagnosed with conjunctivitis may return 24 hours after treatment begins. The office may ask for a provider's note after three or more days of absence.",
  },
  {
    key: "K4",
    title: "Meals and snacks",
    policyText:
      "Breakfast is served from 7:30 to 8:15 a.m., lunch at 11:30 a.m., and an afternoon snack at 3:00 p.m. The weekly menu is posted on the family board each Friday. Families may send a lunch from home. The center is nut-free; please do not send foods containing peanuts or tree nuts.",
  },
  {
    key: "K5",
    title: "Spare lunches",
    policyText:
      "The center keeps a small number of spare lunches for children who arrive without one. Availability varies by day and is confirmed by the front office. A spare lunch is charged at $6 to the family account.",
  },
  {
    key: "K6",
    title: "Food allergies",
    policyText:
      "Families must provide a written allergy action plan signed by the child's provider before the first day of care and update it each year. Allergy information is posted in the classroom and kitchen. Home-packed foods must be labeled with the child's name.",
  },
  {
    key: "K7",
    title: "Drop-off, pickup, and authorized adults",
    policyText:
      "Please drop off by 9:30 a.m. so children can join morning activities. Only adults on the child's authorized pickup list may pick up; changes to the list require written notice from a parent or guardian before pickup. Pickup after 6:00 p.m. is charged $1 per minute.",
  },
  {
    key: "K8",
    title: "Weather and emergency closures",
    policyText:
      "The center decides weather and emergency closures independently of the local school district. Closure decisions are posted in the family app by 6:00 a.m. on the affected day.",
  },
  {
    key: "K9",
    title: "Tuition and billing",
    policyText:
      "Monthly tuition for full-time care (five days): infants (6 weeks to 12 months) $2,150; toddlers (12 to 30 months) $1,900; preschool (30 months to 5 years) $1,650. Part-time schedules (three days) are 70% of the full-time rate. Tuition is billed on the 1st of each month and a $75 late fee applies after the 5th. Rates are reviewed each August.",
  },
  {
    key: "K10",
    title: "Tours and enrollment",
    policyText:
      "Tours are offered Tuesday and Thursday at 10:00 a.m. and last about 30 minutes. To book a tour, call the front office at (555) 010-0199 or email office@maplegrove.example with your preferred date and your child's age. Enrollment is first come, first served after a tour; a waitlist is kept by age group.",
  },
];
