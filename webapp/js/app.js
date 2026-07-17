import { isUnlocked, mountLockScreen } from './auth.js';
import { renderMarkdown, renderInline } from './markdown.js';
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
  currentRecipe: null,
  pantryIndex: null,
  pantryQuery: '',
  currentFood: null,
  view: 'recipes', // 'recipes' | 'pantry' — which top-level section is active
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

async function loadPantryIndex() {
  const res = await fetch('data/pantry-index.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load pantry index (${res.status})`);
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

function matchesPantryQuery(food, query) {
  if (!query) return true;
  return food.text.toLowerCase().includes(query.toLowerCase());
}

function visiblePantryFoods() {
  if (!state.pantryIndex) return [];
  return state.pantryIndex.foods
    .filter((f) => matchesPantryQuery(f, state.pantryQuery))
    .slice()
    .sort((a, b) => foodDisplayName(a.text).localeCompare(foodDisplayName(b.text)));
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

function foodEmoji(text) {
  const m = text.match(/\p{Extended_Pictographic}(️)?/u);
  return m ? m[0] : '🧺';
}

function foodDisplayName(text) {
  return text.replace(/\p{Extended_Pictographic}(️)?\s*/u, '').trim();
}

function renderPantryList() {
  const listEl = document.getElementById('pantry-list');
  const emptyEl = document.getElementById('pantry-empty-state');
  const foods = visiblePantryFoods();

  emptyEl.hidden = foods.length !== 0;
  listEl.innerHTML = foods
    .map((f) => {
      const meta = [];
      if (f.status === 'pending') meta.push('profile pending');
      else if (f.per100?.calories != null) meta.push(`${Math.round(f.per100.calories)} kcal / 100g`);
      meta.push(`${f.recipes.length} recipe${f.recipes.length === 1 ? '' : 's'}`);
      return `
      <div class="recipe-card">
        <button class="recipe-card-main" data-food-id="${f.id}">
          <p class="recipe-card-title">${foodEmoji(f.text)} ${foodDisplayName(f.text)}</p>
          <div class="recipe-card-meta">${meta.map((m) => `<span class="tag">${m}</span>`).join('')}</div>
        </button>
      </div>`;
    })
    .join('');

  listEl.querySelectorAll('[data-food-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.location.hash = `#/pantry/${btn.dataset.foodId}`;
    });
  });
}

// view: 'recipes' | 'pantry' — which top-level section.
// mode: 'list' | 'detail'.
// item: the current recipe or pantry food when mode === 'detail'.
function setHeaderMode(view, mode, item) {
  const navTitle = document.getElementById('nav-title');
  const backBtn = document.getElementById('back-btn');
  const navMenuBtn = document.getElementById('nav-menu-btn');
  const refreshBtn = document.getElementById('refresh-btn');
  const moreBtn = document.getElementById('more-btn');
  const searchRow = document.getElementById('search-row');
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');
  const chips = document.getElementById('category-chips');

  const inDetail = mode === 'detail';
  const inPantry = view === 'pantry';

  if (inDetail) {
    navTitle.textContent = inPantry ? foodDisplayName(item.text) : item.title;
  } else {
    navTitle.textContent = inPantry ? '🧺 Pantry' : '🍽️ Family Recipes';
  }

  backBtn.hidden = !inDetail;
  navMenuBtn.hidden = inDetail;
  refreshBtn.hidden = inDetail;
  moreBtn.hidden = !inDetail || inPantry;
  searchRow.hidden = inDetail;
  chips.hidden = inDetail || inPantry;
  sortSelect.hidden = inPantry;
  searchInput.placeholder = inPantry ? 'Search pantry' : 'Search recipes or ingredients';
}

function hideAllViews() {
  document.getElementById('recipe-list').hidden = true;
  document.getElementById('empty-state').hidden = true;
  document.getElementById('recipe-detail').hidden = true;
  document.getElementById('pantry-list').hidden = true;
  document.getElementById('pantry-empty-state').hidden = true;
  document.getElementById('pantry-detail').hidden = true;
}

async function showDetail(id) {
  const recipe = state.index.recipes.find((r) => r.id === id);
  const detail = document.getElementById('recipe-detail');
  const contentEl = document.getElementById('recipe-content');

  state.view = 'recipes';
  state.currentRecipe = recipe || null;
  hideAllViews();
  detail.hidden = false;
  window.scrollTo(0, 0);

  if (!recipe) {
    setHeaderMode('recipes', 'list');
    contentEl.innerHTML = '<p class="load-error">Recipe not found.</p>';
    return;
  }

  setHeaderMode('recipes', 'detail', recipe);
  contentEl.innerHTML = '<p class="loading">Loading…</p>';

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
  state.view = 'recipes';
  hideAllViews();
  document.getElementById('recipe-list').hidden = false;
  setHeaderMode('recipes', 'list');
  renderList();
}

function nutrientTableHtml(per100) {
  const ROWS = [
    ['calories', 'Energy', 'kcal', 1],
    ['protein', 'Protein', 'g', 1],
    ['carbs', 'Carbohydrates', 'g', 1],
    ['sugars', '— of which sugars', 'g', 1],
    ['fat', 'Fat', 'g', 1],
    ['fatSaturated', '— of which saturates', 'g', 1],
    ['fiber', 'Fibre', 'g', 1],
    ['sodium', 'Salt', 'g', 2.5 / 1000],
  ];
  const MICRO_ROWS = [
    ['iron', 'Iron', 'mg', 1],
    ['calcium', 'Calcium', 'mg', 1],
    ['zinc', 'Zinc', 'mg', 1],
    ['magnesium', 'Magnesium', 'mg', 1],
    ['potassium', 'Potassium', 'mg', 1],
    ['vitaminD', 'Vitamin D', 'µg', 1],
    ['vitaminB12', 'Vitamin B12', 'µg', 1],
    ['folate', 'Folate', 'µg', 1],
  ];
  const fmt = (v, mult) => {
    const n = v * mult;
    return Math.abs(n) < 10 ? Math.round(n * 100) / 100 : Math.round(n * 10) / 10;
  };
  const rows = ROWS.map(([key, label, unit, mult], i) => {
    const macroVal = per100[key] != null ? `${fmt(per100[key], mult)} ${unit}` : '—';
    const [mkey, mlabel, munit, mmult] = MICRO_ROWS[i];
    const microVal = per100[mkey] != null ? `${fmt(per100[mkey], mmult)} ${munit}` : '—';
    return `<tr><td>${label}</td><td>${macroVal}</td><td>${mlabel}</td><td>${microVal}</td></tr>`;
  });
  return `<div class="table-scroll"><table><thead><tr><th>Macro</th><th>Total</th><th>Micro</th><th>Total</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

function pantryFoodNomsLinkHtml(url, label) {
  const standalone = isStandaloneApp();
  const attrs = standalone ? '' : ' target="_blank" rel="noopener"';
  return `<p><a href="${url}"${attrs}>⬇︎ ${label || 'Download FoodNoms'}</a></p>`;
}

function pantryUsedInHtml(food) {
  if (!food.recipes.length) return '';
  const links = food.recipes
    .map((r) => `<li><a href="#/recipe/${r.id}">${r.title}</a></li>`)
    .join('');
  return `<h2>Used in</h2><ul>${links}</ul>`;
}

async function showPantryDetail(id) {
  const food = state.pantryIndex?.foods.find((f) => f.id === id) || null;
  const detail = document.getElementById('pantry-detail');
  const contentEl = document.getElementById('pantry-content');

  state.view = 'pantry';
  state.currentFood = food;
  hideAllViews();
  detail.hidden = false;
  window.scrollTo(0, 0);

  if (!food) {
    setHeaderMode('pantry', 'list');
    contentEl.innerHTML = '<p class="load-error">Pantry item not found.</p>';
    return;
  }

  setHeaderMode('pantry', 'detail', food);

  let html = `<h1>${foodEmoji(food.text)} ${foodDisplayName(food.text)}</h1>`;

  if (food.status === 'pending') {
    html += `<p class="load-error">Profile pending — nutrition research not yet done for this ingredient.</p>`;
    if (food.pendingReason) html += `<p><em>${renderInline(food.pendingReason)}</em></p>`;
  } else if (food.status === 'compound') {
    html += `<p><em>This ingredient cell names more than one food; both are shown below.</em></p>`;
    for (const comp of food.components) {
      html += `<h2>${comp.label}</h2>`;
      if (comp.source) html += `<p><em>${renderInline(comp.source)}</em></p>`;
      html += nutrientTableHtml(comp.per100);
      html += pantryFoodNomsLinkHtml(comp.foodNomsUrl, `Download ${comp.label}`);
    }
  } else {
    if (food.source) html += `<p><em>${renderInline(food.source)}</em></p>`;
    html += nutrientTableHtml(food.per100);
    html += pantryFoodNomsLinkHtml(food.foodNomsUrl);
  }

  html += pantryUsedInHtml(food);
  contentEl.innerHTML = html;
}

function hidePantryDetail() {
  state.view = 'pantry';
  hideAllViews();
  document.getElementById('pantry-list').hidden = false;
  setHeaderMode('pantry', 'list');
  renderPantryList();
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
  const recipeMatch = hash.match(/^#\/recipe\/(.+)$/);
  const pantryItemMatch = hash.match(/^#\/pantry\/(.+)$/);

  if (recipeMatch) {
    showDetail(decodeURIComponent(recipeMatch[1]));
  } else if (pantryItemMatch) {
    showPantryDetail(decodeURIComponent(pantryItemMatch[1]));
  } else if (hash === '#/pantry') {
    hidePantryDetail();
  } else {
    hideDetail();
  }
}

async function refreshData() {
  try {
    const [index, pantryIndex] = await Promise.all([loadIndex(), loadPantryIndex().catch(() => state.pantryIndex)]);
    state.index = index;
    state.pantryIndex = pantryIndex;
  } catch {
    return; // keep showing whatever's already on screen rather than erroring out
  }

  renderChips();
  route();

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

  try {
    state.pantryIndex = await loadPantryIndex();
  } catch {
    state.pantryIndex = { count: 0, researchedCount: 0, pendingCount: 0, foods: [] };
  }

  renderChips();
  renderList();
  renderPantryList();
  route();

  document.getElementById('search-input').addEventListener(
    'input',
    debounce((e) => {
      if (state.view === 'pantry') {
        state.pantryQuery = e.target.value;
        renderPantryList();
      } else {
        state.query = e.target.value;
        renderList();
      }
    }, 150)
  );

  document.getElementById('sort-select').addEventListener('change', (e) => {
    state.sort = e.target.value;
    renderList();
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    window.location.hash = state.view === 'pantry' ? '#/pantry' : '';
  });

  document.getElementById('refresh-btn').addEventListener('click', refreshData);

  window.addEventListener('hashchange', route);

  document.getElementById('recipe-content').addEventListener('click', handleSectionToggle);
  document.getElementById('pantry-content').addEventListener('click', handleSectionToggle);

  setupMoreMenu();
  setupNavMenu();

  initPullToRefresh(refreshData);
}

function handleSectionToggle(e) {
  const btn = e.target.closest('.md-toggle');
  if (!btn) return;
  const section = btn.closest('.md-section');
  const collapsed = section.classList.toggle('collapsed');
  btn.textContent = collapsed ? 'Show' : 'Hide';
  btn.setAttribute('aria-expanded', String(!collapsed));
}

function setupNavMenu() {
  const navMenu = document.getElementById('nav-menu');
  const closeMenu = () => {
    navMenu.hidden = true;
  };

  document.getElementById('nav-menu-btn').addEventListener('click', () => {
    navMenu.hidden = false;
  });
  document.getElementById('nav-menu-backdrop').addEventListener('click', closeMenu);
  document.getElementById('nav-menu-cancel').addEventListener('click', closeMenu);
  document.getElementById('nav-menu-recipes').addEventListener('click', () => {
    closeMenu();
    window.location.hash = '';
  });
  document.getElementById('nav-menu-pantry').addEventListener('click', () => {
    closeMenu();
    window.location.hash = '#/pantry';
  });
}

// Installed (home-screen/Dock) web apps open target="_blank" links in a
// constrained in-app-browser overlay instead of a real Safari tab, and that
// overlay doesn't reliably hand off file downloads like the .foodnoms file
// — the link just silently fails. A plain top-level navigation (no target)
// is the one path that reliably triggers Safari's native download handling
// even from a standalone shell, so drop target/rel there; a real browser
// tab keeps target="_blank" so the download doesn't navigate away from the
// recipe.
function isStandaloneApp() {
  return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

function setupMoreMenu() {
  const moreMenu = document.getElementById('more-menu');
  const menuRefresh = document.getElementById('menu-refresh');
  const menuFoodnoms = document.getElementById('menu-foodnoms');
  const menuFav = document.getElementById('menu-fav');
  const menuShare = document.getElementById('menu-share');

  if (isStandaloneApp()) {
    menuFoodnoms.removeAttribute('target');
    menuFoodnoms.removeAttribute('rel');
  }

  const closeMenu = () => {
    moreMenu.hidden = true;
  };

  document.getElementById('more-btn').addEventListener('click', () => {
    const recipe = state.currentRecipe;
    if (!recipe) return;
    menuFoodnoms.hidden = !recipe.foodNomsUrl;
    if (recipe.foodNomsUrl) menuFoodnoms.href = recipe.foodNomsUrl;
    menuFav.textContent = isFavorite(recipe.id) ? '★ Remove from Favorites' : '☆ Add to Favorites';
    moreMenu.hidden = false;
  });

  document.getElementById('more-menu-backdrop').addEventListener('click', closeMenu);
  document.getElementById('menu-cancel').addEventListener('click', closeMenu);
  menuFoodnoms.addEventListener('click', closeMenu);

  menuRefresh.addEventListener('click', () => {
    if (state.currentRecipe) showDetail(state.currentRecipe.id);
    closeMenu();
  });

  menuFav.addEventListener('click', () => {
    if (state.currentRecipe) toggleFavorite(state.currentRecipe.id);
    closeMenu();
  });

  menuShare.addEventListener('click', () => {
    if (state.currentRecipe) shareRecipe(state.currentRecipe);
    closeMenu();
  });
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
