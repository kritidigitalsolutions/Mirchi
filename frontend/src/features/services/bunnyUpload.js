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
  return encodeURIComponent(String(value || "").trim().replace(/^\/+|\/+$/g, ""));
};

const getExtension = (file) => {
  const name = file?.name || "";
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  return ext ? `.${ext}` : "";
};

const uploadThroughBackend = async (file, type, subfolder, onProgress) => {
  const formData = new FormData();
  formData.append("type", type);
  formData.append("subfolder", subfolder);
  formData.append("file", file);

  const response = await API.post("/admin/auth/bunny-upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });

  return response.data.url;
};

/**
 * Uploads a physical file directly to BunnyCDN for speed.
 * Falls back to the backend proxy if direct browser upload is blocked.
 * 
 * @param {File} file - The file object from the HTML input element.
 * @param {string} type - The content type directory (e.g., 'movies', 'series', 'shortdramas', 'episodes').
 * @param {string} subfolder - The assets subfolder (e.g., 'posters', 'banners', 'videos', 'trailers', 'cast').
 * @param {function} onProgress - Progress callback function receiving percent uploaded.
 * @returns {Promise<string>} The public BunnyCDN URL of the uploaded file.
 */
export const uploadToBunny = async (file, type, subfolder, onProgress) => {
  if (!file) return "";

  const config = await fetchBunnyConfig();
  const { storageHost, storageZone, accessKey, cdnUrl } = config;

  if (!storageHost || !storageZone || !accessKey || !cdnUrl) {
    return uploadThroughBackend(file, type, subfolder, onProgress);
  }

  const remoteFolder = `${safePathSegment(type)}/${safePathSegment(subfolder)}`;
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${getExtension(file)}`;
  const cleanStorageHost = String(storageHost).replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  const cleanCdnUrl = String(cdnUrl).replace(/\/+$/, "");
  const uploadUrl = `https://${cleanStorageHost}/${safePathSegment(storageZone)}/${remoteFolder}/${filename}`;

  try {
    await axios.put(uploadUrl, file, {
      headers: {
        AccessKey: accessKey,
        "Content-Type": file.type || "application/octet-stream",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });

    return `${cleanCdnUrl}/${remoteFolder}/${filename}`;
  } catch (error) {
    console.warn("Direct Bunny upload failed, falling back to backend proxy.", error);
    return uploadThroughBackend(file, type, subfolder, onProgress);
  }
};
