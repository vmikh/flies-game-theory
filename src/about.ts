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
<p>Восемь мух играют друг с другом в повторяющуюся дилемму заключённого. Игра в них не запрограммирована: у каждой настоящий мозг из карты всех нейронов дрозофилы, муха сама решает, сотрудничать или предать, и учится только так, как учится живая муха, через дофамин.</p>
<h3>Как это устроено</h3>
<p>В браузере нет никаких запахов. Всё взаимодействие построено на прямом воздействии на нейроны, и делается это так.</p>
<ol>
<li><b>У каждой мухи есть удостоверение.</b> Это фиксированный набор входных нейронов обонятельной системы. У живой мухи такой набор включился бы от конкретного запаха; здесь мы включаем его напрямую, электрически. Итого восемь наборов, не пересекающихся между собой, по одному на муху.</li>
<li><b>Встреча.</b> Когда муха A играет с мухой B, в мозге A мы активируем удостоверение B и даём мозгу 0.6 секунды поработать. Сигнал проходит через центр памяти мухи, грибовидное тело, и доходит до его выходных нейронов. Они делятся на две группы: одна у живой мухи означает «иди к этому», другая «уходи от этого».</li>
<li><b>Решение.</b> Мы сравниваем, какая группа ответила сильнее относительно того, как этот мозг отвечал на это удостоверение до всякого опыта. Перевес «иди к этому» считаем сотрудничеством, перевес «уходи» предательством. Для незнакомца перевеса нет, и решение близко к монетке.</li>
<li><b>Выплата.</b> Если обе сотрудничали, каждая получает 3 очка; предательница против сотрудничавшей получает 5, обманутая 0; если обе предали, по 1. Хорошую выплату мы подаём в мозг так же, как в жизни подаётся сахар: включаем нейроны награды. Плохую как удар током: включаем нейроны наказания. Удостоверение соперницы в этот момент всё ещё активно, и мозг сам, по своему обычному правилу обучения, ослабляет связи так, что в следующий раз этот набор нейронов будет тянуть к «уходи» или к «иди».</li>
<li><b>Слухи.</b> Мухи, не участвующие в партии, тоже получают удостоверения игроков вместе со слабым сигналом награды или наказания в зависимости от того, что игрок сделал. Так возникает репутация.</li>
<li><b>Выбывание.</b> Муха, у которой кончились очки, выбывает, а её место занимает копия лидера вместе с его памятью, слегка искажённой.</li>
</ol>
<p>Стратегии никто не программировал. Мы смотрим на поведение задним числом: как часто муха сотрудничает при первой встрече, после того как с ней поступили хорошо, и после того как её обманули. По этим трём числам ей даётся имя, например «око за око» или «всегда сотрудничает».</p>
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
<p>Eight flies play an iterated prisoner's dilemma against each other. Nothing about the game is programmed into them: each has a real brain from the map of every neuron in a fruit fly, decides for itself whether to cooperate or defect, and learns only the way a living fly learns, through dopamine.</p>
<h3>How it works</h3>
<p>There are no smells in the browser. Everything is done by acting on neurons directly, like this.</p>
<ol>
<li><b>Every fly has an ID badge.</b> It is a fixed set of input neurons of the olfactory system. In a living fly that set would be switched on by one particular smell; here we switch it on directly, electrically. Eight non-overlapping sets, one per fly.</li>
<li><b>A meeting.</b> When fly A plays fly B, we activate B's badge inside A's brain and let the brain run for 0.6 seconds. The signal passes through the fly's memory centre, the mushroom body, and reaches its output neurons. Those come in two groups: in a living fly one means "go toward this", the other "get away from this".</li>
<li><b>The decision.</b> We compare which group responded more strongly, relative to how this brain responded to this badge before any experience. A lean toward "go toward" counts as cooperating, a lean toward "get away" as betraying. For a stranger there is no lean, so the choice is close to a coin flip.</li>
<li><b>The payout.</b> If both cooperated, each gets 3 points; a betrayer against a cooperator gets 5, the victim 0; if both betrayed, 1 each. A good payout is delivered to the brain the way sugar is in real life: we switch on the reward neurons. A bad one is delivered like an electric shock: we switch on the punishment neurons. The opponent's badge is still active at that moment, and the brain, following its own ordinary learning rule, weakens connections so that next time this set of neurons pulls toward "get away" or toward "go toward".</li>
<li><b>Gossip.</b> Flies not playing in a game also receive the players' badges together with a faint reward or punishment signal, depending on what each player did. That is where reputation comes from.</li>
<li><b>Dropping out.</b> A fly that runs out of points drops out, and a copy of the leader, memory included and slightly perturbed, takes its place.</li>
</ol>
<p>Nobody programmed any strategies. We look at behaviour afterwards: how often a fly cooperates on a first meeting, after it was treated well, and after it was cheated. Those three numbers give it a name, such as "tit-for-tat" or "always cooperates".</p>
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
