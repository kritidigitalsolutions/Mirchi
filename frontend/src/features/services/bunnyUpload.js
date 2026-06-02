import API from "../../api/axios";
import axios from "axios";

let cachedConfig = null;
const MAX_BACKEND_FALLBACK_BYTES = 4 * 1024 * 1024;

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
 * Uploads a file to BunnyCDN — tries direct browser upload first for speed,
 * falls back to backend proxy for small files if direct upload fails.
 *
 * @param {File} file - The file object from the HTML input element.
 * @param {string} type - The content type directory (e.g., 'movies', 'series', 'shortdramas', 'episodes').
 * @param {string} subfolder - The assets subfolder (e.g., 'posters', 'banners', 'videos', 'trailers', 'cast').
 * @param {function} onProgress - Progress callback function receiving percent uploaded.
 * @returns {Promise<string>} The public BunnyCDN URL of the uploaded file.
 */
//commented direct upload , backend upload only
export const uploadToBunny = async (
  file,
  type,
  subfolder,
  onProgress
) => {
  if (!file) return "";

  return uploadThroughBackend(
    file,
    type,
    subfolder,
    onProgress
  );
};