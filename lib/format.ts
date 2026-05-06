export function formatNumber(value: number, digits = 0): string {
  return Number(value || 0).toLocaleString("en-CA", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits ? digits : 0
  });
}

export function formatCurrency(value: number): string {
  return Number(value || 0).toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0
  });
}

export function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `item-${Date.now()}`;
}
