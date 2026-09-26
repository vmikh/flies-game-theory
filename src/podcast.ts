/**
 * Podcast player in the bottom-right corner of the arena: one episode per language, the site language picks it.
 * Follows the narration player of earth-simulator: play, seek, time, playback speed.
 */
import { t, getLang, onLang, type Lang } from './i18n.ts';
import { track } from './analytics.ts';

const SRC: Record<Lang, string> = { en: '/audio/podcast-en.mp3', ru: '/audio/podcast-ru.mp3' };
const RATES = [0.75, 1, 1.25, 1.5, 2];
const ICON = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
};
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function mountPodcast(container: HTMLElement) {
  const el = document.createElement('section'); el.id = 'podcast';
  el.innerHTML = `<audio preload="metadata"></audio>
    <div class="podcast-controls">
      <button type="button" class="btn podcast-play"></button>
      <input type="range" class="range" min="0" max="1" step="0.1" value="0" disabled>
      <span class="podcast-time">0:00 / 0:00</span>
      <select class="select select-sm podcast-rate">${RATES.map((r) => `<option value="${r}"${r === 1 ? ' selected' : ''}>${r}×</option>`).join('')}</select>
    </div>
    <div class="podcast-error" role="status" hidden></div>`;
  container.appendChild(el);
  const audio = el.querySelector('audio')!, playBtn = el.querySelector<HTMLButtonElement>('.podcast-play')!;
  const seek = el.querySelector<HTMLInputElement>('.range')!, time = el.querySelector<HTMLElement>('.podcast-time')!;
  const rate = el.querySelector<HTMLSelectElement>('.podcast-rate')!, error = el.querySelector<HTMLElement>('.podcast-error')!;
  let failed = false;

  const duration = () => (Number.isFinite(audio.duration) ? audio.duration : 0);
  const showTime = () => { time.textContent = `${clock(audio.currentTime)} / ${clock(duration())}`; seek.value = String(audio.currentTime); };
  const showButton = () => { const on = !audio.paused; playBtn.innerHTML = on ? ICON.pause : ICON.play; playBtn.setAttribute('aria-label', on ? t('podcastPause') : failed ? t('podcastRetry') : t('podcastPlay')); };
  const setFailed = (v: boolean) => { failed = v; error.hidden = !v; error.textContent = v ? t('podcastError') : ''; showButton(); };
  const applyLang = () => {
    el.setAttribute('aria-label', t('podcast'));
    seek.setAttribute('aria-label', t('podcastPosition')); rate.setAttribute('aria-label', t('podcastSpeed'));
    if (failed) error.textContent = t('podcastError');
    showButton();
  };
  const load = () => {   // each language has its own episode; switching starts it from the beginning
    audio.pause(); audio.src = SRC[getLang()]; audio.load(); setFailed(false);
    seek.max = '1'; seek.value = '0'; seek.disabled = true; showTime();
  };

  playBtn.onclick = async () => {
    if (!audio.paused) { audio.pause(); return; }
    if (failed) audio.load();
    audio.playbackRate = Number(rate.value); audio.preservesPitch = true; setFailed(false);
    try { await audio.play(); track('podcast_played', { language: getLang(), from: Math.round(audio.currentTime) }); } catch { setFailed(true); }
  };
  seek.oninput = () => { audio.currentTime = Number(seek.value); showTime(); };
  rate.onchange = () => { audio.playbackRate = Number(rate.value); };
  audio.onplay = audio.onpause = showButton;
  audio.onloadedmetadata = () => { seek.max = String(duration() || 1); seek.disabled = !duration(); audio.playbackRate = Number(rate.value); showTime(); };
  audio.ontimeupdate = showTime;
  audio.onended = () => { audio.currentTime = 0; showButton(); };
  audio.onerror = () => { if (audio.getAttribute('src')) setFailed(true); };

  onLang(() => { load(); applyLang(); });
  load(); applyLang();
}
