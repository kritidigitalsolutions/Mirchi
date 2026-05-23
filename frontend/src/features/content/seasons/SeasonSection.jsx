import { Plus, Trash2 } from "lucide-react";
import EpisodeRow from "./EpisodeRow";

export default function SeasonSection({
  season,
  seasonIndex,
  addEp,
  removeSeason,

  chEp,
  removeEp,

  episodeVideoFiles,
  episodeThumbnailFiles,

  handleEpisodeVideoChange,
  handleEpisodeThumbnailChange,
}) {
  return (
    <div
      className="season-block"
      style={{ marginBottom: 18 }}
    >
      <div
        className="season-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <strong>
            Season {season.seasonNumber}
          </strong>

          <span className="season-count">
            {season.episodes.length} episodes
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
          }}
        >
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => addEp(seasonIndex)}
          >
            <Plus size={16} />
            Add Episode
          </button>

          <button
            type="button"
            className="btn btn-ghost del-season-btn"
            onClick={() =>
              removeSeason(seasonIndex)
            }
            aria-label={`Remove season ${season.seasonNumber}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div
        className="season-content"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {season.episodes.map(
          (episode, episodeIndex) => (
            <EpisodeRow
              key={episodeIndex}
              episode={episode}
              seasonIndex={seasonIndex}
              episodeIndex={episodeIndex}

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
          )
        )}
      </div>
    </div>
  );
}
