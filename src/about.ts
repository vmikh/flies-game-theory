import type { Lang } from './i18n.ts';

const L = {
  malecns: 'https://male-cns.janelia.org/', google: 'https://research.google/blog/a-connectomics-milestone-mapping-the-complete-male-fruit-fly-brain/',
  shiu: 'https://www.nature.com/articles/s41586-024-07763-9', aso: 'https://elifesciences.org/articles/04577', three: 'https://threejs.org/', d3: 'https://d3js.org/',
  repo: 'https://github.com/vmikh/flies-game-theory',
};
const a = (href: string, text: string) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;

export function aboutHtml(lang: Lang): string {
  if (lang === 'ru') return `
<p>Восемь мух играют в повторяющуюся дилемму заключённого. У каждой настоящий мозг из карты всех нейронов дрозофилы, и учится он только через дофамин, как у живой мухи.</p>
<h3>Как это устроено</h3>
<p>Мозг мухи умеет одно: связать запах с наградой или наказанием и потом тянуться к нему или избегать. На этом всё и построено.</p>
<p><b>Соперник как запах.</b> У каждой мухи свой набор обонятельных входных нейронов. При встрече A с B в мозге A активируется набор B, как от настоящего запаха. Наборы не пересекаются.</p>
<p><b>Решение.</b> Сигнал идёт через центр памяти, грибовидное тело, к выходным нейронам двух групп: приближение и избегание. Перевес приближения это сотрудничество, избегания предательство. К незнакомцу муха равнодушна.</p>
<p><b>Слухи.</b> Мухи видят сотрудничество друг друга и получают те же сигналы на каждого игрока, только слабее. Так складывается репутация.</p>
<p><b>Выбывание.</b> Муха без очков выбывает.</p>
<h3>Под капотом</h3>
<ul>
<li><b>Проводка</b>: грибовидное тело правого полушария из коннектома ${a(L.malecns, 'Male CNS v1.0')} (HHMI Janelia FlyEM, Google Research, Кембридж, MRC LMB; CC-BY 4.0):
2 609 нейронов, 118 773 связи от 3 синапсов: проекционные нейроны, 2 045 клеток Кеньона, 49 MBON, 170 дофаминовых нейронов, APL, DPM. Знаки нейромедиаторов из предсказаний датасета.
${a(L.google, 'Анонс Google Research')}.</li>
<li><b>Нейроны</b>: leaky integrate-and-fire, шаг 1 мс, 0.275 мВ на синапс, параметры по ${a(L.shiu, 'Shiu et al., Nature 2024')}. Каждая муха живёт в своём Web Worker; 400 мс мозгового времени считаются за ~8 мс.</li>
<li><b>Кодирование запахов</b>: запах приходит на 2 045 клеток Кеньона и зажигает 3–8 % из них, а наборы для разных запахов совпадают только на 5 %, то есть мозг надёжно отличает одного соперника от другого.</li>
<li><b>Обучение</b>: память хранится в связях между клетками Кеньона и выходными нейронами MBON. Когда одновременно активен запах и дофаминовый нейрон, связи, ведущие к тем MBON, которые этот нейрон обслуживает, ослабевают. Какие нейроны какие MBON обслуживают, взято прямо из коннектома, и эта карта совпадает с известной из экспериментов (${a(L.aso, 'Aso et al., eLife 2014')}): нейроны наказания PPL1 обслуживают MBON приближения, нейроны награды PAM обслуживают MBON избегания. Поэтому наказание глушит тягу к запаху, а награда глушит отвращение.</li>
<li><b>Решение</b>: перед игрой мы запоминаем, как каждый мозг отвечает на каждый запах без всякого опыта. Дальше сравниваем ответ группы приближения и группы избегания с этим начальным: незнакомый запах даёт ноль и решение как монетка, полностью наказанный запах даёт избегание, полностью награждённый притяжение.</li>
</ul>
<p class="muted">Это модель, ограниченная коннектомом, а не запись живой мухи. Проводка, числа синапсов и знаки медиаторов это данные; правило обучения, считывание решения и перевод выплат в дофамин это модельные допущения.</p>
<p class="muted">${a(L.repo, 'Исходный код')}</p>`;
  return `
<p>Eight flies play an iterated prisoner's dilemma. Each has a real brain from the map of every neuron in a fruit fly, and it learns only through dopamine, like a living fly.</p>
<h3>How it works</h3>
<p>A fly's brain can do one thing: link an odour with reward or punishment, then approach or avoid it. Everything is built on that.</p>
<p><b>Opponent as odour.</b> Each fly has its own set of olfactory input neurons. When A meets B, B's set is activated in A's brain, as a real odour would. The sets do not overlap.</p>
<p><b>Decision.</b> The signal runs through the memory centre, the mushroom body, to two groups of output neurons: approach and avoidance. Approach wins: cooperate. Avoidance wins: defect. A stranger leaves the fly indifferent.</p>
<p><b>Gossip.</b> Flies see each other's play and receive the same signals for each player, only weaker. That is how reputation forms.</p>
<p><b>Dropping out.</b> A fly with no points left is out.</p>
<h3>Under the hood</h3>
<ul>
<li><b>Wiring</b>: the mushroom body of the right hemisphere from the ${a(L.malecns, 'Male CNS v1.0 connectome')} (HHMI Janelia FlyEM, Google Research, Cambridge, MRC LMB; CC-BY 4.0):
2 609 neurons, 118 773 connections with ≥3 synapses: projection neurons, 2 045 Kenyon cells, 49 MBONs, 170 dopaminergic neurons, APL, DPM. Neurotransmitter signs from the dataset's predictions.
${a(L.google, 'Google Research announcement')}.</li>
<li><b>Neurons</b>: leaky integrate-and-fire, 1 ms steps, 0.275 mV per synapse, parameters after ${a(L.shiu, 'Shiu et al., Nature 2024')}. Each fly runs in its own Web Worker; 400 ms of brain time takes ~8 ms.</li>
<li><b>Odour coding</b>: an odour reaches 2 045 Kenyon cells and lights up 3–8 % of them; the sets for different odours overlap by only 5 %, so the brain reliably tells one opponent from another.</li>
<li><b>Learning</b>: memory lives in the connections between Kenyon cells and the output neurons, the MBONs. When an odour and a dopamine neuron are active at the same time, the connections leading to the MBONs that neuron serves weaken. Which neurons serve which MBONs comes straight from the connectome, and the map matches the one known from experiments (${a(L.aso, 'Aso et al., eLife 2014')}): punishment neurons PPL1 serve the approach MBONs, reward neurons PAM serve the avoidance MBONs. So punishment mutes the pull toward an odour, and reward mutes the aversion.</li>
<li><b>Decision</b>: before the game we record how each brain responds to each odour with no experience at all. From then on we compare the response of the approach group and the avoidance group with that baseline: an unfamiliar odour gives zero and a coin-flip decision, a fully punished odour gives avoidance, a fully rewarded one attraction.</li>
</ul>
<p class="muted">This is a model constrained by the connectome, not a recording of a fly. Wiring, synapse counts and transmitter signs are data; the learning rule, the decision readout and the mapping of payoffs to dopamine are modelling choices.</p>
<p class="muted">${a(L.repo, 'Source code')}</p>`;
}
