const STORAGE_KEY = 'quatroletras-songs';
const FONT_SIZE_KEY = 'quatroletras-font-size';
const PEDAL_KEYS_KEY = 'quatroletras-pedal-keys';

const DEFAULT_PEDAL_KEYS = {
  next: 'PageDown',
  back: 'PageUp',
};

let songs = [];
let editingId = null;
let currentDisplayId = null;
let currentSections = [];
let currentSectionIndex = 0;
let pickerIndex = 0;
let fontSize = parseFloat(localStorage.getItem(FONT_SIZE_KEY)) || 1;
let pedalKeys = loadPedalKeys();
let capturingPedal = null;
let lastPedalTime = 0;

// ── DOM refs ──
const screens = {
  manage: document.getElementById('manage-screen'),
  edit: document.getElementById('edit-screen'),
  display: document.getElementById('display-screen'),
};

const songList = document.getElementById('song-list');
const emptyState = document.getElementById('empty-state');
const songTitle = document.getElementById('song-title');
const songLyrics = document.getElementById('song-lyrics');
const editTitle = document.getElementById('edit-title');
const btnDelete = document.getElementById('btn-delete');
const displayContent = document.getElementById('display-content');
const displayTitleBar = document.getElementById('display-title-bar');
const sectionIndicator = document.getElementById('section-indicator');
const pickerOverlay = document.getElementById('picker-overlay');
const pickerList = document.getElementById('picker-list');
const btnSetNextKey = document.getElementById('btn-set-next-key');
const btnSetBackKey = document.getElementById('btn-set-back-key');
const pedalCaptureHint = document.getElementById('pedal-capture-hint');

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

// ── Navigation ──

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

function isPickerOpen() {
  return !pickerOverlay.classList.contains('hidden');
}

function getSongIndex(id) {
  return songs.findIndex(s => s.id === id);
}

function getSongNumber(id) {
  const idx = getSongIndex(id);
  return idx >= 0 ? idx + 1 : 0;
}

function moveSong(fromIndex, toIndex) {
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= songs.length || toIndex >= songs.length) return;
  if (fromIndex === toIndex) return;
  const [item] = songs.splice(fromIndex, 1);
  songs.splice(toIndex, 0, item);
  saveSongs();
  renderSongList();
}

function moveSongById(id, delta) {
  moveSong(getSongIndex(id), getSongIndex(id) + delta);
}

// ── Song list ──

function renderSongList() {
  songList.innerHTML = '';
  emptyState.classList.toggle('hidden', songs.length > 0);

  songs.forEach((song, index) => {
    const num = index + 1;
    const isFirst = index === 0;
    const isLast = index === songs.length - 1;
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
        <button type="button" class="btn btn-ghost btn-icon" data-action="edit" data-id="${song.id}" aria-label="Editar">✎</button>
        <button type="button" class="btn btn-primary btn-icon" data-action="show" data-id="${song.id}" aria-label="Mostrar">▶</button>
      </div>
    `;
    songList.appendChild(item);
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
    songs.push({ id: crypto.randomUUID(), title, lyrics });
  }

  saveSongs();
  renderSongList();
  showScreen('manage');
}

function deleteSong() {
  if (!editingId) return;
  if (!confirm('¿Eliminar esta canción?')) return;
  songs = songs.filter(s => s.id !== editingId);
  saveSongs();
  renderSongList();
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
  const total = currentSections.length;
  const current = currentSectionIndex + 1;
  const num = getSongNumber(song.id);
  const prefix = `${num}. `;
  displayTitleBar.textContent = total > 1
    ? `${prefix}${song.title} · ${current}/${total}`
    : `${prefix}${song.title}`;
  sectionIndicator.textContent = total > 1 ? `${current} / ${total}` : '';
  sectionIndicator.classList.toggle('visible', total > 1);
}

function showCurrentSection() {
  const sections = displayContent.querySelectorAll('.lyrics-section');
  sections.forEach((el, i) => {
    el.classList.toggle('active', i === currentSectionIndex);
  });
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

  applyFontSize();
  renderLyrics(song);
  showScreen('display');
}

function renderLyrics(song) {
  displayContent.innerHTML = '';
  const block = document.createElement('div');
  block.className = 'lyrics-block';

  currentSections.forEach((sectionText, i) => {
    const section = document.createElement('div');
    section.className = 'lyrics-section' + (i === currentSectionIndex ? ' active' : '');
    renderSectionLines(section, sectionText);
    block.appendChild(section);
  });

  displayContent.appendChild(block);
  updateSectionIndicator(song);
}

function applyFontSize() {
  document.documentElement.style.setProperty(
    '--font-size-display',
    `clamp(1.2rem, ${fontSize * 5}vw, ${fontSize * 3.5}rem)`
  );
}

function adjustFontSize(delta) {
  fontSize = Math.min(2.5, Math.max(0.6, fontSize + delta));
  localStorage.setItem(FONT_SIZE_KEY, fontSize);
  applyFontSize();
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

// ── Pedal navigation ──

function pedalNext() {
  if (isPickerOpen()) {
    pickerNavigate(1);
    return;
  }

  if (!screens.display.classList.contains('active')) return;

  if (currentSectionIndex < currentSections.length - 1) {
    currentSectionIndex++;
    showCurrentSection();
    flashControls();
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

  if (currentSectionIndex > 0) {
    currentSectionIndex--;
    showCurrentSection();
    flashControls();
    return;
  }

  openPicker();
}

function goToNextSong() {
  if (songs.length <= 1) return;
  const idx = getSongIndex(currentDisplayId);
  const nextIdx = idx < songs.length - 1 ? idx + 1 : 0;
  showSong(songs[nextIdx].id, 0);
  flashControls();
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
  // Atajos extra sin configurar (pedales comunes)
  if (action === 'next' && (key === 'ArrowRight' || key === 'ArrowDown')) return true;
  if (action === 'back' && (key === 'ArrowLeft' || key === 'ArrowUp')) return true;
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

  // No interceptar mientras se escribe
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
  if (songs.length === 0) return;
  pickerIndex = Math.max(0, getSongIndex(currentDisplayId));
  pickerList.innerHTML = '';

  songs.forEach((song, i) => {
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
  if (songs.length === 0) return;
  pickerIndex = (pickerIndex + delta + songs.length) % songs.length;
  renderPickerHighlight();
  showSong(songs[pickerIndex].id, 0);
}

// ── Event listeners ──

document.getElementById('btn-new-song').addEventListener('click', openNewSong);
document.getElementById('btn-back').addEventListener('click', () => showScreen('manage'));
document.getElementById('btn-save').addEventListener('click', saveSong);
document.getElementById('btn-delete').addEventListener('click', deleteSong);

document.getElementById('btn-exit-display').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  closePicker();
  showScreen('manage');
});

document.getElementById('btn-font-up').addEventListener('click', () => adjustFontSize(0.15));
document.getElementById('btn-font-down').addEventListener('click', () => adjustFontSize(-0.15));
document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);
document.getElementById('btn-close-picker').addEventListener('click', closePicker);

btnSetNextKey.addEventListener('click', () => startPedalCapture('next'));
btnSetBackKey.addEventListener('click', () => startPedalCapture('back'));

pickerOverlay.addEventListener('click', e => {
  if (e.target === pickerOverlay) closePicker();
});

// ── Reordenar setlist ──

let dragSongId = null;
const pointerDrag = { id: null, active: false };

function clearDragState() {
  dragSongId = null;
  pointerDrag.id = null;
  pointerDrag.active = false;
  songList.querySelectorAll('.song-item').forEach(el => {
    el.classList.remove('dragging', 'drag-over');
  });
}

function setDragOverItem(item) {
  songList.querySelectorAll('.song-item').forEach(el => {
    el.classList.toggle('drag-over', item && el === item);
  });
}

songList.addEventListener('dragstart', e => {
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

songList.addEventListener('dragend', clearDragState);

songList.addEventListener('dragover', e => {
  e.preventDefault();
  const item = e.target.closest('.song-item');
  if (!item || item.dataset.id === dragSongId) return;
  setDragOverItem(item);
});

songList.addEventListener('drop', e => {
  e.preventDefault();
  const item = e.target.closest('.song-item');
  if (!item || !dragSongId) return;
  moveSong(getSongIndex(dragSongId), getSongIndex(item.dataset.id));
  clearDragState();
});

songList.addEventListener('pointerdown', e => {
  const handle = e.target.closest('.drag-handle');
  if (!handle || e.pointerType === 'mouse') return;
  pointerDrag.id = handle.dataset.id;
  pointerDrag.active = true;
  handle.setPointerCapture(e.pointerId);
  handle.closest('.song-item')?.classList.add('dragging');
});

songList.addEventListener('pointermove', e => {
  if (!pointerDrag.active) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const item = el?.closest('.song-item');
  setDragOverItem(item && item.dataset.id !== pointerDrag.id ? item : null);
});

songList.addEventListener('pointerup', e => {
  if (!pointerDrag.active) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const item = el?.closest('.song-item');
  if (item && item.dataset.id !== pointerDrag.id) {
    moveSong(getSongIndex(pointerDrag.id), getSongIndex(item.dataset.id));
  }
  clearDragState();
});

songList.addEventListener('pointercancel', clearDragState);

songList.addEventListener('click', e => {
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
  if (action === 'edit') openEditSong(id);
  if (action === 'show') showSong(id);
  if (action === 'up') moveSongById(id, -1);
  if (action === 'down') moveSongById(id, 1);
});

displayContent.addEventListener('click', () => {
  if (songs.length > 1) openPicker();
});

let controlsTimer;
function flashControls() {
  const controls = document.querySelector('.display-controls');
  controls.classList.add('visible');
  displayTitleBar.classList.add('visible');
  sectionIndicator.classList.add('visible');
  clearTimeout(controlsTimer);
  controlsTimer = setTimeout(() => {
    controls.classList.remove('visible');
    displayTitleBar.classList.remove('visible');
    if (currentSections.length <= 1) sectionIndicator.classList.remove('visible');
  }, 2500);
}

screens.display.addEventListener('click', flashControls);
screens.display.addEventListener('touchstart', flashControls, { passive: true });

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
  if (e.key === '+' || e.key === '=') adjustFontSize(0.15);
  if (e.key === '-') adjustFontSize(-0.15);
});

// ── Init ──
loadSongs();
renderSongList();
applyFontSize();
updatePedalKeyButtons();
