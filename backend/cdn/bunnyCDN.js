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
  const region = (process.env.BUNNY_REGION || "").trim().toLowerCase();
  return region && region !== "us"
    ? `${region}.storage.bunnycdn.com`
    : "storage.bunnycdn.com";
};

const getStorageHosts = (storageHost) => {
  return [...new Set([storageHost, "storage.bunnycdn.com"].filter(Boolean))];
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
  if (!storageZone) missing.push("BUNNY_STORAGE_ZONE");
  if (!accessKey) missing.push("BUNNY_ACCESS_KEY");
  if (!cdnUrl) missing.push("BUNNY_CDN_URL");

  if (missing.length) {
    throw new Error(`Missing Bunny CDN config: ${missing.join(", ")}`);
  }

  return {
    storageZone,
    accessKey,
    storageHost,
    storageHosts: getStorageHosts(storageHost),
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
  const { cdnUrl } = getConfig();
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
  } = getConfig();

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
    url: `${getConfig().cdnUrl}/${safeRemotePath}`,
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
  } = getConfig();

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
    url: `${getConfig().cdnUrl}/${safeRemotePath}`,
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

const deleteFromBunny = async (remotePathOrUrl) => {
  const {
    storageZone,
    accessKey,
    storageHosts,
    cdnUrl,
  } = getConfig();

  let remotePath = String(remotePathOrUrl || "");

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
  uploadBufferToBunny,
  uploadFileToBunny,
  uploadMulterFileToBunny,
  uploadStreamToBunny,
};
