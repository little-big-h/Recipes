import { isUnlocked, mountLockScreen, lock } from './auth.js';
import { renderMarkdown } from './markdown.js';
import { initPullToRefresh } from './pull-to-refresh.js';

const root = document.getElementById('app');

const FAVORITES_KEY = 'recipes-favorites';
const RECENT_KEY = 'recipes-recent';
const RECENT_LIMIT = 10;

const state = {
  index: null,
  query: '',
  category: 'All',
  sort: 'newest',
};

function readList(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function writeList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

function isFavorite(id) {
  return readList(FAVORITES_KEY).includes(id);
}

function toggleFavorite(id) {
  const favs = readList(FAVORITES_KEY);
  const idx = favs.indexOf(id);
  if (idx === -1) favs.push(id);
  else favs.splice(idx, 1);
  writeList(FAVORITES_KEY, favs);
  return favs.includes(id);
}

function pushRecent(id) {
  const recent = readList(RECENT_KEY).filter((r) => r !== id);
  recent.unshift(id);
  writeList(RECENT_KEY, recent.slice(0, RECENT_LIMIT));
}

async function loadIndex() {
  const res = await fetch('data/recipes-index.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load recipe index (${res.status})`);
  return res.json();
}

function matchesQuery(recipe, query) {
  if (!query) return true;
  const haystack = `${recipe.title} ${recipe.subtitle || ''} ${recipe.category}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function visibleRecipes() {
  let list = state.index.recipes.filter((r) => matchesQuery(r, state.query));

  if (state.category === 'Favorites') {
    const favs = new Set(readList(FAVORITES_KEY));
    list = list.filter((r) => favs.has(r.id));
  } else if (state.category !== 'All') {
    list = list.filter((r) => r.category === state.category);
  }

  if (state.sort === 'az') {
    list = [...list].sort((a, b) => a.title.localeCompare(b.title));
  } else {
    list = [...list].sort((a, b) => (b.lastModified || '').localeCompare(a.lastModified || ''));
  }

  return list;
}

function truncate(text, max) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

// Recipe markdown links reference sibling files relative to the SOURCE repo
// path (e.g. "../oven-mains/hasselback-jacket-potatoes.md"), not relative to
// index.html. Resolve them against the current recipe's directory and map
// to an in-app route when the target is a known recipe; otherwise the link
// can't be honored (e.g. it points at docs/ which isn't published), so drop
// it rather than leave a dead link.
function resolveRecipeLink(href, currentRecipe, index) {
  if (!href.endsWith('.md')) return null;

  const sourcePath = currentRecipe.path.replace(/^content\//, '');
  const baseDir = sourcePath.split('/').slice(0, -1);
  const stack = [...baseDir];

  for (const part of href.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }

  const resolvedPath = `content/${stack.join('/')}`;
  const match = index.recipes.find((r) => r.path === resolvedPath);
  return match ? `#/recipe/${match.id}` : null;
}

function renderChips() {
  const chipsEl = document.getElementById('category-chips');
  const cats = ['All', 'Favorites', ...state.index.categories];
  chipsEl.innerHTML = cats
    .map(
      (c) =>
        `<button class="chip${c === state.category ? ' active' : ''}" data-cat="${c}">${c}</button>`
    )
    .join('');
  chipsEl.querySelectorAll('.chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.category = btn.dataset.cat;
      renderChips();
      renderList();
    });
  });
}

function renderList() {
  const listEl = document.getElementById('recipe-list');
  const emptyEl = document.getElementById('empty-state');
  const recipes = visibleRecipes();

  emptyEl.hidden = recipes.length !== 0;
  listEl.innerHTML = recipes
    .map((r) => {
      const meta = [];
      if (r.kcal) meta.push(`${r.kcal} kcal`);
      if (r.proteinG) meta.push(`${r.proteinG} g protein`);
      meta.push(r.category);
      return `
      <div class="recipe-card">
        <button class="recipe-card-main" data-id="${r.id}">
          <p class="recipe-card-title">${r.title}</p>
          <p class="recipe-card-sub">${truncate(r.subtitle, 120)}</p>
          <div class="recipe-card-meta">${meta.map((m) => `<span class="tag">${m}</span>`).join('')}</div>
        </button>
        <button class="fav-star" data-fav="${r.id}" aria-label="Toggle favorite">${
        isFavorite(r.id) ? '★' : '☆'
      }</button>
      </div>`;
    })
    .join('');

  listEl.querySelectorAll('[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.location.hash = `#/recipe/${btn.dataset.id}`;
    });
  });
  listEl.querySelectorAll('[data-fav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nowFav = toggleFavorite(btn.dataset.fav);
      btn.textContent = nowFav ? '★' : '☆';
      if (state.category === 'Favorites') renderList();
    });
  });
}

function setHeaderMode(mode, recipe) {
  const navTitle = document.getElementById('nav-title');
  const backBtn = document.getElementById('back-btn');
  const lockBtn = document.getElementById('lock-btn');
  const favBtn = document.getElementById('fav-btn');
  const shareBtn = document.getElementById('share-btn');
  const foodnomsBtn = document.getElementById('foodnoms-btn');
  const searchRow = document.getElementById('search-row');
  const chips = document.getElementById('category-chips');

  const inDetail = mode === 'detail';

  navTitle.textContent = inDetail ? recipe.title : '🍽️ Family Recipes';
  backBtn.hidden = !inDetail;
  lockBtn.hidden = inDetail;
  favBtn.hidden = !inDetail;
  shareBtn.hidden = !inDetail;
  foodnomsBtn.hidden = !inDetail || !recipe.foodNomsUrl;
  if (inDetail && recipe.foodNomsUrl) foodnomsBtn.href = recipe.foodNomsUrl;
  searchRow.hidden = inDetail;
  chips.hidden = inDetail;
}

async function showDetail(id) {
  const recipe = state.index.recipes.find((r) => r.id === id);
  const listView = document.getElementById('recipe-list');
  const emptyEl = document.getElementById('empty-state');
  const detail = document.getElementById('recipe-detail');
  const contentEl = document.getElementById('recipe-content');
  const favBtn = document.getElementById('fav-btn');
  const shareBtn = document.getElementById('share-btn');

  listView.hidden = true;
  emptyEl.hidden = true;
  detail.hidden = false;
  window.scrollTo(0, 0);

  if (!recipe) {
    setHeaderMode('list');
    contentEl.innerHTML = '<p class="load-error">Recipe not found.</p>';
    return;
  }

  setHeaderMode('detail', recipe);
  contentEl.innerHTML = '<p class="loading">Loading…</p>';
  favBtn.textContent = isFavorite(recipe.id) ? '★' : '☆';
  favBtn.onclick = () => {
    favBtn.textContent = toggleFavorite(recipe.id) ? '★' : '☆';
  };
  shareBtn.onclick = () => shareRecipe(recipe);

  try {
    const res = await fetch(recipe.path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const md = await res.text();
    contentEl.innerHTML = renderMarkdown(md, {
      resolveLink: (href) => resolveRecipeLink(href, recipe, state.index),
    });
    pushRecent(recipe.id);
  } catch (err) {
    contentEl.innerHTML = `<p class="load-error">Couldn't load this recipe (${err.message}). Check your connection and try again.</p>`;
  }
}

function hideDetail() {
  document.getElementById('recipe-list').hidden = false;
  document.getElementById('recipe-detail').hidden = true;
  setHeaderMode('list');
  renderList();
}

async function shareRecipe(recipe) {
  const url = `${window.location.origin}${window.location.pathname}#/recipe/${recipe.id}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: recipe.title, url });
    } catch {
      // user cancelled — no-op
    }
  } else if (navigator.clipboard) {
    await navigator.clipboard.writeText(url);
    alert('Link copied to clipboard.');
  }
}

function route() {
  const hash = window.location.hash;
  const m = hash.match(/^#\/recipe\/(.+)$/);
  if (m) {
    showDetail(decodeURIComponent(m[1]));
  } else {
    hideDetail();
  }
}

async function refreshData() {
  try {
    state.index = await loadIndex();
  } catch {
    return; // keep showing whatever's already on screen rather than erroring out
  }

  renderChips();

  const m = window.location.hash.match(/^#\/recipe\/(.+)$/);
  if (m) {
    await showDetail(decodeURIComponent(m[1]));
  } else {
    renderList();
  }

  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    reg?.update();
  }
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

async function initApp() {
  const tpl = document.getElementById('tpl-shell');
  root.innerHTML = '';
  root.appendChild(tpl.content.cloneNode(true));

  try {
    state.index = await loadIndex();
  } catch (err) {
    root.innerHTML = `<p class="load-error">Couldn't load recipes: ${err.message}</p>`;
    return;
  }

  renderChips();
  renderList();
  route();

  document.getElementById('search-input').addEventListener(
    'input',
    debounce((e) => {
      state.query = e.target.value;
      renderList();
    }, 150)
  );

  document.getElementById('sort-select').addEventListener('change', (e) => {
    state.sort = e.target.value;
    renderList();
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    window.location.hash = '';
  });

  document.getElementById('lock-btn').addEventListener('click', () => {
    if (confirm('Lock the app? You will need the password again.')) {
      lock();
      window.location.hash = '';
      window.location.reload();
    }
  });

  window.addEventListener('hashchange', route);

  document.getElementById('recipe-content').addEventListener('click', (e) => {
    const btn = e.target.closest('.md-toggle');
    if (!btn) return;
    const section = btn.closest('.md-section');
    const collapsed = section.classList.toggle('collapsed');
    btn.textContent = collapsed ? 'Show' : 'Hide';
    btn.setAttribute('aria-expanded', String(!collapsed));
  });

  initPullToRefresh(refreshData);
}

function boot() {
  if (isUnlocked()) {
    initApp();
  } else {
    mountLockScreen(root, initApp);
  }
}

boot();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // offline support is a nice-to-have, not required
    });
  });
}
