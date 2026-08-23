const STORAGE_KEY = 'quatroletras-songs';
const SETLISTS_KEY = 'quatroletras-setlists';
const ACTIVE_SETLIST_KEY = 'quatroletras-active-setlist';
const LEGACY_SETLIST_KEY = 'quatroletras-setlist';
const SECTION_FONTS_KEY = 'quatroletras-section-fonts';
const FONT_SIZE_KEY = 'quatroletras-font-size';
const PEDAL_KEYS_KEY = 'quatroletras-pedal-keys';
const DISPLAY_MODE_KEY = 'quatroletras-display-mode';
const SCROLL_AMOUNTS_KEY = 'quatroletras-scroll-amounts';
const SIMPLE_MODE_KEY = 'quatroletras-simple-mode';

let isSimpleMode = localStorage.getItem(SIMPLE_MODE_KEY) === 'true';

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
const songArtist = document.getElementById('song-artist');
const songDurationMin = document.getElementById('song-duration-min');
const songDurationSec = document.getElementById('song-duration-sec');
const energySelector = document.getElementById('energy-selector');
const energyLevelDisplay = document.getElementById('energy-level-display');
const setlistTotalDuration = document.getElementById('setlist-total-duration');
const songLyrics = document.getElementById('song-lyrics');
const btnFormatBold = document.getElementById('btn-format-bold');
const btnFormatItalic = document.getElementById('btn-format-italic');
const btnFormatUnderline = document.getElementById('btn-format-underline');
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
const audioWarningOverlay = document.getElementById('audio-warning-overlay');
const btnWarningBack = document.getElementById('btn-warning-back');
const btnWarningContinue = document.getElementById('btn-warning-continue');
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

// DOM refs para Filtros (Biblioteca y Añadir al setlist)
const librarySearchInput = document.getElementById('library-search-input');
const libraryFilterArtist = document.getElementById('library-filter-artist');
const libraryFilterEnergy = document.getElementById('library-filter-energy');
const librarySort = document.getElementById('library-sort');

const addSetlistSearchInput = document.getElementById('add-setlist-search-input');
const addSetlistFilterArtist = document.getElementById('add-setlist-filter-artist');
const addSetlistFilterEnergy = document.getElementById('add-setlist-filter-energy');
const addSetlistSort = document.getElementById('add-setlist-sort');

// DOM refs para Audio y Presentación
const songAudioInput = document.getElementById('song-audio-input');
const audioUploadLabel = document.getElementById('audio-upload-label');
const audioUploadText = document.getElementById('audio-upload-text');
const audioFileInfo = document.getElementById('audio-file-info');
const audioFileName = document.getElementById('audio-file-name');
const editAudioPreview = document.getElementById('edit-audio-preview');
const btnRemoveAudio = document.getElementById('btn-remove-audio');

const displayTopBar = document.getElementById('display-top-bar');
const displayAudioControls = document.getElementById('display-audio-controls');
const btnAudioPlay = document.getElementById('btn-audio-play');
const audioProgressBar = document.getElementById('audio-progress-bar');
const audioTimeDisplay = document.getElementById('audio-time-display');

// ── Audio Storage (IndexedDB) ──
const DB_NAME = 'quatroletras-audio-db';
const DB_VERSION = 1;
const AUDIO_STORE = 'audio-files';

function openAudioDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE, { keyPath: 'songId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveSongAudio(songId, blobOrFile, fileName) {
  try {
    const db = await openAudioDB();
    const tx = db.transaction(AUDIO_STORE, 'readwrite');
    const store = tx.objectStore(AUDIO_STORE);
    store.put({
      songId,
      blob: blobOrFile,
      fileName: fileName || blobOrFile.name || 'audio.mp3',
      type: blobOrFile.type || 'audio/mpeg',
      updatedAt: Date.now()
    });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Error al guardar audio en IndexedDB:', err);
  }
}

async function getSongAudio(songId) {
  try {
    const db = await openAudioDB();
    const tx = db.transaction(AUDIO_STORE, 'readonly');
    const store = tx.objectStore(AUDIO_STORE);
    const req = store.get(songId);
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.error('Error al obtener audio de IndexedDB:', err);
    return null;
  }
}

async function deleteSongAudio(songId) {
  try {
    const db = await openAudioDB();
    const tx = db.transaction(AUDIO_STORE, 'readwrite');
    const store = tx.objectStore(AUDIO_STORE);
    store.delete(songId);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.error('Error al eliminar audio de IndexedDB:', err);
  }
}

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

// ── Setlist Helpers & Item Operations ──

function ensureSetlistItems(sl) {
  if (!sl) return;
  if (!Array.isArray(sl.items) || sl.items.length === 0) {
    const items = [{ type: 'tanda', id: crypto.randomUUID(), name: 'Tanda 1' }];
    const songIds = Array.isArray(sl.songIds) ? sl.songIds : [];
    songIds.forEach(songId => {
      items.push({ type: 'song', id: crypto.randomUUID(), songId });
    });
    sl.items = items;
  }
  sl.songIds = sl.items.filter(i => i.type === 'song').map(i => i.songId);
}

function loadSetlists() {
  setlists = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(SETLISTS_KEY));
    if (Array.isArray(parsed) && parsed.length > 0) {
      setlists = parsed;
    }
  } catch { /* fallback */ }

  activeSetlistId = localStorage.getItem(ACTIVE_SETLIST_KEY);

  // Migración desde setlist único antiguo
  if (setlists.length === 0) {
    let legacyIds = [];
    try {
      legacyIds = JSON.parse(localStorage.getItem(LEGACY_SETLIST_KEY)) || [];
    } catch { /* ignore */ }

    const id = crypto.randomUUID();
    const items = [{ type: 'tanda', id: crypto.randomUUID(), name: 'Tanda 1' }];
    legacyIds.forEach(songId => items.push({ type: 'song', id: crypto.randomUUID(), songId }));
    setlists = [{ id, name: 'Setlist 1', songIds: legacyIds, items }];
    activeSetlistId = id;
    saveSetlists();
    localStorage.removeItem(LEGACY_SETLIST_KEY);
  }

  setlists.forEach(sl => ensureSetlistItems(sl));

  if (!setlists.some(s => s.id === activeSetlistId)) {
    activeSetlistId = setlists[0]?.id ?? null;
  }

  // Migración: setlist activo vacío con canciones en biblioteca
  const active = getActiveSetlist();
  if (active && active.items.filter(i => i.type === 'song').length === 0 && songs.length > 0 && setlists.length === 1) {
    songs.forEach(s => active.items.push({ type: 'song', id: crypto.randomUUID(), songId: s.id }));
    ensureSetlistItems(active);
    saveSetlists();
  }

  syncSetlistIdsFromActive();
  pruneSetlist();
}

function saveSetlists() {
  setlists.forEach(sl => ensureSetlistItems(sl));
  localStorage.setItem(SETLISTS_KEY, JSON.stringify(setlists));
  if (activeSetlistId) {
    localStorage.setItem(ACTIVE_SETLIST_KEY, activeSetlistId);
  }
}

function syncSetlistIdsFromActive() {
  const active = getActiveSetlist();
  if (active) {
    ensureSetlistItems(active);
    setlistIds = [...active.songIds];
  } else {
    setlistIds = [];
  }
}

function persistSetlistIds() {
  const active = getActiveSetlist();
  if (active) {
    ensureSetlistItems(active);
    active.songIds = active.items.filter(i => i.type === 'song').map(i => i.songId);
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
  const items = [{ type: 'tanda', id: crypto.randomUUID(), name: 'Tanda 1' }];
  setlists.push({ id, name, songIds: [], items });
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
  const active = getActiveSetlist();
  if (!active) return;
  ensureSetlistItems(active);
  const valid = new Set(songs.map(s => s.id));
  active.items = active.items.filter(i => {
    if (i.type === 'song') return valid.has(i.songId);
    return true;
  });
  persistSetlistIds();
}

function getSetlistSongs() {
  const active = getActiveSetlist();
  if (!active) return [];
  ensureSetlistItems(active);
  const map = new Map(songs.map(s => [s.id, s]));
  return active.items
    .filter(i => i.type === 'song')
    .map(i => map.get(i.songId))
    .filter(Boolean);
}

function getSetlistPlayableItems() {
  const active = getActiveSetlist();
  if (!active || !Array.isArray(active.items)) return [];
  const map = new Map(songs.map(s => [s.id, s]));
  return active.items.filter(i => {
    if (i.type === 'song') return map.has(i.songId);
    if (i.type === 'speech') return true;
    return false;
  });
}

function isInSetlist(songId) {
  const active = getActiveSetlist();
  if (!active || !Array.isArray(active.items)) return false;
  return active.items.some(i => i.type === 'song' && i.songId === songId);
}

function getItemIndexInSetlist(itemId) {
  const active = getActiveSetlist();
  if (!active || !Array.isArray(active.items)) return -1;
  return active.items.findIndex(i => i.id === itemId || i.songId === itemId);
}

function getSongNumber(songId) {
  const songsInSetlist = getSetlistSongs();
  const idx = songsInSetlist.findIndex(s => s.id === songId);
  return idx >= 0 ? idx + 1 : 0;
}

function addToSetlist(songId) {
  const active = getActiveSetlist();
  if (!active) return;
  ensureSetlistItems(active);
  if (!songs.some(s => s.id === songId) || isInSetlist(songId)) return;
  active.items.push({ type: 'song', id: crypto.randomUUID(), songId });
  persistSetlistIds();
  renderAll();
}

function removeFromSetlist(itemId) {
  const active = getActiveSetlist();
  if (!active) return;
  active.items = active.items.filter(i => i.id !== itemId && i.songId !== itemId);
  persistSetlistIds();
  renderAll();
}

function moveSetlistItem(fromIndex, toIndex) {
  const active = getActiveSetlist();
  if (!active || !Array.isArray(active.items)) return;
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= active.items.length || toIndex >= active.items.length) return;
  if (fromIndex === toIndex) return;
  const [moved] = active.items.splice(fromIndex, 1);
  active.items.splice(toIndex, 0, moved);
  persistSetlistIds();
  renderSetlist();
}

function addTanda() {
  const active = getActiveSetlist();
  if (!active) return;
  ensureSetlistItems(active);
  const count = active.items.filter(i => i.type === 'tanda').length;
  active.items.push({
    type: 'tanda',
    id: crypto.randomUUID(),
    name: `Tanda ${count + 1}`
  });
  persistSetlistIds();
  renderSetlist();
}

function renameTanda(tandaId) {
  const active = getActiveSetlist();
  if (!active) return;
  const item = active.items.find(i => i.type === 'tanda' && i.id === tandaId);
  if (!item) return;
  const name = prompt('Nombre de la tanda:', item.name);
  if (!name?.trim()) return;
  item.name = name.trim();
  persistSetlistIds();
  renderSetlist();
}

function deleteTanda(tandaId) {
  const active = getActiveSetlist();
  if (!active) return;
  active.items = active.items.filter(i => i.id !== tandaId);
  persistSetlistIds();
  renderSetlist();
}

// ── Manejo de Speech ──
let currentEditingSpeechId = null;

function openSpeechModal(speechId = null) {
  currentEditingSpeechId = speechId;
  const speechTitleInput = document.getElementById('speech-title-input');
  const speechDurationMin = document.getElementById('speech-duration-min');
  const speechDurationSec = document.getElementById('speech-duration-sec');
  const speechPlacementSelect = document.getElementById('speech-placement-select');
  const speechTextInput = document.getElementById('speech-text-input');
  const speechModalTitle = document.getElementById('speech-modal-title');

  if (speechId) {
    const active = getActiveSetlist();
    const item = active?.items.find(i => i.type === 'speech' && i.id === speechId);
    if (item) {
      if (speechModalTitle) speechModalTitle.textContent = '✏️ Editar Speech / Discurso';
      if (speechTitleInput) speechTitleInput.value = item.title || '';
      if (speechDurationMin) speechDurationMin.value = item.durationMin ?? '';
      if (speechDurationSec) speechDurationSec.value = item.durationSec ?? '';
      if (speechPlacementSelect) speechPlacementSelect.value = item.placement || (item.standalone ? 'standalone' : 'in-tanda');
      if (speechTextInput) speechTextInput.value = item.text || '';
    }
  } else {
    if (speechModalTitle) speechModalTitle.textContent = '🎙️ Nuevo Speech / Discurso';
    if (speechTitleInput) speechTitleInput.value = '';
    if (speechDurationMin) speechDurationMin.value = '';
    if (speechDurationSec) speechDurationSec.value = '';
    if (speechPlacementSelect) speechPlacementSelect.value = 'in-tanda';
    if (speechTextInput) speechTextInput.value = '';
  }

  document.getElementById('edit-speech-overlay')?.classList.remove('hidden');
  speechTitleInput?.focus();
}

function closeSpeechModal() {
  document.getElementById('edit-speech-overlay')?.classList.add('hidden');
  currentEditingSpeechId = null;
}

function saveSpeechForm(e) {
  e?.preventDefault();
  const active = getActiveSetlist();
  if (!active) return;

  const titleInput = document.getElementById('speech-title-input');
  const durationMinInput = document.getElementById('speech-duration-min');
  const durationSecInput = document.getElementById('speech-duration-sec');
  const placementSelect = document.getElementById('speech-placement-select');
  const textInput = document.getElementById('speech-text-input');

  const title = titleInput?.value.trim() || 'Speech sin título';
  const durationMin = durationMinInput && durationMinInput.value !== '' ? Math.max(0, parseInt(durationMinInput.value, 10) || 0) : '';
  const durationSec = durationSecInput && durationSecInput.value !== '' ? Math.min(59, Math.max(0, parseInt(durationSecInput.value, 10) || 0)) : '';
  const placement = placementSelect?.value || 'in-tanda';
  const text = textInput?.value || '';

  if (currentEditingSpeechId) {
    const item = active.items.find(i => i.type === 'speech' && i.id === currentEditingSpeechId);
    if (item) {
      item.title = title;
      item.durationMin = durationMin;
      item.durationSec = durationSec;
      item.placement = placement;
      item.standalone = placement === 'standalone';
      item.text = text;
    }
  } else {
    active.items.push({
      type: 'speech',
      id: crypto.randomUUID(),
      title,
      durationMin,
      durationSec,
      placement,
      standalone: placement === 'standalone',
      text
    });
  }

  persistSetlistIds();
  renderSetlist();
  closeSpeechModal();
}

function toggleSpeechPlacement(speechId) {
  const active = getActiveSetlist();
  if (!active || !Array.isArray(active.items)) return;
  const item = active.items.find(i => i.type === 'speech' && i.id === speechId);
  if (!item) return;
  const isCurrentlyStandalone = item.placement === 'standalone' || Boolean(item.standalone);
  item.placement = isCurrentlyStandalone ? 'in-tanda' : 'standalone';
  item.standalone = !isCurrentlyStandalone;
  persistSetlistIds();
  renderSetlist();
}

function deleteSpeech(speechId) {
  const active = getActiveSetlist();
  if (!active || !Array.isArray(active.items)) return;
  active.items = active.items.filter(i => i.id !== speechId);
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
    stopAudioPlayer();
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
  populateArtistSelects();
  renderSetlist();
  renderLibrary();
}

// ── Setlist UI ──

function formatSongDuration(min, sec) {
  const m = parseInt(min, 10) || 0;
  const s = parseInt(sec, 10) || 0;
  const total = m * 60 + s;
  if (total <= 0) return '';
  const displayMin = Math.floor(total / 60);
  const displaySec = total % 60;
  return `${displayMin}:${String(displaySec).padStart(2, '0')}`;
}

function getSongTotalSeconds(song) {
  const m = parseInt(song.durationMin, 10) || 0;
  const s = parseInt(song.durationSec, 10) || 0;
  return m * 60 + s;
}

function formatTotalSetlistTime(totalSec) {
  if (totalSec <= 0) return '⏱ 0 min';
  const hours = Math.floor(totalSec / 3600);
  const remSec = totalSec % 3600;
  const mins = Math.floor(remSec / 60);
  const secs = remSec % 60;

  if (hours > 0) {
    return `⏱ ${hours} h ${mins} min`;
  }
  if (secs > 0) {
    return `⏱ ${mins} min ${secs} s`;
  }
  return `⏱ ${mins} min`;
}

function getSetlistTotalSeconds(sl) {
  if (!sl || !Array.isArray(sl.items)) return 0;
  const songMap = new Map(songs.map(s => [s.id, s]));
  let total = 0;
  sl.items.forEach(item => {
    if (item.type === 'song') {
      const song = songMap.get(item.songId);
      if (song) total += getSongTotalSeconds(song);
    } else if (item.type === 'speech') {
      const m = parseInt(item.durationMin, 10) || 0;
      const s = parseInt(item.durationSec, 10) || 0;
      total += m * 60 + s;
    }
  });
  return total;
}

function updateSetlistTotalDuration() {
  if (!setlistTotalDuration) return;
  const active = getActiveSetlist();
  const totalSec = getSetlistTotalSeconds(active);
  setlistTotalDuration.textContent = formatTotalSetlistTime(totalSec);
}

let currentEditEnergy = 0;

const ENERGY_LABELS = {
  0: 'Sin definir',
  1: 'Grado 1 (Muy baja)',
  2: 'Grado 2 (Baja)',
  3: 'Grado 3 (Baja-Media)',
  4: 'Grado 4 (Media)',
  5: 'Grado 5 (Media-Alta)',
  6: 'Grado 6 (Alta)',
  7: 'Grado 7 (Muy alta)',
};

function setEditEnergy(level) {
  currentEditEnergy = Math.max(0, Math.min(7, parseInt(level, 10) || 0));
  if (energySelector) {
    energySelector.dataset.energy = String(currentEditEnergy);
  }
  if (energyLevelDisplay) {
    energyLevelDisplay.textContent = ENERGY_LABELS[currentEditEnergy] || 'Sin definir';
  }
}

function renderEnergyBadge(energy) {
  const level = parseInt(energy, 10) || 0;
  if (level <= 0) return '';
  return `
    <div class="song-energy-badge" title="Energía: Grado ${level}/7">
      <div class="energy-mini-bars" data-energy="${level}">
        <span class="mini-bar level-1"></span>
        <span class="mini-bar level-2"></span>
        <span class="mini-bar level-3"></span>
        <span class="mini-bar level-4"></span>
        <span class="mini-bar level-5"></span>
        <span class="mini-bar level-6"></span>
        <span class="mini-bar level-7"></span>
      </div>
      <span class="energy-num">${level}/7</span>
    </div>
  `;
}

function updateSimpleModeUI() {
  const btn = document.getElementById('btn-toggle-simple-mode');
  const setlistSection = document.querySelector('.setlist-section');
  if (setlistSection) {
    setlistSection.classList.toggle('setlist-simple-mode', isSimpleMode);
  }
  if (btn) {
    btn.classList.toggle('btn-active-toggle', isSimpleMode);
    btn.innerHTML = isSimpleMode
      ? '👁️ Ver Tandas'
      : '👁️ Ocultar Tandas';
    btn.title = isSimpleMode
      ? 'Mostrar Tandas, Speeches, colores y gráfico'
      : 'Ocultar Tandas, Speeches, colores y gráfico';
  }
}

function toggleSimpleMode() {
  isSimpleMode = !isSimpleMode;
  localStorage.setItem(SIMPLE_MODE_KEY, String(isSimpleMode));
  updateSimpleModeUI();
  renderSetlist();
}

function renderSetlist() {
  updateSimpleModeUI();
  const active = getActiveSetlist();
  if (!active) return;
  ensureSetlistItems(active);

  const items = active.items;
  setlistList.innerHTML = '';
  setlistEmpty.classList.toggle('hidden', items.length > 0);

  const songMap = new Map(songs.map(s => [s.id, s]));
  let songCounter = 0;
  let currentTandaIndex = -1;
  let currentTandaName = '';

  items.forEach((item, index) => {
    if (item.type === 'tanda') {
      currentTandaIndex++;
      currentTandaName = item.name || `Tanda ${currentTandaIndex + 1}`;
      const colorClass = `tanda-color-${(currentTandaIndex % 7) + 1}`;

      let tandaSongCount = 0;
      let tandaTotalSec = 0;
      for (let j = index + 1; j < items.length; j++) {
        const nextItem = items[j];
        if (nextItem.type === 'tanda') break;
        if (nextItem.type === 'song') {
          tandaSongCount++;
          const song = songMap.get(nextItem.songId);
          if (song) tandaTotalSec += getSongTotalSeconds(song);
        } else if (nextItem.type === 'speech') {
          const isStandalone = nextItem.placement === 'standalone' || Boolean(nextItem.standalone);
          if (!isStandalone) {
            const m = parseInt(nextItem.durationMin, 10) || 0;
            const s = parseInt(nextItem.durationSec, 10) || 0;
            tandaTotalSec += m * 60 + s;
          }
        }
      }

      const tandaEl = document.createElement('div');
      tandaEl.className = `tanda-divider ${colorClass}`;
      tandaEl.draggable = true;
      tandaEl.dataset.id = item.id;
      tandaEl.dataset.index = String(index);
      tandaEl.innerHTML = `
        <span class="drag-handle" data-id="${item.id}" aria-label="Arrastrar tanda" title="Arrastrar para mover">⠿</span>
        <div class="tanda-info">
          <span class="tanda-title">🏷️ ${escapeHtml(currentTandaName)}</span>
          <span class="tanda-badge">${tandaSongCount} canción${tandaSongCount === 1 ? '' : 'es'} — ${formatTotalSetlistTime(tandaTotalSec)}</span>
        </div>
        <div class="tanda-actions">
          <button type="button" class="btn btn-ghost btn-icon" data-action="rename-tanda" data-id="${item.id}" aria-label="Renombrar tanda" title="Renombrar tanda">✎</button>
          <button type="button" class="btn btn-ghost btn-icon" data-action="delete-tanda" data-id="${item.id}" aria-label="Eliminar tanda" title="Eliminar tanda">🗑</button>
        </div>
      `;
      setlistList.appendChild(tandaEl);
    } else if (item.type === 'speech') {
      const durText = formatSongDuration(item.durationMin, item.durationSec);
      const isStandalone = item.placement === 'standalone' || Boolean(item.standalone);
      const colorClass = (!isStandalone && currentTandaIndex >= 0) ? `tanda-color-${(currentTandaIndex % 7) + 1}` : '';
      const standaloneClass = isStandalone ? 'speech-standalone' : '';

      const speechEl = document.createElement('div');
      speechEl.className = `speech-item ${colorClass} ${standaloneClass}`.trim();
      speechEl.draggable = true;
      speechEl.dataset.id = item.id;
      speechEl.dataset.index = String(index);

      const placementBadgeHtml = isStandalone
        ? `<span class="speech-placement-badge" data-action="toggle-speech-placement" data-id="${item.id}" title="Haz clic para asignarlo a la Tanda actual">🎙️ Entre Tandas</span>`
        : (currentTandaName
            ? `<span class="tanda-pill-badge" data-action="toggle-speech-placement" data-id="${item.id}" title="Haz clic para cambiarlo a Entre Tandas">🏷️ ${escapeHtml(currentTandaName)}</span>`
            : `<span class="speech-placement-badge" data-action="toggle-speech-placement" data-id="${item.id}" title="Haz clic para asignarlo a la Tanda actual">🎙️ Entre Tandas</span>`);

      speechEl.innerHTML = `
        <span class="drag-handle" data-id="${item.id}" aria-label="Arrastrar speech" title="Arrastrar para mover">⠿</span>
        <div class="speech-icon-badge">🎙️</div>
        <div class="speech-info">
          <div class="speech-title">
            ${escapeHtml(item.title || 'Speech')}
            ${placementBadgeHtml}
          </div>
          <div class="speech-preview">${escapeHtml(item.text?.trim() || 'Sin notas escritas')}</div>
        </div>
        ${durText ? `<span class="speech-duration-badge">⏱ ${durText}</span>` : ''}
        <div class="song-item-actions">
          <button type="button" class="btn btn-ghost btn-icon" data-action="edit-speech" data-id="${item.id}" aria-label="Editar Speech" title="Editar Speech">✎</button>
          <button type="button" class="btn btn-ghost btn-icon" data-action="remove-speech" data-id="${item.id}" aria-label="Quitar Speech" title="Quitar Speech">−</button>
          <button type="button" class="btn btn-primary btn-icon" data-action="show-speech" data-id="${item.id}" aria-label="Mostrar Speech" title="Mostrar Speech">▶</button>
        </div>
      `;
      setlistList.appendChild(speechEl);
    } else if (item.type === 'song') {
      const song = songMap.get(item.songId);
      if (!song) return;
      songCounter++;
      const durationText = formatSongDuration(song.durationMin, song.durationSec);
      const artistText = song.artist?.trim() || 'Artista no especificado';
      const colorClass = currentTandaIndex >= 0 ? `tanda-color-${(currentTandaIndex % 7) + 1}` : '';

      const songEl = document.createElement('div');
      songEl.className = `song-item ${colorClass}`.trim();
      songEl.draggable = true;
      songEl.dataset.id = item.id;
      songEl.dataset.songId = song.id;
      songEl.dataset.index = String(index);
      songEl.innerHTML = `
        <span class="drag-handle" data-id="${item.id}" aria-label="Arrastrar para reordenar" title="Arrastrar para mover">⠿</span>
        <span class="song-number">${songCounter}</span>
        <div class="song-item-info">
          <div class="song-item-title">
            ${escapeHtml(song.title)}
            ${currentTandaName ? `<span class="tanda-pill-badge">🏷️ ${escapeHtml(currentTandaName)}</span>` : ''}
            ${song.hasAudio ? '<span class="in-setlist-badge" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa;">🎵 Audio</span>' : ''}
          </div>
          <div class="song-item-artist">${escapeHtml(artistText)}</div>
        </div>
        ${durationText ? `<span class="song-duration-badge">⏱ ${durationText}</span>` : ''}
        ${renderEnergyBadge(song.energy)}
        <div class="song-item-actions">
          <button type="button" class="btn btn-ghost btn-icon" data-action="remove" data-id="${item.id}" aria-label="Quitar del setlist" title="Quitar del setlist">−</button>
          <button type="button" class="btn btn-primary btn-icon" data-action="show" data-id="${song.id}" aria-label="Mostrar">▶</button>
        </div>
      `;
      setlistList.appendChild(songEl);
    }
  });

  updateSetlistTotalDuration();
  renderSetlistChart();
}

function getEnergyColorHex(level) {
  const colors = {
    1: '#38bdf8',
    2: '#34d399',
    3: '#4ade80',
    4: '#facc15',
    5: '#fb923c',
    6: '#f87171',
    7: '#ef4444'
  };
  return colors[level] || '#9ca3af';
}

function renderSetlistChart() {
  const chartCard = document.getElementById('setlist-chart-card');
  const svg = document.getElementById('setlist-energy-svg');
  const structureBar = document.getElementById('setlist-structure-bar');
  if (!chartCard || !svg || !structureBar) return;

  const active = getActiveSetlist();
  if (!active || !Array.isArray(active.items) || active.items.length === 0) {
    chartCard.classList.add('hidden');
    return;
  }

  chartCard.classList.remove('hidden');

  const songMap = new Map(songs.map(s => [s.id, s]));
  const items = active.items;

  // 1. Elementos reproducibles y cálculo de tiempo acumulado
  const playableItems = [];
  let currentTandaIndex = -1;
  let currentTandaName = 'Setlist';
  let totalTimeSec = 0;

  items.forEach(item => {
    if (item.type === 'tanda') {
      currentTandaIndex++;
      currentTandaName = item.name || `Tanda ${currentTandaIndex + 1}`;
    } else if (item.type === 'song') {
      const song = songMap.get(item.songId);
      const sec = song ? (getSongTotalSeconds(song) || 180) : 180;
      totalTimeSec += sec;
      playableItems.push({
        type: 'song',
        item,
        song,
        durationSec: sec,
        energy: song ? (parseInt(song.energy, 10) || 0) : 0,
        tandaIndex: currentTandaIndex,
        tandaName: currentTandaName
      });
    } else if (item.type === 'speech') {
      const m = parseInt(item.durationMin, 10) || 0;
      const s = parseInt(item.durationSec, 10) || 0;
      const sec = (m * 60 + s) || 120;
      totalTimeSec += sec;
      const isStandalone = item.placement === 'standalone' || Boolean(item.standalone);
      playableItems.push({
        type: 'speech',
        item,
        durationSec: sec,
        energy: 0,
        isStandalone,
        tandaIndex: isStandalone ? -1 : currentTandaIndex,
        tandaName: isStandalone ? 'Entre Tandas' : currentTandaName
      });
    }
  });

  if (playableItems.length === 0) {
    chartCard.classList.add('hidden');
    return;
  }

  // 2. Renderizar Barra de Estructura (Tandas y Speeches)
  structureBar.innerHTML = '';
  const structureBlocks = [];
  let currentBlock = null;

  items.forEach(item => {
    if (item.type === 'tanda') {
      const tandaIdx = structureBlocks.filter(b => b.type === 'tanda').length;
      currentBlock = {
        type: 'tanda',
        id: item.id,
        name: item.name || `Tanda ${tandaIdx + 1}`,
        tandaIndex: tandaIdx,
        durationSec: 0,
        count: 0
      };
      structureBlocks.push(currentBlock);
    } else if (item.type === 'speech') {
      const isStandalone = item.placement === 'standalone' || Boolean(item.standalone);
      const m = parseInt(item.durationMin, 10) || 0;
      const s = parseInt(item.durationSec, 10) || 0;
      const sec = (m * 60 + s) || 120;

      if (isStandalone || !currentBlock) {
        structureBlocks.push({
          type: 'speech',
          id: item.id,
          name: item.title || 'Speech',
          tandaIndex: -1,
          durationSec: sec,
          count: 1
        });
      } else {
        currentBlock.durationSec += sec;
        currentBlock.count++;
      }
    } else if (item.type === 'song') {
      const song = songMap.get(item.songId);
      const sec = song ? (getSongTotalSeconds(song) || 180) : 180;
      if (!currentBlock) {
        currentBlock = {
          type: 'tanda',
          id: 'tanda-auto',
          name: 'Tanda 1',
          tandaIndex: 0,
          durationSec: 0,
          count: 0
        };
        structureBlocks.push(currentBlock);
      }
      currentBlock.durationSec += sec;
      currentBlock.count++;
    }
  });

  const totalStructureSec = structureBlocks.reduce((sum, b) => sum + b.durationSec, 0) || 1;

  structureBlocks.forEach(block => {
    const pct = Math.max(6, (block.durationSec / totalStructureSec) * 100);
    const div = document.createElement('div');
    div.className = 'structure-block';
    div.style.width = `${pct}%`;

    if (block.type === 'tanda') {
      const colorClass = `tanda-color-${(block.tandaIndex % 7) + 1}`;
      div.classList.add(colorClass);
      div.innerHTML = `🏷️ ${escapeHtml(block.name)} (${formatTotalSetlistTime(block.durationSec).replace('⏱ ', '')})`;
      div.title = `${block.name}: ${block.count} canciones — ${formatTotalSetlistTime(block.durationSec)}`;
    } else {
      div.classList.add('speech-standalone');
      div.innerHTML = `🎙️ ${escapeHtml(block.name)}`;
      div.title = `Speech: ${block.name} (${formatSongDuration(Math.floor(block.durationSec / 60), block.durationSec % 60)})`;
    }

    div.addEventListener('click', () => {
      const targetEl = document.querySelector(`[data-id="${block.id}"]`);
      targetEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    structureBar.appendChild(div);
  });

  // 3. Renderizar Gráfico SVG de Evolución de Energía
  const svgWidth = 800;
  const svgHeight = 180;
  const paddingL = 45;
  const paddingR = 25;
  const paddingTop = 25;
  const paddingB = 30;

  const drawW = svgWidth - paddingL - paddingR;
  const drawH = svgHeight - paddingTop - paddingB;

  let svgHtml = `
    <defs>
      <linearGradient id="energy-gradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ef4444" stop-opacity="0.6"/>
        <stop offset="50%" stop-color="#3b82f6" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#10b981" stop-opacity="0.05"/>
      </linearGradient>
      <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#38bdf8"/>
        <stop offset="50%" stop-color="#a855f7"/>
        <stop offset="100%" stop-color="#ef4444"/>
      </linearGradient>
    </defs>
  `;

  // Grid líneas Y (Grados 1, 3, 5, 7)
  const gridLevels = [1, 3, 5, 7];
  gridLevels.forEach(lvl => {
    const y = paddingTop + drawH - ((lvl / 7) * drawH);
    svgHtml += `
      <line x1="${paddingL}" y1="${y}" x2="${svgWidth - paddingR}" y2="${y}" class="chart-grid-line"/>
      <text x="${paddingL - 8}" y="${y + 4}" text-anchor="end" class="chart-grid-label">G${lvl}</text>
    `;
  });

  // Calcular puntos X, Y
  let currentAccumSec = 0;
  const points = [];

  playableItems.forEach((pi, idx) => {
    const midSec = currentAccumSec + (pi.durationSec / 2);
    currentAccumSec += pi.durationSec;
    const pct = totalTimeSec > 0 ? (midSec / totalTimeSec) : (idx / playableItems.length);
    const x = paddingL + (pct * drawW);

    const energyVal = pi.type === 'song' ? Math.max(1, pi.energy || 1) : 1;
    const y = paddingTop + drawH - ((energyVal / 7) * drawH);

    points.push({ x, y, pi, energyVal });
  });

  // Trazo y Área de degradado
  if (points.length > 0) {
    let pathD = `M ${points[0].x} ${points[0].y}`;
    let areaD = `M ${points[0].x} ${paddingTop + drawH} L ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const pPrev = points[i - 1];
      const pCur = points[i];
      const cpX1 = pPrev.x + (pCur.x - pPrev.x) / 2;
      const cpX2 = cpX1;
      pathD += ` C ${cpX1} ${pPrev.y}, ${cpX2} ${pCur.y}, ${pCur.x} ${pCur.y}`;
      areaD += ` C ${cpX1} ${pPrev.y}, ${cpX2} ${pCur.y}, ${pCur.x} ${pCur.y}`;
    }

    const lastP = points[points.length - 1];
    areaD += ` L ${lastP.x} ${paddingTop + drawH} Z`;

    svgHtml += `<path d="${areaD}" class="chart-area-fill"/>`;
    svgHtml += `<path d="${pathD}" class="chart-energy-line"/>`;
  }

  // Dibujar Nodos Puntos
  points.forEach((pt, i) => {
    const isSong = pt.pi.type === 'song';
    const color = isSong ? getEnergyColorHex(pt.energyVal) : '#c084fc';
    const radius = isSong ? 6 : 7;
    const stroke = isSong ? '#ffffff' : '#e9d5ff';

    svgHtml += `
      <circle cx="${pt.x}" cy="${pt.y}" r="${radius}" fill="${color}" stroke="${stroke}" stroke-width="2" class="chart-point" data-point-index="${i}"/>
    `;
  });

  svg.innerHTML = svgHtml;

  // Tooltip y Scroll interactivo
  const tooltip = document.getElementById('chart-tooltip');
  svg.querySelectorAll('.chart-point').forEach(circle => {
    const idx = parseInt(circle.dataset.pointIndex, 10);
    const pt = points[idx];
    if (!pt) return;

    circle.addEventListener('mouseenter', () => {
      if (!tooltip) return;
      const pi = pt.pi;
      if (pi.type === 'song') {
        const title = pi.song?.title || 'Canción';
        const artist = pi.song?.artist || '';
        const dur = formatSongDuration(pi.song?.durationMin, pi.song?.durationSec);
        tooltip.innerHTML = `
          <strong>🎵 ${escapeHtml(title)}</strong><br>
          <span style="color: #aaa;">${escapeHtml(artist)}</span><br>
          <span style="color: ${getEnergyColorHex(pt.energyVal)};">⚡ Energía: Grado ${pt.energyVal}/7</span><br>
          <span style="color: #888;">⏱ ${dur || 'Sin tiempo'} — ${escapeHtml(pi.tandaName)}</span>
        `;
      } else {
        const title = pi.item?.title || 'Speech';
        const dur = formatSongDuration(pi.item?.durationMin, pi.item?.durationSec);
        tooltip.innerHTML = `
          <strong>🎙️ ${escapeHtml(title)}</strong><br>
          <span style="color: #c084fc;">🎙️ Speech / Discurso</span><br>
          <span style="color: #888;">⏱ ${dur || 'Sin tiempo'} — ${escapeHtml(pi.tandaName)}</span>
        `;
      }
      tooltip.classList.remove('hidden');
    });

    circle.addEventListener('mouseleave', () => {
      tooltip?.classList.add('hidden');
    });

    circle.addEventListener('click', () => {
      const targetEl = document.querySelector(`[data-id="${pt.pi.item.id}"]`);
      targetEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetEl?.classList.add('drag-over');
      setTimeout(() => targetEl?.classList.remove('drag-over'), 1200);
    });
  });
}

function filterAndSortSongs(songArray, search = '', artist = '', energy = '', sort = 'title-asc') {
  const query = (search || '').toLowerCase().trim();
  
  let result = songArray.filter(song => {
    if (query) {
      const matchTitle = (song.title || '').toLowerCase().includes(query);
      const matchArtist = (song.artist || '').toLowerCase().includes(query);
      if (!matchTitle && !matchArtist) return false;
    }
    
    if (artist !== '') {
      const songArtist = (song.artist || '').trim();
      if (songArtist !== artist) return false;
    }
    
    if (energy !== '') {
      const songEnergy = String(song.energy || 0);
      if (songEnergy !== energy) return false;
    }
    
    return true;
  });

  result.sort((a, b) => {
    if (sort === 'title-asc') {
      return (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base', numeric: true });
    }
    if (sort === 'title-desc') {
      return (b.title || '').localeCompare(a.title || '', undefined, { sensitivity: 'base', numeric: true });
    }
    if (sort === 'artist-asc') {
      const artA = (a.artist || '').trim();
      const artB = (b.artist || '').trim();
      if (!artA && artB) return 1;
      if (artA && !artB) return -1;
      const cmp = artA.localeCompare(artB, undefined, { sensitivity: 'base', numeric: true });
      if (cmp !== 0) return cmp;
      return (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base', numeric: true });
    }
    if (sort === 'energy-desc') {
      const eA = parseInt(a.energy, 10) || 0;
      const eB = parseInt(b.energy, 10) || 0;
      if (eB !== eA) return eB - eA;
      return (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base', numeric: true });
    }
    if (sort === 'energy-asc') {
      const eA = parseInt(a.energy, 10) || 0;
      const eB = parseInt(b.energy, 10) || 0;
      if (eA !== eB) return eA - eB;
      return (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base', numeric: true });
    }
    return 0;
  });

  return result;
}

function populateArtistSelects() {
  const artists = [...new Set(songs.map(s => s.artist?.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const selects = [
    { el: libraryFilterArtist, current: libraryFilterArtist?.value || '' },
    { el: addSetlistFilterArtist, current: addSetlistFilterArtist?.value || '' }
  ];

  selects.forEach(({ el, current }) => {
    if (!el) return;
    const existingValues = Array.from(el.options).map(o => o.value).filter(Boolean);
    const isSame = existingValues.length === artists.length && existingValues.every((v, i) => v === artists[i]);
    if (isSame) {
      if (current) el.value = current;
      return;
    }

    el.innerHTML = '<option value="">Todos los artistas</option>';
    artists.forEach(artist => {
      const opt = document.createElement('option');
      opt.value = artist;
      opt.textContent = artist;
      el.appendChild(opt);
    });
    if (current) el.value = current;
  });
}

function renderLibrary() {
  const search = librarySearchInput?.value || '';
  const artist = libraryFilterArtist?.value || '';
  const energy = libraryFilterEnergy?.value || '';
  const sort = librarySort?.value || 'title-asc';

  const filteredSongs = filterAndSortSongs(songs, search, artist, energy, sort);

  libraryList.innerHTML = '';
  const hasSongs = songs.length > 0;
  const hasFiltered = filteredSongs.length > 0;

  libraryEmpty.classList.toggle('hidden', hasFiltered);
  if (!hasSongs) {
    libraryEmpty.textContent = 'No hay canciones todavía. Crea la primera.';
  } else if (!hasFiltered) {
    libraryEmpty.textContent = 'No se encontraron canciones con los filtros aplicados.';
  }

  filteredSongs.forEach(song => {
    const inSetlist = isInSetlist(song.id);
    const durationText = formatSongDuration(song.durationMin, song.durationSec);
    const artistText = song.artist?.trim() || 'Artista no especificado';

    const item = document.createElement('div');
    item.className = 'song-item song-item-library';
    item.dataset.id = song.id;
    item.innerHTML = `
      <div class="song-item-info">
        <div class="song-item-title">
          ${escapeHtml(song.title)}
          ${inSetlist ? '<span class="in-setlist-badge">En setlist</span>' : ''}
          ${song.hasAudio ? '<span class="in-setlist-badge" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa;">🎵 Audio</span>' : ''}
        </div>
        <div class="song-item-artist">${escapeHtml(artistText)}</div>
      </div>
      ${durationText ? `<span class="song-duration-badge">⏱ ${durationText}</span>` : ''}
      ${renderEnergyBadge(song.energy)}
      <div class="song-item-actions">
        ${inSetlist ? '' : `<button type="button" class="btn btn-ghost" data-action="add-setlist" data-id="${song.id}">+ Setlist</button>`}
        <button type="button" class="btn btn-ghost btn-icon" data-action="edit" data-id="${song.id}" aria-label="Editar">✎</button>
      </div>
    `;
    libraryList.appendChild(item);
  });
}

function preview(lyrics) {
  if (!lyrics) return 'Sin letra';
  const tmp = document.createElement('div');
  tmp.innerHTML = lyrics;
  const text = tmp.textContent || tmp.innerText || '';
  const line = getLyricsLines(text).find(l => l.trim());
  if (!line) return 'Sin letra';
  const clean = line.replace(/\*\*|\*/g, '').trim();
  return clean.slice(0, 60);
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatLine(line) {
  if (!line) return '';
  let safe = escapeHtml(line);
  safe = safe.replace(/&lt;(\/?(?:u|b|i|strong|em))&gt;/gi, '<$1>');
  safe = safe.replace(/&lt;font color=&quot;(.*?)&quot;&gt;(.*?)&lt;\/font&gt;/gi, '<font color="$1">$2</font>');
  safe = safe.replace(/&lt;font color=(&quot;.*?&quot;|.*?);?&gt;/gi, (m, c) => `<font color="${c.replace(/&quot;/g, '')}">`);
  safe = safe.replace(/&lt;span style=&quot;color:\s*(.*?);?&quot;&gt;(.*?)&lt;\/span&gt;/gi, '<span style="color:$1">$2</span>');
  safe = safe.replace(/&lt;span style=&quot;color:\s*(&quot;.*?&quot;|.*?);?&quot;&gt;/gi, (m, c) => `<span style="color:${c.replace(/&quot;/g, '')}">`);
  safe = safe.replace(/&lt;\/span&gt;/gi, '</span>');
  safe = safe.replace(/&lt;\/font&gt;/gi, '</font>');
  safe = safe.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  safe = safe.replace(/\*(.*?)\*/g, '<i>$1</i>');
  return safe;
}

function getLyricsLines(lyrics) {
  if (!lyrics) return [];
  let text = lyrics
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<div[^>]*>/gi, '');
  return text.split('\n');
}

function getSongLyricsValue() {
  if (!songLyrics) return '';
  const text = songLyrics.textContent || songLyrics.innerText || '';
  if (!text.trim() && !/<(?:b|i|u|font|span)[^>]*>/i.test(songLyrics.innerHTML)) {
    return '';
  }
  return songLyrics.innerHTML.trim();
}

function setSongLyricsValue(val) {
  if (!songLyrics) return;
  if (!val) {
    songLyrics.innerHTML = '';
    return;
  }
  let html = val;
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    html = escapeHtml(html)
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>')
      .replace(/&lt;(\/?(?:u|b|i|strong|em))&gt;/gi, '<$1>')
      .replace(/\n/g, '<br>');
  } else if (!/<(?:div|p|br)[^>]*>/i.test(html)) {
    html = html.replace(/\n/g, '<br>');
  }
  songLyrics.innerHTML = html;
}

function applyFormatting(command, value = null) {
  if (!songLyrics) return;
  songLyrics.focus();
  document.execCommand(command, false, value);
  songLyrics.focus();
}

// ── Add to setlist overlay ──

function renderAddSetlistList() {
  const available = songs.filter(s => !isInSetlist(s.id));
  const search = addSetlistSearchInput?.value || '';
  const artist = addSetlistFilterArtist?.value || '';
  const energy = addSetlistFilterEnergy?.value || '';
  const sort = addSetlistSort?.value || 'title-asc';

  const filtered = filterAndSortSongs(available, search, artist, energy, sort);

  addSetlistList.innerHTML = '';
  const hasAvailable = available.length > 0;
  const hasFiltered = filtered.length > 0;

  addSetlistEmpty.classList.toggle('hidden', hasFiltered);
  addSetlistList.classList.toggle('hidden', !hasFiltered);

  if (!hasAvailable) {
    addSetlistEmpty.textContent = 'Todas las canciones ya están en el setlist.';
  } else if (!hasFiltered) {
    addSetlistEmpty.textContent = 'No se encontraron canciones con los filtros aplicados.';
  }

  filtered.forEach(song => {
    const durationText = formatSongDuration(song.durationMin, song.durationSec);
    const artistText = song.artist?.trim() || 'Artista no especificado';

    const item = document.createElement('div');
    item.className = 'song-item song-item-library';
    item.dataset.id = song.id;
    item.innerHTML = `
      <div class="song-item-info">
        <div class="song-item-title">
          ${escapeHtml(song.title)}
          ${song.hasAudio ? '<span class="in-setlist-badge" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa;">🎵 Audio</span>' : ''}
        </div>
        <div class="song-item-artist">${escapeHtml(artistText)}</div>
      </div>
      ${durationText ? `<span class="song-duration-badge">⏱ ${durationText}</span>` : ''}
      ${renderEnergyBadge(song.energy)}
      <div class="song-item-actions">
        <button type="button" class="btn btn-ghost" data-action="add-setlist" data-id="${song.id}">+ Setlist</button>
      </div>
    `;
    addSetlistList.appendChild(item);
  });
}

function openAddSetlistOverlay() {
  renderAddSetlistList();
  addSetlistOverlay.classList.remove('hidden');
}

function closeAddSetlistOverlay() {
  addSetlistOverlay.classList.add('hidden');
}

// ── Edit Audio State ──
let currentEditAudioBlob = null;
let currentEditAudioName = null;
let audioMarkedForDeletion = false;
let editPreviewObjectUrl = null;

function clearEditAudioPreview() {
  if (editPreviewObjectUrl) {
    URL.revokeObjectURL(editPreviewObjectUrl);
    editPreviewObjectUrl = null;
  }
  if (editAudioPreview) {
    editAudioPreview.pause();
    editAudioPreview.removeAttribute('src');
    editAudioPreview.load();
  }
}

function resetEditAudioState() {
  currentEditAudioBlob = null;
  currentEditAudioName = null;
  audioMarkedForDeletion = false;
  clearEditAudioPreview();
  if (songAudioInput) songAudioInput.value = '';
  if (audioFileInfo) audioFileInfo.classList.add('hidden');
  if (audioUploadLabel) audioUploadLabel.classList.remove('hidden');
}

// ── Edit ──

async function openNewSong() {
  editingId = null;
  editTitle.textContent = 'Nueva canción';
  songTitle.value = '';
  if (songArtist) songArtist.value = '';
  if (songDurationMin) songDurationMin.value = '';
  if (songDurationSec) songDurationSec.value = '';
  setEditEnergy(0);
  setSongLyricsValue('');
  resetEditAudioState();
  btnDelete.classList.add('hidden');
  showScreen('edit');
  songTitle.focus();
}

async function openEditSong(id) {
  const song = songs.find(s => s.id === id);
  if (!song) return;
  editingId = id;
  editTitle.textContent = 'Editar canción';
  songTitle.value = song.title;
  if (songArtist) songArtist.value = song.artist || '';
  if (songDurationMin) songDurationMin.value = song.durationMin ?? '';
  if (songDurationSec) songDurationSec.value = song.durationSec ?? '';
  setEditEnergy(song.energy || 0);
  setSongLyricsValue(song.lyrics);
  btnDelete.classList.remove('hidden');

  resetEditAudioState();
  const existingAudio = await getSongAudio(id);
  if (existingAudio && existingAudio.blob) {
    currentEditAudioName = existingAudio.fileName;
    if (audioFileName) audioFileName.textContent = existingAudio.fileName;
    editPreviewObjectUrl = URL.createObjectURL(existingAudio.blob);
    if (editAudioPreview) editAudioPreview.src = editPreviewObjectUrl;
    if (audioFileInfo) audioFileInfo.classList.remove('hidden');
    if (audioUploadLabel) audioUploadLabel.classList.add('hidden');
  }

  showScreen('edit');
  songTitle.focus();
}

async function saveSong() {
  const title = songTitle.value.trim();
  const artist = songArtist ? songArtist.value.trim() : '';
  const durationMin = songDurationMin && songDurationMin.value !== '' ? Math.max(0, parseInt(songDurationMin.value, 10) || 0) : '';
  const durationSec = songDurationSec && songDurationSec.value !== '' ? Math.min(59, Math.max(0, parseInt(songDurationSec.value, 10) || 0)) : '';
  const energy = currentEditEnergy;
  const lyrics = getSongLyricsValue();

  if (!title) {
    songTitle.focus();
    return;
  }
  if (!lyrics) {
    songLyrics.focus();
    return;
  }

  let songId = editingId;

  if (editingId) {
    const song = songs.find(s => s.id === editingId);
    if (song) {
      song.title = title;
      song.artist = artist;
      song.durationMin = durationMin;
      song.durationSec = durationSec;
      song.energy = energy;
      song.lyrics = lyrics;
      if (currentEditAudioBlob) {
        await saveSongAudio(editingId, currentEditAudioBlob, currentEditAudioName);
        song.hasAudio = true;
      } else if (audioMarkedForDeletion) {
        await deleteSongAudio(editingId);
        song.hasAudio = false;
      }
    }
  } else {
    songId = crypto.randomUUID();
    let hasAudio = false;
    if (currentEditAudioBlob) {
      await saveSongAudio(songId, currentEditAudioBlob, currentEditAudioName);
      hasAudio = true;
    }
    songs.push({ id: songId, title, artist, durationMin, durationSec, energy, lyrics, hasAudio });
    setlistIds.push(songId);
    persistSetlistIds();
  }

  resetEditAudioState();
  saveSongs();
  renderAll();
  showScreen('manage');
}

async function deleteSong() {
  if (!editingId) return;
  if (!confirm('¿Eliminar esta canción de la biblioteca? También se quitará del setlist.')) return;
  await deleteSongAudio(editingId);
  songs = songs.filter(s => s.id !== editingId);
  setlistIds = setlistIds.filter(id => id !== editingId);
  setlists.forEach(sl => {
    sl.songIds = sl.songIds.filter(id => id !== editingId);
  });
  delete sectionFontSizes[editingId];
  resetEditAudioState();
  saveSongs();
  saveSetlists();
  saveSectionFonts();
  renderAll();
  showScreen('manage');
}

// ── Audio Player para Visualización ──
let activeAudio = null;
let activeAudioObjectUrl = null;

function formatAudioTime(seconds) {
  if (isNaN(seconds) || seconds === Infinity) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function stopAudioPlayer() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.removeAttribute('src');
    activeAudio.load();
    activeAudio = null;
  }
  if (activeAudioObjectUrl) {
    URL.revokeObjectURL(activeAudioObjectUrl);
    activeAudioObjectUrl = null;
  }
  if (displayAudioControls) {
    displayAudioControls.classList.add('hidden');
  }
  if (btnAudioPlay) {
    btnAudioPlay.textContent = '▶';
    btnAudioPlay.title = 'Reproducir';
  }
  if (audioProgressBar) {
    audioProgressBar.value = 0;
  }
  if (audioTimeDisplay) {
    audioTimeDisplay.textContent = '00:00 / 00:00';
  }
}

async function setupAudioPlayerForSong(id) {
  stopAudioPlayer();
  const audioData = await getSongAudio(id);
  if (!audioData || !audioData.blob) {
    if (displayAudioControls) displayAudioControls.classList.add('hidden');
    return;
  }

  try {
    activeAudioObjectUrl = URL.createObjectURL(audioData.blob);
    activeAudio = new Audio(activeAudioObjectUrl);
    if (displayAudioControls) displayAudioControls.classList.remove('hidden');

    activeAudio.addEventListener('loadedmetadata', () => {
      const dur = activeAudio.duration;
      if (audioTimeDisplay) audioTimeDisplay.textContent = `00:00 / ${formatAudioTime(dur)}`;
    });

    activeAudio.addEventListener('timeupdate', () => {
      if (!activeAudio) return;
      const cur = activeAudio.currentTime;
      const dur = activeAudio.duration || 1;
      const percent = (cur / dur) * 100;
      if (audioProgressBar) audioProgressBar.value = percent;
      if (audioTimeDisplay) audioTimeDisplay.textContent = `${formatAudioTime(cur)} / ${formatAudioTime(dur)}`;
    });

    activeAudio.addEventListener('play', () => {
      if (btnAudioPlay) {
        btnAudioPlay.textContent = '⏸';
        btnAudioPlay.title = 'Pausar';
      }
    });

    activeAudio.addEventListener('pause', () => {
      if (btnAudioPlay) {
        btnAudioPlay.textContent = '▶';
        btnAudioPlay.title = 'Reproducir';
      }
    });

    activeAudio.addEventListener('ended', () => {
      if (btnAudioPlay) {
        btnAudioPlay.textContent = '▶';
        btnAudioPlay.title = 'Reproducir';
      }
      if (audioProgressBar) audioProgressBar.value = 0;
    });
  } catch (err) {
    console.error('Error preparando el reproductor de audio:', err);
  }
}

// ── Sections ──

function parseSections(lyrics) {
  const normalized = getLyricsLines(lyrics).join('\n');
  const sections = (normalized || '')
    .split(/\n\s*\n/)
    .map(s => s.trim())
    .filter(Boolean);
  return sections.length ? sections : [(normalized || '').trim() || '(sin letra)'];
}

function renderSectionLines(container, text) {
  getLyricsLines(text).forEach(line => {
    if (line.trim() === '') {
      const gap = document.createElement('div');
      gap.className = 'lyrics-gap';
      container.appendChild(gap);
    } else {
      const el = document.createElement('div');
      el.className = 'lyrics-line';
      el.innerHTML = formatLine(line);
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
    if (displayContent) displayContent.scrollTop = 0;
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

async function showSong(id, sectionIndex = 0, startWithTitle = true) {
  const song = songs.find(s => String(s.id) === String(id));
  if (!song) return;

  currentDisplayId = song.id;
  currentDisplaySpeechId = null;
  currentSections = parseSections(song.lyrics);
  currentSectionIndex = Math.min(sectionIndex, currentSections.length - 1);
  showingTitle = Boolean(startWithTitle);

  renderLyrics(song);
  showScreen('display');

  if (song.hasAudio) {
    setupAudioPlayerForSong(song.id).catch(err => console.error('Error al cargar audio:', err));
  } else {
    stopAudioPlayer();
  }
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
    renderSectionLines(continuousSection, (song.lyrics || '').trim());
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

// ── Exportar / Importar ──

function buildExportData() {
  persistSetlistIds();
  return {
    version: 3,
    app: 'quatroletras',
    exportedAt: new Date().toISOString(),
    songs: songs.map(s => ({
      id: s.id,
      title: s.title,
      artist: s.artist || '',
      durationMin: s.durationMin ?? '',
      durationSec: s.durationSec ?? '',
      energy: s.energy || 0,
      lyrics: s.lyrics,
      hasAudio: Boolean(s.hasAudio)
    })),
    setlists: setlists.map(sl => ({
      id: sl.id,
      name: sl.name,
      songIds: [...sl.songIds],
      items: Array.isArray(sl.items) ? sl.items.map(i => ({ ...i })) : []
    })),
    activeSetlistId,
    sectionFontSizes,
    scrollAmounts,
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
          sl => sl && typeof sl.id === 'string' && typeof sl.name === 'string'
        )
      : null,
    setlist: Array.isArray(raw.setlist) ? raw.setlist.filter(id => typeof id === 'string') : [],
    activeSetlistId: typeof raw.activeSetlistId === 'string' ? raw.activeSetlistId : null,
    sectionFontSizes: raw.sectionFontSizes && typeof raw.sectionFontSizes === 'object' ? raw.sectionFontSizes : null,
    scrollAmounts: raw.scrollAmounts && typeof raw.scrollAmounts === 'object' ? raw.scrollAmounts : null,
  };
}

function normalizeStr(str) {
  return (str || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
}

function getSongConflicts(existing, imported) {
  const diffs = [];

  const exTitle = (existing.title || '').trim();
  const impTitle = (imported.title || '').trim();
  if (exTitle && impTitle && normalizeStr(exTitle) !== normalizeStr(impTitle)) {
    diffs.push({ field: 'Título', oldVal: exTitle, newVal: impTitle });
  }

  const exArtist = (existing.artist || '').trim();
  const impArtist = (imported.artist || '').trim();
  if (exArtist && impArtist && normalizeStr(exArtist) !== normalizeStr(impArtist)) {
    diffs.push({ field: 'Artista', oldVal: exArtist, newVal: impArtist });
  }

  const exMin = existing.durationMin !== '' && existing.durationMin !== undefined && existing.durationMin !== null ? String(existing.durationMin) : '';
  const impMin = imported.durationMin !== '' && imported.durationMin !== undefined && imported.durationMin !== null ? String(imported.durationMin) : '';
  const exSec = existing.durationSec !== '' && existing.durationSec !== undefined && existing.durationSec !== null ? String(existing.durationSec) : '';
  const impSec = imported.durationSec !== '' && imported.durationSec !== undefined && imported.durationSec !== null ? String(imported.durationSec) : '';

  const hasExDur = exMin !== '' || exSec !== '';
  const hasImpDur = impMin !== '' || impSec !== '';

  if (hasExDur && hasImpDur) {
    const oldDur = formatSongDuration(exMin, exSec);
    const newDur = formatSongDuration(impMin, impSec);
    if (oldDur !== newDur) {
      diffs.push({ field: 'Duración', oldVal: oldDur || 'Sin especificar', newVal: newDur || 'Sin especificar' });
    }
  }

  const exEnergy = Number(existing.energy) || 0;
  const impEnergy = Number(imported.energy) || 0;
  if (exEnergy > 0 && impEnergy > 0 && exEnergy !== impEnergy) {
    diffs.push({ field: 'Energía', oldVal: `Grado ${exEnergy}/7`, newVal: `Grado ${impEnergy}/7` });
  }

  const exLyricsClean = stripHtml(existing.lyrics);
  const impLyricsClean = stripHtml(imported.lyrics);
  if (exLyricsClean && impLyricsClean && normalizeStr(exLyricsClean) !== normalizeStr(impLyricsClean)) {
    diffs.push({ field: 'Letra', oldVal: 'Letra actual en biblioteca', newVal: 'Letra del archivo importado' });
  }

  return diffs;
}

function promptConflictResolution(existing, imported, conflicts) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('import-conflict-overlay');
    const desc = document.getElementById('conflict-description');
    const diffBox = document.getElementById('conflict-diff-box');

    const btnOverwrite = document.getElementById('btn-conflict-overwrite');
    const btnKeep = document.getElementById('btn-conflict-keep');
    const btnOverwriteAll = document.getElementById('btn-conflict-overwrite-all');

    if (!overlay || !btnOverwrite || !btnKeep || !btnOverwriteAll) {
      resolve('keep');
      return;
    }

    const titleStr = existing.title || imported.title || 'Canción';
    const artistStr = existing.artist || imported.artist || '';
    desc.textContent = `La canción "${titleStr}" ${artistStr ? `(${artistStr})` : ''} ya existe en tu biblioteca y presenta datos distintos a los del archivo.`;

    diffBox.innerHTML = '';
    conflicts.forEach(c => {
      const item = document.createElement('div');
      item.className = 'conflict-diff-item';
      item.innerHTML = `
        <span class="conflict-field-name">${escapeHtml(c.field)}</span>
        <span class="conflict-val-old">Biblioteca: ${escapeHtml(c.oldVal)}</span>
        <span class="conflict-val-new">Archivo: ${escapeHtml(c.newVal)}</span>
      `;
      diffBox.appendChild(item);
    });

    overlay.classList.remove('hidden');

    function cleanup(result) {
      overlay.classList.add('hidden');
      btnOverwrite.removeEventListener('click', onOverwrite);
      btnKeep.removeEventListener('click', onKeep);
      btnOverwriteAll.removeEventListener('click', onOverwriteAll);
      resolve(result);
    }

    function onOverwrite(e) {
      e.stopPropagation();
      cleanup('overwrite');
    }

    function onKeep(e) {
      e.stopPropagation();
      cleanup('keep');
    }

    function onOverwriteAll(e) {
      e.stopPropagation();
      cleanup('overwrite-all');
    }

    btnOverwrite.addEventListener('click', onOverwrite);
    btnKeep.addEventListener('click', onKeep);
    btnOverwriteAll.addEventListener('click', onOverwriteAll);
  });
}

async function importLibrary(data) {
  const idRemap = new Map();
  let overwriteAll = false;

  for (const imported of data.songs) {
    const importedTitleNorm = normalizeStr(imported.title);

    const existing = songs.find(s =>
      (s.id && imported.id && s.id === imported.id) ||
      (importedTitleNorm && normalizeStr(s.title) === importedTitleNorm)
    );

    if (!existing) {
      const newSong = {
        id: imported.id,
        title: imported.title,
        artist: imported.artist || '',
        durationMin: imported.durationMin ?? '',
        durationSec: imported.durationSec ?? '',
        energy: imported.energy || 0,
        lyrics: imported.lyrics,
        hasAudio: Boolean(imported.hasAudio)
      };
      songs.push(newSong);
      idRemap.set(imported.id, imported.id);
      continue;
    }

    idRemap.set(imported.id, existing.id);

    const conflicts = getSongConflicts(existing, imported);

    let choice = 'keep';
    if (conflicts.length > 0) {
      if (overwriteAll) {
        choice = 'overwrite';
      } else {
        choice = await promptConflictResolution(existing, imported, conflicts);
        if (choice === 'overwrite-all') {
          overwriteAll = true;
          choice = 'overwrite';
        }
      }
    }

    if (choice === 'overwrite') {
      existing.title = imported.title;
      if (imported.artist !== undefined) existing.artist = imported.artist;
      if (imported.durationMin !== undefined) existing.durationMin = imported.durationMin;
      if (imported.durationSec !== undefined) existing.durationSec = imported.durationSec;
      if (imported.energy !== undefined) existing.energy = imported.energy;
      if (imported.lyrics !== undefined) existing.lyrics = imported.lyrics;
      if (imported.hasAudio !== undefined) existing.hasAudio = Boolean(imported.hasAudio);
    }

    if (!existing.artist?.trim() && imported.artist?.trim()) {
      existing.artist = imported.artist;
    }
    if ((existing.durationMin === '' || existing.durationMin === undefined || existing.durationMin === null) && imported.durationMin !== '' && imported.durationMin !== undefined && imported.durationMin !== null) {
      existing.durationMin = imported.durationMin;
    }
    if ((existing.durationSec === '' || existing.durationSec === undefined || existing.durationSec === null) && imported.durationSec !== '' && imported.durationSec !== undefined && imported.durationSec !== null) {
      existing.durationSec = imported.durationSec;
    }
    if ((!existing.energy || existing.energy === 0) && imported.energy > 0) {
      existing.energy = imported.energy;
    }
    if (!stripHtml(existing.lyrics) && stripHtml(imported.lyrics)) {
      existing.lyrics = imported.lyrics;
    }
    if (!existing.hasAudio && imported.hasAudio) {
      existing.hasAudio = true;
    }
  }

  const validIds = new Set(songs.map(s => s.id));

  if (data.setlists?.length) {
    data.setlists.forEach(importedSl => {
      const existingSl = setlists.find(sl => sl.id === importedSl.id);

      const mappedSongIds = (importedSl.songIds || [])
        .map(id => idRemap.get(id) || id)
        .filter(id => validIds.has(id));

      let mappedItems = [];
      if (Array.isArray(importedSl.items) && importedSl.items.length > 0) {
        mappedItems = importedSl.items.map(item => {
          if (item.type === 'song') {
            return { ...item, songId: idRemap.get(item.songId) || item.songId };
          }
          return { ...item };
        }).filter(item => item.type !== 'song' || validIds.has(item.songId));
      } else {
        mappedItems = [{ type: 'tanda', id: crypto.randomUUID(), name: 'Tanda 1' }];
        mappedSongIds.forEach(sId => mappedItems.push({ type: 'song', id: crypto.randomUUID(), songId: sId }));
      }

      if (existingSl) {
        existingSl.name = importedSl.name;
        existingSl.items = mappedItems;
        ensureSetlistItems(existingSl);
      } else {
        const newSl = { id: importedSl.id, name: importedSl.name, songIds: mappedSongIds, items: mappedItems };
        ensureSetlistItems(newSl);
        setlists.push(newSl);
      }
    });
    if (data.activeSetlistId && setlists.some(sl => sl.id === data.activeSetlistId)) {
      activeSetlistId = data.activeSetlistId;
    }
  }

  if (data.sectionFontSizes) {
    Object.entries(data.sectionFontSizes).forEach(([songId, sections]) => {
      const remappedId = idRemap.get(songId) || songId;
      if (!validIds.has(remappedId) || typeof sections !== 'object') return;
      if (!sectionFontSizes[remappedId]) sectionFontSizes[remappedId] = {};
      Object.entries(sections).forEach(([idx, size]) => {
        if (typeof size === 'number') sectionFontSizes[remappedId][idx] = size;
      });
    });
    saveSectionFonts();
  }

  if (data.scrollAmounts) {
    Object.entries(data.scrollAmounts).forEach(([songId, amount]) => {
      const remappedId = idRemap.get(songId) || songId;
      if (!validIds.has(remappedId) || typeof amount !== 'number') return;
      scrollAmounts[remappedId] = amount;
    });
    saveScrollAmounts();
  }

  syncSetlistIdsFromActive();
  saveSongs();
  saveSetlists();
  pruneSetlist();
  renderSetlistSelector();
  renderAll();
}

// ── Advertencia de Audio Incompleto ──

function isAudioWarningOpen() {
  return audioWarningOverlay && !audioWarningOverlay.classList.contains('hidden');
}

function openAudioWarning() {
  audioWarningOverlay?.classList.remove('hidden');
}

function closeAudioWarning() {
  audioWarningOverlay?.classList.add('hidden');
}

function confirmContinueNextSong() {
  closeAudioWarning();
  stopAudioPlayer();
  goToNextSong(true);
}

function cancelAndReturnToLastSection() {
  closeAudioWarning();
  showingTitle = false;
  if (currentSections.length > 0) {
    currentSectionIndex = currentSections.length - 1;
  }
  showCurrentSection();
  if (displayMode === DISPLAY_MODES.CONTINUOUS && displayContent) {
    displayContent.scrollTop = displayContent.scrollHeight;
  }
}

// ── Pedal navigation ──

let currentDisplaySpeechId = null;

function showSpeech(speechId) {
  const active = getActiveSetlist();
  if (!active || !Array.isArray(active.items)) return;
  const speech = active.items.find(i => i.type === 'speech' && String(i.id) === String(speechId));
  if (!speech) return;

  currentDisplayId = null;
  currentDisplaySpeechId = speech.id;
  stopAudioPlayer();

  displayContent.innerHTML = '';
  displayContent.classList.remove('continuous-mode');

  const durStr = formatSongDuration(speech.durationMin, speech.durationSec);

  const slide = document.createElement('div');
  slide.className = 'speech-slide active';
  slide.innerHTML = `
    <div class="speech-slide-header">🎙️ SPEECH / DISCURSO</div>
    <div class="speech-slide-title">${escapeHtml(speech.title)}</div>
    ${durStr ? `<div class="speech-slide-duration">⏱ Duración estimada: ${durStr} min</div>` : ''}
    ${speech.text?.trim() ? `<div class="speech-slide-text">${escapeHtml(speech.text.trim())}</div>` : ''}
  `;

  displayContent.appendChild(slide);
  if (displayTitleBar) {
    displayTitleBar.textContent = '';
    displayTitleBar.classList.remove('visible');
  }
  if (sectionIndicator) {
    sectionIndicator.textContent = 'SPEECH';
    sectionIndicator.classList.add('visible');
  }
  if (scrollMenuSection) scrollMenuSection.classList.add('hidden');
  if (scrollControlsPanel) scrollControlsPanel.classList.add('hidden');

  showScreen('display');
}

function pedalNext() {
  if (isAudioWarningOpen()) return;

  if (isPickerOpen()) {
    pickerNavigate(1);
    return;
  }

  if (!screens.display.classList.contains('active')) return;

  if (currentDisplaySpeechId) {
    goToNextSong();
    return;
  }

  if (showingTitle) {
    showingTitle = false;
    showCurrentSection();
    return;
  }

  if (displayMode === DISPLAY_MODES.CONTINUOUS) {
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
  if (isAudioWarningOpen()) {
    cancelAndReturnToLastSection();
    return;
  }

  if (isPickerOpen()) {
    pickerNavigate(-1);
    return;
  }

  if (!screens.display.classList.contains('active')) return;

  if (currentDisplaySpeechId) {
    openPicker();
    return;
  }

  if (showingTitle) {
    openPicker();
    return;
  }

  if (displayMode === DISPLAY_MODES.CONTINUOUS) {
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

function goToNextSong(force = false) {
  const playable = getSetlistPlayableItems();
  if (playable.length <= 1) return;

  const isAudioStarted = activeAudio && (!activeAudio.paused || activeAudio.currentTime > 0.5);

  if (!force && isAudioStarted && !activeAudio.ended && activeAudio.duration > 0 && (activeAudio.duration - activeAudio.currentTime > 1.5)) {
    openAudioWarning();
    return;
  }

  let curIdx = -1;
  if (currentDisplayId) {
    curIdx = playable.findIndex(i => i.type === 'song' && i.songId === currentDisplayId);
  } else if (currentDisplaySpeechId) {
    curIdx = playable.findIndex(i => i.type === 'speech' && i.id === currentDisplaySpeechId);
  }

  const nextIdx = curIdx >= 0 && curIdx < playable.length - 1 ? curIdx + 1 : 0;
  const nextItem = playable[nextIdx];
  if (!nextItem) return;

  if (nextItem.type === 'song') {
    showSong(nextItem.songId, 0);
  } else if (nextItem.type === 'speech') {
    showSpeech(nextItem.id);
  }
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
  const playable = getSetlistPlayableItems();
  if (playable.length === 0) return;

  let currentIdx = 0;
  if (currentDisplayId) {
    currentIdx = playable.findIndex(i => i.type === 'song' && i.songId === currentDisplayId);
  } else if (currentDisplaySpeechId) {
    currentIdx = playable.findIndex(i => i.type === 'speech' && i.id === currentDisplaySpeechId);
  }
  pickerIndex = Math.max(0, currentIdx);
  pickerList.innerHTML = '';

  const songMap = new Map(songs.map(s => [s.id, s]));
  let songCounter = 0;

  playable.forEach((item, i) => {
    const btn = document.createElement('button');
    btn.className = 'picker-item' + (i === pickerIndex ? ' active' : '');

    if (item.type === 'song') {
      const song = songMap.get(item.songId);
      if (!song) return;
      songCounter++;
      btn.innerHTML = `
        <span class="picker-item-num">${songCounter}</span>
        <span class="picker-item-title">${escapeHtml(song.title)}</span>
      `;
      btn.addEventListener('click', () => {
        pickerIndex = i;
        closePicker();
        showSong(song.id, 0, false);
      });
    } else if (item.type === 'speech') {
      btn.innerHTML = `
        <span class="picker-item-num" style="color: #c084fc;">🎙️</span>
        <span class="picker-item-title" style="color: #e9d5ff;">${escapeHtml(item.title || 'Speech')}</span>
      `;
      btn.addEventListener('click', () => {
        pickerIndex = i;
        closePicker();
        showSpeech(item.id);
      });
    }

    pickerList.appendChild(btn);
  });

  pickerOverlay.classList.remove('hidden');
  renderPickerHighlight();
}

function closePicker() {
  pickerOverlay.classList.add('hidden');
}

function pickerNavigate(delta) {
  const playable = getSetlistPlayableItems();
  if (playable.length === 0) return;
  pickerIndex = (pickerIndex + delta + playable.length) % playable.length;
  renderPickerHighlight();

  const item = playable[pickerIndex];
  if (!item) return;
  if (item.type === 'song') {
    showSong(item.songId, 0, false);
  } else if (item.type === 'speech') {
    showSpeech(item.id);
  }
}

// ── Event listeners ──

librarySearchInput?.addEventListener('input', renderLibrary);
libraryFilterArtist?.addEventListener('change', renderLibrary);
libraryFilterEnergy?.addEventListener('change', renderLibrary);
librarySort?.addEventListener('change', renderLibrary);

addSetlistSearchInput?.addEventListener('input', renderAddSetlistList);
addSetlistFilterArtist?.addEventListener('change', renderAddSetlistList);
addSetlistFilterEnergy?.addEventListener('change', renderAddSetlistList);
addSetlistSort?.addEventListener('change', renderAddSetlistList);

document.getElementById('btn-new-song').addEventListener('click', openNewSong);
document.getElementById('btn-add-to-setlist').addEventListener('click', openAddSetlistOverlay);
document.getElementById('btn-add-tanda')?.addEventListener('click', addTanda);
document.getElementById('btn-add-speech')?.addEventListener('click', () => openSpeechModal());
document.getElementById('btn-close-add-setlist').addEventListener('click', closeAddSetlistOverlay);

// Speech modal listeners
document.getElementById('speech-form')?.addEventListener('submit', saveSpeechForm);
document.getElementById('btn-close-speech')?.addEventListener('click', closeSpeechModal);
document.getElementById('btn-cancel-speech')?.addEventListener('click', closeSpeechModal);
document.getElementById('edit-speech-overlay')?.addEventListener('click', e => {
  if (e.target === document.getElementById('edit-speech-overlay')) closeSpeechModal();
});

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
btnFormatBold?.addEventListener('click', () => applyFormatting('bold'));
btnFormatItalic?.addEventListener('click', () => applyFormatting('italic'));
btnFormatUnderline?.addEventListener('click', () => applyFormatting('underline'));

const btnFormatColor = document.getElementById('btn-format-color');
const colorPopover = document.getElementById('color-popover');
const customColorInput = document.getElementById('custom-color-input');

btnFormatColor?.addEventListener('click', e => {
  e.stopPropagation();
  colorPopover?.classList.toggle('hidden');
});

document.addEventListener('click', e => {
  if (!e.target.closest('.color-picker-wrapper')) {
    colorPopover?.classList.add('hidden');
  }
});

document.querySelectorAll('.color-swatch').forEach(swatch => {
  swatch.addEventListener('click', e => {
    e.stopPropagation();
    const color = swatch.dataset.color;
    applyFormatting('foreColor', color);
    colorPopover?.classList.add('hidden');
  });
});

customColorInput?.addEventListener('input', e => {
  const color = e.target.value;
  applyFormatting('foreColor', color);
});

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

document.getElementById('btn-toggle-simple-mode')?.addEventListener('click', toggleSimpleMode);

document.getElementById('btn-toggle-chart')?.addEventListener('click', () => {
  const wrapper = document.getElementById('setlist-chart-wrapper');
  const btn = document.getElementById('btn-toggle-chart');
  if (!wrapper) return;
  const isCollapsed = wrapper.classList.toggle('collapsed');
  if (btn) {
    btn.innerHTML = isCollapsed
      ? '<span id="chart-toggle-text">Mostrar gráfico</span> ▼'
      : '<span id="chart-toggle-text">Ocultar gráfico</span> ▲';
  }
});

editMenu?.addEventListener('click', e => {
  e.stopPropagation();
  editMenu.classList.add('visible');
  clearTimeout(controlsTimer);
  controlsTimer = setTimeout(() => {
    editMenu.classList.remove('visible');
  }, 3000);
});

// ── Event listeners de Audio ──

songAudioInput?.addEventListener('change', e => {
  const file = e.target.files?.[0];
  if (!file) return;
  currentEditAudioBlob = file;
  currentEditAudioName = file.name;
  audioMarkedForDeletion = false;
  if (audioFileName) audioFileName.textContent = file.name;
  if (editPreviewObjectUrl) URL.revokeObjectURL(editPreviewObjectUrl);
  editPreviewObjectUrl = URL.createObjectURL(file);
  if (editAudioPreview) editAudioPreview.src = editPreviewObjectUrl;
  if (audioFileInfo) audioFileInfo.classList.remove('hidden');
  if (audioUploadLabel) audioUploadLabel.classList.add('hidden');
});

btnRemoveAudio?.addEventListener('click', () => {
  currentEditAudioBlob = null;
  currentEditAudioName = null;
  audioMarkedForDeletion = true;
  if (songAudioInput) songAudioInput.value = '';
  clearEditAudioPreview();
  if (audioFileInfo) audioFileInfo.classList.add('hidden');
  if (audioUploadLabel) audioUploadLabel.classList.remove('hidden');
});

btnAudioPlay?.addEventListener('click', e => {
  e.stopPropagation();
  if (!activeAudio) return;
  if (activeAudio.paused) {
    activeAudio.play().catch(err => console.error('Error al reproducir audio:', err));
  } else {
    activeAudio.pause();
  }
});

audioProgressBar?.addEventListener('input', e => {
  e.stopPropagation();
  if (!activeAudio || !activeAudio.duration) return;
  const percent = parseFloat(e.target.value);
  activeAudio.currentTime = (percent / 100) * activeAudio.duration;
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
    await importLibrary(data);
  } catch (err) {
    alert(err.message || 'No se pudo importar el archivo.');
  }
});

document.addEventListener('fullscreenchange', updateFullscreenButtons);

energySelector?.querySelectorAll('.energy-bar').forEach(bar => {
  bar.addEventListener('click', e => {
    e.stopPropagation();
    const lvl = parseInt(bar.dataset.level, 10);
    if (currentEditEnergy === lvl) {
      setEditEnergy(0);
    } else {
      setEditEnergy(lvl);
    }
  });
});
btnSetNextKey.addEventListener('click', () => startPedalCapture('next'));
btnSetBackKey.addEventListener('click', () => startPedalCapture('back'));

btnWarningBack?.addEventListener('click', e => {
  e.stopPropagation();
  cancelAndReturnToLastSection();
});

btnWarningContinue?.addEventListener('click', e => {
  e.stopPropagation();
  confirmContinueNextSong();
});

audioWarningOverlay?.addEventListener('click', e => {
  if (e.target === audioWarningOverlay) {
    cancelAndReturnToLastSection();
  }
});

pickerOverlay.addEventListener('click', e => {
  if (e.target === pickerOverlay) closePicker();
});

addSetlistOverlay.addEventListener('click', e => {
  if (e.target === addSetlistOverlay) closeAddSetlistOverlay();
});

// ── Reordenar setlist ──

// ── Reordenar setlist ──

let dragSongId = null;
let touchDragId = null;

function clearDragState() {
  dragSongId = null;
  touchDragId = null;
  setlistList.querySelectorAll('.song-item, .speech-item, .tanda-divider').forEach(el => {
    el.classList.remove('dragging', 'drag-over');
  });
}

function setDragOverItem(item) {
  setlistList.querySelectorAll('.song-item, .speech-item, .tanda-divider').forEach(el => {
    el.classList.toggle('drag-over', Boolean(item && el === item));
  });
}

// Drag & drop nativo HTML5 (Mouse y navegadores estándar)
setlistList.addEventListener('dragstart', e => {
  const item = e.target.closest('.song-item, .speech-item, .tanda-divider');
  if (!item || !item.dataset.id) return;
  dragSongId = item.dataset.id;
  item.classList.add('dragging');
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragSongId);
  }
});

setlistList.addEventListener('dragend', clearDragState);

setlistList.addEventListener('dragover', e => {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  const item = e.target.closest('.song-item, .speech-item, .tanda-divider');
  if (item && item.dataset.id !== dragSongId) {
    setDragOverItem(item);
  }
});

setlistList.addEventListener('dragleave', e => {
  const item = e.target.closest('.song-item, .speech-item, .tanda-divider');
  if (item && item === e.target) {
    item.classList.remove('drag-over');
  }
});

setlistList.addEventListener('drop', e => {
  e.preventDefault();
  e.stopPropagation();
  const item = e.target.closest('.song-item, .speech-item, .tanda-divider');
  if (!item || !dragSongId || item.dataset.id === dragSongId) {
    clearDragState();
    return;
  }
  const fromIdx = getItemIndexInSetlist(dragSongId);
  const toIdx = getItemIndexInSetlist(item.dataset.id);
  if (fromIdx >= 0 && toIdx >= 0) {
    moveSetlistItem(fromIdx, toIdx);
  }
  clearDragState();
});

// Soporte táctil (Touch events para tablets y móviles)
setlistList.addEventListener('touchstart', e => {
  const handle = e.target.closest('.drag-handle');
  if (!handle) return;
  const item = handle.closest('.song-item, .speech-item, .tanda-divider');
  if (!item || !item.dataset.id) return;
  touchDragId = item.dataset.id;
  item.classList.add('dragging');
}, { passive: true });

setlistList.addEventListener('touchmove', e => {
  if (!touchDragId) return;
  const touch = e.touches[0];
  if (!touch) return;
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  const item = el?.closest('.song-item, .speech-item, .tanda-divider');
  setDragOverItem(item && item.dataset.id !== touchDragId ? item : null);
}, { passive: true });

setlistList.addEventListener('touchend', e => {
  if (!touchDragId) return;
  const touch = e.changedTouches[0];
  if (touch) {
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const item = el?.closest('.song-item, .speech-item, .tanda-divider');
    if (item && item.dataset.id !== touchDragId) {
      const fromIdx = getItemIndexInSetlist(touchDragId);
      const toIdx = getItemIndexInSetlist(item.dataset.id);
      if (fromIdx >= 0 && toIdx >= 0) {
        moveSetlistItem(fromIdx, toIdx);
      }
    }
  }
  clearDragState();
});

setlistList.addEventListener('touchcancel', clearDragState);

setlistList.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (btn) {
    e.stopPropagation();
    const { action, id } = btn.dataset;
    if (action === 'show') {
      showSong(id);
      return;
    }
    if (action === 'remove') {
      removeFromSetlist(id);
      return;
    }
    if (action === 'rename-tanda') {
      renameTanda(id);
      return;
    }
    if (action === 'delete-tanda') {
      deleteTanda(id);
      return;
    }
    if (action === 'edit-speech') {
      openSpeechModal(id);
      return;
    }
    if (action === 'remove-speech') {
      deleteSpeech(id);
      return;
    }
    if (action === 'show-speech') {
      showSpeech(id);
      return;
    }
    if (action === 'toggle-speech-placement') {
      toggleSpeechPlacement(id);
      return;
    }
  }

  if (e.target.closest('.drag-handle')) return;

  const item = e.target.closest('.song-item');
  if (item && item.dataset.songId) {
    showSong(item.dataset.songId);
    return;
  }
  const speechItem = e.target.closest('.speech-item');
  if (speechItem && speechItem.dataset.id) {
    showSpeech(speechItem.dataset.id);
  }
});

libraryList.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (btn) {
    const { action, id } = btn.dataset;
    if (action === 'edit') openEditSong(id);
    if (action === 'add-setlist') addToSetlist(id);
    return;
  }

  const item = e.target.closest('.song-item');
  if (item && item.dataset.id) {
    showSong(item.dataset.id);
  }
});

addSetlistList.addEventListener('click', e => {
  const btn = e.target.closest('[data-action="add-setlist"]');
  if (btn) {
    e.stopPropagation();
    const id = btn.dataset.id;
    addToSetlist(id);
    renderAddSetlistList();
    return;
  }

  const item = e.target.closest('.song-item');
  if (item && item.dataset.id) {
    addToSetlist(item.dataset.id);
    renderAddSetlistList();
  }
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

// ── Navegación por Pestañas ──
const TAB_KEY = 'quatroletras-active-tab';
const manageNavTabs = document.getElementById('manage-nav-tabs');
const manageMain = document.querySelector('.manage-main');

function setActiveTab(tabName) {
  const validTabs = ['all', 'setlist', 'library', 'settings'];
  const activeTab = validTabs.includes(tabName) ? tabName : 'all';
  localStorage.setItem(TAB_KEY, activeTab);
  if (manageMain) {
    manageMain.dataset.tab = activeTab;
  }
  if (manageNavTabs) {
    manageNavTabs.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === activeTab);
    });
  }
}

manageNavTabs?.addEventListener('click', e => {
  const btn = e.target.closest('.tab-btn');
  if (!btn || !btn.dataset.tab) return;
  setActiveTab(btn.dataset.tab);
});

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
setActiveTab(localStorage.getItem(TAB_KEY) || 'all');

