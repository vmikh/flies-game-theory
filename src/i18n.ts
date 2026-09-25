/** Two-language UI strings. `t(key)` returns the string for the current language; `setLang` notifies listeners. */
export type Lang = 'en' | 'ru';
type Entry = { en: string; ru: string };

const D = {
  title: { en: 'Flies and game theory', ru: 'Мухи и теория игр' },
  mobileLanguage: { en: 'Switch language', ru: 'Сменить язык' },
  mobileBrainLabel: { en: 'Interactive fruit fly brain model', ru: 'Интерактивная модель мозга мухи' },
  mobileBrainLoading: { en: 'Loading the brain…', ru: 'Загружаем мозг…' },
  mobileBrainUnavailable: { en: 'The 3D model could not be loaded.', ru: 'Не удалось загрузить 3D-модель.' },
  mobileDrag: { en: 'Drag to rotate the brain', ru: 'Потяните, чтобы повернуть мозг' },
  mobileDesktopNote: { en: 'Open this site on a desktop screen (1350 px or wider) to watch and control the full experiment.', ru: 'Чтобы посмотреть эксперимент целиком и управлять им, откройте сайт на компьютере с экраном от 1350 px.' },
  starting: { en: 'starting…', ru: 'запуск…' },
  loadingSkeletons: { en: 'loading skeletons…', ru: 'загрузка скелетов…' },
  spawning: { en: 'spawning {n} brains…', ru: 'создаём {n} мозгов…' },
  building: { en: 'building brains…', ru: 'строим мозги…' },
  shuffledWiring: { en: 'shuffled wiring', ru: 'перемешанная проводка' },
  statusLine: { en: 'round {r} · all decisions: {c}% cooperative', ru: 'раунд {r} · сотрудничество за всё время: {c}%' },
  roundsPerSec: { en: '{v} rounds/s', ru: '{v} раундов/с' },
  play: { en: 'Play', ru: 'Играть' }, pause: { en: 'Pause', ru: 'Пауза' },
  parameters: { en: 'Parameters', ru: 'Параметры' }, aboutTitle: { en: 'About this experiment', ru: 'Об эксперименте' }, about: { en: 'About', ru: 'О проекте' }, close: { en: 'Close', ru: 'Закрыть' },
  // panel
  experiment: { en: 'Experiment', ru: 'Эксперимент' }, restartApplies: { en: '(Restart applies)', ru: '(применяется после перезапуска)' },
  gossip: { en: 'gossip', ru: 'слухи' },
  gossipHint: { en: 'signal strength per observed action; with 8 flies, up to 6 observed actions per round;<br>0: own experience only.', ru: 'сила сигнала за каждое увиденное действие; при 8 мухах до 6 наблюдений за раунд;<br>0: только свой опыт.' },
  forgetting: { en: 'forgetting', ru: 'забывание' },
  forgettingHint: { en: 'share of memory that fades each round;<br>0.05 ≈ a grudge lasts ~20 rounds.', ru: 'какая доля памяти стирается за раунд;<br>0.05 ≈ обида живёт ~20 раундов.' },
  trustBias: { en: 'baseline trust on every move', ru: 'базовое доверие в каждой партии' },
  trustBiasHint: { en: 'added to the brain score on every decision, including repeat meetings;<br>0: first unseen opponent ≈ 50%; +0.5: more trusting; −0.5: more wary.', ru: 'прибавляется к сигналу мозга при каждом решении, включая повторные встречи;<br>0: первый незнакомый соперник ≈ 50%; +0.5: доверчивее; −0.5: осторожнее.' },
  payoffs: { en: 'payoffs', ru: 'выплаты' }, payoffsHint: { en: 'temptation / reward / punishment / sucker', ru: 'искушение / награда / наказание / простак' },
  presetClassic: { en: 'classic 5 / 3 / 1 / 0', ru: 'классика 5 / 3 / 1 / 0' }, presetGenerous: { en: 'generous 5 / 4 / 1 / 0', ru: 'щедрый мир 5 / 4 / 1 / 0' }, presetHarsh: { en: 'harsh 8 / 3 / 1 / 0', ru: 'жёсткий мир 8 / 3 / 1 / 0' },
  lesions: { en: 'Mutations', ru: 'Мутации' }, perFly: { en: '(set per fly)', ru: '(отдельно для каждой мухи)' },
  mutationsHint: { en: 'A mutant fly has part of its brain switched off. What it does to behaviour:', ru: 'У мухи-мутанта отключена часть мозга. Как это меняет поведение:' },
  apply: { en: 'Apply and restart', ru: 'Применить и начать заново' }, cancel: { en: 'Cancel', ru: 'Отмена' },
  advanced: { en: 'Advanced', ru: 'Дополнительно' },
  wiring: { en: 'wiring', ru: 'проводка' }, realConnectome: { en: 'real connectome', ru: 'реальный коннектом' }, shuffledControl: { en: 'shuffled (control)', ru: 'перемешанный (контроль)' },
  seed: { en: 'seed', ru: 'зерно случайности' }, newSeedEachRestart: { en: 'new each restart', ru: 'новое при каждом запуске' },
  temperature: { en: 'temperature', ru: 'температура выбора' }, decisionWindow: { en: 'decision window, ms', ru: 'время на решение, мс' },
  learningWindow: { en: 'learning window, ms', ru: 'время обучения, мс' }, antePerGame: { en: 'ante per game', ru: 'взнос за партию' },
  startMoney: { en: 'start money', ru: 'стартовые очки' }, payoffMatrix: { en: 'payoff T / R / P / S', ru: 'выплаты T / R / P / S' },
  // lesion labels + hints
  'les.none': { en: 'normal', ru: 'обычная' }, 'les.none.hint': { en: '', ru: '' },
  'les.noPPL1': { en: 'no PPL1', ru: 'без PPL1' }, 'les.noPPL1.hint': { en: 'no punishment signal, cannot hold a grudge: cooperates with almost everyone and gets exploited', ru: 'не чувствует наказания и не умеет обижаться: сотрудничает почти со всеми, и её доят' },
  'les.noPAM': { en: 'no PAM', ru: 'без PAM' }, 'les.noPAM.hint': { en: 'no reward signal, cannot learn to trust: drifts into defection and profits from the trusting', ru: 'не чувствует награды и не умеет доверять: скатывается в предательство и наживается на доверчивых' },
  'les.noDAN': { en: 'no dopamine', ru: 'без дофамина' }, 'les.noDAN.hint': { en: 'no learning at all: plays at random, remembers nobody', ru: 'не учится вообще: играет случайно, никого не помнит' },
  'les.halfKC': { en: 'half KCs', ru: 'половина клеток Кеньона' }, 'les.halfKC.hint': { en: 'half the memory cells are gone: tells opponents apart poorly, grudges land on the wrong fly', ru: 'половины клеток памяти нет: плохо различает соперников, обиды достаются не тем' },
  'les.noAPL': { en: 'no APL', ru: 'без APL' }, 'les.noAPL.hint': { en: 'no inhibition, all opponents look alike: one betrayal sours it on everyone', ru: 'нет торможения, все соперники на одно лицо: одно предательство портит отношение ко всем' },
  // strategies
  'st.tit-for-tat': { en: 'tit-for-tat', ru: 'око за око' }, 'st.forgiving tit-for-tat': { en: 'forgiving tit-for-tat', ru: 'отходчивое око за око' },
  'st.always cooperates': { en: 'always cooperates', ru: 'всегда сотрудничает' }, 'st.defector': { en: 'defector', ru: 'предатель' },
  'st.contrarian': { en: 'contrarian', ru: 'наоборот' }, 'st.unstable': { en: 'unstable', ru: 'неустойчивая' }, 'st.…': { en: '…', ru: '…' },
  firstMeeting: { en: 'First direct meeting', ru: 'Первая личная встреча' }, afterC: { en: 'Opponent cooperated', ru: 'Соперник сотрудничал' }, afterD: { en: 'Opponent defected', ru: 'Соперник предал' },
  afterOppC: { en: 'after opponent cooperated', ru: 'после сотрудничества соперника' }, afterOppD: { en: 'after opponent defected', ru: 'после предательства соперника' },
  choiceRates: { en: 'Response to opponents', ru: 'Ответ на действия соперника' },
  sampleGames: { en: '{n} games', ru: '{n} партий' },
  choiceNoData: { en: 'too few games', ru: 'мало партий' },
  // side panel
  ranking: { en: 'Ranking', ru: 'Рейтинг' }, trust: { en: 'Trust', ru: 'Доверие' },
  trustSub: { en: 'how the fly feels about each opponent<br>green approach, red avoid', ru: 'как муха относится к каждому сопернику<br>зелёный: тянет, красный: избегает' },
  cooperation: { en: 'Cooperation', ru: 'Сотрудничество' }, cooperationSub: { en: 'share of cooperative choices, last 200 decisions', ru: 'доля сотрудничества, последние 200 решений' },
  lastGames: { en: 'Last games', ru: 'Последние партии' },
  roundShort: { en: 'R{r}', ru: 'Р{r}' }, versus: { en: 'vs', ru: 'против' },
  roundsStat: { en: 'rounds {n}', ru: 'раундов {n}' },
  stats: { en: 'coop {c}% · betrayed {b}', ru: 'сотр. {c}% · предана {b}' },
  gameOver: { en: 'game over', ru: 'игра окончена' },
  cooperated: { en: 'cooperated', ru: 'сотрудничала' }, defected: { en: 'defected', ru: 'предала' }, pCoop: { en: 'p(cooperate)', ru: 'p(сотрудничать)' },
  // caption
  money: { en: 'money', ru: 'денег' }, games: { en: 'games', ru: 'партий' }, cooperates: { en: 'cooperates', ru: 'сотрудничает' },
  lastGame: { en: 'Last game', ru: 'Последняя партия' },
  roundAgainst: { en: 'Round {r} · vs F{o}', ru: 'Раунд {r} · против F{o}' },
  brainResponse: { en: 'Brain signal', ru: 'Сигнал мозга' },
  approachMinusAvoid: { en: 'approach − avoid', ru: 'тяга − избегание' },
  coopChance: { en: 'chance to cooperate', ru: 'шанс сотрудничества' },
  payoff: { en: 'payoff', ru: 'выплата' }, reward: { en: 'reward · PAM dopamine', ru: 'награда · дофамин PAM' }, punishment: { en: 'punishment · PPL1 dopamine', ru: 'наказание · дофамин PPL1' },
  back: { en: 'Back', ru: 'Назад' },
} satisfies Record<string, Entry>;

export type Key = keyof typeof D;
const urlLang = new URLSearchParams(location.search).get('lang') as Lang | null;
const savedLang = localStorage.getItem('lang');
let lang: Lang = urlLang === 'ru' || urlLang === 'en' ? urlLang : savedLang === 'ru' || savedLang === 'en' ? savedLang : navigator.language.startsWith('ru') ? 'ru' : 'en';
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
