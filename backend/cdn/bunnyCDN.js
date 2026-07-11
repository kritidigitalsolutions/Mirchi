const fs = require("fs/promises");
const https = require("https");
const path = require("path");

const normalizeBaseUrl = (value) => String(value || "").trim().replace(/\/+$/, "");

const normalizeStorageHost = (value) => {
  if (value) {
    return String(value)
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "");
  }

  return "storage.bunnycdn.com";
};

const getStorageHosts = (storageHost) => {
  return [...new Set([storageHost, "storage.bunnycdn.com"].filter(Boolean))];
};

let discoveredConfigPromise = null;

const getArrayResponseItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.Items)) return payload.Items;
  return [];
};

const selectStorageZone = (zones) => {
  const activeZones = zones.filter((zone) => !zone.Deleted);

  if (!activeZones.length) {
    throw new Error("No active Bunny storage zones found for BUNNY_ACCESS_KEY");
  }

  if (activeZones.length === 1) {
    return activeZones[0];
  }

  const zonesWithPullZone = activeZones.filter((zone) => {
    return Array.isArray(zone.PullZones) && zone.PullZones.length > 0;
  });

  if (zonesWithPullZone.length === 1) {
    return zonesWithPullZone[0];
  }

  return zonesWithPullZone[0] || activeZones[0];
};

const selectCdnUrl = (zone) => {
  const pullZones = Array.isArray(zone.PullZones) ? zone.PullZones : [];
  const enabledPullZone = pullZones.find((pullZone) => {
    return pullZone?.Enabled && !pullZone?.Suspended;
  }) || pullZones[0];

  const hostnames = Array.isArray(enabledPullZone?.Hostnames)
    ? enabledPullZone.Hostnames
    : [];

  const hostname =
    hostnames.find((item) => item?.IsSystemHostname)?.Value ||
    hostnames.find((item) => item?.Value)?.Value ||
    (enabledPullZone?.Name ? `${enabledPullZone.Name}.b-cdn.net` : "");

  if (!hostname) {
    throw new Error("No Bunny pull zone hostname found for the selected storage zone");
  }

  return normalizeBaseUrl(`https://${hostname}`);
};

const discoverConfigFromBunny = async (accountAccessKey) => {
  const response = await fetch("https://api.bunny.net/storagezone", {
    headers: {
      AccessKey: accountAccessKey,
    },
  });

  if (!response.ok) {
    const message = await readResponseBody(response);
    throw new Error(
      `Bunny config discovery failed (${response.status}): ${message || response.statusText}`
    );
  }

  const zones = getArrayResponseItems(await response.json());
  const envStorageZone = String(process.env.BUNNY_STORAGE_ZONE || "").trim();
  const selectedZone = envStorageZone
    ? zones.find((zone) => String(zone.Name || "").trim() === envStorageZone)
    : selectStorageZone(zones);

  if (!selectedZone) {
    throw new Error(`Bunny storage zone not found: ${envStorageZone}`);
  }

  const storageHost = normalizeStorageHost(selectedZone.StorageHostname);
  const storageAccessKey = String(selectedZone.Password || "").trim();

  if (!storageAccessKey) {
    throw new Error("Selected Bunny storage zone is missing an upload password");
  }

  return {
    storageZone: String(selectedZone.Name || "").trim(),
    accessKey: storageAccessKey,
    storageHost,
    storageHosts: getStorageHosts(storageHost),
    cdnUrl: selectCdnUrl(selectedZone),
  };
};

const encodePathPart = (part) => {
  try {
    return encodeURIComponent(decodeURIComponent(part));
  } catch {
    return encodeURIComponent(part);
  }
};

const getConfig = () => {
  const storageZone = String(process.env.BUNNY_STORAGE_ZONE || "").trim();
  const accessKey = String(process.env.BUNNY_ACCESS_KEY || "").trim();
  const storageHost = normalizeStorageHost(process.env.BUNNY_STORAGE_HOST);
  const cdnUrl = normalizeBaseUrl(process.env.BUNNY_CDN_URL);

  const missing = [];
  if (!accessKey) missing.push("BUNNY_ACCESS_KEY");

  if (missing.length) {
    throw new Error(`Missing Bunny CDN config: ${missing.join(", ")}`);
  }

  if (!storageZone || !cdnUrl) {
    return null;
  }

  return {
    storageZone,
    accessKey,
    storageHost,
    storageHosts: getStorageHosts(storageHost),
    cdnUrl,
  };
};

const getConfigAsync = async () => {
  const staticConfig = getConfig();
  if (staticConfig) {
    return staticConfig;
  }

  if (!discoveredConfigPromise) {
    discoveredConfigPromise = discoverConfigFromBunny(
      String(process.env.BUNNY_ACCESS_KEY || "").trim()
    );
  }

  return discoveredConfigPromise;
};

const getClientUploadConfig = async () => {
  const {
    storageZone,
    accessKey,
    storageHosts,
    cdnUrl,
  } = await getConfigAsync();

  return {
    storageZone,
    accessKey,
    storageHost: storageHosts[0],
    storageHosts,
    cdnUrl,
  };
};

const sanitizeRemotePath = (remotePath) => {
  const normalized = String(remotePath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  const parts = normalized.split("/").filter(Boolean);

  if (
    !parts.length ||
    parts.some((part) => part === "." || part === "..")
  ) {
    throw new Error("Invalid Bunny remote path");
  }

  return parts.map(encodePathPart).join("/");
};

const buildPublicUrl = (remotePath) => {
  const { cdnUrl } = getConfig() || {};
  if (!cdnUrl) {
    throw new Error("Bunny CDN URL is not available until config discovery completes");
  }
  return `${cdnUrl}/${sanitizeRemotePath(remotePath)}`;
};

const withUploadTimeout = async (uploadRequest) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 30 * 60 * 1000);

  try {
    return await uploadRequest(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
};

const requestWithHostFallback = async ({
  hosts,
  storageZone,
  remotePath,
  requestOptions,
}) => {
  let lastResponse = null;

  for (const host of hosts) {
    const requestUrl = `https://${host}/${storageZone}/${remotePath}`;
    const response = await requestOptions(requestUrl);

    if (response.ok || response.status !== 401) {
      return response;
    }

    lastResponse = response;
  }

  return lastResponse;
};

const readResponseBody = (response) => {
  if (typeof response.text === "function") {
    return response.text().catch(() => "");
  }

  return Promise.resolve(response.body || "");
};

const uploadStreamRequest = ({
  stream,
  uploadUrl,
  headers,
  timeoutMs = 30 * 60 * 1000,
}) => {
  return new Promise((resolve, reject) => {
    const req = https.request(uploadUrl, {
      method: "PUT",
      headers,
      timeout: timeoutMs,
    }, (res) => {
      let body = "";

      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          body,
        });
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error("Bunny upload timed out"));
    });

    req.on("error", reject);
    stream.on("error", reject);
    stream.pipe(req);
  });
};

const uploadBufferToBunny = async ({
  buffer,
  remotePath,
  contentType = "application/octet-stream",
}) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Bunny upload buffer is required");
  }

  const {
    storageZone,
    accessKey,
    storageHosts,
  } = await getConfigAsync();

  const safeRemotePath = sanitizeRemotePath(remotePath);

  const response = await requestWithHostFallback({
    hosts: storageHosts,
    storageZone,
    remotePath: safeRemotePath,
    requestOptions: (uploadUrl) => withUploadTimeout((signal) => fetch(uploadUrl, {
      method: "PUT",
      headers: {
        AccessKey: accessKey,
        "Content-Type": contentType,
      },
      body: buffer,
      signal,
    })),
  });

  if (!response.ok) {
    const message = await readResponseBody(response);
    throw new Error(
      `Bunny upload failed (${response.status}): ${message || response.statusText}`
    );
  }

  return {
    path: safeRemotePath,
    url: `${(await getConfigAsync()).cdnUrl}/${safeRemotePath}`,
  };
};

const uploadStreamToBunny = async ({
  stream,
  remotePath,
  contentType = "application/octet-stream",
  contentLength,
}) => {
  const {
    storageZone,
    accessKey,
    storageHosts,
  } = await getConfigAsync();

  const safeRemotePath = sanitizeRemotePath(remotePath);

  const headers = {
    AccessKey: accessKey,
    "Content-Type": contentType,
  };

  if (contentLength) {
    headers["Content-Length"] = String(contentLength);
  }

  const uploadUrl = `https://${storageHosts[0]}/${storageZone}/${safeRemotePath}`;
  const response = await uploadStreamRequest({
    stream,
    uploadUrl,
    headers,
  });

  if (!response.ok) {
    const message = await readResponseBody(response);
    throw new Error(
      `Bunny upload failed (${response.status}): ${message || response.statusText}`
    );
  }

  return {
    path: safeRemotePath,
    url: `${(await getConfigAsync()).cdnUrl}/${safeRemotePath}`,
  };
};

const uploadFileToBunny = async ({
  filePath,
  remotePath,
  contentType,
}) => {
  const buffer = await fs.readFile(filePath);

  return uploadBufferToBunny({
    buffer,
    remotePath,
    contentType,
  });
};

const uploadMulterFileToBunny = async (file, remoteFolder = "") => {
  if (!file) {
    return null;
  }

  const fileName = file.filename || `${Date.now()}-${file.originalname}`;
  const remotePath = path.posix.join(
    String(remoteFolder || "").replace(/\\/g, "/"),
    fileName
  );

  if (file.buffer) {
    return uploadBufferToBunny({
      buffer: file.buffer,
      remotePath,
      contentType: file.mimetype,
    });
  }

  return uploadFileToBunny({
    filePath: file.path,
    remotePath,
    contentType: file.mimetype,
  });
};

const parseBunnyStreamUrl = (url) => {
  if (!url || typeof url !== "string") return null;

  // HLS URL format: https://vz-<zone>.b-cdn.net/<videoId>/playlist.m3u8
  const bcdnMatch = url.match(/https:\/\/([a-zA-Z0-9-]+)\.b-cdn\.net\/([a-zA-Z0-9-]+)\/playlist\.m3u8/);
  if (bcdnMatch) {
    const pullZone = bcdnMatch[1];
    const videoId = bcdnMatch[2];
    return {
      videoId,
      videoUrl: url,
      streamUrl: url,
      playlistUrl: url,
      playbackUrl: url,
      thumbnailUrl: `https://${pullZone}.b-cdn.net/${videoId}/thumbnail.jpg`,
      videoSource: "bunny_stream",
      storageType: "bunny_stream",
      encodingStatus: "processing",
    };
  }

  // Embed URL format: https://iframe.mediadelivery.net/embed/<libraryId>/<videoId>
  const iframeMatch = url.match(/https:\/\/iframe\.mediadelivery\.net\/embed\/(\d+)\/([a-zA-Z0-9-]+)/);
  if (iframeMatch) {
    const libraryId = iframeMatch[1];
    const videoId = iframeMatch[2];
    const pullZone = String(process.env.BUNNY_STREAM_PULL_ZONE || "vz-98ca1951-b15").trim();
    const playlistUrl = `https://${pullZone}.b-cdn.net/${videoId}/playlist.m3u8`;

    return {
      videoId,
      videoUrl: playlistUrl,
      streamUrl: playlistUrl,
      playlistUrl,
      playbackUrl: playlistUrl,
      thumbnailUrl: `https://${pullZone}.b-cdn.net/${videoId}/thumbnail.jpg`,
      videoSource: "bunny_stream",
      storageType: "bunny_stream",
      encodingStatus: "processing",
    };
  }

  return null;
};

const uploadStreamToBunnyStream = async ({
  stream,
  fileName,
  contentType = "application/octet-stream",
}) => {
  const libraryId = String(process.env.BUNNY_STREAM_LIBRARY_ID || "").trim();
  const apiKey = String(process.env.BUNNY_STREAM_API_KEY || "").trim();

  if (!libraryId || !apiKey) {
    throw new Error("Missing Bunny Stream library ID or API key config");
  }

  // 1. Create a video placeholder in Bunny Stream
  const createResponse = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
    method: "POST",
    headers: {
      AccessKey: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: fileName || `Video-${Date.now()}`,
    }),
  });

  if (!createResponse.ok) {
    const text = await readResponseBody(createResponse);
    throw new Error(`Failed to create video on Bunny Stream (${createResponse.status}): ${text}`);
  }

  const createData = await createResponse.json();
  const videoGuid = createData.guid;

  if (!videoGuid) {
    throw new Error("Bunny Stream did not return a valid video GUID");
  }

  // 2. Upload the stream to Bunny Stream PUT API
  const uploadUrl = `https://video.bunnycdn.com/library/${libraryId}/videos/${videoGuid}`;
  const response = await uploadStreamRequest({
    stream,
    uploadUrl,
    headers: {
      AccessKey: apiKey,
      "Content-Type": contentType,
    },
  });

  if (!response.ok) {
    const message = await readResponseBody(response);
    throw new Error(
      `Bunny Stream upload failed (${response.status}): ${message}`
    );
  }

  const pullZone = String(process.env.BUNNY_STREAM_PULL_ZONE || "vz-98ca1951-b15").trim();
  const playlistUrl = `https://${pullZone}.b-cdn.net/${videoGuid}/playlist.m3u8`;

  return {
    videoId: videoGuid,
    url: playlistUrl,
  };
};

const deleteFromBunny = async (remotePathOrUrl) => {
  let remotePath = String(remotePathOrUrl || "");

  // Detect and handle Bunny Stream deletion
  if (
    remotePath.includes("iframe.mediadelivery.net") || 
    (remotePath.includes(".b-cdn.net") && remotePath.includes("/playlist.m3u8")) ||
    remotePath.startsWith("stream:")
  ) {
    let videoId = "";
    let libraryId = String(process.env.BUNNY_STREAM_LIBRARY_ID || "").trim();

    if (remotePath.startsWith("stream:")) {
      videoId = remotePath.split(":")[1];
    } else {
      const matchIframe = remotePath.match(/\/embed\/(\d+)\/([a-zA-Z0-9-]+)/);
      const matchM3u8 = remotePath.match(/\.b-cdn\.net\/([a-zA-Z0-9-]+)\/playlist\.m3u8/);
      if (matchIframe) {
        libraryId = matchIframe[1];
        videoId = matchIframe[2];
      } else if (matchM3u8) {
        videoId = matchM3u8[1];
      }
    }

    const apiKey = String(process.env.BUNNY_STREAM_API_KEY || "").trim();

    if (libraryId && videoId && apiKey) {
      const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, {
        method: "DELETE",
        headers: {
          AccessKey: apiKey,
        },
      });

      if (!response.ok && response.status !== 404) {
        const message = await readResponseBody(response);
        throw new Error(`Bunny Stream delete failed (${response.status}): ${message}`);
      }
      return true;
    }
    return false;
  }

  const {
    storageZone,
    accessKey,
    storageHosts,
    cdnUrl,
  } = await getConfigAsync();

  if (remotePath.startsWith(cdnUrl)) {
    remotePath = remotePath.slice(cdnUrl.length);
  }

  const safeRemotePath = sanitizeRemotePath(remotePath);

  const response = await requestWithHostFallback({
    hosts: storageHosts,
    storageZone,
    remotePath: safeRemotePath,
    requestOptions: (deleteUrl) => fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        AccessKey: accessKey,
      },
    }),
  });

  if (!response.ok && response.status !== 404) {
    const message = await readResponseBody(response);
    throw new Error(
      `Bunny delete failed (${response.status}): ${message || response.statusText}`
    );
  }

  return true;
};

module.exports = {
  buildPublicUrl,
  deleteFromBunny,
  getClientUploadConfig,
  parseBunnyStreamUrl,
  uploadBufferToBunny,
  uploadFileToBunny,
  uploadMulterFileToBunny,
  uploadStreamToBunny,
  uploadStreamToBunnyStream,
};
