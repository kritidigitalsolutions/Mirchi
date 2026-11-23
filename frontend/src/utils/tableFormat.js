// Shared date/time formatting for admin tables (India time).

export const fmtDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "—";

export const fmtTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      })
    : "";

export const fmtMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export const plural = (n, word) => `${n} ${word}${Number(n) === 1 ? "" : "s"}`;
