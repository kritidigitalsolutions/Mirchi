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
  X,
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

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState(""); // "main", "episodes", "complete"
  const [currentEpisodeInfo, setCurrentEpisodeInfo] = useState({ current: 0, total: 0 });

  const [notification, setNotification] = useState({
    type: "", // 'success' or 'error'
    message: "",
    visible: false,
  });

  const showNotification = (type, message) => {
    setNotification({
      type,
      message,
      visible: true,
    });
  };

  const closeNotification = () => {
    setNotification((prev) => ({ ...prev, visible: false }));
  };



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

  // Prevent Enter key from submitting form when typing inside input fields
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      e.preventDefault();
    }
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setUploadProgress(0);
    setUploadPhase("main");

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
        
        onVideoProgress: (percent) => {
          setUploadProgress(percent);
          if (percent === 100) {
            setUploadPhase(form.type === "movie" ? "complete" : "episodes");
          }
        },
        onEpisodeProgress: (current, total, percent) => {
          setUploadPhase("episodes");
          setCurrentEpisodeInfo({ current, total });
          setUploadProgress(percent);
          if (current === total && percent === 100) {
            setUploadPhase("complete");
          }
        },
      });

      showNotification(
        "success",
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

      setUploadProgress(0);
      setUploadPhase("");
      setCurrentEpisodeInfo({ current: 0, total: 0 });

    } catch (err) {
      console.error(err);

      showNotification(
        "error",
        err.response?.data?.message || "Error publishing content"
      );

      setUploadProgress(0);
      setUploadPhase("");
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
            Web Series
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
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

          setEpisodeVideoFiles={
            setEpisodeVideoFiles
          }

          setEpisodeThumbnailFiles={
            setEpisodeThumbnailFiles
          }
        />



        {loading && (
          <div
            className="upload-progress-card"
            style={{
              padding: "24px",
              borderRadius: "16px",
              background: "rgba(30, 30, 40, 0.6)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              marginTop: "20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  className="spinner"
                  style={{
                    width: 20,
                    height: 20,
                    border: "3px solid rgba(230, 57, 70, 0.2)",
                    borderTopColor: "var(--primary)",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <span style={{ fontSize: "16px", fontWeight: "600", color: "#fff" }}>
                  {uploadPhase === "main" && (form.type === "movie" ? "Uploading Movie Assets..." : "Uploading TV Series Details...")}
                  {uploadPhase === "episodes" && `Uploading Episode ${currentEpisodeInfo.current} of ${currentEpisodeInfo.total}...`}
                  {uploadPhase === "complete" && "Finalizing and Publishing Content..."}
                </span>
              </div>
              <span style={{ fontSize: "16px", fontWeight: "700", color: "var(--primary)" }}>
                {uploadProgress}%
              </span>
            </div>

            <div
              style={{
                width: "100%",
                height: "10px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                borderRadius: "999px",
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #e30914 0%, #ff4d5a 100%)",
                  borderRadius: "999px",
                  transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 0 12px rgba(227, 9, 20, 0.5)",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#8a8b98" }}>
              <span>Please keep this window open until publishing is complete.</span>
              {uploadPhase === "main" && (
                <span>
                  {videoFile || trailerFile ? "Sending media chunks to CDN..." : "Uploading metadata..."}
                </span>
              )}
              {uploadPhase === "episodes" && (
                <span>
                  Season {form.seasons.find((_, i) => {
                    let totalBefore = 0;
                    for (let sIdx = 0; sIdx < i; sIdx++) {
                      totalBefore += form.seasons[sIdx].episodes.length;
                    }
                    return currentEpisodeInfo.current <= totalBefore + form.seasons[i].episodes.length;
                  })?.seasonNumber || 1}
                </span>
              )}
              {uploadPhase === "complete" && <span>Syncing CDN distribution nodes...</span>}
            </div>
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

      {/* Premium Notification Modal Overlay */}
      {notification.visible && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(10, 12, 18, 0.8)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999,
            animation: "modalFadeIn 0.25s ease-out",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              background: "rgba(22, 23, 30, 0.9)",
              backdropFilter: "blur(20px)",
              border: `1px solid ${
                notification.type === "success"
                  ? "rgba(16, 185, 129, 0.35)"
                  : "rgba(239, 68, 68, 0.35)"
              }`,
              borderRadius: "20px",
              padding: "36px",
              textAlign: "center",
              boxShadow: `0 20px 50px rgba(0, 0, 0, 0.5), 0 0 40px ${
                notification.type === "success"
                  ? "rgba(16, 185, 129, 0.15)"
                  : "rgba(239, 68, 68, 0.15)"
              }`,
              animation: "modalZoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {/* Status Icon */}
            <div
              style={{
                width: "76px",
                height: "76px",
                borderRadius: "50%",
                background:
                  notification.type === "success"
                    ? "rgba(16, 185, 129, 0.1)"
                    : "rgba(239, 68, 68, 0.1)",
                border: `2px solid ${
                  notification.type === "success" ? "#10b981" : "#ef4444"
                }`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px auto",
                boxShadow: `0 0 24px ${
                  notification.type === "success"
                    ? "rgba(16, 185, 129, 0.25)"
                    : "rgba(239, 68, 68, 0.25)"
                }`,
              }}
            >
              {notification.type === "success" ? (
                <Rocket size={34} color="#10b981" style={{ animation: "rocketPulse 2s infinite" }} />
              ) : (
                <X size={34} color="#ef4444" />
              )}
            </div>

            {/* Title */}
            <h3
              style={{
                fontSize: "22px",
                fontWeight: "850",
                color: "#ffffff",
                marginBottom: "12px",
                letterSpacing: "0.5px",
              }}
            >
              {notification.type === "success" ? "Publish Successful!" : "Publish Error"}
            </h3>

            {/* Message Body */}
            <p
              style={{
                fontSize: "14px",
                lineHeight: "1.65",
                color: "#a0a5b5",
                marginBottom: "28px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {notification.message}
            </p>

            {/* Action Button */}
            <button
              onClick={closeNotification}
              style={{
                width: "100%",
                height: "50px",
                borderRadius: "10px",
                background:
                  notification.type === "success"
                    ? "linear-gradient(135deg, #10b981, #059669)"
                    : "linear-gradient(135deg, #ef4444, #dc2626)",
                border: "none",
                color: "#ffffff",
                fontWeight: "800",
                fontSize: "15px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: `0 4px 14px ${
                  notification.type === "success"
                    ? "rgba(16, 185, 129, 0.4)"
                    : "rgba(239, 68, 68, 0.4)"
                }`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02) translateY(-1px)";
                e.currentTarget.style.boxShadow = `0 6px 18px ${
                  notification.type === "success"
                    ? "rgba(16, 185, 129, 0.5)"
                    : "rgba(239, 68, 68, 0.5)"
                }`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1) translateY(0)";
                e.currentTarget.style.boxShadow = `0 4px 14px ${
                  notification.type === "success"
                    ? "rgba(16, 185, 129, 0.4)"
                    : "rgba(239, 68, 68, 0.4)"
                }`;
              }}
            >
              {notification.type === "success" ? "Done" : "Review Form & Retry"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalZoomIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes rocketPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08) translateY(-2px); }
        }
      `}</style>
    </div>
  );
}
