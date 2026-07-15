const STORAGE_KEY = 'quatroletras-songs';
const SETLISTS_KEY = 'quatroletras-setlists';
const ACTIVE_SETLIST_KEY = 'quatroletras-active-setlist';
const LEGACY_SETLIST_KEY = 'quatroletras-setlist';
const SECTION_FONTS_KEY = 'quatroletras-section-fonts';
const FONT_SIZE_KEY = 'quatroletras-font-size';
const PEDAL_KEYS_KEY = 'quatroletras-pedal-keys';
const DISPLAY_MODE_KEY = 'quatroletras-display-mode';
const SCROLL_AMOUNTS_KEY = 'quatroletras-scroll-amounts';

const DEFAULT_PEDAL_KEYS = {
  next: 'PageDown',
  back: 'PageUp',
};

const DEFAULT_FONT_SIZE = 1;
const FONT_SIZE_MIN = 0.6;
const FONT_SIZE_MAX = 2.5;
const FONT_SIZE_STEP = 0.15;

const DEFAULT_SCROLL_AMOUNT = 100;
const SCROLL_AMOUNT_MIN = 20;
const SCROLL_AMOUNT_MAX = 600;
const SCROLL_AMOUNT_STEP = 20;

const DISPLAY_MODES = {
  SECTIONS: 'sections',
  CONTINUOUS: 'continuous'
};

let songs = [];
let setlists = [];
let activeSetlistId = null;
let setlistIds = [];
let sectionFontSizes = {};
let editingId = null;
let currentDisplayId = null;
let currentSections = [];
let currentSectionIndex = 0;
let pickerIndex = 0;
let defaultFontSize = parseFloat(localStorage.getItem(FONT_SIZE_KEY)) || DEFAULT_FONT_SIZE;
let pedalKeys = loadPedalKeys();
let capturingPedal = null;
let lastPedalTime = 0;
let showingTitle = false;
let wakeLock = null;
let swipeHandled = false;
const swipeState = { startX: 0, startY: 0, tracking: false };
let displayMode = localStorage.getItem(DISPLAY_MODE_KEY) || DISPLAY_MODES.SECTIONS;
let scrollAmounts = {};
let currentScrollAmount = DEFAULT_SCROLL_AMOUNT;

// ── DOM refs ──
const screens = {
  manage: document.getElementById('manage-screen'),
  edit: document.getElementById('edit-screen'),
  display: document.getElementById('display-screen'),
};

const setlistList = document.getElementById('setlist-list');
const setlistEmpty = document.getElementById('setlist-empty');
const libraryList = document.getElementById('library-list');
const libraryEmpty = document.getElementById('library-empty');
const songTitle = document.getElementById('song-title');
const songLyrics = document.getElementById('song-lyrics');
const editTitle = document.getElementById('edit-title');
const btnDelete = document.getElementById('btn-delete');
const displayContent = document.getElementById('display-content');
const displayTitleBar = document.getElementById('display-title-bar');
const sectionIndicator = document.getElementById('section-indicator');
const pickerOverlay = document.getElementById('picker-overlay');
const pickerList = document.getElementById('picker-list');
const addSetlistOverlay = document.getElementById('add-setlist-overlay');
const addSetlistList = document.getElementById('add-setlist-list');
const addSetlistEmpty = document.getElementById('add-setlist-empty');
const btnSetNextKey = document.getElementById('btn-set-next-key');
const btnSetBackKey = document.getElementById('btn-set-back-key');
const pedalCaptureHint = document.getElementById('pedal-capture-hint');
const btnManageFullscreen = document.getElementById('btn-manage-fullscreen');
const importFileInput = document.getElementById('import-file');
const setlistDropdown = document.getElementById('setlist-dropdown');
const fontControlsPanel = document.getElementById('font-controls-panel');
const btnToggleMode = document.getElementById('btn-toggle-mode');
const btnEdit = document.getElementById('btn-edit');
const editMenu = document.getElementById('edit-menu');
const scrollMenuSection = document.getElementById('scroll-menu-section');
const btnFontUpMenu = document.getElementById('btn-font-up-menu');
const btnFontDownMenu = document.getElementById('btn-font-down-menu');
const btnScrollUpMenu = document.getElementById('btn-scroll-up-menu');
const btnScrollDownMenu = document.getElementById('btn-scroll-down-menu');
const scrollAmountDisplayMenu = document.getElementById('scroll-amount-display-menu');
const scrollControlsPanel = document.getElementById('scroll-controls-panel');
const btnScrollUp = document.getElementById('btn-scroll-up');
const btnScrollDown = document.getElementById('btn-scroll-down');
const scrollAmountDisplay = document.getElementById('scroll-amount-display');

// ── Storage ──

function loadPedalKeys() {
  try {
    const saved = JSON.parse(localStorage.getItem(PEDAL_KEYS_KEY));
    if (saved?.next && saved?.back) return saved;
  } catch { /* ignore */ }
  return { ...DEFAULT_PEDAL_KEYS };
}

function savePedalKeys() {
  localStorage.setItem(PEDAL_KEYS_KEY, JSON.stringify(pedalKeys));
}

function loadScrollAmounts() {
  try {
    scrollAmounts = JSON.parse(localStorage.getItem(SCROLL_AMOUNTS_KEY)) || {};
  } catch {
    scrollAmounts = {};
  }
}

function saveScrollAmounts() {
  localStorage.setItem(SCROLL_AMOUNTS_KEY, JSON.stringify(scrollAmounts));
}

function getScrollAmount(songId) {
  return scrollAmounts[songId] ?? DEFAULT_SCROLL_AMOUNT;
}

function setScrollAmount(songId, amount) {
  scrollAmounts[songId] = amount;
  saveScrollAmounts();
}

function loadSongs() {
  try {
    songs = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    songs = [];
  }
}

function saveSongs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
}

function loadSetlists() {
  try {
    setlists = JSON.parse(localStorage.getItem(SETLISTS_KEY)) || [];
  } catch {
    setlists = [];
  }

  activeSetlistId = localStorage.getItem(ACTIVE_SETLIST_KEY);

  // Migración desde setlist único antiguo
  if (setlists.length === 0) {
    let legacyIds = [];
    try {
      legacyIds = JSON.parse(localStorage.getItem(LEGACY_SETLIST_KEY)) || [];
    } catch { /* ignore */ }

    const id = crypto.randomUUID();
    setlists = [{ id, name: 'Setlist 1', songIds: legacyIds }];
    activeSetlistId = id;
    saveSetlists();
    localStorage.removeItem(LEGACY_SETLIST_KEY);
  }

  if (!setlists.some(s => s.id === activeSetlistId)) {
    activeSetlistId = setlists[0]?.id ?? null;
  }

  // Migración: setlist activo vacío con canciones en biblioteca
  const active = getActiveSetlist();
  if (active && active.songIds.length === 0 && songs.length > 0 && setlists.length === 1) {
    active.songIds = songs.map(s => s.id);
    saveSetlists();
  }

  syncSetlistIdsFromActive();
  pruneSetlist();
}

function saveSetlists() {
  localStorage.setItem(SETLISTS_KEY, JSON.stringify(setlists));
  if (activeSetlistId) {
    localStorage.setItem(ACTIVE_SETLIST_KEY, activeSetlistId);
  }
}

function syncSetlistIdsFromActive() {
  const active = getActiveSetlist();
  setlistIds = active ? [...active.songIds] : [];
}

function persistSetlistIds() {
  const active = getActiveSetlist();
  if (active) {
    active.songIds = [...setlistIds];
    saveSetlists();
  }
}

function getActiveSetlist() {
  return setlists.find(s => s.id === activeSetlistId) ?? null;
}

function loadSectionFonts() {
  try {
    sectionFontSizes = JSON.parse(localStorage.getItem(SECTION_FONTS_KEY)) || {};
  } catch {
    sectionFontSizes = {};
  }
}

function saveSectionFonts() {
  localStorage.setItem(SECTION_FONTS_KEY, JSON.stringify(sectionFontSizes));
}

function getSectionFontSize(songId, sectionIndex) {
  return sectionFontSizes[songId]?.[sectionIndex] ?? defaultFontSize;
}

function setSectionFontSize(songId, sectionIndex, size) {
  if (!sectionFontSizes[songId]) sectionFontSizes[songId] = {};
  sectionFontSizes[songId][sectionIndex] = size;
  saveSectionFonts();
}

function fontSizeToCss(size) {
  return `clamp(1.2rem, ${size * 5}vw, ${size * 3.5}rem)`;
}

function createSetlist(name) {
  const id = crypto.randomUUID();
  setlists.push({ id, name, songIds: [] });
  activeSetlistId = id;
  syncSetlistIdsFromActive();
  saveSetlists();
  renderSetlistSelector();
  renderAll();
}

function renameActiveSetlist() {
  const active = getActiveSetlist();
  if (!active) return;
  const name = prompt('Nombre del setlist:', active.name);
  if (!name?.trim()) return;
  active.name = name.trim();
  saveSetlists();
  renderSetlistSelector();
}

function deleteActiveSetlist() {
  if (setlists.length <= 1) {
    alert('Debe quedar al menos un setlist.');
    return;
  }
  const active = getActiveSetlist();
  if (!active) return;
  if (!confirm(`¿Eliminar el setlist "${active.name}"?`)) return;
  setlists = setlists.filter(s => s.id !== active.id);
  activeSetlistId = setlists[0].id;
  syncSetlistIdsFromActive();
  saveSetlists();
  renderSetlistSelector();
  renderAll();
}

function switchSetlist(id) {
  if (id === activeSetlistId) return;
  persistSetlistIds();
  activeSetlistId = id;
  syncSetlistIdsFromActive();
  pruneSetlist();
  saveSetlists();
  renderAll();
}

function renderSetlistSelector() {
  if (!setlistDropdown) return;
  setlistDropdown.innerHTML = '';
  setlists.forEach(sl => {
    const opt = document.createElement('option');
    opt.value = sl.id;
    opt.textContent = sl.name;
    if (sl.id === activeSetlistId) opt.selected = true;
    setlistDropdown.appendChild(opt);
  });
}

function pruneSetlist() {
  const valid = new Set(songs.map(s => s.id));
  const pruned = setlistIds.filter(id => valid.has(id));
  if (pruned.length !== setlistIds.length) {
    setlistIds = pruned;
    persistSetlistIds();
  }
}

// ── Setlist helpers ──

function getSetlistSongs() {
  const map = new Map(songs.map(s => [s.id, s]));
  return setlistIds.map(id => map.get(id)).filter(Boolean);
}

function isInSetlist(id) {
  return setlistIds.includes(id);
}

function getSetlistIndex(id) {
  return setlistIds.indexOf(id);
}

function getSongNumber(id) {
  const idx = getSetlistIndex(id);
  return idx >= 0 ? idx + 1 : 0;
}

function addToSetlist(id) {
  if (!songs.some(s => s.id === id) || isInSetlist(id)) return;
  setlistIds.push(id);
  persistSetlistIds();
  renderAll();
}

function removeFromSetlist(id) {
  setlistIds = setlistIds.filter(x => x !== id);
  persistSetlistIds();
  renderAll();
}

function moveSetlistItem(fromIndex, toIndex) {
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= setlistIds.length || toIndex >= setlistIds.length) return;
  if (fromIndex === toIndex) return;
  const [item] = setlistIds.splice(fromIndex, 1);
  setlistIds.splice(toIndex, 0, item);
  persistSetlistIds();
  renderSetlist();
}

function moveSetlistById(id, delta) {
  moveSetlistItem(getSetlistIndex(id), getSetlistIndex(id) + delta);
}

// ── Navigation ──

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  if (name === 'display') {
    requestWakeLock();
  } else {
    releaseWakeLock();
  }
}

// ── Wake Lock (evitar que la pantalla se apague) ──

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => {
      wakeLock = null;
    });
  } catch { /* no disponible o rechazado */ }
}

function releaseWakeLock() {
  wakeLock?.release();
  wakeLock = null;
}

function isPickerOpen() {
  return !pickerOverlay.classList.contains('hidden');
}

function renderAll() {
  renderSetlist();
  renderLibrary();
}

// ── Setlist UI ──

function renderSetlist() {
  const items = getSetlistSongs();
  setlistList.innerHTML = '';
  setlistEmpty.classList.toggle('hidden', items.length > 0);

  items.forEach((song, index) => {
    const num = index + 1;
    const isFirst = index === 0;
    const isLast = index === items.length - 1;
    const item = document.createElement('div');
    item.className = 'song-item';
    item.dataset.id = song.id;
    item.dataset.index = String(index);
    item.innerHTML = `
      <span class="drag-handle" draggable="true" data-id="${song.id}" aria-label="Arrastrar para reordenar" title="Arrastrar">⠿</span>
      <span class="song-number">${num}</span>
      <div class="song-item-info">
        <div class="song-item-title">${escapeHtml(song.title)}</div>
        <div class="song-item-preview">${escapeHtml(preview(song.lyrics))}</div>
      </div>
      <div class="song-reorder">
        <button type="button" class="btn btn-ghost" data-action="up" data-id="${song.id}" ${isFirst ? 'disabled' : ''} aria-label="Subir en el setlist">↑</button>
        <button type="button" class="btn btn-ghost" data-action="down" data-id="${song.id}" ${isLast ? 'disabled' : ''} aria-label="Bajar en el setlist">↓</button>
      </div>
      <div class="song-item-actions">
        <button type="button" class="btn btn-ghost btn-icon" data-action="remove" data-id="${song.id}" aria-label="Quitar del setlist" title="Quitar del setlist">−</button>
        <button type="button" class="btn btn-primary btn-icon" data-action="show" data-id="${song.id}" aria-label="Mostrar">▶</button>
      </div>
    `;
    setlistList.appendChild(item);
  });
}

function renderLibrary() {
  libraryList.innerHTML = '';
  libraryEmpty.classList.toggle('hidden', songs.length > 0);

  songs.forEach(song => {
    const inSetlist = isInSetlist(song.id);
    const item = document.createElement('div');
    item.className = 'song-item song-item-library';
    item.dataset.id = song.id;
    item.innerHTML = `
      <div class="song-item-info">
        <div class="song-item-title">
          ${escapeHtml(song.title)}
          ${inSetlist ? '<span class="in-setlist-badge">En setlist</span>' : ''}
        </div>
        <div class="song-item-preview">${escapeHtml(preview(song.lyrics))}</div>
      </div>
      <div class="song-item-actions">
        ${inSetlist ? '' : `<button type="button" class="btn btn-ghost" data-action="add-setlist" data-id="${song.id}">+ Setlist</button>`}
        <button type="button" class="btn btn-ghost btn-icon" data-action="edit" data-id="${song.id}" aria-label="Editar">✎</button>
      </div>
    `;
    libraryList.appendChild(item);
  });
}

function preview(lyrics) {
  const line = lyrics.split('\n').find(l => l.trim());
  return line ? line.trim().slice(0, 60) : 'Sin letra';
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Add to setlist overlay ──

function openAddSetlistOverlay() {
  const available = songs.filter(s => !isInSetlist(s.id));
  addSetlistList.innerHTML = '';
  addSetlistEmpty.classList.toggle('hidden', available.length > 0);
  addSetlistList.classList.toggle('hidden', available.length === 0);

  available.forEach(song => {
    const btn = document.createElement('button');
    btn.className = 'picker-item';
    btn.innerHTML = `
      <span class="picker-item-title">${escapeHtml(song.title)}</span>
      <span class="picker-item-add">+</span>
    `;
    btn.addEventListener('click', () => {
      addToSetlist(song.id);
      openAddSetlistOverlay();
    });
    addSetlistList.appendChild(btn);
  });

  addSetlistOverlay.classList.remove('hidden');
}

function closeAddSetlistOverlay() {
  addSetlistOverlay.classList.add('hidden');
}

// ── Edit ──

function openNewSong() {
  editingId = null;
  editTitle.textContent = 'Nueva canción';
  songTitle.value = '';
  songLyrics.value = '';
  btnDelete.classList.add('hidden');
  showScreen('edit');
  songTitle.focus();
}

function openEditSong(id) {
  const song = songs.find(s => s.id === id);
  if (!song) return;
  editingId = id;
  editTitle.textContent = 'Editar canción';
  songTitle.value = song.title;
  songLyrics.value = song.lyrics;
  btnDelete.classList.remove('hidden');
  showScreen('edit');
  songTitle.focus();
}

function saveSong() {
  const title = songTitle.value.trim();
  const lyrics = songLyrics.value.trim();
  if (!title) {
    songTitle.focus();
    return;
  }
  if (!lyrics) {
    songLyrics.focus();
    return;
  }

  if (editingId) {
    const song = songs.find(s => s.id === editingId);
    if (song) {
      song.title = title;
      song.lyrics = lyrics;
    }
  } else {
    const id = crypto.randomUUID();
    songs.push({ id, title, lyrics });
    setlistIds.push(id);
    persistSetlistIds();
  }

  saveSongs();
  renderAll();
  showScreen('manage');
}

function deleteSong() {
  if (!editingId) return;
  if (!confirm('¿Eliminar esta canción de la biblioteca? También se quitará del setlist.')) return;
  songs = songs.filter(s => s.id !== editingId);
  setlistIds = setlistIds.filter(id => id !== editingId);
  setlists.forEach(sl => {
    sl.songIds = sl.songIds.filter(id => id !== editingId);
  });
  delete sectionFontSizes[editingId];
  saveSongs();
  saveSetlists();
  saveSectionFonts();
  renderAll();
  showScreen('manage');
}

// ── Sections ──

function parseSections(lyrics) {
  const sections = lyrics
    .split(/\n\s*\n/)
    .map(s => s.trim())
    .filter(Boolean);
  return sections.length ? sections : [lyrics.trim() || '(sin letra)'];
}

function renderSectionLines(container, text) {
  text.split('\n').forEach(line => {
    if (line.trim() === '') {
      const gap = document.createElement('div');
      gap.className = 'lyrics-gap';
      container.appendChild(gap);
    } else {
      const el = document.createElement('div');
      el.className = 'lyrics-line';
      el.textContent = line;
      container.appendChild(el);
    }
  });
}

function updateSectionIndicator(song) {
  if (showingTitle) {
    displayTitleBar.textContent = '';
    displayTitleBar.classList.remove('visible');
    sectionIndicator.textContent = '';
    sectionIndicator.classList.remove('visible');
    return;
  }

  displayTitleBar.textContent = '';
  displayTitleBar.classList.remove('visible');

  if (displayMode === DISPLAY_MODES.SECTIONS) {
    const total = currentSections.length;
    sectionIndicator.textContent = total > 1 ? `${currentSectionIndex + 1} / ${total}` : '';
    sectionIndicator.classList.toggle('visible', total > 1);
  } else {
    sectionIndicator.textContent = '';
    sectionIndicator.classList.remove('visible');
  }
}

function updateScrollControls() {
  if (displayMode === DISPLAY_MODES.CONTINUOUS && !showingTitle) {
    currentScrollAmount = getScrollAmount(currentDisplayId);
    scrollAmountDisplay.textContent = `${currentScrollAmount}px`;
    scrollAmountDisplayMenu.textContent = `${currentScrollAmount}px`;
    scrollMenuSection.classList.remove('hidden');
    scrollControlsPanel.classList.add('hidden');
  } else {
    scrollMenuSection.classList.add('hidden');
    scrollControlsPanel.classList.add('hidden');
  }
}

function showCurrentSection() {
  const titleSlide = displayContent.querySelector('.song-title-slide');
  if (titleSlide) {
    titleSlide.classList.toggle('active', showingTitle);
  }
  
  if (displayMode === DISPLAY_MODES.SECTIONS) {
    displayContent.querySelectorAll('.lyrics-section').forEach((el, i) => {
      el.classList.toggle('active', !showingTitle && i === currentSectionIndex);
    });
  } else {
    // Modo continuo: mostrar siempre la sección continua
    displayContent.querySelectorAll('.lyrics-section').forEach(el => {
      el.classList.toggle('active', !showingTitle);
    });
  }
  
  applyCurrentSectionFontSize();
  const song = songs.find(s => s.id === currentDisplayId);
  if (song) updateSectionIndicator(song);
}

// ── Display ──

function showSong(id, sectionIndex = 0) {
  const song = songs.find(s => s.id === id);
  if (!song) return;

  currentDisplayId = id;
  currentSections = parseSections(song.lyrics);
  currentSectionIndex = Math.min(sectionIndex, currentSections.length - 1);
  showingTitle = true;

  renderLyrics(song);
  showScreen('display');
}

function renderLyrics(song) {
  displayContent.innerHTML = '';
  displayContent.classList.toggle('continuous-mode', displayMode === DISPLAY_MODES.CONTINUOUS);
  
  const block = document.createElement('div');
  block.className = 'lyrics-block';

  const titleSlide = document.createElement('div');
  titleSlide.className = 'song-title-slide' + (showingTitle ? ' active' : '');
  const num = getSongNumber(song.id);
  if (num > 0) {
    const numEl = document.createElement('div');
    numEl.className = 'song-title-number';
    numEl.textContent = num;
    titleSlide.appendChild(numEl);
  }
  const titleEl = document.createElement('div');
  titleEl.className = 'song-title-text';
  titleEl.textContent = song.title;
  titleSlide.appendChild(titleEl);
  block.appendChild(titleSlide);

  if (displayMode === DISPLAY_MODES.SECTIONS) {
    currentSections.forEach((sectionText, i) => {
      const section = document.createElement('div');
      section.className = 'lyrics-section' + (!showingTitle && i === currentSectionIndex ? ' active' : '');
      const size = getSectionFontSize(song.id, i);
      section.style.setProperty('--section-font-size', fontSizeToCss(size));
      renderSectionLines(section, sectionText);
      block.appendChild(section);
    });
  } else {
    // Modo continuo
    const continuousSection = document.createElement('div');
    continuousSection.className = 'lyrics-section continuous';
    const size = getSectionFontSize(song.id, 0);
    continuousSection.style.setProperty('--section-font-size', fontSizeToCss(size));
    currentSections.forEach(sectionText => {
      renderSectionLines(continuousSection, sectionText);
      const gap = document.createElement('div');
      gap.className = 'lyrics-gap';
      continuousSection.appendChild(gap);
    });
    block.appendChild(continuousSection);
  }

  displayContent.appendChild(block);
  updateSectionIndicator(song);
  updateScrollControls();
}

function applyCurrentSectionFontSize() {
  if (!currentDisplayId || showingTitle) return;
  const section = displayContent.querySelector('.lyrics-section.active');
  if (!section) return;
  const size = getSectionFontSize(currentDisplayId, currentSectionIndex);
  section.style.setProperty('--section-font-size', fontSizeToCss(size));
  document.documentElement.style.setProperty('--font-size-display', fontSizeToCss(size));
}

function adjustFontSize(delta) {
  if (!currentDisplayId || showingTitle) return;
  const current = getSectionFontSize(currentDisplayId, currentSectionIndex);
  const newSize = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, current + delta));
  setSectionFontSize(currentDisplayId, currentSectionIndex, newSize);
  applyCurrentSectionFontSize();
  flashFontControls();
}

function toggleDisplayMode() {
  displayMode = displayMode === DISPLAY_MODES.SECTIONS ? DISPLAY_MODES.CONTINUOUS : DISPLAY_MODES.SECTIONS;
  localStorage.setItem(DISPLAY_MODE_KEY, displayMode);
  updateModeButton();
  
  if (currentDisplayId) {
    const song = songs.find(s => s.id === currentDisplayId);
    if (song) {
      renderLyrics(song);
      showCurrentSection();
    }
  }
}

function updateModeButton() {
  if (btnToggleMode) {
    btnToggleMode.textContent = displayMode === DISPLAY_MODES.SECTIONS ? '📄' : '📜';
    btnToggleMode.title = displayMode === DISPLAY_MODES.SECTIONS ? 'Modo por estrofas' : 'Modo continuo';
  }
}

function adjustScrollAmount(delta) {
  if (!currentDisplayId) return;
  const current = getScrollAmount(currentDisplayId);
  const newAmount = Math.min(SCROLL_AMOUNT_MAX, Math.max(SCROLL_AMOUNT_MIN, current + delta));
  setScrollAmount(currentDisplayId, newAmount);
  currentScrollAmount = newAmount;
  scrollAmountDisplay.textContent = `${newAmount}px`;
  scrollAmountDisplayMenu.textContent = `${newAmount}px`;
  flashControls();
}

function toggleEditMenu() {
  editMenu.classList.toggle('hidden');
  if (!editMenu.classList.contains('hidden')) {
    editMenu.classList.add('visible');
    clearTimeout(controlsTimer);
    controlsTimer = setTimeout(() => {
      editMenu.classList.remove('visible');
    }, 3000);
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

function updateFullscreenButtons() {
  const isFs = !!document.fullscreenElement;
  const label = isFs ? 'Salir de pantalla completa' : 'Pantalla completa';
  btnManageFullscreen?.setAttribute('aria-label', label);
  btnManageFullscreen?.setAttribute('title', label);
  document.getElementById('btn-fullscreen')?.setAttribute('aria-label', label);
}

// ── Exportar / Importar ──

function buildExportData() {
  persistSetlistIds();
  return {
    version: 2,
    app: 'quatroletras',
    exportedAt: new Date().toISOString(),
    songs: songs.map(s => ({ id: s.id, title: s.title, lyrics: s.lyrics })),
    setlists: setlists.map(sl => ({ id: sl.id, name: sl.name, songIds: [...sl.songIds] })),
    activeSetlistId,
    sectionFontSizes,
    // Compatibilidad con versiones anteriores
    setlist: [...(getActiveSetlist()?.songIds ?? setlistIds)],
  };
}

function exportFilename() {
  const date = new Date().toISOString().slice(0, 10);
  return `quatroletras-${date}.json`;
}

async function exportLibrary() {
  const data = buildExportData();
  const json = JSON.stringify(data, null, 2);
  const filename = exportFilename();
  const file = new File([json], filename, { type: 'application/json' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'QuatroLetras' });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function validateImportData(raw) {
  if (!raw || raw.app !== 'quatroletras' || !Array.isArray(raw.songs)) {
    throw new Error('Archivo no válido. Usa un export de QuatroLetras.');
  }
  const validSongs = raw.songs.filter(
    s => s && typeof s.id === 'string' && typeof s.title === 'string' && typeof s.lyrics === 'string'
  );
  if (validSongs.length === 0) throw new Error('El archivo no contiene canciones válidas.');
  return {
    songs: validSongs,
    setlists: Array.isArray(raw.setlists)
      ? raw.setlists.filter(
          sl => sl && typeof sl.id === 'string' && typeof sl.name === 'string' && Array.isArray(sl.songIds)
        )
      : null,
    setlist: Array.isArray(raw.setlist) ? raw.setlist.filter(id => typeof id === 'string') : [],
    activeSetlistId: typeof raw.activeSetlistId === 'string' ? raw.activeSetlistId : null,
    sectionFontSizes: raw.sectionFontSizes && typeof raw.sectionFontSizes === 'object' ? raw.sectionFontSizes : null,
  };
}

function importLibrary(data) {
  const songMap = new Map(songs.map(s => [s.id, s]));
  data.songs.forEach(imported => {
    const existing = songMap.get(imported.id);
    if (existing) {
      existing.title = imported.title;
      existing.lyrics = imported.lyrics;
    } else {
      songs.push({ id: imported.id, title: imported.title, lyrics: imported.lyrics });
      songMap.set(imported.id, imported);
    }
  });

  const validIds = new Set(songs.map(s => s.id));

  if (data.setlists?.length) {
    data.setlists.forEach(imported => {
      const existing = setlists.find(sl => sl.id === imported.id);
      const songIds = imported.songIds.filter(id => validIds.has(id));
      if (existing) {
        existing.name = imported.name;
        songIds.forEach(id => {
          if (!existing.songIds.includes(id)) existing.songIds.push(id);
        });
      } else {
        setlists.push({ id: imported.id, name: imported.name, songIds: [...songIds] });
      }
    });
    if (data.activeSetlistId && setlists.some(sl => sl.id === data.activeSetlistId)) {
      activeSetlistId = data.activeSetlistId;
    }
  } else {
    const importedSetlist = data.setlist.filter(id => validIds.has(id));
    importedSetlist.forEach(id => {
      if (!setlistIds.includes(id)) setlistIds.push(id);
    });
    persistSetlistIds();
  }

  if (data.sectionFontSizes) {
    Object.entries(data.sectionFontSizes).forEach(([songId, sections]) => {
      if (!validIds.has(songId) || typeof sections !== 'object') return;
      if (!sectionFontSizes[songId]) sectionFontSizes[songId] = {};
      Object.entries(sections).forEach(([idx, size]) => {
        if (typeof size === 'number') sectionFontSizes[songId][idx] = size;
      });
    });
    saveSectionFonts();
  }

  syncSetlistIdsFromActive();
  saveSongs();
  saveSetlists();
  pruneSetlist();
  renderSetlistSelector();
  renderAll();
}

// ── Pedal navigation ──

function pedalNext() {
  if (isPickerOpen()) {
    pickerNavigate(1);
    return;
  }

  if (!screens.display.classList.contains('active')) return;

  if (showingTitle) {
    showingTitle = false;
    showCurrentSection();
    return;
  }

  if (displayMode === DISPLAY_MODES.CONTINUOUS) {
    // Modo continuo: hacer scroll en displayContent
    displayContent.scrollBy({ top: currentScrollAmount, behavior: 'smooth' });
    return;
  }

  if (currentSectionIndex < currentSections.length - 1) {
    currentSectionIndex++;
    showCurrentSection();
    return;
  }

  goToNextSong();
}

function pedalBack() {
  if (isPickerOpen()) {
    if (pickerIndex <= 0) {
      closePicker();
      return;
    }
    pickerNavigate(-1);
    return;
  }

  if (!screens.display.classList.contains('active')) return;

  if (showingTitle) {
    openPicker();
    return;
  }

  if (displayMode === DISPLAY_MODES.CONTINUOUS) {
    // Modo continuo: hacer scroll hacia arriba en displayContent
    displayContent.scrollBy({ top: -currentScrollAmount, behavior: 'smooth' });
    return;
  }

  if (currentSectionIndex > 0) {
    currentSectionIndex--;
    showCurrentSection();
    return;
  }

  showingTitle = true;
  showCurrentSection();
}

function goToNextSong() {
  const setlist = getSetlistSongs();
  if (setlist.length <= 1) return;
  const idx = getSetlistIndex(currentDisplayId);
  const nextIdx = idx >= 0 && idx < setlist.length - 1 ? idx + 1 : 0;
  showSong(setlist[nextIdx].id, 0);
}

function keyLabel(key) {
  const labels = {
    PageDown: 'Page Down',
    PageUp: 'Page Up',
    ArrowRight: 'Flecha →',
    ArrowLeft: 'Flecha ←',
    ArrowDown: 'Flecha ↓',
    ArrowUp: 'Flecha ↑',
    ' ': 'Espacio',
    Enter: 'Enter',
  };
  return labels[key] || key;
}

function updatePedalKeyButtons() {
  btnSetNextKey.textContent = keyLabel(pedalKeys.next);
  btnSetBackKey.textContent = keyLabel(pedalKeys.back);
}

function startPedalCapture(which) {
  capturingPedal = which;
  pedalCaptureHint.classList.remove('hidden');
  btnSetNextKey.classList.toggle('listening', which === 'next');
  btnSetBackKey.classList.toggle('listening', which === 'back');
}

function stopPedalCapture() {
  capturingPedal = null;
  pedalCaptureHint.classList.add('hidden');
  btnSetNextKey.classList.remove('listening');
  btnSetBackKey.classList.remove('listening');
}

function isPedalKey(key, action) {
  if (key === pedalKeys[action]) return true;
  if (action === 'next' && (key === 'ArrowRight' || key === 'ArrowDown' || key === 'PageDown')) return true;
  if (action === 'back' && (key === 'ArrowLeft' || key === 'ArrowUp' || key === 'PageUp')) return true;
  return false;
}

function handlePedalKeydown(e) {
  if (capturingPedal) {
    e.preventDefault();
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
    pedalKeys[capturingPedal] = e.key;
    savePedalKeys();
    updatePedalKeyButtons();
    stopPedalCapture();
    return;
  }

  if (screens.edit.classList.contains('active')) return;
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  const now = Date.now();
  if (now - lastPedalTime < 120) return;

  if (isPedalKey(e.key, 'next')) {
    e.preventDefault();
    lastPedalTime = now;
    pedalNext();
    return;
  }

  if (isPedalKey(e.key, 'back')) {
    e.preventDefault();
    lastPedalTime = now;
    pedalBack();
  }
}

// ── Picker ──

function renderPickerHighlight() {
  pickerList.querySelectorAll('.picker-item').forEach((btn, i) => {
    btn.classList.toggle('active', i === pickerIndex);
    if (i === pickerIndex) btn.scrollIntoView({ block: 'nearest' });
  });
}

function openPicker() {
  const setlist = getSetlistSongs();
  if (setlist.length === 0) return;
  pickerIndex = Math.max(0, getSetlistIndex(currentDisplayId));
  pickerList.innerHTML = '';

  setlist.forEach((song, i) => {
    const btn = document.createElement('button');
    btn.className = 'picker-item' + (i === pickerIndex ? ' active' : '');
    btn.innerHTML = `
      <span class="picker-item-num">${i + 1}</span>
      <span class="picker-item-title">${escapeHtml(song.title)}</span>
    `;
    btn.addEventListener('click', () => {
      pickerIndex = i;
      showSong(song.id, 0);
      closePicker();
    });
    pickerList.appendChild(btn);
  });

  pickerOverlay.classList.remove('hidden');
  renderPickerHighlight();
}

function closePicker() {
  pickerOverlay.classList.add('hidden');
}

function pickerNavigate(delta) {
  const setlist = getSetlistSongs();
  if (setlist.length === 0) return;
  pickerIndex = (pickerIndex + delta + setlist.length) % setlist.length;
  renderPickerHighlight();
  showSong(setlist[pickerIndex].id, 0);
}

// ── Event listeners ──

document.getElementById('btn-new-song').addEventListener('click', openNewSong);
document.getElementById('btn-add-to-setlist').addEventListener('click', openAddSetlistOverlay);
document.getElementById('btn-close-add-setlist').addEventListener('click', closeAddSetlistOverlay);
document.getElementById('btn-new-setlist')?.addEventListener('click', () => {
  const name = prompt('Nombre del nuevo setlist:', `Setlist ${setlists.length + 1}`);
  if (!name?.trim()) return;
  createSetlist(name.trim());
});
document.getElementById('btn-rename-setlist')?.addEventListener('click', renameActiveSetlist);
document.getElementById('btn-delete-setlist')?.addEventListener('click', deleteActiveSetlist);
setlistDropdown?.addEventListener('change', e => switchSetlist(e.target.value));
document.getElementById('btn-back').addEventListener('click', () => showScreen('manage'));
document.getElementById('btn-save').addEventListener('click', saveSong);
document.getElementById('btn-delete').addEventListener('click', deleteSong);

document.getElementById('btn-exit-display').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  closePicker();
  showScreen('manage');
});

document.getElementById('btn-font-up').addEventListener('click', e => {
  e.stopPropagation();
  adjustFontSize(FONT_SIZE_STEP);
});
document.getElementById('btn-font-down').addEventListener('click', e => {
  e.stopPropagation();
  adjustFontSize(-FONT_SIZE_STEP);
});
fontControlsPanel?.addEventListener('click', e => {
  e.stopPropagation();
  flashFontControls();
});
fontControlsPanel?.addEventListener('touchstart', e => {
  e.stopPropagation();
  flashFontControls();
}, { passive: true });
document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);
btnToggleMode?.addEventListener('click', e => {
  e.stopPropagation();
  toggleDisplayMode();
});

btnEdit?.addEventListener('click', e => {
  e.stopPropagation();
  toggleEditMenu();
});

btnFontUpMenu?.addEventListener('click', e => {
  e.stopPropagation();
  adjustFontSize(FONT_SIZE_STEP);
});

btnFontDownMenu?.addEventListener('click', e => {
  e.stopPropagation();
  adjustFontSize(-FONT_SIZE_STEP);
});

btnScrollUpMenu?.addEventListener('click', e => {
  e.stopPropagation();
  adjustScrollAmount(SCROLL_AMOUNT_STEP);
});

btnScrollDownMenu?.addEventListener('click', e => {
  e.stopPropagation();
  adjustScrollAmount(-SCROLL_AMOUNT_STEP);
});

editMenu?.addEventListener('click', e => {
  e.stopPropagation();
  editMenu.classList.add('visible');
  clearTimeout(controlsTimer);
  controlsTimer = setTimeout(() => {
    editMenu.classList.remove('visible');
  }, 3000);
});

const displayControls = document.querySelector('.display-controls');
displayControls?.addEventListener('click', e => {
  e.stopPropagation();
  displayControls.classList.add('visible');
  clearTimeout(controlsTimer);
  controlsTimer = setTimeout(() => {
    displayControls.classList.remove('visible');
  }, 3000);
});
document.getElementById('btn-close-picker').addEventListener('click', closePicker);
btnManageFullscreen?.addEventListener('click', toggleFullscreen);
document.getElementById('btn-export')?.addEventListener('click', exportLibrary);
document.getElementById('btn-import')?.addEventListener('click', () => importFileInput?.click());
importFileInput?.addEventListener('change', async e => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;

  try {
    const raw = JSON.parse(await file.text());
    const data = validateImportData(raw);
    const msg = `¿Importar ${data.songs.length} canción${data.songs.length === 1 ? '' : 'es'}? Se fusionarán con la biblioteca actual y se añadirán al setlist las que falten.`;
    if (!confirm(msg)) return;
    importLibrary(data);
  } catch (err) {
    alert(err.message || 'No se pudo importar el archivo.');
  }
});

document.addEventListener('fullscreenchange', updateFullscreenButtons);

btnSetNextKey.addEventListener('click', () => startPedalCapture('next'));
btnSetBackKey.addEventListener('click', () => startPedalCapture('back'));

pickerOverlay.addEventListener('click', e => {
  if (e.target === pickerOverlay) closePicker();
});

addSetlistOverlay.addEventListener('click', e => {
  if (e.target === addSetlistOverlay) closeAddSetlistOverlay();
});

// ── Reordenar setlist ──

let dragSongId = null;
const pointerDrag = { id: null, active: false };

function clearDragState() {
  dragSongId = null;
  pointerDrag.id = null;
  pointerDrag.active = false;
  setlistList.querySelectorAll('.song-item').forEach(el => {
    el.classList.remove('dragging', 'drag-over');
  });
}

function setDragOverItem(item) {
  setlistList.querySelectorAll('.song-item').forEach(el => {
    el.classList.toggle('drag-over', item && el === item);
  });
}

setlistList.addEventListener('dragstart', e => {
  const handle = e.target.closest('.drag-handle');
  if (!handle) {
    e.preventDefault();
    return;
  }
  dragSongId = handle.dataset.id;
  handle.closest('.song-item')?.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragSongId);
});

setlistList.addEventListener('dragend', clearDragState);

setlistList.addEventListener('dragover', e => {
  e.preventDefault();
  const item = e.target.closest('.song-item');
  if (!item || item.dataset.id === dragSongId) return;
  setDragOverItem(item);
});

setlistList.addEventListener('drop', e => {
  e.preventDefault();
  const item = e.target.closest('.song-item');
  if (!item || !dragSongId) return;
  moveSetlistItem(getSetlistIndex(dragSongId), getSetlistIndex(item.dataset.id));
  clearDragState();
});

setlistList.addEventListener('pointerdown', e => {
  const handle = e.target.closest('.drag-handle');
  if (!handle || e.pointerType === 'mouse') return;
  pointerDrag.id = handle.dataset.id;
  pointerDrag.active = true;
  handle.setPointerCapture(e.pointerId);
  handle.closest('.song-item')?.classList.add('dragging');
});

setlistList.addEventListener('pointermove', e => {
  if (!pointerDrag.active) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const item = el?.closest('.song-item');
  setDragOverItem(item && item.dataset.id !== pointerDrag.id ? item : null);
});

setlistList.addEventListener('pointerup', e => {
  if (!pointerDrag.active) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const item = el?.closest('.song-item');
  if (item && item.dataset.id !== pointerDrag.id) {
    moveSetlistItem(getSetlistIndex(pointerDrag.id), getSetlistIndex(item.dataset.id));
  }
  clearDragState();
});

setlistList.addEventListener('pointercancel', clearDragState);

setlistList.addEventListener('click', e => {
  if (e.target.closest('.drag-handle') || e.target.closest('.song-reorder')) return;

  const btn = e.target.closest('[data-action]');
  if (!btn) {
    const item = e.target.closest('.song-item');
    if (item) {
      const showBtn = item.querySelector('[data-action="show"]');
      if (showBtn) showSong(showBtn.dataset.id);
    }
    return;
  }
  const { action, id } = btn.dataset;
  if (action === 'show') showSong(id);
  if (action === 'remove') removeFromSetlist(id);
  if (action === 'up') moveSetlistById(id, -1);
  if (action === 'down') moveSetlistById(id, 1);
});

libraryList.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === 'edit') openEditSong(id);
  if (action === 'add-setlist') addToSetlist(id);
});

displayContent.addEventListener('click', () => {
  if (swipeHandled) {
    swipeHandled = false;
    return;
  }
  if (getSetlistSongs().length > 1) openPicker();
});

// ── Deslizar para cambiar estrofa ──

const SWIPE_MIN_DISTANCE = 50;

screens.display.addEventListener('touchstart', e => {
  if (isPickerOpen() || e.touches.length !== 1) return;
  const touch = e.touches[0];
  swipeState.startX = touch.clientX;
  swipeState.startY = touch.clientY;
  swipeState.tracking = true;
}, { passive: true });

screens.display.addEventListener('touchend', e => {
  if (!swipeState.tracking || isPickerOpen()) return;
  swipeState.tracking = false;

  const touch = e.changedTouches[0];
  const dx = touch.clientX - swipeState.startX;
  const dy = touch.clientY - swipeState.startY;

  if (Math.abs(dx) < SWIPE_MIN_DISTANCE || Math.abs(dx) < Math.abs(dy)) return;

  swipeHandled = true;
  if (dx < 0) pedalNext();
  else pedalBack();
}, { passive: true });

screens.display.addEventListener('touchcancel', () => {
  swipeState.tracking = false;
}, { passive: true });

let controlsTimer;
let fontControlsTimer;

function flashControls() {
  const controls = document.querySelector('.display-controls');
  controls.classList.add('visible');
  
  if (displayMode === DISPLAY_MODES.CONTINUOUS && !showingTitle) {
    scrollControlsPanel.classList.add('visible');
  }
  
  clearTimeout(controlsTimer);
  controlsTimer = setTimeout(() => {
    controls.classList.remove('visible');
    scrollControlsPanel.classList.remove('visible');
    if (!showingTitle && currentSections.length > 1) {
      sectionIndicator.classList.add('visible');
    } else {
      sectionIndicator.classList.remove('visible');
    }
  }, 3000);

  if (showingTitle) {
    sectionIndicator.classList.remove('visible');
    return;
  }
  if (currentSections.length > 1) sectionIndicator.classList.add('visible');
}

function flashFontControls() {
  if (!fontControlsPanel) return;
  fontControlsPanel.classList.add('visible');
  clearTimeout(fontControlsTimer);
  fontControlsTimer = setTimeout(() => {
    fontControlsPanel.classList.remove('visible');
  }, 3000);
}

screens.display.addEventListener('click', e => {
  if (e.target.closest('.font-controls-panel')) return;
  flashControls();
});
screens.display.addEventListener('touchstart', e => {
  if (e.target.closest('.font-controls-panel')) return;
  flashControls();
}, { passive: true });

document.addEventListener('keydown', e => {
  handlePedalKeydown(e);

  if (!screens.display.classList.contains('active')) return;
  if (isPickerOpen()) return;

  if (e.key === 'Escape') {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else {
      closePicker();
      showScreen('manage');
    }
  }
  if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  if (e.key === '+' || e.key === '=') adjustFontSize(FONT_SIZE_STEP);
  if (e.key === '-') adjustFontSize(-FONT_SIZE_STEP);
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && screens.display.classList.contains('active')) {
    requestWakeLock();
  }
});

// ── Service Worker Registration ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((registration) => {
        console.log('Service Worker registrado con éxito:', registration.scope);
      })
      .catch((error) => {
        console.log('Error al registrar el Service Worker:', error);
      });
  });
}

// ── Init ──
loadSongs();
loadSetlists();
loadSectionFonts();
loadScrollAmounts();
renderSetlistSelector();
renderAll();
updatePedalKeyButtons();
updateModeButton();
updateFullscreenButtons();
