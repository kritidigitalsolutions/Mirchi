# Watch tracking API: app integration

The admin panel's **Content Analytics** (views, watch time, completion, retention, drop-off)
is built only from these calls. Until the app sends them, analytics stays empty.

Base URL: `{API_BASE}/api/watch`. `Authorization: Bearer <user token>` is **optional**:
send it when the user is logged in. Guests are tracked by `deviceId`.

All calls are **fire-and-forget**. Never block or delay playback on them, and ignore failures.

## 1. Start: when playback actually begins

`POST /api/watch/start`

```json
{
  "episodeId": "665f...",           // required
  "sessionId": "7d1c2b0e-...-uuid",  // required, new UUID for every play (8-100 chars: letters, digits, - _)
  "platform": "android",             // "android" | "ios" | "web"
  "deviceId": "stable-install-id",   // required when NOT logged in, recommended always
  "durationSec": 1260                // episode length from the player, if known
}
```

Retrying with the same `sessionId` is safe.

## 2. Progress: heartbeat

`POST /api/watch/progress`

```json
{ "sessionId": "7d1c2b0e-...", "positionSec": 734, "deltaSec": 30 }
```

Send it:
- every **30 seconds** while the video is playing
- on **pause**, **app backgrounded**, **player closed**, **episode ended**

`deltaSec` is the seconds actually *watched* since the previous heartbeat (do not count paused or
buffering time). `positionSec` is the current playhead.

The server applies these rules (so the app doesn't need to):
- A **view** is counted once, after 10 seconds watched.
- A play is **completed** at 90% of the episode.
- Each heartbeat adds at most 60 seconds, and never more than the real time since the last
  heartbeat, so watch time can't be inflated.

## 3. Share: when the user taps share

`POST /api/watch/share`

```json
{ "seriesId": "665a...", "episodeId": "665f...", "platform": "android", "deviceId": "..." }
```

`episodeId` is optional (omit it when sharing the series page).

## 4. Continue watching (bonus, logged-in users only)

`GET /api/watch/continue?limit=20` (token required)

Returns the latest unfinished episode per series, newest first:

```json
{ "items": [{ "series": {...}, "episode": {...}, "positionSec": 734, "durationSec": 1260,
              "progress": 0.58, "lastWatchedAt": "2026-11-23T10:00:00.000Z" }] }
```

Use `positionSec` to resume playback.

## Minimal player pseudo-code

```js
onPlay(episode) {
  sessionId = uuid();
  lastTick = now(); watched = 0;
  post("/watch/start", { episodeId: episode._id, sessionId, platform, deviceId, durationSec: player.duration });
  timer = every(30s, flush);
}
onTimeUpdate() { if (player.isPlaying) watched += now() - lastTick; lastTick = now(); }
flush() {
  post("/watch/progress", { sessionId, positionSec: player.currentTime, deltaSec: Math.round(watched) });
  watched = 0;
}
onPause / onBackground / onClose / onEnded -> flush();  (onClose/onEnded also stop the timer)
```

## Admin side (for reference)

- Admin panel: **Content Analytics** in the sidebar (`/dashboard/analytics`). Sub-admins need
  the new **Content Analytics** permission.
- Admin API: `GET /api/admin/analytics/overview | series | series/:id | episodes/:id | bunny/:episodeId`
  with `?range=today|yesterday|week|month|year|all|custom&from=YYYY-MM-DD&to=YYYY-MM-DD`
  (IST days).
- After deploying, run once to fill episode lengths from Bunny:
  `node scripts/backfillEpisodeDuration.js` (dry run), then add `--write` to save.

## Responses

All responses are JSON with `success: true | false`; errors also have `message`.

### POST /start
- `200` `{ "success": true, "sessionId": "<id>" }` (same id again = still 200, no duplicate)
- `400` `Valid episodeId is required` · `sessionId must be 8-100 chars (letters, numbers, - or _)` · `Login or deviceId is required`
- `404` `Episode not found`
- `409` `sessionId already used for another episode` (generate a new sessionId)
- `500` `Server error`

### POST /progress
- `200` `{ "success": true }`
- `400` `Valid sessionId is required`
- `403` `Session belongs to another user`
- `404` `Session not found. Call /start first` (call /start with the same sessionId, then continue)
- `500` `Server error`

### POST /share
- `200` `{ "success": true }`
- `400` `Valid seriesId is required` · `Invalid episodeId`
- `404` `Series not found`
- `500` `Server error`

### GET /continue (token required, `limit` default 20, max 50)
- `200`
```json
{
  "success": true,
  "items": [{
    "series": { "_id": "...", "title": "...", "slug": "...", "poster": "...", "banner": "..." },
    "episode": { "_id": "...", "title": "...", "seasonNumber": 1, "episodeNumber": 3, "thumbnail": "..." },
    "positionSec": 734, "durationSec": 1260, "progress": 0.58,
    "lastWatchedAt": "2026-11-23T10:15:00.000Z"
  }]
}
```
- `401` `Unauthorized` · `Invalid or expired token` · `User not found`; `403` `User access only`; `500` `Server error`

### Notes
- On /start, /progress and /share an invalid or expired token does **not** return 401: the request
  continues as a guest. Always send `deviceId`, or /start returns 400 for guests.
- Never block playback on these calls or show their errors to users. Only react to a 404 from
  /progress (call /start again with the same sessionId).
