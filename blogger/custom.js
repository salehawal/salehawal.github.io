document.addEventListener('DOMContentLoaded', () => {
    const liteVideos = document.querySelectorAll('.lite-yt-box');
    liteVideos.forEach(video => {
      const videoId = video.dataset.id;
      // Fetch high-quality compressed thumbnail cover natively from YouTube CDN
      video.style.backgroundImage = `url('https://i.ytimg.com/vi/${videoId}/hqdefault.jpg')`;
      
      video.addEventListener('click', () => {
        if (!video.querySelector('iframe')) {
          const iframe = document.createElement('iframe');
          iframe.setAttribute('src', `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`);
          iframe.setAttribute('title', 'YouTube video player');
          iframe.setAttribute('frameborder', '0');
          iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
          iframe.setAttribute('allowfullscreen', 'true');
          video.appendChild(iframe);
        }
      }, { once: true });
    });
  });