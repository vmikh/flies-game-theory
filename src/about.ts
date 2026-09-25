import type { Lang } from './i18n.ts';

const L = {
  malecns: 'https://male-cns.janelia.org/', google: 'https://research.google/blog/a-connectomics-milestone-mapping-the-complete-male-fruit-fly-brain/',
  shiu: 'https://www.nature.com/articles/s41586-024-07763-9', aso: 'https://elifesciences.org/articles/04577', three: 'https://threejs.org/', d3: 'https://d3js.org/',
  repo: 'https://github.com/vmikh/flies-game-theory', download: 'https://male-cns.janelia.org/download/', neuprint: 'https://neuprint.janelia.org/?dataset=male-cns%3Av1.0',
  cell: 'https://www.cell.com/cell/fulltext/S0092-8674(26)00815-2', flywire: 'https://flywire.ai/',
};
const a = (href: string, text: string) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;

export function aboutHtml(lang: Lang): string {
  if (lang === 'ru') return `
<p>Восемь мозгов дрозофилы играют друг с другом в игру «сотрудничать или предать». Правил игры в них не заложено: мозги настоящие, взятые из карты всех нейронов мухи, и умеют они только то, что умеет живая муха.</p>
<h3>Как муха вообще может играть</h3>
<p>Муха живёт запахами. Главное, что умеет её мозг, это запомнить: «этот запах был связан с чем-то вкусным» или «с чем-то плохим». Потом, почуяв знакомый запах, она либо идёт к нему, либо уходит. Это и есть вся её память.</p>
<p>Мы пользуемся этим так. <b>Каждой мухе выдан свой запах</b>, как бейджик с именем. Когда две мухи встречаются, каждая «нюхает» бейджик соперницы. Если память говорит «от этого запаха было хорошо», муха тянется к нему, и мы считаем это за <b>сотрудничество</b>. Если «от этого запаха было плохо», муха избегает его, и это <b>предательство</b>. Незнакомый запах ей безразличен, поэтому с незнакомцем решение почти как монетка.</p>
<p>Дальше игра платит. Если обе сотрудничали, каждая получает 3 очка. Если одна предала, а другая сотрудничала, предательница получает 5, а обманутая ничего. Если обе предали, по 1. Хорошая выплата подаётся мухе так же, как в жизни подаётся сахар: включаются нейроны удовольствия. Плохая как удар током: включаются нейроны боли. В этот момент муха всё ещё чует запах соперницы, и мозг связывает одно с другим: «запах F3 = неприятности». В следующий раз при встрече с F3 муха её избегает, то есть предаёт.</p>
<p>Мухи ещё и подглядывают за чужими партиями и получают слабый сигнал «этот запах предал» или «этот запах сотрудничал». Так рождаются слухи и репутация. Муха, у которой кончились очки, выбывает, а её место занимает копия лидера с его памятью.</p>
<p>Стратегии никто не программировал. Мы просто смотрим на поведение задним числом: как часто муха сотрудничает при первой встрече, после того как с ней поступили хорошо, и после того как её обманули. По этим трём числам ей даётся имя, например «око за око» или «всегда сотрудничает».</p>
<h3>Под капотом</h3>
<ul>
<li><b>Проводка</b>: грибовидное тело правого полушария из коннектома ${a(L.malecns, 'Male CNS v1.0')} (HHMI Janelia FlyEM, Google Research, Кембридж, MRC LMB; CC-BY 4.0):
2 609 нейронов, 118 773 связи от 3 синапсов: проекционные нейроны, 2 045 клеток Кеньона, 49 MBON, 170 дофаминовых нейронов, APL, DPM. Знаки нейромедиаторов из предсказаний датасета.
${a(L.google, 'Анонс Google Research')}.</li>
<li><b>Нейроны</b>: leaky integrate-and-fire, шаг 1 мс, 0.275 мВ на синапс, параметры по ${a(L.shiu, 'Shiu et al., Nature 2024')} (модель всего мозга самки).
Каждая муха живёт в своём Web Worker; 400 мс мозгового времени считаются за ~8 мс.</li>
<li><b>Кодирование запахов</b>: синапсы PN→PN и KC→KC отключены, вход на каждую клетку Кеньона нормирован; после этого запах зажигает 3–8 % клеток Кеньона, а коды разных запахов пересекаются на ~5 %.</li>
<li><b>Обучение</b>: дофамин ослабляет синапсы клеток Кеньона на MBON в тех компартментах, куда проецируются активные дофаминовые нейроны. Карта компартментов взята прямо из коннектома
(PPL1 → MBON11/12/14…, PAM → MBON01–07, 09…) и совпадает с ${a(L.aso, 'Aso et al., eLife 2014')}. Учит только внешний дофамин; память медленно стирается.</li>
<li><b>Решение</b>: MBON компартментов PPL1 тянут к приближению, MBON компартментов PAM к избеганию. Счёт это изменение каждой популяции относительно наивного отклика мухи на этот запах:
незнакомец это монетка, полностью наказанный запах избегается, полностью награждённый притягивает.</li>
<li><b>Контроль</b>: при перемешанной проводке (те же классы, те же числа синапсов, случайные адресаты) коды запахов пересекаются в 5 раз сильнее, обучение расползается на чужих соперников, и доверие перестаёт отслеживать поведение.
Работу делает именно конкретный коннектом.</li>
<li><b>Отрисовка</b>: настоящие ЭМ-скелеты тех же нейронов (30 % клеток Кеньона), аддитивный HDR-рендер на ${a(L.three, 'three.js')}; панели на ${a(L.d3, 'd3')}. На 1× и 2× мозги проигрывают реальные спайки каждого решения и дофамин после него.</li>
</ul>
<h3>Ссылки</h3>
<ul>
<li>Исходный код: ${a(L.repo, 'github.com/vmikh/flies-game-theory')}</li>
<li>Данные: ${a(L.download, 'загрузки Male CNS')} · ${a(L.neuprint, 'neuPrint')} · ${a(L.cell, 'Cell, 2026: половой диморфизм в полном коннектоме ЦНС самца')}</li>
<li>Мозг самки для сравнения: ${a(L.flywire, 'FlyWire')}</li>
<li>Теория игр: Р. Аксельрод, <i>Эволюция кооперации</i> (1984)</li>
</ul>
<p class="muted">Это модель, ограниченная коннектомом, а не запись живой мухи. Проводка, числа синапсов и знаки медиаторов это данные; правило обучения, считывание решения и перевод выплат в дофамин это модельные допущения.</p>`;
  return `
<p>Eight fruit-fly brains play a game of "cooperate or betray" against each other. The rules are not built into them: the brains are real, taken from the map of every neuron in a fly, and they can only do what a living fly can do.</p>
<h3>How can a fly play at all</h3>
<p>A fly lives by smell. The main thing its brain can do is remember "this smell came with something tasty" or "this smell came with something bad". Later, on meeting a familiar smell, it either walks toward it or away from it. That is the whole of its memory.</p>
<p>We use that as follows. <b>Every fly is given its own smell</b>, like a name badge. When two flies meet, each "sniffs" the other's badge. If memory says "this smell was good for me", the fly is drawn to it, and we count that as <b>cooperating</b>. If memory says "this smell was bad", the fly avoids it, and that counts as <b>betraying</b>. An unfamiliar smell leaves it indifferent, so with a stranger the choice is close to a coin flip.</p>
<p>Then the game pays out. If both cooperated, each gets 3 points. If one betrayed and the other cooperated, the betrayer gets 5 and the victim nothing. If both betrayed, 1 each. A good payout is delivered to the fly the way sugar is in real life: its pleasure neurons switch on. A bad one is delivered like an electric shock: its pain neurons switch on. At that moment the fly still smells its opponent, and the brain ties the two together: "the smell of F3 = trouble". Next time it meets F3, it avoids it, that is, it betrays.</p>
<p>Flies also watch the other games and receive a faint "this smell betrayed" or "this smell cooperated" signal. That is how gossip and reputation appear. A fly that runs out of points drops out, and a copy of the leader, memory included, takes its place.</p>
<p>Nobody programmed any strategies. We just look at behaviour afterwards: how often a fly cooperates on a first meeting, after it was treated well, and after it was cheated. Those three numbers give it a name, such as "tit-for-tat" or "always cooperates".</p>
<h3>Under the hood</h3>
<ul>
<li><b>Wiring</b>: the mushroom body of the right hemisphere from the ${a(L.malecns, 'Male CNS v1.0 connectome')} (HHMI Janelia FlyEM, Google Research, Cambridge, MRC LMB; CC-BY 4.0):
2 609 neurons, 118 773 connections with ≥3 synapses: projection neurons, 2 045 Kenyon cells, 49 MBONs, 170 dopaminergic neurons, APL, DPM. Neurotransmitter signs from the dataset's predictions.
${a(L.google, 'Google Research announcement')}.</li>
<li><b>Neurons</b>: leaky integrate-and-fire, 1 ms steps, 0.275 mV per synapse, parameters after ${a(L.shiu, 'Shiu et al., Nature 2024')} (whole-brain model of the female fly).
Each fly runs in its own Web Worker; 400 ms of brain time takes ~8 ms.</li>
<li><b>Odour coding</b>: PN→PN and KC→KC synapses are silenced and PN input per Kenyon cell is normalised; with that, each odour lights up 3–8 % of Kenyon cells and different odours overlap by ~5 %.</li>
<li><b>Learning</b>: dopamine-gated depression of Kenyon cell → MBON synapses in the compartments the active dopamine neurons innervate. The compartment map comes straight from the connectome
(PPL1 → MBON11/12/14…, PAM → MBON01–07, 09…), matching ${a(L.aso, 'Aso et al., eLife 2014')}. Only externally driven dopamine teaches; memories fade slowly.</li>
<li><b>Decision</b>: MBONs in PPL1 compartments push toward approach, MBONs in PAM compartments toward avoidance. The score is the change of each population relative to the fly's naive response to that odour,
so a stranger is a coin flip, a fully punished odour is avoided, a fully rewarded one approached.</li>
<li><b>Control</b>: with the wiring shuffled (same classes, same synapse counts, random targets) odour codes overlap 5× more, learning spills over to the wrong opponents and trust stops tracking behaviour.
The specific connectome does the work.</li>
<li><b>Drawing</b>: real EM skeletons of the same neurons (30 % of Kenyon cells), additive HDR rendering in ${a(L.three, 'three.js')}; panels in ${a(L.d3, 'd3')}. At 1× and 2× the brains replay the actual spikes of each decision and the dopamine that followed.</li>
</ul>
<h3>Links</h3>
<ul>
<li>Source code: ${a(L.repo, 'github.com/vmikh/flies-game-theory')}</li>
<li>Data: ${a(L.download, 'Male CNS downloads')} · ${a(L.neuprint, 'neuPrint')} · ${a(L.cell, 'Cell, 2026: sexual dimorphism in the complete male CNS connectome')}</li>
<li>Female brain for comparison: ${a(L.flywire, 'FlyWire')}</li>
<li>Game theory: R. Axelrod, <i>The Evolution of Cooperation</i> (1984)</li>
</ul>
<p class="muted">This is a model constrained by the connectome, not a recording of a fly. Wiring, synapse counts and transmitter signs are data; the learning rule, the decision readout and the mapping of payoffs to dopamine are modelling choices.</p>`;
}
