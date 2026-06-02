import API from "../../api/axios";

/**
 * Uploads a file to BunnyCDN via the backend proxy.
 *
 * @param {File} file - The file object from the HTML input element.
 * @param {string} type - The content type directory (e.g., 'movies', 'series', 'shortdramas', 'episodes').
 * @param {string} subfolder - The assets subfolder (e.g., 'posters', 'banners', 'videos', 'trailers', 'cast').
 * @param {function} onProgress - Progress callback function receiving percent uploaded.
 * @returns {Promise<string>} The public BunnyCDN URL of the uploaded file.
 */
export const uploadToBunny = async (file, type, subfolder, onProgress) => {
  if (!file) return "";

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
