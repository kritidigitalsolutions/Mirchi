// IST (India) date helpers for admin reports.
// MongoDB stores UTC; every report is bucketed on the India calendar day,
// regardless of where the API process is hosted.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const IST_TZ = "+05:30";
const DAY_MS = 24 * 60 * 60 * 1000;

// 12:00 AM - 11:59:59 PM IST bounds of the day `daysOffset` from `date`
const getIndiaDayBounds = (date = new Date(), daysOffset = 0) => {
  const indiaNow = new Date(date.getTime() + IST_OFFSET_MS);
  const startOfIndiaDayAsUtc = Date.UTC(
    indiaNow.getUTCFullYear(),
    indiaNow.getUTCMonth(),
    indiaNow.getUTCDate() + daysOffset
  );
  const start = new Date(startOfIndiaDayAsUtc - IST_OFFSET_MS);
  return { start, end: new Date(start.getTime() + DAY_MS) };
};

// "YYYY-MM-DD" -> start of that day in IST (or null)
const parseIndiaDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  return new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MS);
};

const BUCKET_FORMATS = {
  hour: "%Y-%m-%d %H:00",
  day: "%Y-%m-%d",
  month: "%Y-%m",
};

const pad = (n) => String(n).padStart(2, "0");

// JS equivalent of $dateToString(BUCKET_FORMATS[bucket], timezone IST)
const bucketKey = (date, bucket) => {
  const d = new Date(date.getTime() + IST_OFFSET_MS);
  const ymd = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
  if (bucket === "month") return ymd;
  const day = `${ymd}-${pad(d.getUTCDate())}`;
  if (bucket === "day") return day;
  return `${day} ${pad(d.getUTCHours())}:00`;
};

// Every bucket key between start (inclusive) and end (exclusive)
const buildBucketKeys = (start, end, bucket) => {
  const keys = [];
  if (!start || !end || start >= end) return keys;
  if (bucket === "month") {
    const s = new Date(start.getTime() + IST_OFFSET_MS);
    let y = s.getUTCFullYear();
    let m = s.getUTCMonth();
    const last = bucketKey(new Date(end.getTime() - 1), "month");
    for (let i = 0; i < 600; i += 1) {
      const key = `${y}-${pad(m + 1)}`;
      keys.push(key);
      if (key >= last) break;
      m += 1;
      if (m > 11) { m = 0; y += 1; }
    }
    return keys;
  }
  const step = bucket === "hour" ? 60 * 60 * 1000 : DAY_MS;
  for (let t = start.getTime(); t < end.getTime() && keys.length < 2000; t += step) {
    keys.push(bucketKey(new Date(t), bucket));
  }
  return keys;
};

const RANGES = ["today", "yesterday", "week", "month", "year", "all", "custom"];

/**
 * Resolve a report range.
 *  today / yesterday -> that IST day, hourly buckets
 *  week              -> current Monday-Sunday IST week, daily buckets
 *  month             -> current IST calendar month, daily buckets
 *  year              -> current IST calendar year, monthly buckets
 *  all               -> everything (start = null), monthly buckets
 *  custom            -> from..to (YYYY-MM-DD, inclusive IST days)
 * Returns { range, start, end, bucket, format } (start null = no lower bound).
 */
const getRange = (rangeInput, fromInput, toInput, now = new Date()) => {
  const range = RANGES.includes(rangeInput) ? rangeInput : "week";
  const { start: todayStart, end: todayEnd } = getIndiaDayBounds(now, 0);
  let start = null;
  let end = todayEnd;
  let bucket = "day";

  switch (range) {
    case "today":
      start = todayStart;
      bucket = "hour";
      break;
    case "yesterday":
      ({ start, end } = getIndiaDayBounds(now, -1));
      bucket = "hour";
      break;
    case "month": {
      const s = new Date(todayStart.getTime() + IST_OFFSET_MS);
      start = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1) - IST_OFFSET_MS);
      end = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, 1) - IST_OFFSET_MS);
      break;
    }
    case "year": {
      const s = new Date(todayStart.getTime() + IST_OFFSET_MS);
      start = new Date(Date.UTC(s.getUTCFullYear(), 0, 1) - IST_OFFSET_MS);
      end = new Date(Date.UTC(s.getUTCFullYear() + 1, 0, 1) - IST_OFFSET_MS);
      bucket = "month";
      break;
    }
    case "all":
      bucket = "month";
      break;
    case "custom": {
      const from = parseIndiaDate(fromInput);
      const to = parseIndiaDate(toInput);
      start = from || todayStart;
      end = to ? new Date(to.getTime() + DAY_MS) : todayEnd;
      if (end <= start) end = new Date(start.getTime() + DAY_MS);
      const days = (end - start) / DAY_MS;
      bucket = days <= 1 ? "hour" : days <= 92 ? "day" : "month";
      break;
    }
    case "week":
    default: {
      const indiaDay = new Date(now.getTime() + IST_OFFSET_MS).getUTCDay();
      const daysSinceMonday = (indiaDay + 6) % 7;
      start = new Date(todayStart.getTime() - daysSinceMonday * DAY_MS);
      end = new Date(start.getTime() + 7 * DAY_MS);
      break;
    }
  }

  return { range, start, end, bucket, format: BUCKET_FORMATS[bucket] };
};

// The equally long period right before `start` (for % change), or null
const getPreviousRange = ({ start, end }) => {
  if (!start) return null;
  const length = end.getTime() - start.getTime();
  return { start: new Date(start.getTime() - length), end: start };
};

module.exports = {
  IST_OFFSET_MS,
  IST_TZ,
  getIndiaDayBounds,
  parseIndiaDate,
  getRange,
  getPreviousRange,
  bucketKey,
  buildBucketKeys,
  BUCKET_FORMATS,
};
