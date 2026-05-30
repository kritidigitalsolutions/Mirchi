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

  const [videoProgress, setVideoProgress] = useState(null);
  const [trailerProgress, setTrailerProgress] = useState(null);
  const [episodeProgress, setEpisodeProgress] = useState({});

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
    setVideoProgress(null);
    setTrailerProgress(null);
    setEpisodeProgress({});

    try {
      await createContent({
        form,

        videoFile,
        posterFile,
        bannerFile,
        trailerFile,

        castFiles,

        episodeVideoFiles,
        episodeThumbnailFiles,
        
        onVideoProgress: (p) => setVideoProgress(p),
        onTrailerProgress: (p) => setTrailerProgress(p),
        onEpisodeProgress: (key, p) => setEpisodeProgress(prev => ({ ...prev, [key]: p })),
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
            className={`toggle-btn ${form.type === "movie"
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
            className={`toggle-btn ${form.type === "series"
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

        {loading && (
          <div className="upload-progress-container" style={{
            background: "var(--bg3)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "20px",
            marginTop: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            animation: "fadeIn 0.3s ease"
          }}>
            <h4 style={{ margin: 0, color: "var(--primary)", fontSize: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <div className="spinner" style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              Uploading Large Assets (Streaming Chunks)...
            </h4>
            
            {trailerProgress !== null && (
              <div className="progress-item">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Trailer Video</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--primary)" }}>{trailerProgress}%</span>
                </div>
                <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "6px", height: "8px", overflow: "hidden" }}>
                  <div style={{ background: "var(--primary)", width: `${trailerProgress}%`, height: "100%", transition: "width 0.2s ease" }} />
                </div>
              </div>
            )}
            
            {videoProgress !== null && (
              <div className="progress-item">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Full Movie Video</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--primary)" }}>{videoProgress}%</span>
                </div>
                <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "6px", height: "8px", overflow: "hidden" }}>
                  <div style={{ background: "var(--primary)", width: `${videoProgress}%`, height: "100%", transition: "width 0.2s ease" }} />
                </div>
              </div>
            )}

            {Object.keys(episodeProgress).map((key) => {
              const [si, ei] = key.split("_");
              const progress = episodeProgress[key];
              return (
                <div key={key} className="progress-item">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Season {Number(si) + 1} Episode {Number(ei) + 1} Video</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--primary)" }}>{progress}%</span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "6px", height: "8px", overflow: "hidden" }}>
                    <div style={{ background: "var(--primary)", width: `${progress}%`, height: "100%", transition: "width 0.2s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
