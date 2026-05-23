import { useState } from "react";

const EMPTY_FORM = {
  title: "",
  description: "",
  type: "movie",
  language: "",
  releaseYear: "",
  duration: "",
  genre: "",
  category: "",
  rating: "",
  videoUrl: "",
  trailerUrl: "",
  poster: "",
  banner: "",
  isPremium: false,
  isComingSoon: false,
  releaseDate: "",

  cast: [
    {
      name: "",
      image: "",
    },
  ],

  seasons: [],
};

export default function useContentForm() {
  const [form, setForm] =
    useState(EMPTY_FORM);

  const ch = (e) => {
    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setForm((f) => ({
      ...f,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  const setType = (type) => {
    setForm((f) => ({
      ...f,
      type,
    }));
  };

  const addCast = () => {
    setForm((f) => ({
      ...f,
      cast: [
        ...f.cast,
        {
          name: "",
          image: "",
        },
      ],
    }));
  };

  const removeCast = (index) => {
    setForm((f) => ({
      ...f,
      cast: f.cast.filter(
        (_, i) => i !== index
      ),
    }));
  };

  const chCast = (
    index,
    field,
    value
  ) => {
    setForm((f) => {
      const cast = [...f.cast];

      cast[index][field] = value;

      return {
        ...f,
        cast,
      };
    });
  };

  const addSeason = () => {
    setForm((f) => ({
      ...f,

      seasons: [
        ...f.seasons,

        {
          seasonNumber:
            f.seasons.length + 1,

          episodes: [],
        },
      ],
    }));
  };

  const removeSeason = (
    seasonIndex
  ) => {
    setForm((f) => ({
      ...f,

      seasons: f.seasons.filter(
        (_, i) => i !== seasonIndex
      ),
    }));
  };

  const addEp = (seasonIndex) => {
    setForm((f) => {
      const seasons = [...f.seasons];

      seasons[
        seasonIndex
      ].episodes.push({
        title: "",
        videoUrl: "",
        thumbnailUrl: "",
        duration: "",
      });

      return {
        ...f,
        seasons,
      };
    });
  };

  const removeEp = (
    seasonIndex,
    episodeIndex
  ) => {
    setForm((f) => {
      const seasons = [...f.seasons];

      seasons[
        seasonIndex
      ].episodes =
        seasons[
          seasonIndex
        ].episodes.filter(
          (_, i) =>
            i !== episodeIndex
        );

      return {
        ...f,
        seasons,
      };
    });
  };

  const chEp = (
    seasonIndex,
    episodeIndex,
    field,
    value
  ) => {
    setForm((f) => {
      const seasons = [...f.seasons];

      seasons[
        seasonIndex
      ].episodes[
        episodeIndex
      ][field] = value;

      return {
        ...f,
        seasons,
      };
    });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
  };

  return {
    form,
    setForm,

    ch,
    setType,

    addCast,
    removeCast,
    chCast,

    addSeason,
    removeSeason,

    addEp,
    removeEp,
    chEp,

    resetForm,
  };
}