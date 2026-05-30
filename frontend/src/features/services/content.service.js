import API from "../../api/axios";


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
    formData.append("trailer", trailerFile);
  } else if (form.trailerUrl) {
    formData.append(
      "trailerUrl",
      form.trailerUrl
    );
  }

  // Movie Video
  if (isMovie) {
    if (videoFile) {
      formData.append("video", videoFile);
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
          epFormData.append("video", episodeVideoFiles[episodeKey]);
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
