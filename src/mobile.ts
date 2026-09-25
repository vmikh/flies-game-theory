import { Circuit } from './circuit.ts';
import { Arena } from './arena.ts';
import { renderAbout } from './about.ts';
import { getLang, onLang, setLang, t } from './i18n.ts';
import { initAnalytics, track } from './analytics.ts';

initAnalytics();

const app = document.getElementById('app')!;
app.innerHTML = `
<div class="mobile-page">
  <section class="mobile-hero" aria-label="">
    <div id="mobile-brain"></div>
    <button id="mobile-lang" class="btn btn-link mobile-lang" type="button" aria-label="Switch language"></button>
    <div class="mobile-hero-meta">
      <span id="mobile-drag"></span>
      <span class="mobile-live" aria-hidden="true"><i></i><i></i><i></i></span>
    </div>
    <div id="mobile-loading" class="mobile-loading" role="status"></div>
  </section>
  <main class="mobile-content">
    <h1 id="mobile-title"></h1>
    <p id="mobile-desktop-note" class="mobile-desktop-note"></p>
    <section class="mobile-description" aria-labelledby="mobile-about-title">
      <h2 id="mobile-about-title"></h2>
      <div id="mobile-about-body"></div>
    </section>
  </main>
</div>`;

const langButton = document.getElementById('mobile-lang') as HTMLButtonElement;
const hero = document.querySelector('.mobile-hero') as HTMLElement;
const loading = document.getElementById('mobile-loading')!;

function renderText() {
  document.documentElement.lang = getLang();
  document.title = t('title');
  langButton.textContent = getLang() === 'ru' ? 'EN' : 'RU';
  langButton.setAttribute('aria-label', t('mobileLanguage'));
  hero.setAttribute('aria-label', t('mobileBrainLabel'));
  document.getElementById('mobile-drag')!.textContent = t('mobileDrag');
  document.getElementById('mobile-title')!.textContent = t('title');
  document.getElementById('mobile-desktop-note')!.textContent = t('mobileDesktopNote');
  document.getElementById('mobile-about-title')!.textContent = t('aboutTitle');
  renderAbout(document.getElementById('mobile-about-body')!, getLang());
  if (!loading.hidden) loading.textContent = t('mobileBrainLoading');
}

langButton.onclick = () => { const lang = getLang() === 'ru' ? 'en' : 'ru'; setLang(lang); track('language_changed', { language: lang }); };
onLang(renderText);
renderText();

try {
  const circuit = await Circuit.load();
  const arena = await Arena.load(document.getElementById('mobile-brain')!, circuit, 1);
  arena.enableShowcase();
  loading.hidden = true;
} catch (error) {
  loading.textContent = t('mobileBrainUnavailable');
  console.error(error);
}
