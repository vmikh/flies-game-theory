/** Two-language UI strings. `t(key)` returns the string for the current language; `setLang` notifies listeners. */
export type Lang = 'en' | 'ru';
type Entry = { en: string; ru: string };

const D = {
  title: { en: 'Flies · Game Theory', ru: 'Мухи · Теория игр' },
  starting: { en: 'starting…', ru: 'запуск…' },
  loadingSkeletons: { en: 'loading skeletons…', ru: 'загрузка скелетов…' },
  spawning: { en: 'spawning {n} brains…', ru: 'создаём {n} мозгов…' },
  building: { en: 'building brains…', ru: 'строим мозги…' },
  shuffledWiring: { en: 'shuffled wiring', ru: 'перемешанная проводка' },
  statusLine: { en: 'round {r} · {g} games · coop {c}%', ru: 'раунд {r} · {g} партий · сотрудничество {c}%' },
  roundsPerSec: { en: '{v} rounds/s', ru: '{v} раундов/с' },
  play: { en: '▶ Play', ru: '▶ Играть' }, pause: { en: '❚❚ Pause', ru: '❚❚ Пауза' },
  parameters: { en: 'Parameters', ru: 'Параметры' }, aboutTitle: { en: 'About this experiment', ru: 'Об эксперименте' },
  // panel
  experiment: { en: 'Experiment', ru: 'Эксперимент' }, restartApplies: { en: '(Restart applies)', ru: '(применяется после перезапуска)' },
  gossip: { en: 'gossip', ru: 'слухи' },
  gossipHint: { en: 'how much a fly learns from games it only watches; 0 = own experience only, 1 = as strong as its own', ru: 'насколько муха учится на чужих партиях; 0 — только свой опыт, 1 — как на своём' },
  forgetting: { en: 'forgetting', ru: 'забывание' },
  forgettingHint: { en: 'share of memory that fades each round; 0.05 ≈ grudges last ~20 rounds', ru: 'какая доля памяти стирается за раунд; 0.05 ≈ обида живёт ~20 раундов' },
  trustBias: { en: 'trust bias', ru: 'доверие к незнакомцу' },
  trustBiasHint: { en: 'how a fly treats a stranger: 0 coin flip, +0.5 trusting, −0.5 wary', ru: '0 — монетка, +0.5 — скорее доверяет, −0.5 — скорее нет' },
  payoffs: { en: 'payoffs', ru: 'выплаты' }, payoffsHint: { en: 'temptation / reward / punishment / sucker', ru: 'искушение / награда / наказание / простак' },
  presetClassic: { en: 'classic 5 / 3 / 1 / 0', ru: 'классика 5 / 3 / 1 / 0' }, presetGenerous: { en: 'generous 5 / 4 / 1 / 0', ru: 'щедрый мир 5 / 4 / 1 / 0' }, presetHarsh: { en: 'harsh 8 / 3 / 1 / 0', ru: 'жёсткий мир 8 / 3 / 1 / 0' },
  lesions: { en: 'Lesions', ru: 'Лезии' }, perFly: { en: '(per fly)', ru: '(для каждой мухи)' },
  restart: { en: 'Restart with these parameters', ru: 'Перезапустить с этими параметрами' },
  advanced: { en: 'Advanced', ru: 'Дополнительно' },
  // lesion labels + hints
  'les.none': { en: 'intact', ru: 'здоровая' }, 'les.none.hint': { en: '', ru: '' },
  'les.noPPL1': { en: 'no PPL1', ru: 'без PPL1' }, 'les.noPPL1.hint': { en: 'punishment dopamine silenced: cannot learn to avoid', ru: 'нет дофамина наказания: не умеет обижаться' },
  'les.noPAM': { en: 'no PAM', ru: 'без PAM' }, 'les.noPAM.hint': { en: 'reward dopamine silenced: cannot learn to approach', ru: 'нет дофамина награды: не умеет доверять' },
  'les.noDAN': { en: 'no dopamine', ru: 'без дофамина' }, 'les.noDAN.hint': { en: 'no learning at all', ru: 'не учится вообще' },
  'les.halfKC': { en: 'half KCs', ru: 'половина клеток Кеньона' }, 'les.halfKC.hint': { en: 'half of the Kenyon cells silenced: coarser odour memory', ru: 'хуже различает соперников' },
  'les.noAPL': { en: 'no APL', ru: 'без APL' }, 'les.noAPL.hint': { en: 'inhibitory APL silenced: dense, overlapping odour codes', ru: 'нет торможения: коды запахов слипаются' },
  // strategies
  'st.tit-for-tat': { en: 'tit-for-tat', ru: 'око за око' }, 'st.forgiving tit-for-tat': { en: 'forgiving tit-for-tat', ru: 'отходчивое око за око' },
  'st.always cooperates': { en: 'always cooperates', ru: 'всегда сотрудничает' }, 'st.defector': { en: 'defector', ru: 'предатель' },
  'st.contrarian': { en: 'contrarian', ru: 'наоборот' }, 'st.unstable': { en: 'unstable', ru: 'неустойчивая' }, 'st.…': { en: '…', ru: '…' },
  firstMeeting: { en: 'first meeting', ru: 'первая встреча' }, afterC: { en: 'after C', ru: 'после C' }, afterD: { en: 'after D', ru: 'после D' },
  afterOppC: { en: 'after opponent cooperated', ru: 'после сотрудничества соперника' }, afterOppD: { en: 'after opponent defected', ru: 'после предательства соперника' },
  // side panel
  ranking: { en: 'Ranking', ru: 'Рейтинг' }, trust: { en: 'Trust', ru: 'Доверие' },
  trustSub: { en: 'how the fly feels about each opponent<br>green approach, red avoid', ru: 'как муха относится к каждому сопернику<br>зелёный — тянет, красный — избегает' },
  cooperation: { en: 'Cooperation', ru: 'Сотрудничество' }, cooperationSub: { en: 'share of cooperative choices, last 200 decisions', ru: 'доля сотрудничества, последние 200 решений' },
  lastGames: { en: 'Last games', ru: 'Последние партии' },
  stats: { en: '{g} games · coop {c}% · betrayed {b}', ru: '{g} партий · сотр. {c}% · предана {b}' },
  out: { en: 'out', ru: 'выбыла' }, gameOver: { en: 'game over', ru: 'игра окончена' },
  cooperated: { en: 'cooperated', ru: 'сотрудничала' }, defected: { en: 'defected', ru: 'предала' }, pCoop: { en: 'p(cooperate)', ru: 'p(сотрудничать)' },
  // caption
  money: { en: 'money', ru: 'денег' }, games: { en: 'games', ru: 'партий' }, cooperates: { en: 'cooperates', ru: 'сотрудничает' },
  lastGame: { en: 'Last game · R{r} vs F{o}', ru: 'Последняя партия · R{r} против F{o}' },
  smells: { en: 'smells F{o}', ru: 'нюхает F{o}' }, approachMinusAvoid: { en: 'approach − avoid', ru: 'тяга − избегание' },
  decides: { en: 'decides', ru: 'решает' }, decCoop: { en: 'cooperates', ru: 'сотрудничает' }, decDefect: { en: 'defects', ru: 'предаёт' },
  payoff: { en: 'payoff', ru: 'выплата' }, reward: { en: 'reward · PAM dopamine', ru: 'награда · дофамин PAM' }, punishment: { en: 'punishment · PPL1 dopamine', ru: 'наказание · дофамин PPL1' },
  movieNote: { en: 'activity replay is recorded at 1× and 2× only', ru: 'активность записывается только на 1× и 2×' },
  back: { en: '← Back', ru: '← Назад' },
} satisfies Record<string, Entry>;

export type Key = keyof typeof D;
const urlLang = new URLSearchParams(location.search).get('lang') as Lang | null;
let lang: Lang = urlLang === 'ru' || urlLang === 'en' ? urlLang : ((localStorage.getItem('lang') as Lang) || (navigator.language.startsWith('ru') ? 'ru' : 'en'));
const listeners: (() => void)[] = [];
export const getLang = () => lang;
export function setLang(l: Lang) { lang = l; localStorage.setItem('lang', l); document.documentElement.lang = l; for (const f of listeners) f(); }
export function onLang(f: () => void) { listeners.push(f); }
export function t(key: Key, vars: Record<string, string | number> = {}): string {
  let s: string = D[key][lang]; for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v)); return s;
}
export const strategyLabel = (label: string) => t((`st.${label}` as Key) in D ? (`st.${label}` as Key) : 'st.unstable');
export const lesionLabel = (id: string) => t(`les.${id}` as Key);
export const lesionHint = (id: string) => t(`les.${id}.hint` as Key);
