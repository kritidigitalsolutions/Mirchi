import { useState, useRef } from "react";

import "./Dashboard.css";

import MediaAssetsStep from "../features/content/steps/MediaAssetsStep";
import CastSection from "../features/content/cast/CastSection";
import SeasonsSection from "../features/content/seasons/SeasonsSection";
import BasicInfoSection from "../features/content/basic/BasicInfoSection";

import { createContent } from "../features/services/content.service";
import useContentForm from "../features/hooks/useContentForm";

import {
  Plus,
  Film,
  Tv,
  Rocket,
  ChevronRight,
} from "lucide-react";

export default function AddContent() {
  const fileUploadsEnabled =
    import.meta.env.DEV ||
    import.meta.env.VITE_ENABLE_FILE_UPLOADS === "true";

  const {
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
  } = useContentForm();

  const [loading, setLoading] =
    useState(false);

  const [videoFile, setVideoFile] =
    useState(null);

  const [posterFile, setPosterFile] =
    useState(null);

  const [bannerFile, setBannerFile] =
    useState(null);

  const [trailerFile, setTrailerFile] =
    useState(null);

  const [
    episodeVideoFiles,
    setEpisodeVideoFiles,
  ] = useState({});

  const [
    episodeThumbnailFiles,
    setEpisodeThumbnailFiles,
  ] = useState({});

  const [castFiles, setCastFiles] =
    useState({});

  // File Input Refs
  const videoInputRef = useRef(null);

  const posterInputRef =
    useRef(null);

  const bannerInputRef =
    useRef(null);

  const trailerInputRef =
    useRef(null);

  const getFullUrl = (url) => {
    if (!url) return "";

    if (
      /^(https?:\/\/|data:|blob:|\/\/)/i.test(
        url
      )
    ) {
      return url;
    }

    return url;
  };

  // Upload Handlers
  const handleVideoFileChange = (e) => {
    const file = e.target.files?.[0];

    if (file) {
      setVideoFile(file);
    }
  };

  const handlePosterFileChange = (
    e
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      setPosterFile(file);
    }
  };

  const handleBannerFileChange = (
    e
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      setBannerFile(file);
    }
  };

  const handleTrailerFileChange = (
    e
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      setTrailerFile(file);
    }
  };

  const handleEpisodeVideoChange = (
    seasonIndex,
    episodeIndex,
    e
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      const key =
        `${seasonIndex}_${episodeIndex}`;

      setEpisodeVideoFiles(
        (prev) => ({
          ...prev,
          [key]: file,
        })
      );
    }
  };

  const handleEpisodeThumbnailChange =
    (
      seasonIndex,
      episodeIndex,
      e
    ) => {
      const file =
        e.target.files?.[0];

      if (file) {
        const key =
          `${seasonIndex}_${episodeIndex}`;

        setEpisodeThumbnailFiles(
          (prev) => ({
            ...prev,
            [key]: file,
          })
        );
      }
    };

  const handleCastFileChange = (
    index,
    e
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      setCastFiles((prev) => ({
        ...prev,
        [index]: file,
      }));
    }
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      if (
        !fileUploadsEnabled &&
        (videoFile ||
          posterFile ||
          bannerFile ||
          trailerFile ||
          Object.keys(castFiles).length ||
          Object.keys(episodeVideoFiles).length ||
          Object.keys(episodeThumbnailFiles).length)
      ) {
        throw new Error(
          "File uploads are disabled on the hosted app. Paste media URLs instead."
        );
      }

      await createContent({
        form,

        videoFile,
        posterFile,
        bannerFile,
        trailerFile,

        castFiles,

        episodeVideoFiles,
        episodeThumbnailFiles,
      });

      alert(
        "Content published successfully! 🚀"
      );

      resetForm();

      setVideoFile(null);
      setPosterFile(null);
      setBannerFile(null);
      setTrailerFile(null);

      setEpisodeVideoFiles({});
      setEpisodeThumbnailFiles({});
      setCastFiles({});

    } catch (err) {
      console.error(err);

      alert(
        err.response?.data?.message ||
          err.message ||
          "Error publishing content"
      );
    }

    setLoading(false);
  };

  return (
    <div className="add-content-page">

      {/* Header */}
      <div
        className="pg-header"
        style={{
          alignItems: "center",
        }}
      >
        <div>
          <h1 className="pg-title">
            <Plus
              size={24}
              style={{
                color:
                  "var(--primary)",
              }}
            />

            Publish New Content
          </h1>

          <p className="pg-sub">
            Fill in the details below
            to add a {form.type} to
            the platform
          </p>
        </div>

        <div className="content-type-toggle">
          <button
            type="button"
            className={`toggle-btn ${
              form.type === "movie"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setType("movie")
            }
          >
            <Film size={18} />
            Movies
          </button>

          <button
            type="button"
            className={`toggle-btn ${
              form.type === "series"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setType("series")
            }
          >
            <Tv size={18} />
            TV Series
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 30,
        }}
      >

        <BasicInfoSection
          form={form}
          ch={ch}
        />

        <MediaAssetsStep
          form={form}
          ch={ch}
          fileUploadsEnabled={fileUploadsEnabled}

          posterFile={posterFile}
          posterInputRef={
            posterInputRef
          }
          handlePosterFileChange={
            handlePosterFileChange
          }

          bannerFile={bannerFile}
          bannerInputRef={
            bannerInputRef
          }
          handleBannerFileChange={
            handleBannerFileChange
          }

          trailerFile={trailerFile}
          trailerInputRef={
            trailerInputRef
          }
          handleTrailerFileChange={
            handleTrailerFileChange
          }

          videoFile={videoFile}
          videoInputRef={
            videoInputRef
          }
          handleVideoFileChange={
            handleVideoFileChange
          }

          type={form.type}
          isComingSoon={
            form.isComingSoon
          }
        />

        <CastSection
          cast={form.cast}
          castFiles={castFiles}
          fileUploadsEnabled={fileUploadsEnabled}
          addCast={addCast}
          removeCast={removeCast}
          chCast={chCast}
          handleCastFileChange={
            handleCastFileChange
          }
          getFullUrl={getFullUrl}
        />

        <SeasonsSection
          form={form}
          setForm={setForm}
          fileUploadsEnabled={fileUploadsEnabled}

          addSeason={addSeason}
          addEp={addEp}
          removeSeason={removeSeason}

          chEp={chEp}
          removeEp={removeEp}

          episodeVideoFiles={
            episodeVideoFiles
          }

          episodeThumbnailFiles={
            episodeThumbnailFiles
          }

          handleEpisodeVideoChange={
            handleEpisodeVideoChange
          }

          handleEpisodeThumbnailChange={
            handleEpisodeThumbnailChange
          }
        />

        {/* Submit */}
        <div
          className="submit-row"
          style={{
            marginTop: 20,
          }}
        >
          <button
            type="submit"
            className="btn-lg"
            disabled={loading}
            style={{
              minWidth: "240px",
              height: "60px",

              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",

              gap: 12,
            }}
          >
            {loading ? (
              <>
                <div
                  className="spinner"
                  style={{
                    width: 20,
                    height: 20,

                    border:
                      "3px solid rgba(255,255,255,0.3)",

                    borderTopColor:
                      "white",

                    borderRadius: "50%",

                    animation:
                      "spin 1s linear infinite",
                  }}
                />

                <span>
                  Publishing...
                </span>
              </>
            ) : (
              <>
                <Rocket size={20} />

                <span>
                  Publish to Platform
                </span>

                <ChevronRight
                  size={18}
                />
              </>
            )}
          </button>
        </div>
      </form>

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
