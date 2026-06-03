import API from "../../api/axios";

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

export const uploadToBunny = async (
  file,
  type,
  subfolder,
  onProgress
) => {
  if (!file) return "";

  console.log(
    "USING BACKEND BUNNY UPLOAD FOR:",
    subfolder
  );

  return uploadThroughBackend(
    file,
    type,
    subfolder,
    onProgress
  );
};
