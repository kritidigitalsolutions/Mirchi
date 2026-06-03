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
  const {
    storageHost,
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

  const uploadUrl =
    `https://${storageHost}/${storageZone}/${remoteFolder}/${filename}`;

  const response = await axios.put(uploadUrl, file, {
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

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Bunny upload failed (${response.status})`);
  }

  return `${cdnUrl}/${remoteFolder}/${filename}`;
};

export const uploadToBunny = async (
  file,
  type,
  subfolder,
  onProgress
) => {
  if (!file) return "";

  console.log(
    "USING DIRECT BUNNY UPLOAD FOR:",
    subfolder
  );

  try {
    return await uploadDirectToBunny(
      file,
      type,
      subfolder,
      onProgress
    );
  } catch (err) {
    const isBunnyCorsOrNetworkIssue =
      !err?.response && file.size <= 4 * 1024 * 1024;

    if (!isBunnyCorsOrNetworkIssue) {
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
