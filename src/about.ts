import type { Lang } from './i18n.ts';

const L = {
  malecns: 'https://male-cns.janelia.org/', google: 'https://research.google/blog/a-connectomics-milestone-mapping-the-complete-male-fruit-fly-brain/',
  shiu: 'https://www.nature.com/articles/s41586-024-07763-9', aso: 'https://elifesciences.org/articles/04577', three: 'https://threejs.org/', d3: 'https://d3js.org/',
  repo: 'https://github.com/vmikh/flies-game-theory', download: 'https://male-cns.janelia.org/download/', neuprint: 'https://neuprint.janelia.org/?dataset=male-cns%3Av1.0',
  cell: 'https://www.cell.com/cell/fulltext/S0092-8674(26)00815-2',
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
<li><b>Кодирование запахов</b>: синапсы PN→PN и KC→KC отключены, вход на каждую клетку Кеньона нормирован; после этого запах зажигает 3–8 % клеток Кеньона, а коды разных запахов пересекаются на ~5 %.</li>
<li><b>Обучение</b>: дофамин ослабляет синапсы клеток Кеньона на MBON в тех компартментах, куда проецируются активные дофаминовые нейроны. Карта компартментов взята прямо из коннектома
(PPL1 → MBON11/12/14…, PAM → MBON01–07, 09…) и совпадает с ${a(L.aso, 'Aso et al., eLife 2014')}. Учит только внешний дофамин; память медленно стирается.</li>
<li><b>Решение</b>: MBON компартментов PPL1 тянут к приближению, MBON компартментов PAM к избеганию. Счёт это изменение каждой популяции относительно наивного отклика мухи на этот запах:
незнакомец это монетка, полностью наказанный запах избегается, полностью награждённый притягивает.</li>
</ul>
<h3>Ссылки</h3>
<ul>
<li>Исходный код: ${a(L.repo, 'github.com/vmikh/flies-game-theory')}</li>
<li>Данные: ${a(L.download, 'загрузки Male CNS')} · ${a(L.neuprint, 'neuPrint')} · ${a(L.cell, 'Cell, 2026: половой диморфизм в полном коннектоме ЦНС самца')}</li>
<li>Теория игр: Р. Аксельрод, <i>Эволюция кооперации</i> (1984)</li>
</ul>
<p class="muted">Это модель, ограниченная коннектомом, а не запись живой мухи. Проводка, числа синапсов и знаки медиаторов это данные; правило обучения, считывание решения и перевод выплат в дофамин это модельные допущения.</p>`;
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
<li><b>Odour coding</b>: PN→PN and KC→KC synapses are silenced and PN input per Kenyon cell is normalised; with that, each odour lights up 3–8 % of Kenyon cells and different odours overlap by ~5 %.</li>
<li><b>Learning</b>: dopamine-gated depression of Kenyon cell → MBON synapses in the compartments the active dopamine neurons innervate. The compartment map comes straight from the connectome
(PPL1 → MBON11/12/14…, PAM → MBON01–07, 09…), matching ${a(L.aso, 'Aso et al., eLife 2014')}. Only externally driven dopamine teaches; memories fade slowly.</li>
<li><b>Decision</b>: MBONs in PPL1 compartments push toward approach, MBONs in PAM compartments toward avoidance. The score is the change of each population relative to the fly's naive response to that odour,
so a stranger is a coin flip, a fully punished odour is avoided, a fully rewarded one approached.</li>
</ul>
<h3>Links</h3>
<ul>
<li>Source code: ${a(L.repo, 'github.com/vmikh/flies-game-theory')}</li>
<li>Data: ${a(L.download, 'Male CNS downloads')} · ${a(L.neuprint, 'neuPrint')} · ${a(L.cell, 'Cell, 2026: sexual dimorphism in the complete male CNS connectome')}</li>
<li>Game theory: R. Axelrod, <i>The Evolution of Cooperation</i> (1984)</li>
</ul>
<p class="muted">This is a model constrained by the connectome, not a recording of a fly. Wiring, synapse counts and transmitter signs are data; the learning rule, the decision readout and the mapping of payoffs to dopamine are modelling choices.</p>`;
}
