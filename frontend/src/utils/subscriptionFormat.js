export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      })
    : "—";

export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        dateStyle: "medium",
        timeZone: "Asia/Kolkata",
      })
    : "—";

// Whole days remaining until `endDate` (0 once expired)
export const daysLeft = (endDate) => {
  if (!endDate) return null;
  const ms = new Date(endDate).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 86400000) : 0;
};

export const SOURCE_LABELS = {
  payment: "Payment",
  promo: "Promo",
  voucher: "Voucher",
  direct: "Direct",
  admin: "Admin",
};

export const sourceLabel = (source) => SOURCE_LABELS[source] || "—";
