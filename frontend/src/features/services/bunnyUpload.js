import API from "../../api/axios";
import axios from "axios";

let cachedConfig = null;

export const fetchBunnyConfig = async () => {
  if (cachedConfig) return cachedConfig;

  const response = await API.get("/admin/auth/bunny-config");
  cachedConfig = response.data;

  return cachedConfig;
};

const safePathSegment = (value) => {
  return encodeURIComponent(
    String(value || "")
      .trim()
      .replace(/^\/+|\/+$/g, "")
  );
};

const getExtension = (file) => {
  const name = file?.name || "";
  let ext = name.includes(".")
    ? name.split(".").pop().toLowerCase()
    : "";

  if (ext === "jfif") {
    ext = "jpg";
  }

  return ext ? `.${ext}` : "";
};

const getContentType = (file) => {
  const type = (file?.type || "").toLowerCase();
  const name = (file?.name || "").toLowerCase();
  if (type === "image/jfif" || type === "image/pjpeg" || name.endsWith(".jfif")) {
    return "image/jpeg";
  }
  return file?.type || "application/octet-stream";
};

const uploadThroughBackend = async (
  file,
  type,
  subfolder,
  onProgress
) => {
  const formData = new FormData();

  formData.append("type", type);
  formData.append("subfolder", subfolder);
  formData.append("file", file);

  const response = await API.post(
    "/admin/auth/bunny-upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) /
              progressEvent.total
          );

          onProgress(percentCompleted);
        }
      },
    }
  );

  return response.data.url;
};

const uploadDirectToBunny = async (
  file,
  type,
  subfolder,
  onProgress
) => {
  const {
    storageHosts = [],
    storageZone,
    accessKey,
    cdnUrl,
  } = await fetchBunnyConfig();

  const filename = `${Date.now()}-${Math.round(
    Math.random() * 1000000000
  )}${getExtension(file)}`;

  const remoteFolder =
    `${safePathSegment(type)}/${safePathSegment(
      subfolder
    )}`;

  let lastError = null;

  for (const storageHost of storageHosts) {
    const uploadUrl =
      `https://${storageHost}/${storageZone}/${remoteFolder}/${filename}`;

    try {
      const response = await axios.put(uploadUrl, file, {
        headers: {
          AccessKey: accessKey,
          "Content-Type": getContentType(file),
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) /
                progressEvent.total
            );

            onProgress(percentCompleted);
          }
        },
      });

      if (response.status >= 200 && response.status < 300) {
        return `${cdnUrl}/${remoteFolder}/${filename}`;
      }

      lastError = new Error(
        `Bunny upload failed (${response.status})`
      );
    } catch (err) {
      lastError = err;
      const status = err?.response?.status;
      const isRetryable = status === 401 || status === 403 || !err?.response;

      if (!isRetryable) {
        break;
      }

      // Try the next storage host if available.
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("Bunny upload failed");
};

const uploadDirectToBunnyStream = async (file, onProgress) => {
  const {
    streamLibraryId,
    streamApiKey,
    streamPullZone,
  } = await fetchBunnyConfig();

  if (!streamLibraryId || !streamApiKey || !streamPullZone) {
    throw new Error("Missing Bunny Stream configuration credentials");
  }

  // 1. Create the video
  const createUrl = `https://video.bunnycdn.com/library/${streamLibraryId}/videos`;
  const createRes = await axios.post(
    createUrl,
    { title: file.name || `Video-${Date.now()}` },
    {
      headers: {
        AccessKey: streamApiKey,
        "Content-Type": "application/json",
      },
    }
  );

  const videoId = createRes?.data?.guid;
  if (!videoId) {
    throw new Error("Failed to create video GUID from Bunny Stream");
  }

  // 2. Upload the video file
  const uploadUrl = `https://video.bunnycdn.com/library/${streamLibraryId}/videos/${videoId}`;
  const uploadRes = await axios.put(uploadUrl, file, {
    headers: {
      AccessKey: streamApiKey,
      "Content-Type": "application/octet-stream",
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) /
            progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });

  if (uploadRes.status < 200 || uploadRes.status >= 300) {
    throw new Error(`Bunny Stream upload failed with status ${uploadRes.status}`);
  }

  return `https://${streamPullZone}.b-cdn.net/${videoId}/playlist.m3u8`;
};

export const uploadToBunny = async (
  file,
  type,
  subfolder,
  onProgress
) => {
  if (!file) return "";

  const isVideo = subfolder === "videos" || subfolder === "trailers";

  console.log(
    `USING DIRECT ${isVideo ? "BUNNY STREAM" : "BUNNY STORAGE"} UPLOAD FOR:`,
    subfolder
  );

  try {
    if (isVideo) {
      return await uploadDirectToBunnyStream(file, onProgress);
    } else {
      return await uploadDirectToBunny(
        file,
        type,
        subfolder,
        onProgress
      );
    }
  } catch (err) {
    console.error("Direct upload failed, falling back to backend:", err);
    const status = err?.response?.status;
    const shouldFallbackToBackend =
      !err?.response ||
      status === 401 ||
      status === 403 ||
      status === 0;

    if (!shouldFallbackToBackend) {
      throw err;
    }

    return uploadThroughBackend(
      file,
      type,
      subfolder,
      onProgress
    );
  }
};
