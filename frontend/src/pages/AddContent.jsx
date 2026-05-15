import { useState, useRef } from "react";
import API from "../api/axios";
import "./Dashboard.css";
import { 
  Plus, Star, Image as ImageIcon, Palette, Film, Tv, Users, 
  X, Upload, Play, Rocket, Lock, AlertCircle, Globe, Calendar, 
  Layers, Clock, Tag, MessageSquare, ChevronRight, Video
} from "lucide-react";

const EMPTY_FORM = {
  title: "", description: "", type: "movie", language: "",
  releaseYear: "", duration: "", genre: "", category: "",
  rating: "", videoUrl: "", trailerUrl: "", poster: "", banner: "",
  isPremium: false,
  isComingSoon: false,
  releaseDate: "",
  cast: [{ name: "", image: "" }],
  seasons: [],
};

export default function AddContent() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const getFullUrl = (url) => {
    if (!url) return "";
    if (/^(https?:\/\/|data:|blob:|\/\/)/i.test(url)) return url;
    return url; // In AddContent, we mostly deal with new URLs or file names
  };

  const [videoFile, setVideoFile] = useState(null);
  const [posterFile, setPosterFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [trailerFile, setTrailerFile] = useState(null);
  const [episodeVideoFiles, setEpisodeVideoFiles] = useState({});
  const [episodeThumbnailFiles, setEpisodeThumbnailFiles] = useState({});
  const [castFiles, setCastFiles] = useState({});


  // Refs for file inputs to trigger them from custom UI
  const videoInputRef = useRef(null);
  const posterInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const trailerInputRef = useRef(null);

  const ch = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const setType = (type) => {
    setForm(f => ({ ...f, type }));
  };

  const handleVideoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setVideoFile(file);
  };

  const handlePosterFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setPosterFile(file);
  };

  const handleBannerFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setBannerFile(file);
  };

  const handleTrailerFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setTrailerFile(file);
  };

  const handleEpisodeVideoChange = (seasonIndex, episodeIndex, e) => {
    const file = e.target.files?.[0];
    if (file) {
      const key = `${seasonIndex}_${episodeIndex}`;
      setEpisodeVideoFiles(prev => ({ ...prev, [key]: file }));
    }
  };

  const handleEpisodeThumbnailChange = (seasonIndex, episodeIndex, e) => {
    const file = e.target.files?.[0];
    if (file) {
      const key = `${seasonIndex}_${episodeIndex}`;
      setEpisodeThumbnailFiles(prev => ({ ...prev, [key]: file }));
    }
  };


  const handleCastFileChange = (index, e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCastFiles(prev => ({ ...prev, [index]: file }));
    }
  };

  const addCast = () => setForm(f => ({ ...f, cast: [...f.cast, { name: "", image: "" }] }));
  const removeCast = (i) => {
    setForm(f => ({ ...f, cast: f.cast.filter((_, j) => j !== i) }));
    const newCastFiles = { ...castFiles };
    delete newCastFiles[i];
    setCastFiles(newCastFiles);
  };

  const chCast = (i, field, val) => {
    setForm(f => {
      const cast = [...f.cast];
      cast[i][field] = val;
      return { ...f, cast };
    });
  };

  const addSeason = () => setForm(f => ({
    ...f, seasons: [...f.seasons, { seasonNumber: f.seasons.length + 1, episodes: [] }]
  }));

  const addEp = (si) => setForm(f => {
    const seasons = [...f.seasons];
    seasons[si].episodes.push({ title: "", videoUrl: "", thumbnailUrl: "", duration: "" });
    return { ...f, seasons };
  });

  const removeSeason = (si) => setForm(f => ({
    ...f, seasons: f.seasons.filter((_, i) => i !== si)
  }));

  const removeEp = (si, ei) => setForm(f => {
    const seasons = [...f.seasons];
    seasons[si].episodes = seasons[si].episodes.filter((_, i) => i !== ei);
    return { ...f, seasons };
  });


  const chEp = (si, ei, field, val) => setForm(f => {
    const seasons = [...f.seasons];
    seasons[si].episodes[ei][field] = val;
    return { ...f, seasons };
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const isMovie = form.type === "movie";
      const endpoint = isMovie ? "/admin/movies/add" : "/admin/series/add";
      
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("language", form.language);
      formData.append("releaseYear", form.releaseYear ? Number(form.releaseYear) : "");
      formData.append("duration", form.duration);
      formData.append("genre", JSON.stringify(form.genre.split(",").map(s => s.trim()).filter(Boolean)));
      formData.append("category", JSON.stringify(form.category ? [form.category] : []));
      formData.append("rating", form.rating ? Number(form.rating) : 0);
      formData.append("isPremium", String(form.isPremium));
      formData.append("isComingSoon", String(form.isComingSoon));
      formData.append("releaseDate", form.releaseDate || "");

      // Media fallback handling
      if (posterFile) formData.append("poster", posterFile);
      else if (form.poster) formData.append("poster", form.poster);

      if (bannerFile) formData.append("banner", bannerFile);
      else if (form.banner) formData.append("banner", form.banner);

      if (trailerFile) formData.append("trailer", trailerFile);
      else if (form.trailerUrl) formData.append("trailerUrl", form.trailerUrl);

      if (isMovie) {
        if (videoFile) formData.append("video", videoFile);
        else if (form.videoUrl) formData.append("videoUrl", form.videoUrl);
      }

      // Cast
      const updatedCast = form.cast.map((c, i) => {
        if (castFiles[i]) return { ...c, image: `cast_${i}` };
        return c;
      });
      formData.append("cast", JSON.stringify(updatedCast));
      Object.keys(castFiles).forEach((key) => {
        formData.append(`castImage_${key}`, castFiles[key]);
      });

      const response = await API.post(endpoint, formData, { 
        headers: { "Content-Type": "multipart/form-data" } 
      });

      if (!isMovie && form.seasons.length > 0) {
        const seriesId = response.data.series._id;
        for (const [si, season] of form.seasons.entries()) {
          for (const [ei, ep] of season.episodes.entries()) {
            const epFormData = new FormData();
            epFormData.append("seriesId", seriesId);
            epFormData.append("seasonNumber", season.seasonNumber);
            epFormData.append("episodeNumber", ei + 1);
            epFormData.append("title", ep.title);
            epFormData.append("description", ep.description || "");
            epFormData.append("duration", ep.duration || "");

            const episodeKey = `${si}_${ei}`;
            if (episodeVideoFiles[episodeKey]) epFormData.append("video", episodeVideoFiles[episodeKey]);
            else if (ep.videoUrl) epFormData.append("videoUrl", ep.videoUrl);

            if (episodeThumbnailFiles[episodeKey]) epFormData.append("thumbnail", episodeThumbnailFiles[episodeKey]);
            else if (ep.thumbnailUrl) epFormData.append("thumbnailUrl", ep.thumbnailUrl);

            await API.post("/admin/episodes/add", epFormData, { 
              headers: { "Content-Type": "multipart/form-data" } 
            });
          }
        }
      }

      alert("Content published successfully! 🚀");
      setForm(EMPTY_FORM);
      setVideoFile(null); setPosterFile(null); setBannerFile(null); setTrailerFile(null);
      setEpisodeVideoFiles({}); setEpisodeThumbnailFiles({}); setCastFiles({});

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error publishing content");
    }
    setLoading(false);
  };


  return (
    <div className="add-content-page">
      {/* Header with Type Toggle */}
      <div className="pg-header" style={{ alignItems: 'center' }}>
        <div>
          <h1 className="pg-title">
            <Plus size={24} style={{ color: 'var(--primary)' }} /> 
            Publish New Content
          </h1>
          <p className="pg-sub">Fill in the details below to add a {form.type} to the platform</p>
        </div>
        
        <div className="content-type-toggle">
          <button 
            type="button" 
            className={`toggle-btn ${form.type === 'movie' ? 'active' : ''}`}
            onClick={() => setType('movie')}
          >
            <Film size={18} /> Movies
          </button>
          <button 
            type="button" 
            className={`toggle-btn ${form.type === 'series' ? 'active' : ''}`}
            onClick={() => setType('series')}
          >
            <Tv size={18} /> TV Series
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 30 }}>
        
        {/* Basic Information Section */}
        <div className="premium-card">
          <h3 className="section-title">
            <span><Star size={18} /></span> Basic Information
          </h3>
          
          <div className="form-2col" style={{ marginBottom: 20 }}>
            <div className="form-row form-full">
              <label className="form-label">Content Title *</label>
              <input className="form-input-styled" name="title" placeholder="e.g. Inception" onChange={ch} value={form.title} required />
            </div>
            <div className="form-row form-full">
              <label className="form-label">Synopsis / Description *</label>
              <textarea className="form-input-styled" name="description" placeholder="A brief summary of the plot..." rows={3} onChange={ch} value={form.description} required />
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-row">
              <label className="form-label"><Globe size={14} style={{marginRight: 4}} /> Language</label>
              <input className="form-input-styled" name="language" placeholder="English, Hindi, etc." onChange={ch} value={form.language} />
            </div>
            <div className="form-row">
              <label className="form-label"><Calendar size={14} style={{marginRight: 4}} /> Release Year</label>
              <input className="form-input-styled" name="releaseYear" type="number" placeholder="2024" onChange={ch} value={form.releaseYear} />
            </div>
            <div className="form-row">
              <label className="form-label"><Clock size={14} style={{marginRight: 4}} /> {form.type === 'movie' ? 'Duration' : 'Avg. Ep Duration'}</label>
              <input className="form-input-styled" name="duration" placeholder="e.g. 2h 15m" onChange={ch} value={form.duration} />
            </div>
            <div className="form-row">
              <label className="form-label"><Tag size={14} style={{marginRight: 4}} /> Genres</label>
              <input className="form-input-styled" name="genre" placeholder="Action, Sci-Fi, Drama" onChange={ch} value={form.genre} />
            </div>
            <div className="form-row">
              <label className="form-label"><Layers size={14} style={{marginRight: 4}} /> Category</label>
              <select className="form-input-styled" name="category" onChange={ch} value={form.category}>
                <option value="">Select Category</option>
                <option value="trending">Trending</option>
                <option value="top10">Top 10</option>
                <option value="recommended">Recommended</option>
                {/* <option value="new releases">New Releases</option>
                <option value="bollywood">Bollywood</option>
                <option value="hollywood">Hollywood</option>
                <option value="action">Action</option>
                <option value="comedy">Comedy</option> */}

              </select>
            </div>
            <div className="form-row">
              <label className="form-label"><Star size={14} style={{marginRight: 4}} /> IMDb Rating</label>
              <input className="form-input-styled" name="rating" type="number" step="0.1" placeholder="8.5" onChange={ch} value={form.rating} />
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 24 }}>
            <label className="checkbox-row" style={{ flex: 1, minWidth: '200px' }}>
              <input type="checkbox" name="isComingSoon" onChange={ch} checked={form.isComingSoon} />
              <span><Rocket size={16} style={{marginRight: 8}}/> Coming Soon</span>
            </label>
            <label className="checkbox-row" style={{ flex: 1, minWidth: '200px', background: 'rgba(229, 9, 20, 0.1)', borderColor: 'rgba(229, 9, 20, 0.2)' }}>
              <input type="checkbox" name="isPremium" onChange={ch} checked={form.isPremium} />
              <span style={{ color: 'var(--primary)' }}><Lock size={16} style={{marginRight: 8}}/> Premium Content</span>
            </label>
          </div>

          {form.isComingSoon && (
            <div className="form-row" style={{ marginTop: 20, animation: 'pageIn 0.3s ease' }}>
              <label className="form-label">Scheduled Release Date</label>
              <input className="form-input-styled" type="date" name="releaseDate" onChange={ch} value={form.releaseDate} required />
            </div>
          )}
        </div>

        {/* Media Assets Section */}
        <div className="premium-card">
          <h3 className="section-title">
            <span><ImageIcon size={18} /></span> Visual Assets & Media
          </h3>
          
          <div className="form-grid-3">
            {/* Poster Upload */}
            <div className="form-row">
              <label className="form-label">Poster (Vertical)</label>
              <div 
                className={`file-upload-box ${posterFile ? 'has-file' : ''}`}
                onClick={() => posterInputRef.current?.click()}
              >
                <Upload size={24} color={posterFile ? 'var(--green)' : 'var(--text-muted)'} />
                <p style={{ fontSize: '0.8rem', margin: 0 }}>{posterFile ? posterFile.name : 'Upload Poster'}</p>
                <input type="file" ref={posterInputRef} hidden accept="image/*" onChange={handlePosterFileChange} />
              </div>
              {!posterFile && <input className="form-input-styled" style={{marginTop: 8}} name="poster" placeholder="Or paste URL" onChange={ch} value={form.poster} />}
            </div>

            {/* Banner Upload */}
            <div className="form-row">
              <label className="form-label">Banner (Horizontal)</label>
              <div 
                className={`file-upload-box ${bannerFile ? 'has-file' : ''}`}
                onClick={() => bannerInputRef.current?.click()}
              >
                <Palette size={24} color={bannerFile ? 'var(--green)' : 'var(--text-muted)'} />
                <p style={{ fontSize: '0.8rem', margin: 0 }}>{bannerFile ? bannerFile.name : 'Upload Banner'}</p>
                <input type="file" ref={bannerInputRef} hidden accept="image/*" onChange={handleBannerFileChange} />
              </div>
              {!bannerFile && <input className="form-input-styled" style={{marginTop: 8}} name="banner" placeholder="Or paste URL" onChange={ch} value={form.banner} />}
            </div>

            {/* Trailer Upload */}
            <div className="form-row">
              <label className="form-label">Trailer Video</label>
              <div 
                className={`file-upload-box ${trailerFile ? 'has-file' : ''}`}
                onClick={() => trailerInputRef.current?.click()}
              >
                <Video size={24} color={trailerFile ? 'var(--green)' : 'var(--text-muted)'} />
                <p style={{ fontSize: '0.8rem', margin: 0 }}>{trailerFile ? trailerFile.name : 'Upload Trailer'}</p>
                <input type="file" ref={trailerInputRef} hidden accept="video/*" onChange={handleTrailerFileChange} />
              </div>
              {!trailerFile && <input className="form-input-styled" style={{marginTop: 8}} name="trailerUrl" placeholder="Or paste URL" onChange={ch} value={form.trailerUrl} />}
            </div>
          </div>

          {form.type === "movie" && !form.isComingSoon && (
            <div className="form-row" style={{ marginTop: 24, animation: 'pageIn 0.3s ease' }}>
              <label className="form-label">Full Movie Content</label>
              <div className="form-2col" style={{ gap: 20 }}>
                <div 
                  className={`file-upload-box ${videoFile ? 'has-file' : ''}`}
                  onClick={() => videoInputRef.current?.click()}
                  style={{ flexDirection: 'row', padding: '12px 24px', height: 'fit-content' }}
                >
                  <Play size={20} color={videoFile ? 'var(--green)' : 'var(--text-muted)'} />
                  <span style={{ fontSize: '0.9rem' }}>{videoFile ? videoFile.name : 'Choose Movie File'}</span>
                  <input type="file" ref={videoInputRef} hidden accept="video/*" onChange={handleVideoFileChange} />
                </div>
                {!videoFile && <input className="form-input-styled" name="videoUrl" placeholder="Or paste Direct Video URL" onChange={ch} value={form.videoUrl} />}
              </div>
            </div>
          )}
        </div>

        {/* Cast Members Section */}
        <div className="premium-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 className="section-title" style={{ marginBottom: 0 }}>
              <span><Users size={18} /></span> Cast & Crew
            </h3>
            <button type="button" className="btn btn-ghost" onClick={addCast} style={{ borderRadius: '12px', padding: '8px 16px' }}>
              <Plus size={16} /> Add Actor
            </button>
          </div>

          <div className="cast-grid">
            {form.cast.map((c, i) => (
              <div key={i} className="cast-member-card">
                <button type="button" className="remove-cast-btn" onClick={() => removeCast(i)}><X size={14} /></button>
                
                {/* Cast Image Preview */}
                <div className="cast-preview-circle" style={{ width: 60, height: 60, borderRadius: '50%', margin: '0 auto 12px', background: 'var(--bg3)', border: '2px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {(castFiles[i] || c.image) ? (
                    <img 
                      src={castFiles[i] ? URL.createObjectURL(castFiles[i]) : getFullUrl(c.image)} 
                      alt="" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <Users size={24} style={{ opacity: 0.3 }} />
                  )}
                </div>

                <div className="form-row">

                  <input className="form-input-styled" placeholder="Actor Name" value={c.name} onChange={e => chCast(i, "name", e.target.value)} />
                </div>
                <div className="form-row">
                  <div 
                    className={`file-upload-box ${castFiles[i] ? 'has-file' : ''}`}
                    style={{ padding: '10px' }}
                    onClick={() => document.getElementById(`cast-file-${i}`).click()}
                  >
                    <Upload size={16} />
                    <span style={{ fontSize: '0.75rem' }}>{castFiles[i] ? castFiles[i].name : 'Upload Photo'}</span>
                    <input id={`cast-file-${i}`} type="file" hidden accept="image/*" onChange={(e) => handleCastFileChange(i, e)} />
                  </div>
                  {!castFiles[i] && <input className="form-input-styled" style={{fontSize: '0.8rem', marginTop: 4}} placeholder="Or Photo URL" value={c.image} onChange={e => chCast(i, "image", e.target.value)} />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Seasons & Episodes (Series only) */}
        {form.type === "series" && !form.isComingSoon && (
          <div className="premium-card" style={{ animation: 'pageIn 0.4s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 className="section-title" style={{ marginBottom: 0 }}>
                <span><Tv size={18} /></span> Seasons & Episodes
              </h3>
              <button type="button" className="btn btn-primary" onClick={addSeason}>
                <Plus size={16} /> Add Season
              </button>
            </div>

            {form.seasons.map((s, si) => (
              <div key={si} className="season-block" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ padding: '8px 16px', background: 'var(--primary)', borderRadius: '8px', color: 'white', fontWeight: 800 }}>S{si + 1}</div>
                  <input className="form-input-styled" placeholder="Season Label (e.g. Season 1)" value={s.seasonNumber}
                    onChange={e => {
                      const seasons = [...form.seasons];
                      seasons[si].seasonNumber = e.target.value;
                      setForm(f => ({ ...f, seasons }));
                    }}
                    style={{ width: '200px' }}
                  />
                  <button type="button" className="btn btn-ghost" onClick={() => addEp(si)} style={{ marginLeft: 'auto' }}>
                    <Plus size={14} /> Add Episode
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => removeSeason(si)} style={{ color: 'var(--primary)' }}>
                    <X size={16} />
                  </button>
                </div>


                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {s.episodes.map((ep, ei) => (
                    <div key={ei} className="ep-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 80px 40px', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', gap: '10px' }}>
                      <input className="form-input-styled" placeholder="Title" value={ep.title} onChange={e => chEp(si, ei, "title", e.target.value)} />
                      
                      <div className={`file-upload-box ${episodeVideoFiles[`${si}_${ei}`] ? 'has-file' : ''}`} 
                           style={{ padding: '8px 12px', flexDirection: 'row', gap: 8, height: '40px' }}
                           onClick={() => document.getElementById(`ep-file-${si}-${ei}`).click()}>
                        <Video size={16} />
                        <span style={{ fontSize: '0.75rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {episodeVideoFiles[`${si}_${ei}`] ? 'Video OK' : 'Video'}
                        </span>
                        <input id={`ep-file-${si}-${ei}`} type="file" hidden accept="video/*" onChange={(e) => handleEpisodeVideoChange(si, ei, e)} />
                      </div>

                      <div className={`file-upload-box ${episodeThumbnailFiles[`${si}_${ei}`] ? 'has-file' : ''}`} 
                           style={{ padding: '8px 12px', flexDirection: 'row', gap: 8, height: '40px' }}
                           onClick={() => document.getElementById(`ep-thumb-${si}-${ei}`).click()}>
                        <ImageIcon size={16} />
                        <span style={{ fontSize: '0.75rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {episodeThumbnailFiles[`${si}_${ei}`] ? 'Thumb OK' : 'Thumb'}
                        </span>
                        <input id={`ep-thumb-${si}-${ei}`} type="file" hidden accept="image/*" onChange={(e) => handleEpisodeThumbnailChange(si, ei, e)} />
                      </div>

                      <input className="form-input-styled" placeholder="Or URLs" value={`${ep.videoUrl}${ep.thumbnailUrl ? ' | ' + ep.thumbnailUrl : ''}`} 
                             onChange={e => {
                               const [v, t] = e.target.value.split('|').map(s => s.trim());
                               chEp(si, ei, "videoUrl", v || "");
                               if (t) chEp(si, ei, "thumbnailUrl", t);
                             }} />
                      
                      <input className="form-input-styled" placeholder="Dur" value={ep.duration} onChange={e => chEp(si, ei, "duration", e.target.value)} />
                      
                      <button type="button" className="remove-cast-btn" style={{ position: 'static' }} onClick={() => removeEp(si, ei)}><X size={14} /></button>
                    </div>

                  ))}
                  {s.episodes.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '20px' }}>No episodes added yet.</p>}
                </div>
              </div>
            ))}
            {form.seasons.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '2px dashed rgba(255,255,255,0.05)' }}>
                <Tv size={48} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: 16 }} />
                <p style={{ color: 'var(--text-muted)' }}>Click "Add Season" to start building your TV Series</p>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="submit-row" style={{ marginTop: 20 }}>
          <button type="submit" className="btn-lg" disabled={loading} style={{ minWidth: '240px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            {loading ? (
              <>
                <div className="spinner" style={{ width: 20, height: 20, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Rocket size={20} />
                <span>Publish to Platform</span>
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      </form>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
