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
  const ext = name.includes(".")
    ? name.split(".").pop().toLowerCase()
    : "";

  return ext ? `.${ext}` : "";
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
  const config = await fetchBunnyConfig();

  const {
    storageHost,
    storageZone,
    accessKey,
    cdnUrl,
  } = config;

  const filename = `${Date.now()}-${Math.round(
    Math.random() * 1000000000
  )}${getExtension(file)}`;

  const remoteFolder =
    `${safePathSegment(type)}/${safePathSegment(
      subfolder
    )}`;

  const uploadUrl =
    `https://${storageHost}/${storageZone}/${remoteFolder}/${filename}`;

  console.log("================================");
  console.log("BUNNY CONFIG");
  console.log({
    storageHost,
    storageZone,
    accessKey,
    cdnUrl,
  });

  console.log("UPLOAD URL");
  console.log(uploadUrl);

  console.log("FILE");
  console.log({
    name: file.name,
    size: file.size,
    type: file.type,
  });

  console.log("================================");

  try {
    const result = await axios.put(uploadUrl, file, {
      headers: {
        AccessKey: accessKey,
        "Content-Type":
          file.type || "application/octet-stream",
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

    console.log("UPLOAD SUCCESS");
    console.log(result.status);

    return `${cdnUrl}/${remoteFolder}/${filename}`;
  } catch (err) {
    console.error("================================");
    console.error("DIRECT BUNNY UPLOAD FAILED");

    console.error("STATUS:");
    console.error(err?.response?.status);

    console.error("DATA:");
    console.error(err?.response?.data);

    console.error("HEADERS:");
    console.error(err?.response?.headers);

    console.error("FULL ERROR:");
    console.error(err);

    console.error("================================");

    throw err;
  }
};

export const uploadToBunny = async (
  file,
  type,
  subfolder,
  onProgress
) => {
  if (!file) return "";

  const isLargeMedia =
    subfolder === "videos" ||
    subfolder === "trailers";

  if (isLargeMedia) {
    console.log(
      "USING DIRECT BUNNY UPLOAD:",
      subfolder
    );

    return uploadDirectToBunny(
      file,
      type,
      subfolder,
      onProgress
    );
  }

  console.log(
    "USING BACKEND BUNNY UPLOAD:",
    subfolder
  );

  return uploadThroughBackend(
    file,
    type,
    subfolder,
    onProgress
  );
};