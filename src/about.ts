import type { Lang } from './i18n.ts';

const L = {
  malecns: 'https://male-cns.janelia.org/', google: 'https://research.google/blog/a-connectomics-milestone-mapping-the-complete-male-fruit-fly-brain/',
  shiu: 'https://www.nature.com/articles/s41586-024-07763-9', aso: 'https://elifesciences.org/articles/04577',
  repo: 'https://github.com/vmikh/flies-game-theory',
};
const a = (href: string, label: string) => `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;

export function aboutHtml(lang: Lang): string {
  if (lang === 'ru') return `
<p>Восемь виртуальных мух раз за разом играют в дилемму заключённого. В каждой партии обе решают, сотрудничать или предать. За разные сочетания решений они получают разное число очков. Со временем их поведение меняется.</p>
<h3>Как мухи учатся</h3>
<p>Чтобы муха различала соперников, каждому дали свой условный «запах». При встрече модель подаёт соответствующий сигнал на обонятельные нейроны мухи. Затем он проходит через грибовидное тело. В мозге дрозофилы этот отдел помогает связывать запахи с наградой и наказанием.</p>
<p>Модель сравнивает сигналы приближения и избегания. От них зависит <b>вероятность сотрудничества</b>. Если муха ничего не знает о сопернике и начальное доверие равно нулю, шанс составляет около 50%.</p>
<p>После партии муха учится на полученных очках. Если её предали, шанс сотрудничать с другой мухой тоже может немного снизиться: сигналы разных соперников иногда задействуют одни и те же нейроны.</p>
<p>Муха наблюдает и за чужими партиями: сотрудничество даёт положительный сигнал, а предательство даёт отрицательный. Так мнение о сопернике может появиться ещё до личной встречи. Силу влияния чужого опыта и скорость забывания можно менять в параметрах.</p>
<h3>Как читать результаты</h3>
<p>По умолчанию каждая партия стоит мухе два очка. Когда очки заканчиваются, муха выбывает. Состав игроков со временем меняется, и это тоже влияет на результат.</p>
<p>В полной версии процент вверху показывает долю сотрудничества <b>среди всех решений с начала игры</b>, в том числе решений выбывших мух. Даже с одинаковыми настройками результаты могут различаться. По одному запуску нельзя судить, значима ли разница между настройками. Для этого проведите серию независимых прогонов каждого варианта и сравните средний результат и разброс.</p>
<h3>На чём основана модель</h3>
<p>Схема нейронных связей взята из ${a(L.malecns, 'коннектома мозга дрозофилы Male CNS v1.0')}. Правила игры, перевод очков в сигналы обучения и перевод активности мозга в решение заданы авторами модели.</p>
<details class="about-details"><summary>Технические подробности и источники</summary><div class="about-details-content">
<ul>
<li>Используется часть грибовидного тела правого полушария: 2 609 нейронов и 118 773 связей не менее чем с тремя синапсами. Среди них 2 045 клеток Кеньона, 49 выходных и 170 дофаминовых нейронов, а также входные нейроны, APL и DPM. Данные подготовлены HHMI Janelia FlyEM, Google Research, Кембриджем и MRC LMB и доступны по лицензии CC-BY 4.0. См. ${a(L.google, 'обзор Google Research')}. Знаки нейромедиаторов в датасете предсказаны.</li>
<li>Активность нейронов рассчитывается с шагом 1 мс по упрощённой импульсной модели. Параметры взяты из ${a(L.shiu, 'Shiu et al., Nature 2024')}. Каждый мозг работает отдельно.</li>
<li>У каждого соперника свой набор входных нейронов. Эти наборы не пересекаются, но дальше сигнал может пройти через одни и те же клетки грибовидного тела. Поэтому обучение на одном сопернике способно немного изменить отношение к другому.</li>
<li>Память меняет связи от клеток Кеньона к выходным нейронам. Деление этих нейронов на две группы по входам PPL1 и PAM и правило изменения связей упрощают устройство грибовидного тела, описанное в ${a(L.aso, 'Aso et al., eLife 2014')}. Ответ каждого мозга до обучения служит точкой отсчёта для будущих решений.</li>
</ul></div></details>
<p class="muted">Исходный код: ${a(L.repo, 'github.com/vmikh/flies-game-theory')}</p>`;
  return `
<p>Eight virtual flies play the prisoner's dilemma round after round. In each game, both choose whether to cooperate or defect. Different pairs of choices earn different numbers of points. Their behaviour changes as they play.</p>
<h3>How the flies learn</h3>
<p>To help a fly tell opponents apart, the model gives each one a distinct, simulated “odour”. When two flies meet, the model sends the corresponding signal to the olfactory neurons. It then passes through the mushroom body. In real fruit flies, this area helps link odours with reward and punishment.</p>
<p>The model compares signals for approaching and avoiding an opponent. These set the <b>chance of cooperation</b>. With no information about an opponent and zero initial trust, the chance is about 50%.</p>
<p>After a game, a fly learns from the points it earned. If another fly defects against it, its chance of cooperating with a different fly may also drop a little: the two opponents' signals can activate some of the same neurons.</p>
<p>The fly also watches other games: cooperation gives it a positive signal, defection a negative one. It may have an opinion about an opponent before they have met. The effect of watching others and the rate of forgetting can be changed in the settings.</p>
<h3>Reading the results</h3>
<p>By default, each game costs a fly two points. A fly leaves when its points run out. The mix of players changes over time, and that affects the results.</p>
<p>In the full version, the percentage at the top shows the share of cooperative choices <b>since the start of the game</b>, including choices made by flies that later left. Results can differ even with the same settings. A single run cannot tell you whether a difference between settings is statistically meaningful. Run each set of settings several times and compare both the average and the spread of the results.</p>
<h3>Where the model comes from</h3>
<p>The neural wiring comes from the ${a(L.malecns, 'Male CNS v1.0 fruit fly connectome')}. The game rules and the ways points become learning signals and brain activity becomes a choice were set by the model's authors.</p>
<details class="about-details"><summary>Technical details and sources</summary><div class="about-details-content">
<ul>
<li>The circuit is part of the right mushroom body: 2,609 neurons and 118,773 connections with at least three synapses. It contains 2,045 Kenyon cells, 49 output neurons, 170 dopamine neurons, input neurons, APL and DPM. The data was prepared by HHMI Janelia FlyEM, Google Research, Cambridge and MRC LMB and is available under CC-BY 4.0. See the ${a(L.google, 'Google Research overview')}. Neurotransmitter signs in the dataset are predictions.</li>
<li>Neural activity is calculated in 1 ms steps with a simplified spiking model. Parameters come from ${a(L.shiu, 'Shiu et al., Nature 2024')}. Each brain runs separately.</li>
<li>Each opponent has its own set of input neurons. These sets do not overlap, but the signals can pass through some of the same cells inside the mushroom body. Learning about one opponent can therefore slightly change the response to another.</li>
<li>Memory changes connections from Kenyon cells to output neurons. Grouping these neurons by PPL1 and PAM input, along with the rule for changing connections, simplifies the mushroom body organisation described by ${a(L.aso, 'Aso et al., eLife 2014')}. Each brain's response before learning serves as a baseline for later choices.</li>
</ul></div></details>
<p class="muted">Source code: ${a(L.repo, 'github.com/vmikh/flies-game-theory')}</p>`;
}

export function renderAbout(container: HTMLElement, lang: Lang): void {
  const wasOpen = container.querySelector<HTMLDetailsElement>('.about-details')?.open ?? false;
  container.innerHTML = aboutHtml(lang);
  const details = container.querySelector<HTMLDetailsElement>('.about-details')!;
  const summary = details.querySelector('summary')!;
  const content = details.querySelector<HTMLElement>('.about-details-content')!;
  details.open = wasOpen;
  let expanded = wasOpen;
  let animation: Animation | null = null;

  summary.addEventListener('click', (event) => {
    event.preventDefault();
    const currentHeight = details.open ? content.getBoundingClientRect().height : 0;
    animation?.cancel();
    expanded = !expanded;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      details.open = expanded;
      return;
    }
    if (expanded) details.open = true;
    const targetHeight = expanded ? content.scrollHeight : 0;
    animation = content.animate(
      [{ height: `${currentHeight}px`, opacity: currentHeight ? 1 : 0 }, { height: `${targetHeight}px`, opacity: expanded ? 1 : 0 }],
      { duration: 280, easing: 'ease-in-out' },
    );
    animation.onfinish = () => {
      if (!expanded) details.open = false;
      animation = null;
    };
  });
}
