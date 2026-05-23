const DATA_URL = "data/outfits.json";
const STORAGE_KEY = "outfit-preview-studio-saved";
const LOOK_RETURN_KEY = "outfit-preview-studio-return-look";
const LOOK_RETURN_PARAM = "look";
const LOOK_RETURN_URL_PARAM = "returnTo";
const DEFAULT_CATEGORIES = ["全部", "春季", "夏季", "秋季", "冬季"];
const SEASON_ALIASES = {
  春: "春季",
  夏: "夏季",
  秋: "秋季",
  冬: "冬季"
};

primeLookRestoration();

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  wireImageFallbacks(document);
  wireFavoritesOverlay();

  if (page === "list") {
    initListPage();
  }

  if (page === "home") {
    initHomePage();
  }

  if (page === "detail") {
    initDetailPage();
  }

  if (page === "favorites") {
    initFavoritesPage();
  }
});

async function initHomePage() {
  const carousel = document.querySelector("#hero-carousel");

  if (!carousel) {
    return;
  }

  try {
    const outfits = await fetchOutfits();
    const slides = sortOutfits(outfits)
      .map((outfit) => ({
        id: outfit.id,
        title: outfit.title || "",
        src: outfit.large || outfit.thumb
      }))
      .filter((slide) => slide.src);

    initHeroCarousel(carousel, slides);
  } catch (error) {
    // Keep the static fallback image if the catalog cannot be loaded.
  }
}

function initHeroCarousel(carousel, slides) {
  const track = carousel.querySelector(".hero-carousel-track");

  if (!track || !slides.length) {
    return;
  }

  let deck = shuffleSlides(slides);
  let index = 0;
  let current = deck[index];
  let previous = null;
  let isAnimating = false;
  let timer = null;
  let touchStartX = 0;
  let pointerStartX = 0;

  renderSingleHeroSlide(track, current);

  const restartTimer = () => {
    window.clearInterval(timer);
    timer = window.setInterval(() => {
      goToHeroSlide("next");
    }, 3000);
  };

  const getNextSlide = () => {
    previous = current;
    index += 1;

    if (index >= deck.length) {
      deck = shuffleSlides(slides, current.id);
      index = 0;
    }

    current = deck[index];
    return current;
  };

  const getPreviousSlide = () => {
    if (previous) {
      const slide = previous;
      previous = current;
      current = slide;
      return current;
    }

    previous = current;
    index = index > 0 ? index - 1 : deck.length - 1;
    current = deck[index];
    return current;
  };

  const goToHeroSlide = (direction) => {
    if (isAnimating || slides.length < 2) {
      return;
    }

    isAnimating = true;
    const nextSlide = direction === "previous" ? getPreviousSlide() : getNextSlide();
    animateHeroSlide(track, previous, nextSlide, direction, () => {
      isAnimating = false;
    });
  };

  carousel.addEventListener("touchstart", (event) => {
    touchStartX = event.touches[0]?.clientX || 0;
  }, { passive: true });

  carousel.addEventListener("touchend", (event) => {
    const touchEndX = event.changedTouches[0]?.clientX || 0;
    const distance = touchEndX - touchStartX;

    if (Math.abs(distance) < 36) {
      return;
    }

    goToHeroSlide(distance > 0 ? "previous" : "next");
    restartTimer();
  }, { passive: true });

  carousel.addEventListener("pointerdown", (event) => {
    pointerStartX = event.clientX;
  });

  carousel.addEventListener("pointerup", (event) => {
    const distance = event.clientX - pointerStartX;

    if (Math.abs(distance) < 48) {
      return;
    }

    goToHeroSlide(distance > 0 ? "previous" : "next");
    restartTimer();
  });

  restartTimer();
}

function renderSingleHeroSlide(track, slide) {
  track.style.transition = "none";
  track.style.transform = "translateX(0)";
  track.innerHTML = renderHeroSlideImage(slide);
  track.offsetHeight;
  track.style.transition = "";
}

function animateHeroSlide(track, fromSlide, toSlide, direction, onComplete) {
  const nextFirst = direction === "previous";
  const startTransform = nextFirst ? "translateX(-100%)" : "translateX(0)";
  const endTransform = nextFirst ? "translateX(0)" : "translateX(-100%)";
  const slidesHtml = nextFirst
    ? `${renderHeroSlideImage(toSlide)}${renderHeroSlideImage(fromSlide)}`
    : `${renderHeroSlideImage(fromSlide)}${renderHeroSlideImage(toSlide)}`;

  track.style.transition = "none";
  track.innerHTML = slidesHtml;
  track.style.transform = startTransform;
  track.offsetHeight;
  track.style.transition = "transform 620ms ease";
  track.style.transform = endTransform;

  track.addEventListener("transitionend", () => {
    renderSingleHeroSlide(track, toSlide);
    onComplete();
  }, { once: true });
}

function renderHeroSlideImage(slide) {
  return `<img class="hero-image" src="${escapeAttribute(slide.src)}" alt="${escapeAttribute(slide.title)}" loading="eager">`;
}

function shuffleSlides(slides, avoidFirstId = null) {
  const shuffled = [...slides];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  if (avoidFirstId && shuffled.length > 1 && shuffled[0].id === avoidFirstId) {
    const swapIndex = shuffled.findIndex((slide) => slide.id !== avoidFirstId);
    [shuffled[0], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[0]];
  }

  return shuffled;
}

async function initListPage() {
  const list = document.querySelector("#outfit-list");
  const filters = document.querySelector("#category-filters");
  const search = document.querySelector("#outfit-search");
  const status = document.querySelector("#list-status");
  let returnLookId = getReturnLookId();

  try {
    const outfits = await fetchOutfits();
    const initialSeason = normalizeSeason(new URLSearchParams(window.location.search).get("season"));
    const state = {
      category: DEFAULT_CATEGORIES.includes(initialSeason) ? initialSeason : "全部",
      query: ""
    };
    const updateList = () => {
      renderFilters(filters, state.category, (category) => {
        state.category = category;
        updateList();
      });
      renderOutfitList(list, sortOutfits(filterOutfits(outfits, state)));

      if (returnLookId) {
        restoreLookPosition(list, returnLookId);
        returnLookId = "";
      }
    };

    if (search) {
      search.addEventListener("input", () => {
        state.query = search.value.trim();
        updateList();
      });
    }

    window.addEventListener("pageshow", () => {
      const restoredLookId = getReturnLookId();

      if (restoredLookId) {
        restoreLookPosition(list, restoredLookId);
      }
    });

    updateList();
  } catch (error) {
    completeLookRestoration();
    showDataError(status);
  }
}

async function initDetailPage() {
  const detail = document.querySelector("#outfit-detail");
  const status = document.querySelector("#detail-status");
  const id = new URLSearchParams(window.location.search).get("id");

  try {
    const outfits = await fetchOutfits();
    const outfit = outfits.find((item) => item.id === id);

    if (!outfit) {
      detail.innerHTML = renderNotFound();
      return;
    }

    detail.innerHTML = renderDetail(outfit);
    wireImageFallbacks(detail);
    wireSaveButtons(detail);
    wireItemPreview(detail, outfit);
    wireDetailBackLink(detail);
  } catch (error) {
    showDataError(status);
  }
}

async function initFavoritesPage() {
  const list = document.querySelector("#favorites-list");
  const status = document.querySelector("#favorites-status");

  try {
    const outfits = await fetchOutfits();
    renderFavorites(list, outfits);
  } catch (error) {
    showDataError(status);
  }
}

function wireFavoritesOverlay() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-action='open-favorites']");

    if (!link) {
      return;
    }

    event.preventDefault();
    openFavoritesOverlay();
  });
}

async function fetchOutfits() {
  const response = await fetch(DATA_URL, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`无法读取 ${DATA_URL}`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("穿搭数据必须是数组。");
  }

  return data;
}

function renderFilters(container, activeCategory, onSelect) {
  if (!container) {
    return;
  }

  container.innerHTML = DEFAULT_CATEGORIES.map((category) => {
    const activeClass = category === activeCategory ? " is-active" : "";
    const href = category === "全部" ? "list.html" : `list.html?season=${encodeURIComponent(category)}`;
    return `<a class="filter-button${activeClass}" href="${href}" data-category="${escapeAttribute(category)}">${escapeHtml(category)}</a>`;
  }).join("");

  container.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const category = button.dataset.category;
      const url = category === "全部" ? "list.html" : `list.html?season=${encodeURIComponent(category)}`;
      window.history.replaceState({}, "", url);
      onSelect(category);
    });
  });
}

function filterOutfits(outfits, state) {
  const query = state.query.toLowerCase();

  return outfits.filter((outfit) => {
    const outfitSeason = normalizeSeason(outfit.season || outfit.category);
    const searchableText = [
      outfit.title,
      outfit.style,
      outfitSeason,
      outfit.scene,
      ...(Array.isArray(outfit.tags) ? outfit.tags : []),
      ...(Array.isArray(outfit.items)
        ? outfit.items.map((item) => item.name)
        : [])
    ].filter(Boolean).join(" ").toLowerCase();
    const matchesCategory = state.category === "全部" || outfitSeason === state.category;
    const matchesSearch = !query || searchableText.includes(query);

    return matchesCategory && matchesSearch;
  });
}

function normalizeSeason(value) {
  const season = String(value || "").trim();
  return SEASON_ALIASES[season] || season;
}

function sortOutfits(outfits) {
  return [...outfits].sort((a, b) => {
    const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : Number.POSITIVE_INFINITY;
    const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : Number.POSITIVE_INFINITY;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

function renderOutfitList(container, outfits) {
  if (!outfits.length) {
    container.innerHTML = `<div class="notice">暂时没有满足条件的搭配</div>`;
    return;
  }

  container.innerHTML = outfits.map((outfit) => renderOutfitCard(outfit, "toggle")).join("");
  wireImageFallbacks(container);
  wireSaveButtons(container);
  wireLookReturnLinks(container);
}

function renderFavorites(container, outfits) {
  const savedIds = getSavedLooks();
  const savedOutfits = sortOutfits(outfits.filter((outfit) => savedIds.includes(outfit.id)));

  if (!savedOutfits.length) {
    container.innerHTML = `<div class="notice">暂无灵感</div>`;
    return;
  }

  container.innerHTML = savedOutfits.map((outfit) => renderOutfitCard(outfit, "remove")).join("");
  wireImageFallbacks(container);
  wireLookReturnLinks(container);

  container.querySelectorAll("[data-action='remove-save']").forEach((button) => {
    button.addEventListener("click", () => {
      removeSavedLook(button.dataset.id);
      renderFavorites(container, outfits);
    });
  });
}

async function openFavoritesOverlay() {
  closeFavoritesOverlay();

  const modal = document.createElement("div");
  modal.className = "favorites-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "favorites-modal-title");
  modal.innerHTML = `
    <div class="favorites-panel">
      <div class="favorites-panel-header">
        <div>
          <p class="favorites-panel-kicker">Collected Inspiration</p>
          <h2 id="favorites-modal-title">已收集灵感</h2>
        </div>
        <button class="favorites-close" type="button" aria-label="关闭收藏浮窗"></button>
      </div>
      <div class="favorites-panel-body">
        <div class="notice">正在读取灵感收藏...</div>
      </div>
    </div>
  `;

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeFavoritesOverlay();
    }
  });

  modal.querySelector(".favorites-close").addEventListener("click", closeFavoritesOverlay);
  document.addEventListener("keydown", handleFavoritesOverlayKeydown);
  document.body.classList.add("modal-open");
  document.body.appendChild(modal);

  const body = modal.querySelector(".favorites-panel-body");

  try {
    const outfits = await fetchOutfits();
    body.innerHTML = renderFavoritesOverlayList(outfits);
    wireImageFallbacks(body);
    wireLookReturnLinks(body);
    wireFavoriteOverlayRemoveButtons(body, outfits);
  } catch (error) {
    body.innerHTML = `<div class="notice notice-error">无法读取灵感。</div>`;
  }
}

function renderFavoritesOverlayList(outfits) {
  const savedIds = getSavedLooks();
  const savedOutfits = sortOutfits(outfits.filter((outfit) => savedIds.includes(outfit.id)));

  if (!savedOutfits.length) {
    return `<div class="notice">暂无灵感</div>`;
  }

  return `
    <div class="favorite-look-list">
      ${savedOutfits.map((outfit) => `
        <div class="favorite-look-row">
          <a class="favorite-look-link" href="outfit.html?id=${encodeURIComponent(outfit.id)}" data-return-look-id="${escapeAttribute(outfit.id)}">
            <img src="${escapeAttribute(outfit.thumb || outfit.large)}" alt="${escapeAttribute(outfit.title)}" loading="lazy">
            <div class="favorite-look-copy">
              <strong>${escapeHtml(outfit.title)}</strong>
              ${renderTags(outfit.tags)}
            </div>
          </a>
          <button class="favorites-close favorite-look-remove" type="button" data-action="remove-overlay-save" data-id="${escapeAttribute(outfit.id)}" aria-label="取消收藏"></button>
        </div>
      `).join("")}
    </div>
  `;
}

function wireFavoriteOverlayRemoveButtons(container, outfits) {
  container.querySelectorAll("[data-action='remove-overlay-save']").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      removeSavedLook(button.dataset.id);
      container.innerHTML = renderFavoritesOverlayList(outfits);
      wireImageFallbacks(container);
      wireLookReturnLinks(container);
      wireFavoriteOverlayRemoveButtons(container, outfits);
      updateSaveButtons(button.dataset.id);
    });
  });
}

function closeFavoritesOverlay() {
  const existingModal = document.querySelector(".favorites-modal");

  if (existingModal) {
    existingModal.remove();
  }

  document.body.classList.remove("modal-open");
  document.removeEventListener("keydown", handleFavoritesOverlayKeydown);
}

function handleFavoritesOverlayKeydown(event) {
  if (event.key === "Escape") {
    closeFavoritesOverlay();
  }
}

function renderOutfitCard(outfit, mode) {
  const saved = isSaved(outfit.id);
  const detailHref = `outfit.html?id=${encodeURIComponent(outfit.id)}`;
  const buttonAction = mode === "remove" ? "remove-save" : "toggle-save";
  const buttonText = mode === "remove" ? "移除" : saved ? "已收集灵感" : "收藏";
  const buttonClass = mode === "remove" ? "button card-save-button button-muted" : saved ? "button card-save-button button-muted" : "button card-save-button";
  const secondaryAction = mode === "remove" ? `
          <button class="${buttonClass}" type="button" data-action="${buttonAction}" data-id="${escapeAttribute(outfit.id)}" aria-pressed="${saved}">
            <span aria-hidden="true">&#9829;</span>${buttonText}
          </button>
  ` : "";

  return `
    <article class="outfit-card" id="${escapeAttribute(outfit.id)}" data-outfit-id="${escapeAttribute(outfit.id)}">
      <div class="image-frame" aria-label="${escapeAttribute(outfit.title)}">
        <img src="${escapeAttribute(outfit.large || outfit.thumb)}" alt="${escapeAttribute(outfit.title)}" loading="lazy">
      </div>
      <div class="card-body">
        <div class="card-title-bar">
          <button class="detail-heart-button card-heart-button${saved ? " is-active" : ""}" type="button" data-action="toggle-save" data-id="${escapeAttribute(outfit.id)}" aria-label="${saved ? "取消收藏" : "收藏"}" aria-pressed="${saved}">
            ${saved ? "&#9829;" : "&#9825;"}
          </button>
          <a class="card-view-more" href="${detailHref}" data-return-look-id="${escapeAttribute(outfit.id)}">VIEW MORE</a>
        </div>
        <h2 class="card-title">${escapeHtml(outfit.title)}</h2>
        ${renderTags(outfit.tags)}
        <a class="card-description card-description-link" href="${detailHref}" data-return-look-id="${escapeAttribute(outfit.id)}">${escapeHtml(outfit.description || "")}</a>
        ${secondaryAction ? `<div class="card-actions">${secondaryAction}</div>` : ""}
      </div>
    </article>
  `;
}

function renderDetail(outfit) {
  const saved = isSaved(outfit.id);
  const items = sortPieces(normalizePieces(outfit.items));

  return `
    <article class="detail-card">
      <div class="detail-image-frame">
        <img src="${escapeAttribute(outfit.large)}" alt="${escapeAttribute(outfit.title)}" loading="lazy">
      </div>
      <div class="detail-content">
        <div class="card-title-bar detail-title-bar">
          <button class="detail-heart-button card-heart-button${saved ? " is-active" : ""}" type="button" data-action="toggle-save" data-id="${escapeAttribute(outfit.id)}" aria-label="${saved ? "取消收藏" : "收藏"}" aria-pressed="${saved}">
            ${saved ? "&#9829;" : "&#9825;"}
          </button>
          <a class="card-view-more detail-back-action" href="list.html?${LOOK_RETURN_PARAM}=${encodeURIComponent(outfit.id)}">BACK</a>
        </div>
        <h1 class="detail-title">${escapeHtml(outfit.title)}</h1>
        ${renderTags(outfit.tags)}
        <p class="detail-description">${escapeHtml(outfit.description || "")}</p>

        <section class="detail-block">
          <h2>单品展示</h2>
          ${renderPieceList(items, "item")}
        </section>

        <section class="detail-block detail-info-block">
          <h2>季节</h2>
          <p class="detail-description">${escapeHtml(normalizeSeason(outfit.season || outfit.category) || "全年")}</p>
        </section>

        <section class="detail-block detail-info-block">
          <h2>风格</h2>
          <p class="detail-description">${escapeHtml(outfit.style || outfit.styleNotes || "")}</p>
        </section>

        <section class="detail-block detail-info-block">
          <h2>场景</h2>
          <p class="detail-description">${escapeHtml(outfit.scene || "影棚穿搭图册预览")}</p>
        </section>

      </div>
    </article>
  `;
}

function renderPieceList(pieces, type) {
  if (!pieces.length) {
    return `<p class="detail-description">暂无信息</p>`;
  }

  return `
    <div class="piece-list">
      ${pieces.map((piece, index) => `
        <div class="piece-row">
          <div>
            <span>${escapeHtml(piece.name)}</span>
            <small>${escapeHtml(piece.note || "点击缩略图查看大图")}</small>
          </div>
          <button class="piece-thumb-button" type="button" data-piece-type="${type}" data-piece-index="${index}" aria-label="查看 ${escapeAttribute(piece.name)} 大图">
            <img src="${escapeAttribute(createPieceImage(piece))}" alt="${escapeAttribute(piece.name)}" loading="lazy">
          </button>
        </div>
      `).join("")}
    </div>
  `;
}

function wireItemPreview(scope, outfit) {
  const groups = {
    item: sortPieces(normalizePieces(outfit.items))
  };

  scope.querySelectorAll(".piece-thumb-button").forEach((button) => {
    button.addEventListener("click", () => {
      const pieces = groups[button.dataset.pieceType] || [];
      const piece = pieces[Number(button.dataset.pieceIndex)];

      if (!piece) {
        return;
      }

      openPieceModal(pieces, Number(button.dataset.pieceIndex));
    });
  });
}

function wireDetailBackLink(scope) {
  const backLink = scope.querySelector(".detail-back-action");

  if (!backLink) {
    return;
  }

  backLink.addEventListener("click", (event) => {
    const outfitId = new URLSearchParams(window.location.search).get("id");
    const returnUrl = createLookReturnUrl(outfitId);
    const referrer = document.referrer ? new URL(document.referrer) : null;
    const canReturnToPreviousPage = window.history.length > 1
      && referrer
      && referrer.origin === window.location.origin;

    rememberReturnLook(outfitId);

    if (returnUrl) {
      event.preventDefault();
      window.location.href = returnUrl;
      return;
    }

    if (!canReturnToPreviousPage) {
      return;
    }

    event.preventDefault();
    window.history.back();
  });
}

function wireLookReturnLinks(scope) {
  scope.querySelectorAll("[data-return-look-id]").forEach((link) => {
    link.addEventListener("click", () => {
      prepareLookDetailLink(link);
    });
  });
}

function prepareLookDetailLink(link) {
  const id = link.dataset.returnLookId;

  rememberReturnLook(id);

  if (!id) {
    return;
  }

  const detailUrl = new URL(link.getAttribute("href"), window.location.href);
  const returnUrl = new URL(window.location.href);
  returnUrl.searchParams.set(LOOK_RETURN_PARAM, id);
  detailUrl.searchParams.set(LOOK_RETURN_PARAM, id);
  detailUrl.searchParams.set(LOOK_RETURN_URL_PARAM, `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`);
  link.href = detailUrl.href;
}

function rememberReturnLook(id) {
  if (!id) {
    return;
  }

  try {
    sessionStorage.setItem(LOOK_RETURN_KEY, id);
  } catch (error) {
    // Ignore storage failures; the fallback query parameter still works.
  }
}

function getReturnLookId() {
  const lookFromUrl = new URLSearchParams(window.location.search).get(LOOK_RETURN_PARAM);

  if (lookFromUrl) {
    return lookFromUrl;
  }

  try {
    const lookFromStorage = sessionStorage.getItem(LOOK_RETURN_KEY) || "";
    sessionStorage.removeItem(LOOK_RETURN_KEY);
    return lookFromStorage;
  } catch (error) {
    return "";
  }
}

function peekReturnLookId() {
  const lookFromUrl = new URLSearchParams(window.location.search).get(LOOK_RETURN_PARAM);

  if (lookFromUrl) {
    return lookFromUrl;
  }

  try {
    return sessionStorage.getItem(LOOK_RETURN_KEY) || "";
  } catch (error) {
    return "";
  }
}

function createLookReturnUrl(id) {
  const returnTo = new URLSearchParams(window.location.search).get(LOOK_RETURN_URL_PARAM);

  if (!returnTo || !id) {
    return "";
  }

  try {
    const url = new URL(returnTo, window.location.origin);

    if (url.origin !== window.location.origin) {
      return "";
    }

    url.searchParams.set(LOOK_RETURN_PARAM, id);
    return url.href;
  } catch (error) {
    return "";
  }
}

function restoreLookPosition(container, id) {
  const target = [...container.querySelectorAll("[data-outfit-id]")]
    .find((card) => card.dataset.outfitId === id);

  if (!target) {
    completeLookRestoration();
    return;
  }

  const scrollToTarget = () => {
    const rect = target.getBoundingClientRect();
    const top = rect.top + window.scrollY - Math.max((window.innerHeight - rect.height) / 2, 0);
    const scrollTop = Math.max(top, 0);
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;

    document.documentElement.style.scrollBehavior = "auto";
    document.scrollingElement.scrollTop = scrollTop;

    if (typeof window.scrollTo === "function") {
      window.scrollTo({ top: scrollTop, left: 0, behavior: "auto" });
    }

    document.documentElement.style.scrollBehavior = previousScrollBehavior;
  };

  const finish = () => {
    scrollToTarget();
    completeLookRestoration();
  };

  const schedule = typeof window.requestAnimationFrame === "function"
    ? window.requestAnimationFrame
    : (callback) => window.setTimeout(callback, 0);

  schedule(() => {
    scrollToTarget();
    window.setTimeout(finish, 80);
  });
}

function primeLookRestoration() {
  if (document.body?.dataset.page !== "list" || !peekReturnLookId()) {
    return;
  }

  document.body.classList.add("is-restoring-look");
}

function completeLookRestoration() {
  document.body?.classList.remove("is-restoring-look");
}

function openPieceModal(pieces, startIndex = 0) {
  closePieceModal();

  const normalizedPieces = pieces.filter(Boolean);

  if (!normalizedPieces.length) {
    return;
  }

  const realSlideCount = normalizedPieces.length;
  let activeIndex = Number.isInteger(startIndex)
    ? Math.min(Math.max(startIndex, 0), realSlideCount - 1)
    : 0;
  let trackIndex = realSlideCount > 1 ? activeIndex + 1 : activeIndex;
  let isAnimating = false;
  const modalPieces = realSlideCount > 1
    ? [
        normalizedPieces[realSlideCount - 1],
        ...normalizedPieces,
        normalizedPieces[0]
      ]
    : normalizedPieces;

  const modal = document.createElement("div");
  modal.className = "piece-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "单品大图");
  modal.innerHTML = `
    <div class="piece-modal-content">
      <button class="piece-modal-hotzone piece-modal-hotzone-prev" type="button" data-piece-nav="prev" aria-label="上一张">
        <span aria-hidden="true"></span>
      </button>
      <div class="piece-modal-viewport">
        <div class="piece-modal-track">
          ${modalPieces.map((piece) => `
            <div class="piece-modal-slide">
              <img src="${escapeAttribute(createPieceImage(piece, "large"))}" alt="${escapeAttribute(piece.name)}">
            </div>
          `).join("")}
        </div>
      </div>
      <button class="piece-modal-hotzone piece-modal-hotzone-next" type="button" data-piece-nav="next" aria-label="下一张">
        <span aria-hidden="true"></span>
      </button>
      <div class="piece-modal-caption">
        <strong></strong>
        <span></span>
      </div>
    </div>
  `;

  const track = modal.querySelector(".piece-modal-track");
  const captionTitle = modal.querySelector(".piece-modal-caption strong");
  const captionNote = modal.querySelector(".piece-modal-caption span");
  const prevButton = modal.querySelector("[data-piece-nav='prev']");
  const nextButton = modal.querySelector("[data-piece-nav='next']");
  const updateCaption = () => {
    const piece = normalizedPieces[activeIndex];
    captionTitle.textContent = piece.name;
    captionNote.textContent = piece.note || "单品大图";
  };
  const moveTrack = (withTransition = true) => {
    track.style.transition = withTransition ? "" : "none";
    track.style.transform = `translateX(-${trackIndex * 100}%)`;

    if (!withTransition) {
      track.offsetHeight;
      track.style.transition = "";
    }
  };
  const renderSlide = () => {
    moveTrack(false);
    updateCaption();
  };
  const goToSlide = (direction) => {
    if (isAnimating || realSlideCount <= 1) {
      return;
    }

    isAnimating = true;
    activeIndex = (activeIndex + direction + realSlideCount) % realSlideCount;
    trackIndex += direction;
    updateCaption();
    moveTrack(true);
  };

  renderSlide();

  if (realSlideCount <= 1) {
    prevButton.hidden = true;
    nextButton.hidden = true;
  }

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closePieceModal();
    }
  });

  track.addEventListener("transitionend", (event) => {
    if (event.target !== track || !isAnimating) {
      return;
    }

    if (trackIndex === 0) {
      trackIndex = realSlideCount;
      moveTrack(false);
    }

    if (trackIndex === realSlideCount + 1) {
      trackIndex = 1;
      moveTrack(false);
    }

    isAnimating = false;
  });

  prevButton.addEventListener("click", () => goToSlide(-1));
  nextButton.addEventListener("click", () => goToSlide(1));

  document.addEventListener("keydown", handlePieceModalKeydown);
  document.body.classList.add("modal-open");
  document.body.appendChild(modal);
}

function closePieceModal() {
  const existingModal = document.querySelector(".piece-modal");

  if (existingModal) {
    existingModal.remove();
  }

  document.body.classList.remove("modal-open");
  document.removeEventListener("keydown", handlePieceModalKeydown);
}

function handlePieceModalKeydown(event) {
  if (event.key === "Escape") {
    closePieceModal();
    return;
  }

  if (event.key === "ArrowLeft") {
    document.querySelector("[data-piece-nav='prev']")?.click();
    return;
  }

  if (event.key === "ArrowRight") {
    document.querySelector("[data-piece-nav='next']")?.click();
  }
}

function normalizePieces(pieces) {
  if (!Array.isArray(pieces)) {
    return [];
  }

  return pieces.map((piece) => {
    if (typeof piece === "string") {
      return { name: piece, color: "#dfe9e2", shape: "soft", note: "" };
    }

    return {
      name: piece.name || "未命名单品",
      nameEn: piece.nameEn || "",
      color: piece.color || "#dfe9e2",
      accent: piece.accent || "#263c35",
      shape: piece.shape || "soft",
      note: piece.note || "",
      thumb: piece.thumb || "",
      large: piece.large || "",
      order: piece.order
    };
  });
}

function sortPieces(pieces) {
  return [...pieces].sort((a, b) => {
    const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : Number.POSITIVE_INFINITY;
    const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : Number.POSITIVE_INFINITY;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return (a.name || "").localeCompare(b.name || "", "zh-Hans-CN");
  });
}

function createPieceImage(piece, size = "thumb") {
  const image = size === "large" ? piece.large : piece.thumb;

  if (image) {
    return image;
  }

  const color = escapeSvgColor(piece.color || "#dfe9e2");
  const accent = escapeSvgColor(piece.accent || "#263c35");
  const name = escapeHtml(piece.name || "单品");
  const note = escapeHtml(piece.note || "Outfit Preview Studio");
  const path = getPieceShape(piece.shape);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 720 720">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fbfaf6"/>
          <stop offset="1" stop-color="#ece8df"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#211d1a" flood-opacity="0.16"/>
        </filter>
      </defs>
      <rect width="720" height="720" rx="46" fill="url(#bg)"/>
      <circle cx="590" cy="118" r="112" fill="${color}" opacity="0.36"/>
      <circle cx="110" cy="590" r="138" fill="${accent}" opacity="0.1"/>
      <g filter="url(#shadow)">
        <path d="${path}" fill="${color}" stroke="${accent}" stroke-width="10" stroke-linejoin="round"/>
        <path d="M246 512 C300 540 420 540 474 512" fill="none" stroke="${accent}" stroke-width="8" stroke-linecap="round" opacity="0.35"/>
      </g>
      <text x="360" y="620" text-anchor="middle" fill="#25231f" font-size="42" font-weight="750" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">${name}</text>
      <text x="360" y="666" text-anchor="middle" fill="#777066" font-size="24" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">${note}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getPieceShape(shape) {
  const shapes = {
    top: "M236 204 C274 166 446 166 484 204 L548 302 L492 350 L466 284 L466 512 L254 512 L254 284 L228 350 L172 302 Z",
    skirt: "M274 212 L446 212 L512 512 L208 512 Z",
    pants: "M260 206 L460 206 L496 526 L402 526 L360 318 L318 526 L224 526 Z",
    shoes: "M190 390 C260 358 308 382 346 422 L526 454 C554 458 572 478 572 504 L572 520 L170 520 L170 486 C170 448 174 414 190 390 Z",
    bag: "M244 280 C250 210 470 210 476 280 L520 280 L548 524 L172 524 L200 280 Z M300 280 C304 242 416 242 420 280",
    accessory: "M360 192 C430 192 488 250 488 320 C488 424 360 528 360 528 C360 528 232 424 232 320 C232 250 290 192 360 192 Z"
  };

  return shapes[shape] || "M232 232 C292 184 428 184 488 232 L520 520 L200 520 Z";
}

function renderTags(tags) {
  if (!Array.isArray(tags) || !tags.length) {
    return "";
  }

  return `
    <div class="tag-list" aria-label="标签">
      ${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
    </div>
  `;
}

function renderNotFound() {
  return `
    <div class="notice">
      <strong>没有找到这个穿搭。</strong>
      <a class="text-link" href="list.html">返回穿搭图册</a>
    </div>
  `;
}

function wireSaveButtons(scope) {
  scope.querySelectorAll("[data-action='toggle-save']").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleSavedLook(button.dataset.id);
      updateSaveButtons(button.dataset.id);
      pulseSaveButton(button);
    });
  });
}

function pulseSaveButton(button) {
  button.classList.remove("is-pulsing");
  button.offsetHeight;
  button.classList.add("is-pulsing");
  button.addEventListener("animationend", () => {
    button.classList.remove("is-pulsing");
  }, { once: true });
}

function updateSaveButtons(id) {
  const saved = isSaved(id);

  document.querySelectorAll("[data-action='toggle-save']").forEach((button) => {
    if (button.dataset.id !== id) {
      return;
    }

    if (button.classList.contains("image-save-button")) {
      button.innerHTML = button.closest(".outfit-card")
        ? saved ? "&#9829;" : "&#9825;"
        : "&#9829;";
      button.classList.toggle("is-active", saved);
      button.setAttribute("aria-label", saved ? "取消收藏" : "收藏");
    } else if (button.classList.contains("detail-heart-button")) {
      button.innerHTML = saved ? "&#9829;" : "&#9825;";
      button.classList.toggle("is-active", saved);
      button.setAttribute("aria-label", saved ? "取消收藏" : "收藏");
    } else if (button.classList.contains("card-save-button")) {
      button.innerHTML = `<span aria-hidden="true">♥</span>${saved ? "已收集灵感" : "收藏"}`;
    }

    button.classList.toggle("button-muted", saved);
    button.setAttribute("aria-pressed", String(saved));
  });
}

function getSavedLooks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

function saveLooks(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch (error) {
    // 某些严格隐私模式下 localStorage 可能不可用。
  }
}

function isSaved(id) {
  return getSavedLooks().includes(id);
}

function toggleSavedLook(id) {
  const saved = getSavedLooks();

  if (saved.includes(id)) {
    saveLooks(saved.filter((savedId) => savedId !== id));
    return;
  }

  saveLooks([...saved, id]);
}

function removeSavedLook(id) {
  saveLooks(getSavedLooks().filter((savedId) => savedId !== id));
}

function wireImageFallbacks(scope) {
  scope.querySelectorAll("img").forEach((image) => {
    image.addEventListener("error", () => {
      const fallback = document.createElement("div");
      fallback.className = "image-fallback";
      fallback.textContent = "图片暂不可用";
      image.replaceWith(fallback);
    }, { once: true });
  });
}

function showDataError(container) {
  const localHint = window.location.protocol === "file:"
    ? " 直接打开 HTML 文件可能会阻止 JSON 读取，请使用 VS Code Live Server 或简单本地服务器预览。"
    : "";

  container.innerHTML = `
    <div class="notice notice-error">
      <strong>无法读取穿搭数据。</strong>
      请检查 data/outfits.json，并通过本地服务器预览项目。${localHint}
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function escapeSvgColor(value) {
  const color = String(value || "");
  return /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : "#dfe9e2";
}
