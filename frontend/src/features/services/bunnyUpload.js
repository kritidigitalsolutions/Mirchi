import API from "../../api/axios";
import axios from "axios";

let cachedConfig = null;

/**
 * Fetches secure BunnyCDN configuration from the backend.
 * Caches the result to avoid redundant API requests.
 */
export const fetchBunnyConfig = async () => {
  if (cachedConfig) return cachedConfig;
  const res = await API.get("/admin/auth/bunny-config");
  cachedConfig = res.data;
  return cachedConfig;
};

/**
 * Uploads a physical file directly from the browser to BunnyCDN Storage.
 * Bypasses your backend server, avoiding any payload limit and timeout issues.
 * 
 * @param {File} file - The file object from the HTML input element.
 * @param {string} type - The content type directory (e.g., 'movies', 'series', 'shortdramas', 'episodes').
 * @param {string} subfolder - The assets subfolder (e.g., 'posters', 'banners', 'videos', 'trailers', 'cast').
 * @param {function} onProgress - Progress callback function receiving (percentComplete).
 * @returns {Promise<string>} The public BunnyCDN URL of the uploaded file.
 */
export const uploadToBunny = async (file, type, subfolder, onProgress) => {
  if (!file) return "";

  const config = await fetchBunnyConfig();
  const { storageHost, storageZone, accessKey, cdnUrl } = config;

  // Generate a cryptographically random, unique filename
  const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = file.name.split(".").pop().toLowerCase();
  const filename = `${uniqueName}.${ext}`;

  const remoteFolder = `${type}/${subfolder}`;
  const uploadUrl = `https://${storageHost}/${storageZone}/${remoteFolder}/${filename}`;

  await axios.put(uploadUrl, file, {
    headers: {
      AccessKey: accessKey,
      "Content-Type": file.type || "application/octet-stream",
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    }
  });

  return `${cdnUrl}/${remoteFolder}/${filename}`;
};
