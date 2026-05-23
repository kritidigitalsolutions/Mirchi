import { Image as ImageIcon, Video, X } from "lucide-react";

export default function EpisodeRow({
  episode,
  seasonIndex,
  episodeIndex,

  chEp,
  removeEp,

  episodeVideoFiles,
  episodeThumbnailFiles,

  handleEpisodeVideoChange,
  handleEpisodeThumbnailChange,
}) {
  return (
    <div
      className="ep-row"
      style={{
        gridTemplateColumns:
          "1fr 1fr 1fr 1fr 80px 40px",
        alignItems: "center",
        background: "rgba(0,0,0,0.2)",
        padding: "12px",
        borderRadius: "12px",
        gap: "10px",
      }}
    >
      <input
        className="form-input-styled"
        placeholder="Title"
        value={episode.title}
        onChange={(e) =>
          chEp(
            seasonIndex,
            episodeIndex,
            "title",
            e.target.value
          )
        }
      />

      <div
        className={`file-upload-box ${
          episodeVideoFiles[
            `${seasonIndex}_${episodeIndex}`
          ]
            ? "has-file"
            : ""
        }`}
        style={{
          padding: "8px 12px",
          flexDirection: "row",
          gap: 8,
          height: "40px",
        }}
        onClick={() =>
          document
            .getElementById(
              `ep-file-${seasonIndex}-${episodeIndex}`
            )
            .click()
        }
      >
        <Video size={16} />

        <span
          style={{
            fontSize: "0.75rem",
            textOverflow: "ellipsis",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {episodeVideoFiles[
            `${seasonIndex}_${episodeIndex}`
          ]
            ? "Video OK"
            : "Video"}
        </span>

        <input
          id={`ep-file-${seasonIndex}-${episodeIndex}`}
          type="file"
          hidden
          accept="video/*"
          onChange={(e) =>
            handleEpisodeVideoChange(
              seasonIndex,
              episodeIndex,
              e
            )
          }
        />
      </div>

      <div
        className={`file-upload-box ${
          episodeThumbnailFiles[
            `${seasonIndex}_${episodeIndex}`
          ]
            ? "has-file"
            : ""
        }`}
        style={{
          padding: "8px 12px",
          flexDirection: "row",
          gap: 8,
          height: "40px",
        }}
        onClick={() =>
          document
            .getElementById(
              `ep-thumb-${seasonIndex}-${episodeIndex}`
            )
            .click()
        }
      >
        <ImageIcon size={16} />

        <span
          style={{
            fontSize: "0.75rem",
            textOverflow: "ellipsis",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {episodeThumbnailFiles[
            `${seasonIndex}_${episodeIndex}`
          ]
            ? "Thumb OK"
            : "Thumb"}
        </span>

        <input
          id={`ep-thumb-${seasonIndex}-${episodeIndex}`}
          type="file"
          hidden
          accept="image/*"
          onChange={(e) =>
            handleEpisodeThumbnailChange(
              seasonIndex,
              episodeIndex,
              e
            )
          }
        />
      </div>

      <input
        className="form-input-styled"
        placeholder="Or URLs"
        value={`${episode.videoUrl}${
          episode.thumbnailUrl
            ? " | " + episode.thumbnailUrl
            : ""
        }`}
        onChange={(e) => {
          const [v, t] = e.target.value
            .split("|")
            .map((s) => s.trim());

          chEp(
            seasonIndex,
            episodeIndex,
            "videoUrl",
            v || ""
          );

          if (t) {
            chEp(
              seasonIndex,
              episodeIndex,
              "thumbnailUrl",
              t
            );
          }
        }}
      />

      <input
        className="form-input-styled"
        placeholder="Dur"
        value={episode.duration}
        onChange={(e) =>
          chEp(
            seasonIndex,
            episodeIndex,
            "duration",
            e.target.value
          )
        }
      />

      <button
        type="button"
        className="remove-cast-btn"
        style={{ position: "static" }}
        onClick={() =>
          removeEp(seasonIndex, episodeIndex)
        }
      >
        <X size={14} />
      </button>
    </div>
  );
}