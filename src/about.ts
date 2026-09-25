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
<p>Память мухи устроена вокруг обоняния: её мозг умеет связать определённый запах с наградой или наказанием и потом тянуться к этому запаху или избегать его. Мы используем именно этот механизм.</p>
<p><b>Соперник как запах.</b> Каждой мухе назначен свой набор обонятельных входных нейронов. Для остальных мух она «пахнет» именно так: когда муха A встречает муху B, в мозге A активируется набор нейронов B, точно так же, как активировался бы от настоящего запаха. Восемь наборов не пересекаются, поэтому мухи не путают друг друга.</p>
<p><b>Решение.</b> Сигнал проходит через центр памяти мухи, грибовидное тело, и приходит на его выходные нейроны. Они делятся на две группы: одна у живой мухи запускает приближение, другая избегание. Какая группа ответила сильнее по сравнению с реакцией мухи на этого соперника до всякого опыта, та и решает: перевес приближения это сотрудничество, перевес избегания предательство. К незнакомцу муха равнодушна, и её первый ход близок к случайному.</p>
<p><b>Выплата.</b> Если обе сотрудничали, каждая получает 3 очка. Предавшая сотрудничавшую получает 5, обманутая 0. Если обе предали, по 1. Хорошую выплату мозг получает так же, как живая муха получает сахар: включаются дофаминовые нейроны награды. Плохую так же, как удар током: включаются нейроны наказания. Соперник в этот момент всё ещё «пахнет», и мозг по своему обычному правилу обучения связывает одно с другим. В следующий раз этот соперник будет тянуть к себе или отталкивать.</p>
<p><b>Слухи.</b> Мухи видят и чужие партии. Наблюдатель получает те же сигналы награды или наказания на каждого игрока, только ослабленные, в зависимости от того, как тот поступил. Так складывается репутация.</p>
<p><b>Выбывание.</b> Муха, у которой кончились очки, выбывает, а её место занимает копия лидера вместе с его памятью.</p>
<p><b>Стратегии.</b> Никто их не задаёт. После игры мы смотрим, как часто муха сотрудничает при первой встрече, после того как с ней поступили честно, и после того как её обманули. По этим трём числам ей даётся имя, например «око за око» или «всегда сотрудничает».</p>
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
<p>A fly's memory is built around smell: its brain can link a particular odour with reward or punishment and afterwards approach or avoid that odour. That is the mechanism we use.</p>
<p><b>Opponent as odour.</b> Every fly is assigned its own set of olfactory input neurons. To the other flies, that is what it smells like: when fly A meets fly B, B's set of neurons is activated in A's brain, exactly as a real odour would activate it. The eight sets do not overlap, so flies do not confuse one another.</p>
<p><b>Decision.</b> The signal passes through the fly's memory centre, the mushroom body, and reaches its output neurons. These come in two groups: in a living fly one drives approach, the other avoidance. Whichever group responds more strongly, compared with the fly's response to this opponent before any experience, decides: a lean toward approach is cooperation, a lean toward avoidance is defection. A stranger leaves the fly indifferent, so its first move is close to random.</p>
<p><b>Payout.</b> If both cooperated, each gets 3 points. Defecting against a cooperator pays 5, the victim gets 0. If both defected, 1 each. A good payout reaches the brain the way sugar reaches a living fly: the reward dopamine neurons switch on. A bad one arrives like an electric shock: the punishment neurons switch on. The opponent still "smells" at that moment, and the brain, following its own ordinary learning rule, ties the two together. Next time, that opponent will attract or repel.</p>
<p><b>Gossip.</b> Flies also watch the other games. An observer receives the same reward or punishment signals for each player, only weaker, depending on what the player did. That is how reputation forms.</p>
<p><b>Dropping out.</b> A fly that runs out of points drops out, and a copy of the leader, memory included, takes its place.</p>
<p><b>Strategies.</b> Nobody assigns them. After the game we look at how often a fly cooperates on a first meeting, after it was treated fairly, and after it was cheated. Those three numbers give it a name, such as "tit-for-tat" or "always cooperates".</p>
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
