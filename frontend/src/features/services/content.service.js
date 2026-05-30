import API from "../../api/axios";

export const uploadFileInChunks = async (file, targetFolder, onProgress) => {
  const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB chunks (fits within Vercel's 4.5MB body limit)
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const fileId = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
  
  let responseData = null;

  for (let index = 0; index < totalChunks; index++) {
    const start = index * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append("chunk", chunk, file.name);
    formData.append("filename", fileId);
    formData.append("chunkIndex", index);
    formData.append("totalChunks", totalChunks);
    formData.append("folder", targetFolder);

    const res = await API.post("/admin/uploads/chunk", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    responseData = res.data;
    if (onProgress) {
      onProgress(Math.round(((index + 1) / totalChunks) * 100));
    }
  }

  return responseData;
};

export const createContent = async ({
  form,

  videoFile,
  posterFile,
  bannerFile,
  trailerFile,

  castFiles,

  episodeVideoFiles,
  episodeThumbnailFiles,
  
  onVideoProgress,
  onTrailerProgress,
  onEpisodeProgress,
}) => {
  const isMovie = form.type === "movie";

  const endpoint = isMovie
    ? "/admin/movies/add"
    : "/admin/series/add";

  const formData = new FormData();

  formData.append("title", form.title);
  formData.append(
    "description",
    form.description
  );

  formData.append(
    "language",
    form.language
  );

  formData.append(
    "releaseYear",
    form.releaseYear
      ? Number(form.releaseYear)
      : ""
  );

  formData.append(
    "duration",
    form.duration
  );

  formData.append(
    "genre",
    JSON.stringify(
      form.genre
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );

  formData.append(
    "category",
    JSON.stringify(
      form.category
        ? [form.category]
        : []
    )
  );

  formData.append(
    "rating",
    form.rating
      ? Number(form.rating)
      : 0
  );

  formData.append(
    "isPremium",
    String(form.isPremium)
  );

  formData.append(
    "isComingSoon",
    String(form.isComingSoon)
  );

  formData.append(
    "releaseDate",
    form.releaseDate || ""
  );

  formData.append(
    "priority",
    Number(form.priority) || 0
  );

  // Poster
  if (posterFile) {
    formData.append("poster", posterFile);
  } else if (form.poster) {
    formData.append(
      "poster",
      form.poster
    );
  }

  // Banner
  if (bannerFile) {
    formData.append("banner", bannerFile);
  } else if (form.banner) {
    formData.append(
      "banner",
      form.banner
    );
  }

  // Trailer
  if (trailerFile) {
    onTrailerProgress?.(0);
    const result = await uploadFileInChunks(
      trailerFile,
      `${isMovie ? "movies" : "series"}/trailers`,
      onTrailerProgress
    );
    formData.append("trailerUrl", result.url);
  } else if (form.trailerUrl) {
    formData.append(
      "trailerUrl",
      form.trailerUrl
    );
  }

  // Movie Video
  if (isMovie) {
    if (videoFile) {
      onVideoProgress?.(0);
      const result = await uploadFileInChunks(
        videoFile,
        "movies/videos",
        onVideoProgress
      );
      formData.append("videoUrl", result.url);
    } else if (form.videoUrl) {
      formData.append(
        "videoUrl",
        form.videoUrl
      );
    }
  }

  // Cast
  const updatedCast = form.cast.map(
    (c, i) => {
      if (castFiles[i]) {
        return {
          ...c,
          image: `cast_${i}`,
        };
      }

      return c;
    }
  );

  formData.append(
    "cast",
    JSON.stringify(updatedCast)
  );

  Object.keys(castFiles).forEach(
    (key) => {
      formData.append(
        `castImage_${key}`,
        castFiles[key]
      );
    }
  );

  const response = await API.post(
    endpoint,
    formData,
    {
      headers: {
        "Content-Type":
          "multipart/form-data",
      },
    }
  );

  // Episodes
  if (
    !isMovie &&
    form.seasons.length > 0
  ) {
    const seriesId =
      response.data.series._id;

    for (const [
      si,
      season,
    ] of form.seasons.entries()) {
      for (const [
        ei,
        ep,
      ] of season.episodes.entries()) {
        const epFormData =
          new FormData();

        epFormData.append(
          "seriesId",
          seriesId
        );

        epFormData.append(
          "seasonNumber",
          season.seasonNumber
        );

        epFormData.append(
          "episodeNumber",
          ei + 1
        );

        epFormData.append(
          "title",
          ep.title
        );

        epFormData.append(
          "description",
          ep.description || ""
        );

        epFormData.append(
          "duration",
          ep.duration || ""
        );

        const episodeKey =
          `${si}_${ei}`;

        if (
          episodeVideoFiles[
          episodeKey
          ]
        ) {
          const epVideoFile = episodeVideoFiles[episodeKey];
          onEpisodeProgress?.(episodeKey, 0);
          const result = await uploadFileInChunks(
            epVideoFile,
            "episodes/videos",
            (p) => onEpisodeProgress?.(episodeKey, p)
          );
          epFormData.append("videoUrl", result.url);
        } else if (ep.videoUrl) {
          epFormData.append(
            "videoUrl",
            ep.videoUrl
          );
        }

        if (
          episodeThumbnailFiles[
          episodeKey
          ]
        ) {
          epFormData.append(
            "thumbnail",
            episodeThumbnailFiles[
            episodeKey
            ]
          );
        } else if (
          ep.thumbnailUrl
        ) {
          epFormData.append(
            "thumbnailUrl",
            ep.thumbnailUrl
          );
        }

        await API.post(
          "/admin/episodes/add",
          epFormData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          }
        );
      }
    }
  }

  return response.data;
};
