import type { Lang } from './i18n.ts';

const L = {
  malecns: 'https://male-cns.janelia.org/', google: 'https://research.google/blog/a-connectomics-milestone-mapping-the-complete-male-fruit-fly-brain/',
  shiu: 'https://www.nature.com/articles/s41586-024-07763-9', aso: 'https://elifesciences.org/articles/04577', three: 'https://threejs.org/', d3: 'https://d3js.org/',
  repo: 'https://github.com/vmikh/flies-game-theory',
};
const a = (href: string, text: string) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;

export function aboutHtml(lang: Lang): string {
  if (lang === 'ru') return `
<p>Восемь мух играют в повторяющуюся дилемму заключённого. У каждой смоделирован фрагмент грибовидного тела по коннектому дрозофилы. Его обучение задано упрощённым правилом дофаминовой пластичности.</p>
<h3>Как это устроено</h3>
<p>Мозг мухи умеет одно: связать запах с наградой или наказанием и потом тянуться к нему или избегать. На этом всё и построено.</p>
<p><b>Соперник как запах.</b> У каждой мухи свой набор обонятельных входных нейронов. При встрече A с B в мозге A активируется набор B, как от настоящего запаха. Наборы не пересекаются.</p>
<p><b>Решение.</b> Сигнал идёт через грибовидное тело к выходным нейронам, которым модель назначает тягу или избегание. Их разница задаёт вероятность сотрудничества. Без опыта и при нулевом начальном доверии она близка к 50%.</p>
<p><b>Слухи.</b> За каждое действие, увиденное в чужой партии, наблюдатель получает сигнал по запаху игрока: награду за сотрудничество, наказание за предательство. Свой опыт обучает по полученной выплате. При восьми мухах за раунд бывает до шести наблюдений на один собственный опыт.</p>
<p><b>Выбывание.</b> По умолчанию каждая партия стоит два очка. Муха, у которой после выплаты не осталось очков, выбывает; дальше процент сотрудничества считается среди оставшихся игроков.</p>
<h3>Под капотом</h3>
<ul>
<li><b>Проводка</b>: грибовидное тело правого полушария из коннектома ${a(L.malecns, 'Male CNS v1.0')} (HHMI Janelia FlyEM, Google Research, Кембридж, MRC LMB; CC-BY 4.0):
2 609 нейронов, 118 773 связи от 3 синапсов: проекционные нейроны, 2 045 клеток Кеньона, 49 MBON, 170 дофаминовых нейронов, APL, DPM. Знаки нейромедиаторов из предсказаний датасета.
${a(L.google, 'Анонс Google Research')}.</li>
<li><b>Нейроны</b>: leaky integrate-and-fire, шаг 1 мс, 0.275 мВ на синапс, параметры по ${a(L.shiu, 'Shiu et al., Nature 2024')}. Каждая муха живёт в своём Web Worker; 400 мс мозгового времени считаются за ~8 мс.</li>
<li><b>Кодирование запахов</b>: каждому сопернику достаётся свой непересекающийся набор обонятельных входов. Внутренние ответы клеток Кеньона могут перекрываться, поэтому память об одном сопернике способна повлиять на отношение к другому.</li>
<li><b>Обучение</b>: память хранится в связях между клетками Кеньона и выходными нейронами MBON. При совпадении запаха и дофаминового сигнала связи к соответствующим MBON ослабевают. Модель делит MBON на группы по тому, какой вход из PPL1 или PAM преобладает в коннектоме; это упрощение известной организации грибовидного тела (${a(L.aso, 'Aso et al., eLife 2014')}).</li>
<li><b>Решение</b>: перед игрой мы запоминаем, как каждый мозг отвечает на каждый запах без всякого опыта. Дальше сравниваем ответ группы приближения и группы избегания с этим начальным: незнакомый запах даёт ноль и решение как монетка, полностью наказанный запах даёт избегание, полностью награждённый притяжение.</li>
</ul>
<p class="muted">Это модель, ограниченная частью коннектома, а не запись поведения живой мухи. Проводка и числа синапсов взяты из данных; знаки медиаторов предсказаны в датасете. Правило обучения, разделение MBON на две группы, считывание решения, перевод выплат и наблюдений в дофамин и правило выбывания заданы моделью. Один прогон не даёт устойчивой оценки: сравнивайте результаты нескольких запусков.</p>
<p class="muted">Исходный код: ${a(L.repo, 'github.com/vmikh/flies-game-theory')}</p>`;
  return `
<p>Eight flies play an iterated prisoner's dilemma. Each has a simulated mushroom body circuit built from part of a fruit fly connectome. It learns through a simplified dopamine plasticity rule.</p>
<h3>How it works</h3>
<p>A fly's brain can do one thing: link an odour with reward or punishment, then approach or avoid it. Everything is built on that.</p>
<p><b>Opponent as odour.</b> Each fly has its own set of olfactory input neurons. When A meets B, B's set is activated in A's brain, as a real odour would. The sets do not overlap.</p>
<p><b>Decision.</b> The signal runs through the mushroom body to output neurons assigned approach or avoidance by the model. Their difference sets the probability of cooperation. With no experience and zero initial trust it is close to 50%.</p>
<p><b>Gossip.</b> For each observed action in another game, a bystander receives a signal associated with that player's odour: reward for cooperation, punishment for defection. A fly's own game teaches from its payoff. With eight flies, a round can deliver six observations for one direct experience.</p>
<p><b>Dropping out.</b> By default, each game costs two points. A fly with no points after the payoff leaves; subsequent cooperation rates count the remaining players.</p>
<h3>Under the hood</h3>
<ul>
<li><b>Wiring</b>: the mushroom body of the right hemisphere from the ${a(L.malecns, 'Male CNS v1.0 connectome')} (HHMI Janelia FlyEM, Google Research, Cambridge, MRC LMB; CC-BY 4.0):
2 609 neurons, 118 773 connections with ≥3 synapses: projection neurons, 2 045 Kenyon cells, 49 MBONs, 170 dopaminergic neurons, APL, DPM. Neurotransmitter signs from the dataset's predictions.
${a(L.google, 'Google Research announcement')}.</li>
<li><b>Neurons</b>: leaky integrate-and-fire, 1 ms steps, 0.275 mV per synapse, parameters after ${a(L.shiu, 'Shiu et al., Nature 2024')}. Each fly runs in its own Web Worker; 400 ms of brain time takes ~8 ms.</li>
<li><b>Odour coding</b>: each opponent gets a disjoint set of olfactory inputs. Internal Kenyon cell responses can still overlap, so learning about one opponent can affect the response to another.</li>
<li><b>Learning</b>: memory lives in connections between Kenyon cells and output neurons (MBONs). When an odour coincides with a dopamine signal, connections to the corresponding MBONs weaken. The model assigns each MBON to a group according to whether PPL1 or PAM input dominates in the connectome; this simplifies the known organization of the mushroom body (${a(L.aso, 'Aso et al., eLife 2014')}).</li>
<li><b>Decision</b>: before the game we record how each brain responds to each odour with no experience at all. From then on we compare the response of the approach group and the avoidance group with that baseline: an unfamiliar odour gives zero and a coin-flip decision, a fully punished odour gives avoidance, a fully rewarded one attraction.</li>
</ul>
<p class="muted">This model is constrained by part of the connectome; it is not a recording of a living fly's behaviour. Wiring and synapse counts come from data; transmitter signs are dataset predictions. The learning rule, division of MBONs into two groups, decision readout, dopamine mapping for payoffs and observations, and elimination rule are modelling choices. One run is not a stable estimate: compare results across several runs.</p>
<p class="muted">Source code: ${a(L.repo, 'github.com/vmikh/flies-game-theory')}</p>`;
}
