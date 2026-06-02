const fs = require("fs/promises");
const path = require("path");

const normalizeBaseUrl = (value) => String(value || "").replace(/\/+$/, "");

const getConfig = () => {
  const storageZone = process.env.BUNNY_STORAGE_ZONE;
  const accessKey = process.env.BUNNY_ACCESS_KEY;
  const region = (process.env.BUNNY_REGION || "").trim().toLowerCase();
  const defaultHost = region && region !== "us"
    ? `${region}.storage.bunnycdn.com`
    : "storage.bunnycdn.com";
  const storageHost = process.env.BUNNY_STORAGE_HOST || defaultHost;
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
    cdnUrl,
  };
};

const sanitizeRemotePath = (remotePath) => {
  const normalized = String(remotePath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  if (!normalized || normalized.includes("..")) {
    throw new Error("Invalid Bunny remote path");
  }

  return normalized
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
};

const buildPublicUrl = (remotePath) => {
  const { cdnUrl } = getConfig();
  return `${cdnUrl}/${sanitizeRemotePath(remotePath)}`;
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
    storageHost,
  } = getConfig();

  const safeRemotePath = sanitizeRemotePath(remotePath);
  const uploadUrl = `https://${storageHost}/${storageZone}/${safeRemotePath}`;

const controller = new AbortController();

const timeout = setTimeout(() => {
  controller.abort();
}, 30 * 60 * 1000); // 30 minutes timeout for large files

const response = await fetch(uploadUrl, {
  method: "PUT",
  headers: {
    AccessKey: accessKey,
    "Content-Type": contentType,
  },
  body: buffer,
  signal: controller.signal,
});

clearTimeout(timeout);

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      `Bunny upload failed (${response.status}): ${message || response.statusText}`
    );
  }

  return {
    path: safeRemotePath,
    url: buildPublicUrl(safeRemotePath),
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
    storageHost,
  } = getConfig();

  const safeRemotePath = sanitizeRemotePath(remotePath);
  const uploadUrl = `https://${storageHost}/${storageZone}/${safeRemotePath}`;

  const headers = {
    AccessKey: accessKey,
    "Content-Type": contentType,
  };

  if (contentLength) {
    headers["Content-Length"] = String(contentLength);
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 30 * 60 * 1000); // 30 minutes timeout for large files

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers,
    body: stream,
    duplex: "half",
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      `Bunny upload failed (${response.status}): ${
        message || response.statusText
      }`
    );
  }

  return {
    path: safeRemotePath,
    url: buildPublicUrl(safeRemotePath),
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
    storageHost,
    cdnUrl,
  } = getConfig();

  let remotePath = String(remotePathOrUrl || "");

  if (remotePath.startsWith(cdnUrl)) {
    remotePath = remotePath.slice(cdnUrl.length);
  }

  const safeRemotePath = sanitizeRemotePath(remotePath);
  const deleteUrl = `https://${storageHost}/${storageZone}/${safeRemotePath}`;

  const response = await fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      AccessKey: accessKey,
    },
  });

  if (!response.ok && response.status !== 404) {
    const message = await response.text().catch(() => "");
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
