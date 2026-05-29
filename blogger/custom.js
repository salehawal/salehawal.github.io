/* =========================
   YTL Auto Detect Embed System (FIXED PLAYLIST THUMBNAIL)
   ========================= */

(function () {

  function detectType(id) {
    return /^(PL|UU|OL)/.test(id) ? "playlist" : "video";
  }

  function getThumb(videoId) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }

  function getEmbed(id, type) {
    const p = new URLSearchParams({
      autoplay: 1,
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
      controls: 1
    });

    if (type === "playlist") {
      return `https://www.youtube-nocookie.com/embed/videoseries?list=${id}&${p}`;
    }

    return `https://www.youtube-nocookie.com/embed/${id}?${p}`;
  }

  function getLink(id, type) {
    return type === "playlist"
      ? `https://www.youtube.com/playlist?list=${id}`
      : `https://www.youtube.com/watch?v=${id}`;
  }

  // =========================
  // FIXED: CORS-safe playlist thumbnail fetcher via Fetch API
  // =========================
  function getPlaylistThumbnail(playlistId, callback) {
    const playlistUrl = encodeURIComponent(`https://www.youtube.com/playlist?list=${playlistId}`);
    const ytOembedUrl = `https://www.youtube.com/oembed?url=${playlistUrl}&format=json`;

    fetch(ytOembedUrl)
      .then(response => response.json())
      .then(data => {
        if (data && data.thumbnail_url) {
          callback(data.thumbnail_url);
        } else {
          throw new Error("No thumbnail found in primary oEmbed");
        }
      })
      .catch(err => {
        // Fallback to Noembed proxy if YouTube's native oEmbed fails
        fetch(`https://noembed.com/embed?url=${playlistUrl}`)
          .then(res => res.json())
          .then(data => {
             if (data && data.thumbnail_url) {
               callback(data.thumbnail_url);
             } else {
               callback(null);
             }
          })
          .catch(() => callback(null));
      });
  }

  function renderVideo(el, id) {
    const type = detectType(id);
    el.classList.add("ytl");

    // Fallback transparent image while loading playlist info
    const thumb = type === "video"
      ? getThumb(id)
      : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

    el.innerHTML = `
      <img src="${thumb}" loading="lazy" class="ytl-thumb">
      <div class="ytl-overlay">
        <div class="ytl-play"></div>
        <a class="ytl-youtube"
           href="${getLink(id, type)}"
           target="_blank"
           rel="noopener noreferrer">
           <svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
        </a>
      </div>
    `;

    el.querySelector(".ytl-overlay").addEventListener("click", (e) => {
      if (e.target.closest(".ytl-youtube")) return;

      el.innerHTML = `
        <iframe
          src="${getEmbed(id, type)}"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowfullscreen
        ></iframe>
      `;
    });

    // =========================
    // playlist thumbnail fix application
    // =========================
    if (type === "playlist") {
      getPlaylistThumbnail(id, function(thumbnailUrl) {
        if (!thumbnailUrl) return;
        const img = el.querySelector("img");
        if (img) {
          img.src = thumbnailUrl;
        }
      });
    }
  }

  function init() {
    document.querySelectorAll("[data-ytl]").forEach(el => {
      const id = el.getAttribute("data-ytl")?.trim();
      if (!id) return;
      renderVideo(el, id);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();