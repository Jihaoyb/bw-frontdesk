export const handbookCategories = ['Hours', 'Tuition', 'Health', 'Food', 'Enrollment', 'Policies', 'Contact', 'Other'] as const;
export type HandbookCategory = typeof handbookCategories[number];
export function isHandbookCategory(value: unknown): value is HandbookCategory {
  return typeof value === 'string' && handbookCategories.includes(value as HandbookCategory);
}
export const seedCategories: Record<string, HandbookCategory> = {
  K1: 'Hours', K2: 'Hours', K3: 'Health', K4: 'Food', K5: 'Food',
  K6: 'Health', K7: 'Policies', K8: 'Hours', K9: 'Tuition', K10: 'Enrollment',
};
