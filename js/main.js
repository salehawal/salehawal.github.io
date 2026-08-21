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

/* ============================================================
   Below this point: the theme's own inline JavaScript, moved
   out of the Blogger template XML and into this file so the
   theme stays clean. (clipboard.min.js is intentionally NOT
   merged in here -- it stays loaded as its own separate
   <script src> tag, unchanged.)

   This used to be an inline <script> sitting near the end of
   <body>, after all the page's HTML (including the post grid)
   had already been parsed, so querying elements like '.reveal'
   or '.card' at the top of the script always found them. Now
   that it's loaded via a <script src> tag placed in <head>, it
   would otherwise run BEFORE that markup exists -- e.g. '.reveal'
   cards would never be found, never get their '.in' class, and
   stay at opacity:0 forever (invisible). Wrapping it so it only
   runs once the DOM is actually ready fixes that regardless of
   where the <script> tag ends up in the page. ============ */
function lalMainInit(){
    const $  = s => document.querySelector(s);
    const $$ = s => Array.from(document.querySelectorAll(s));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---- scroll-reveal ---- */
    (function reveal(){
      const els = $$('.reveal');
      if(reduced || !('IntersectionObserver' in window)){
        els.forEach(el => el.classList.add('in'));
        return;
      }
      const io = new IntersectionObserver(entries=>{
        entries.forEach(e=>{
          if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
        });
      },{threshold:.12, rootMargin:'0px 0px -6% 0px'});
      els.forEach(el => io.observe(el));
    })();

    /* ---- nav state, progress bar, scroll-spy, hide-on-scroll-down ---- */
    (function scrollFX(){
      const nav = $('#nav');
      if(!nav) return;
      const progress = $('#progress');
      const links = $$('.nav-link');
      const sections = ['top','main','contact'].filter(id => document.getElementById(id));
      let lastY = 0, ticking = false;
      function update(){
        const y = scrollY;
        nav.classList.toggle('scrolled', y > 8);
        lastY = y;
        if(progress){
          const h = document.documentElement.scrollHeight - innerHeight;
          progress.style.transform = 'scaleX(' + (h > 0 ? Math.min(y/h, 1) : 0) + ')';
        }
        let current = sections.length ? sections[0] : 'top';
        for(const id of sections){
          const el = document.getElementById(id);
          if(el && el.getBoundingClientRect().top <= 120) current = id;
        }
        links.forEach(l => l.classList.toggle('active', l.getAttribute('data-spy') === current));
        ticking = false;
      }
      addEventListener('scroll', ()=>{ if(!ticking){ requestAnimationFrame(update); ticking = true; } }, {passive:true});
      update();
    })();

    /* ---- mobile menu ---- */
    (function menu(){
      const toggle = $('#navToggle');
      if(!toggle) return;
      const mm = $('#mobileMenu');
      if(mm){
        /* Build the drawer from #navMenu so it mirrors the PageList widget. */
        const nav = $('#navMenu');
        if(nav){
          nav.querySelectorAll('a').forEach(a => {
            const m = document.createElement('a');
            m.className = 'mm-link';
            m.href = a.getAttribute('href');
            m.textContent = a.textContent;
            mm.appendChild(m);
          });
        }
      }
      toggle.addEventListener('click', ()=>{
        const open = document.body.classList.toggle('menu-open');
        toggle.setAttribute('aria-expanded', open);
        document.body.style.overflow = open ? 'hidden' : '';
      });
      $$('.mobile-menu a').forEach(a => a.addEventListener('click', ()=>{
        document.body.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded','false');
        document.body.style.overflow = '';
      }));
    })();

    /* ---- card tilt: subtle 3D pointer-follow on hover (mouse only) ---- */
    (function tilt(){
      if(reduced || matchMedia('(pointer:coarse)').matches) return;
      $$('.card').forEach(card=>{
        card.addEventListener('pointermove', e=>{
          if(e.pointerType && e.pointerType !== 'mouse') return;
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - .5;
          const py = (e.clientY - r.top) / r.height - .5;
          card.style.transform = 'perspective(900px) rotateX(' + (py * -6).toFixed(2) + 'deg) rotateY(' + (px * 8).toFixed(2) + 'deg) translateY(-5px)';
        });
        card.addEventListener('pointerleave', ()=>{ card.style.transform = ''; });
      });
    })();

    /* ---- magnetic spotlight: CTA glow follows the cursor ---- */
    (function spotlight(){
      if(reduced) return;
      $$('.btn-book').forEach(btn=>{
        btn.addEventListener('pointermove', e=>{
          const r = btn.getBoundingClientRect();
          btn.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
          btn.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
        });
      });
    })();

    /* ---- ripple: material-style click feedback on primary buttons ---- */
    (function ripple(){
      if(reduced) return;
      $$('.pager-link,.blog-pager a').forEach(btn=>{
        btn.addEventListener('click', function(e){
          const r = this.getBoundingClientRect();
          const d = Math.max(r.width, r.height);
          const span = document.createElement('span');
          span.className = 'ripple';
          span.style.width = span.style.height = d + 'px';
          span.style.left = (e.clientX - r.left - d / 2) + 'px';
          span.style.top = (e.clientY - r.top - d / 2) + 'px';
          this.appendChild(span);
          span.addEventListener('animationend', ()=> span.remove());
        });
      });
    })();

    /* =====================================================
       Matrix rain — bilingual code-rain: katakana, Arabic, Latin letters,
       binary 0/1 and digits woven in. Kept blue, white-dominant.
       Driven by a fixed interval (not requestAnimationFrame) so it
       keeps running reliably in background/low-power contexts.
       ===================================================== */
    (function matrix(){
      const cvs = $('#matrix');
      if(!cvs) return;
      const ctx = cvs.getContext('2d');
      const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノABCDEFGHIJKLMNOPQRSTUVWXYZابتثجحخدذرزسشصضطظعغفقكلمنهوي0123456789٠١٢٣٤٥٦٧٨٩01010101';
      let W, H, fs = 15, cols = [], timer = 0;

      function resize(){
        W = cvs.width = innerWidth;
        H = cvs.height = innerHeight;
        fs = Math.max(13, Math.round(innerWidth / 95));
        cols = Array.from({length: Math.ceil(W / fs) + 1}, ()=> Math.floor(Math.random() * -(H / fs)));
      }

      function draw(){
        ctx.fillStyle = 'rgba(255,255,255,0.14)';   /* fade trail against the white page */
        ctx.fillRect(0,0,W,H);
        ctx.font = fs + 'px "Segoe UI","Geeza Pro","Courier New",monospace';
        for(let i=0;i<cols.length;i++){
          const ch = GLYPHS[Math.floor(Math.random()*GLYPHS.length)];
          const x = i*fs, y = cols[i]*fs;
          ctx.fillStyle = Math.random() > 0.972 ? 'rgba(59,130,246,0.5)' : 'rgba(37,99,235,0.17)';
          ctx.fillText(ch, x, y);
          if(y > H && Math.random() > 0.975) cols[i] = 0;
          cols[i]++;
        }
      }

      function start(){ if(!timer){ timer = setInterval(draw, 33); } }
      function stop(){ clearInterval(timer); timer = 0; }

      resize();
      let rTimer = null, rW = innerWidth, rH = innerHeight;
      addEventListener('resize', function(){
        clearTimeout(rTimer);
        rTimer = setTimeout(function(){
          const w = innerWidth, h = innerHeight;
          if(w !== rW || Math.abs(h - rH) > 150){
            rW = w; rH = h;
            resize();
          }
        }, 150);
      }, {passive:true});

      /* The rain is only ever visible over the transparent hero at the
         very top of the page -- everything further down sits on an
         opaque background. Redrawing it 30x/second the entire time the
         visitor is scrolled deep into the page buys nothing visually
         and costs ongoing GPU/compositor time that some Android
         browsers (Firefox in particular) can't keep up with alongside
         the fixed, translucent header, which is what read as the
         header flickering. Pause it once scrolled past the hero and
         resume it near the top. */
      let sTicking = false;
      function checkScroll(){
        if(scrollY > innerHeight * 1.1) stop();
        else if(!document.hidden) start();
        sTicking = false;
      }
      if(!reduced){
        checkScroll();
        addEventListener('scroll', ()=>{ if(!sTicking){ requestAnimationFrame(checkScroll); sTicking = true; } }, {passive:true});
        document.addEventListener('visibilitychange', ()=> document.hidden ? stop() : checkScroll());
      }
    })();

    /* ---- year ---- */
    (function year(){
      const el = $('#year');
      if(el) el.textContent = new Date().getFullYear();
    })();

    /* ---- grid infinite scroll: the newest post is the FeaturedPost, so the
       homepage grid starts with post #2. Additional pages are fetched only
       once the user has scrolled past the true end of the page -- footer
       included -- and keeps dragging/scrolling well past it, the same
       "pull past the bottom" feel used by social apps, tuned to be hard to
       trigger by accident. This is driven by real wheel/touch drag distance
       accumulated once the page is fully scrolled, not by watching a
       sentinel element's position, since a sentinel that sits above the
       footer would otherwise fire while the footer is still off-screen.

       MIN_CARDS: the grid is meant to show exactly one full first "page" of
       cards (2 rows x 4 columns = 8) right away, not counting the featured
       post -- never more, never less. If the initial fetch returns fewer
       than that once the featured post is excluded, we transparently fetch
       the next page(s) immediately on load -- before the user even
       scrolls. If it returns MORE than that, the extra cards are already
       sitting in the DOM (nothing is discarded, so no post is ever skipped)
       but stay hidden until the user actually scrolls for more, at which
       point they're revealed instantly with no network request, before any
       fresh page is ever fetched. ---- */
    (function infiniteScroll(){
      var grid = document.getElementById('page_body');
      if(!grid) return;
      if(!document.body.classList.contains('feed-view')) return;

      var MIN_CARDS = 8;
      /* Cards we've already fetched (so no data is ever lost/skipped) but
         are intentionally keeping hidden until they're actually needed --
         this is the single reserve that both the very first view and every
         later "load more" trigger draw from, so both can always assemble
         a full batch of MIN_CARDS cards instead of showing whatever
         happened to be left over. */
      var queued = [];

      function enqueue(cards, fromNetwork){
        cards.forEach(function(c){
          c.classList.add('lal-queued');
          if(fromNetwork) c.classList.add('lal-net');
          c.style.display = 'none';
          queued.push(c);
        });
      }

      /* Reveal a queued card. Cards that were already server-rendered on
         this page (just hidden by us) keep their original 'reveal' class
         so the existing scroll-fade IntersectionObserver (set up earlier,
         before any of this hiding happened) still fades them in normally
         once they're actually scrolled into view. Cards that came from a
         fresh network fetch (marked 'lal-net') were never seen by that
         observer, so they're shown immediately instead -- otherwise
         they'd carry the 'reveal' class forever with nothing ever adding
         '.in' to it. */
      function reveal(cards){
        cards.forEach(function(c){
          c.style.display = '';
          c.classList.remove('lal-queued');
          if(c.classList.contains('lal-net')){
            c.classList.remove('lal-net');
            c.classList.add('in');
            c.classList.remove('reveal');
          }
        });
      }

      function featuredUrl(){
        var featured = document.querySelector('.featured-post article.post a[href]');
        if(!featured) return '';
        try { return new URL(featured.getAttribute('href'), location.href).href.split('#')[0]; }
        catch(e) { return featured.getAttribute('href').split('#')[0]; }
      }

      function clean(root){
        var fu = featuredUrl();
        if(!fu) return;
        root.querySelectorAll('.card[href]').forEach(function(card){
          try {
            var u = new URL(card.getAttribute('href'), location.href).href.split('#')[0];
            if(u === fu) card.remove();
          } catch(e) {}
        });
      }

      function prepare(root){
        root.querySelectorAll('.card-media img').forEach(function(img){
          if(img.complete && img.naturalWidth) img.classList.add('loaded');
          else {
            img.addEventListener('load', function(){img.classList.add('loaded')},{once:true});
            img.addEventListener('error', function(){img.classList.add('loaded')},{once:true});
          }
        });
      }

      function fetchPage(url){
        return fetch(url).then(function(res){
          if(!res.ok) throw new Error('HTTP '+res.status);
          return res.text();
        }).then(function(html){
          return new DOMParser().parseFromString(html, 'text/html');
        });
      }

      function currentUrls(){
        return new Set(Array.from(grid.querySelectorAll('.card[href]')).map(function(c){
          try { return new URL(c.getAttribute('href'), location.href).href.split('#')[0]; }
          catch(e) { return c.getAttribute('href').split('#')[0]; }
        }));
      }

      /* Fetches one Blogger page's worth of posts and drops them into the
         reserve queue, hidden -- it does NOT decide how many of them get
         shown; that's entirely up to revealBatch() below, so a network
         fetch always contributes to the same pool the initial SSR reserve
         cards came from, and every "load more" trigger reveals a
         consistent MIN_CARDS regardless of where those cards came from. */
      function fetchNextPageIntoQueue(){
        var sentinel = grid.querySelector('.load-sentinel');
        if(!sentinel) return Promise.resolve();
        var url = sentinel.getAttribute('data-url');
        if(!url) return Promise.resolve();

        var spinner = document.createElement('div');
        spinner.className = 'load-spinner';
        spinner.innerHTML = '<span class="load-spinner-dot"/><span class="load-spinner-dot"/><span class="load-spinner-dot"/>';
        sentinel.parentNode.insertBefore(spinner, sentinel);

        return fetchPage(url).then(function(doc){
          var fu = featuredUrl();
          var seen = currentUrls();
          var frag = document.createDocumentFragment();
          var newCards = [];

          doc.querySelectorAll('.card[href]').forEach(function(card){
            var raw = card.getAttribute('href');
            if(!raw) return;
            try {
              var u = new URL(raw, location.href).href.split('#')[0];
              if(u === fu || seen.has(u)) return;
              seen.add(u);
            } catch(e) { return; }
            frag.appendChild(card);
            newCards.push(card);
          });

          if(frag.childNodes.length){
            sentinel.parentNode.insertBefore(frag, sentinel);
            enqueue(newCards, true);
          }

          var nextSentinel = doc.querySelector('.load-sentinel');
          if(nextSentinel && nextSentinel.getAttribute('data-url')){
            sentinel.setAttribute('data-url', nextSentinel.getAttribute('data-url'));
          } else {
            sentinel.remove();
          }
        })['catch'](function(e){
          console.warn('Infinite scroll fetch failed:', e);
        })['finally'](function(){
          spinner.remove();
        });
      }

      clean(grid);
      prepare(grid);

      /* Everything the server rendered on this page beyond what a single
         request needs starts life in the reserve queue too -- the very
         first view and every later trigger both pull from the exact same
         pool, so both can always assemble a full MIN_CARDS batch. */
      enqueue(Array.prototype.slice.call(grid.querySelectorAll('.card[href]')));

      var loading = false;
      var dragAccum = 0;

      /* Tops the reserve queue up (fetching real pages, hidden, as needed)
         until it holds at least `n` cards or there's nothing left to fetch. */
      function ensureQueueHas(n){
        if(queued.length >= n) return Promise.resolve();
        if(!grid.querySelector('.load-sentinel')) return Promise.resolve();
        return fetchNextPageIntoQueue().then(function(){ return ensureQueueHas(n); });
      }

      /* The one operation both the initial view and every later trigger
         use: make sure the reserve has a full batch available (fetching
         more pages transparently if it's short), then reveal exactly
         MIN_CARDS of them -- or fewer, only if the blog has truly run out
         of posts entirely. */
      function revealBatch(){
        if(loading) return Promise.resolve();
        loading = true;
        return ensureQueueHas(MIN_CARDS).then(function(){
          var take = queued.splice(0, MIN_CARDS);
          reveal(take);
        }).then(function(){
          loading = false;
          dragAccum = 0;
        });
      }

      /* How far (in px) the user still has to scroll to hit the actual
         bottom of the whole document -- footer included. 0 or less means
         they're already at the true end of the page. */
      function distanceToBottom(){
        var doc = document.documentElement;
        return doc.scrollHeight - (window.scrollY + window.innerHeight);
      }

      function maybeLoad(){
        if(loading) return;
        if(!queued.length && !grid.querySelector('.load-sentinel')) return; // truly nothing left
        revealBatch();
      }

      /* Users who prefer reduced motion get everything loaded up front in
         full batches, rather than needing to perform a drag/scroll gesture
         to reveal more. */
      if(reduced){
        (function loadAll(){
          if(!queued.length && !grid.querySelector('.load-sentinel')) return;
          revealBatch().then(loadAll);
        })();
        return;
      }

      /* Fill the very first view: reveal one full batch immediately (no
         scrolling needed), pulling from the reserve and, only if the blog
         doesn't have enough posts to fill it, transparently fetching more
         pages first. */
      revealBatch().then(function(){
        if(!grid.querySelector('.load-sentinel') && !queued.length) return;

        /* Trigger only once the user has actually reached the true end of
           the page (past the footer, not just past the grid) and then
           keeps scrolling/dragging further -- the same "pull past the
           bottom" feel used by social apps, rather than preloading early
           or firing off a single quick flick that happens to land at the
           bottom. Deliberately tuned to be hard to trip by accident:
           - the overscroll distance required is fairly large
           - a single wheel "tick" can only ever count for a small, capped
             amount, so one big trackpad/mouse-wheel flick can't satisfy it
             on its own -- it takes several continued nudges
           - the accumulator resets the moment the user scrolls back up,
             or if they pause at the bottom without continuing to scroll */
        var OVERSCROLL_PX = 220;
        var WHEEL_TICK_CAP = 24;
        var IDLE_RESET_MS = 700;
        var atBottom = false;
        var idleTimer = null;

        function resetIdleTimer(){
          if(idleTimer) clearTimeout(idleTimer);
          idleTimer = setTimeout(function(){ dragAccum = 0; }, IDLE_RESET_MS);
        }

        function updateAtBottom(){
          var wasAtBottom = atBottom;
          atBottom = distanceToBottom() <= 2; // 2px tolerance for rounding
          if(!atBottom && wasAtBottom) dragAccum = 0; // scrolled back up: reset
        }

        addEventListener('scroll', updateAtBottom, {passive:true});

        addEventListener('wheel', function(e){
          updateAtBottom();
          if(atBottom && e.deltaY > 0){
            dragAccum += Math.min(e.deltaY, WHEEL_TICK_CAP);
            resetIdleTimer();
            if(dragAccum >= OVERSCROLL_PX) maybeLoad();
          }
        }, {passive:true});

        /* Touch: mobile browsers mostly don't rubber-band the whole page,
           so "past the bottom" has to be approximated as "finger still
           dragging upward while already pinned at the bottom" rather than
           an actual overscroll position. We measure the drag distance from
           a fixed reference point (where the finger was when it first
           entered the "near bottom" zone), not from the previous touchmove
           event -- resetting the reference on every event would mean the
           measured distance is only ever the few px between two consecutive
           events, which never adds up to anything.

           The "near bottom" zone uses a generous tolerance (not the exact
           2px used for the wheel/desktop check) because on mobile the
           address bar showing/hiding changes window.innerHeight mid-scroll,
           which would otherwise make a tight bottom check unreliable. */
        var TOUCH_NEAR_BOTTOM_PX = 160;
        var touchRefY = null;
        var touchWasNear = false;

        function nearBottomForTouch(){
          return distanceToBottom() < TOUCH_NEAR_BOTTOM_PX;
        }

        addEventListener('touchstart', function(e){
          var y = e.touches[0] ? e.touches[0].clientY : null;
          touchWasNear = nearBottomForTouch();
          touchRefY = touchWasNear ? y : null;
        }, {passive:true});

        addEventListener('touchmove', function(e){
          var y = e.touches[0] ? e.touches[0].clientY : null;
          if(y === null) return;

          var isNear = nearBottomForTouch();
          if(isNear && !touchWasNear){
            /* Just crossed into the near-bottom zone mid-swipe: start
               measuring from right here rather than from wherever the
               finger started (which could've been far up the page). */
            touchRefY = y;
          }
          touchWasNear = isNear;

          if(isNear && touchRefY !== null){
            var delta = touchRefY - y; // finger moving up the screen = scrolling down
            if(delta > 0){
              dragAccum = delta;
              resetIdleTimer();
              if(dragAccum >= OVERSCROLL_PX) maybeLoad();
            }
          } else {
            dragAccum = 0;
          }
        }, {passive:true});

        addEventListener('touchend', function(){
          touchRefY = null;
          touchWasNear = false;
        }, {passive:true});

        updateAtBottom();
      });
    })();

    /* ---- share buttons: self-contained handling (popup + platform actions),
       independent of the stock vegeclub bundle ---- */
    (function share(){
      const closeAll = () => $$('.share-buttons:not(.hidden)').forEach(p => p.classList.add('hidden'));
      document.addEventListener('click', function(e){
        const btn = e.target.closest('.sharing-button');
        if(btn){
          e.preventDefault(); e.stopPropagation();
          const id = btn.getAttribute('aria-controls');
          const pop = id ? document.getElementById(id) : null;
          if(pop){
            const willOpen = pop.classList.contains('hidden');
            closeAll();
            if(willOpen) pop.classList.remove('hidden');
          }
          return;
        }
        const pl = e.target.closest('.sharing-platform-button');
        if(pl){
          e.preventDefault(); e.stopPropagation();
          const href = pl.getAttribute('data-href');
          if(href){
            if(pl.classList.contains('sharing-element-link')){
              const url = pl.getAttribute('data-url') || href;
              if(navigator.clipboard && navigator.clipboard.writeText){
                navigator.clipboard.writeText(url).catch(()=> window.prompt('Copy link', url));
              } else {
                window.prompt('Copy link', url);
              }
            } else {
              window.open(href, '_blank', 'width=640,height=430,noopener');
            }
          }
          closeAll();
          return;
        }
        if(!e.target.closest('.share-buttons-container')) closeAll();
      }, true);
      document.addEventListener('keydown', function(e){
        const t = e.target;
        if(t && t.closest && t.closest('.sharing-platform-button') && (e.key === 'Enter' || e.key === ' ')){
          e.preventDefault(); t.closest('.sharing-platform-button').click();
        }
      }, true);
    })();

    /* ---- live search suggestions: posts + pages dropdown while typing ---- */
    (function suggest(){
      const input = document.querySelector('.centered-top .search input[name="q"]');
      if(!input) return;
      const form = input.closest('form');
      const box = document.createElement('div');
      box.className = 'search-suggestions';
      form.appendChild(box);

      let timer = null, seq = 0;

      function jsonp(url, cb){
        const s = document.createElement('script');
        const name = '__lalSuggest' + (++seq);
        window[name] = function(data){ delete window[name]; s.remove(); cb(data); };
        s.src = url + '&callback=' + name;
        s.onerror = function(){ delete window[name]; s.remove(); cb(null); };
        document.head.appendChild(s);
      }

      function show(items){
        box.innerHTML = '';
        if(!items.length){
          const d = document.createElement('div');
          d.className = 'ss-empty';
          d.textContent = 'No matching posts or pages';
          box.appendChild(d);
        } else {
          items.forEach(function(it){
            const a = document.createElement('a');
            a.href = it.url;
            if(it.thumb){
              const im = document.createElement('img');
              im.className = 'ss-thumb';
              im.src = it.thumb;
              im.alt = '';
              a.appendChild(im);
            }
            const t = document.createElement('span');
            t.className = 'ss-title';
            t.textContent = it.title;
            a.appendChild(t);
            const b = document.createElement('span');
            b.className = 'ss-type';
            b.textContent = it.type;
            a.appendChild(b);
            box.appendChild(a);
          });
        }
        box.classList.add('open');
      }
      function hide(){ box.classList.remove('open'); }

      function run(q){
        const base = location.origin + '/feeds/';
        const postsUrl = base + 'posts/summary?alt=json-in-script&max-results=5&q=' + encodeURIComponent(q);
        const pagesUrl = base + 'pages/summary?alt=json-in-script&max-results=50';
        let posts = [], pages = [], done = 0;
        function finish(){
          const items = [];
          posts.concat(pages).forEach(function(en){
            const link = (en.link || []).filter(function(l){ return l.rel === 'alternate'; })[0];
            if(link && en.title && en.title.$t){
              items.push({
                title: en.title.$t,
                url: link.href,
                thumb: (en.media$thumbnail && en.media$thumbnail.url) ? en.media$thumbnail.url : null
              });
            }
          });
          items.forEach(function(it){ it.type = /\/p\//.test(it.url) ? 'Page' : 'Post'; });
          show(items.slice(0, 5));
        }
        jsonp(postsUrl, function(d){
          posts = (d && d.feed && d.feed.entry) ? d.feed.entry : [];
          if(++done === 2) finish();
        });
        jsonp(pagesUrl, function(d){
          pages = ((d && d.feed && d.feed.entry) || []).filter(function(en){
            return en.title && en.title.$t && en.title.$t.toLowerCase().indexOf(q.toLowerCase()) !== -1;
          });
          if(++done === 2) finish();
        });
      }

      input.addEventListener('input', function(){
        const v = input.value.trim();
        clearTimeout(timer);
        if(v.length < 2){ hide(); return; }
        timer = setTimeout(function(){ run(v); }, 250);
      });
      input.addEventListener('focus', function(){
        const v = input.value.trim();
        if(v.length >= 2) run(v);
      });
      input.addEventListener('keydown', function(e){
        if(e.key === 'Escape') hide();
      });
      document.addEventListener('click', function(e){
        if(e.target !== input && !box.contains(e.target)) hide();
      }, true);
      /* keep the input focused while picking a suggestion; the link still fires */
      box.addEventListener('mousedown', function(e){ e.preventDefault(); });
    })();

    /* ---- back to top ---- */
    (function toTop(){
      const btn = $('#toTop');
      if(!btn) return;
      addEventListener('scroll', ()=>{
        if(!ticking2){ requestAnimationFrame(()=>{ btn.classList.toggle('show', scrollY > 480); ticking2 = false; }); ticking2 = true; }
      }, {passive:true});
      let ticking2 = false;
      btn.addEventListener('click', ()=> scrollTo({top:0, behavior: reduced ? 'auto' : 'smooth'}));
    })();

    /* ---- image fade-in once loaded (grid thumbnails only) ---- */
    (function imgFade(){
      $$('.card-media img').forEach(img=>{
        if(img.complete && img.naturalWidth){ img.classList.add('loaded'); return; }
        img.addEventListener('load', ()=> img.classList.add('loaded'), {once:true});
        img.addEventListener('error', ()=> img.classList.add('loaded'), {once:true});
      });
    })();
}
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', lalMainInit);
} else {
  lalMainInit();
}

/* ---- copy button for code blocks (moved from the HTML3 gadget's
   stored content -- that gadget's content setting is now empty) ---- */
  window.addEventListener("load", function () {
    document.querySelectorAll(".post-body pre").forEach(function (pre) {
      if (pre.parentElement.classList.contains("code-wrap")) return;

      const wrapper = document.createElement("div");
      wrapper.className = "code-wrap";
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      const btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.textContent = "Copy";

      btn.onclick = function () {
        navigator.clipboard.writeText(pre.innerText).then(() => {
          btn.textContent = "Copied!";
          setTimeout(() => (btn.textContent = "Copy"), 2000);
        });
      };

      wrapper.appendChild(btn);
    });
  });

/* ---- keep the fixed header pinned ----
   The stock VegeClub bundle's CollapsedHeader scroll handler hides the
   header (inline transform/opacity), toggles .sticky/.animating and
   relocates the node while the LAL header stays fixed -- that hide-and-
   pop-back dance is what read as flicker when scrolling toward the
   footer. Undo any state it sets as soon as it appears. The CSS above
   (transform/opacity !important) pins the header visually; this keeps
   the DOM and classes clean too. */
(function(){
'use strict';
function keepHeader(){
  var nav=document.getElementById('nav');
  if(!nav)return;
  var ph=document.querySelector('.centered-top-placeholder');
  var home=ph?ph.parentNode:nav.parentNode;
  var anchor=ph||null;
  function settle(){
    var moved=nav.parentNode!==home;
    var inline=!!nav.style.transform||!!nav.style.opacity;
    if(!document.body.classList.contains('collapsed-header')&&!inline&&!moved)return;
    document.body.classList.remove('collapsed-header');
    nav.classList.remove('sticky','animating');
    nav.style.transform='';
    nav.style.opacity='';
    if(moved&&anchor)home.insertBefore(nav,anchor);
  }
  if('MutationObserver' in window){
    var obs=new MutationObserver(function(){settle();});
    obs.observe(document.body,{attributes:true,attributeFilter:['class'],childList:true});
    obs.observe(nav,{attributes:true,attributeFilter:['class','style']});
  }
  addEventListener('scroll',settle,{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',settle);
  else settle();
}
keepHeader();
})();
(function(){
'use strict';
function initLalConsulting(){
  var section=document.getElementById('lal-consulting');
  var slider=section?section.querySelector('.lal-consulting-slider'):null;
  var track=document.getElementById('lalConsultingTrack');
  var dots=document.querySelectorAll('#lalConsultingDots .lal-consulting-dot');
  var prev=document.getElementById('lalConsultingPrev');
  var next=document.getElementById('lalConsultingNext');
  if(!section||!slider||!track||!dots.length||!prev||!next||section.getAttribute('data-lal-ready')==='1')return;
  section.setAttribute('data-lal-ready','1');
  var total=dots.length,index=0,timer=null,interval=5500;
  function sizeToActive(){
    var active=track.children[index];
    if(active)slider.style.height=active.offsetHeight+'px';
  }
  function render(){
    track.style.transform='translate3d('+(-index*100)+'%,0,0)';
    for(var i=0;i<dots.length;i++){
      dots[i].classList.toggle('is-active',i===index);
      dots[i].setAttribute('aria-current',i===index?'true':'false');
    }
    sizeToActive();
  }
  function restart(){
    if(timer)window.clearInterval(timer);
    timer=window.setInterval(function(){index=(index+1)%total;render();},interval);
  }
  function goTo(n){index=(n+total)%total;render();restart();}
  prev.addEventListener('click',function(){goTo(index-1);});
  next.addEventListener('click',function(){goTo(index+1);});
  for(var i=0;i<dots.length;i++){
    (function(n){dots[n].addEventListener('click',function(){goTo(n);});})(i);
  }
  section.addEventListener('mouseenter',function(){if(timer)window.clearInterval(timer);});
  section.addEventListener('mouseleave',restart);
  section.addEventListener('focusin',function(){if(timer)window.clearInterval(timer);});
  section.addEventListener('focusout',function(){
    window.setTimeout(function(){if(!section.contains(document.activeElement))restart();},0);
  });
  var sx=0,sy=0;
  section.addEventListener('touchstart',function(e){
    if(e.touches.length){sx=e.touches[0].clientX;sy=e.touches[0].clientY;}
  },{passive:true});
  section.addEventListener('touchend',function(e){
    if(!e.changedTouches.length)return;
    var dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;
    if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy))goTo(index+(dx<0?1:-1));
  },{passive:true});
  /* Re-measure the active slide's height on rotation, on the mobile
     address bar showing/hiding, or any other viewport change -- text
     rewraps to a different number of lines at a different width, so a
     height measured at load time can go stale. Debounced since these
     can fire in quick bursts on mobile. */
  var rTimer=null;
  function onViewportChange(){
    window.clearTimeout(rTimer);
    rTimer=window.setTimeout(sizeToActive,150);
  }
  window.addEventListener('resize',onViewportChange,{passive:true});
  window.addEventListener('orientationchange',onViewportChange,{passive:true});
  render();
  restart();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initLalConsulting);
else initLalConsulting();
})();
