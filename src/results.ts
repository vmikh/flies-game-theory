import type { Lang } from './i18n.ts';

const REPORT = 'https://github.com/vmikh/flies-game-theory/tree/main/experiments';
const a = (href: string, label: string) => `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;

/** Summary of the headless parameter sweep (experiments/), shown behind the "i" button next to the podcast. */
export function resultsHtml(lang: Lang): string {
  if (lang === 'ru') return `
<h3>Как проводили</h3>
<p>Виртуальные мухи сыграли турнир по повторяющейся дилемме заключённого. Было проверено 14 наборов настроек, по 100 игр на каждый. Всего 1400 игр по 35 раундов. Прогоны шли автоматически и заняли около 7 часов 45 минут.</p>
<p>На этом сайте та же модель работает в ручном режиме. Здесь можно менять параметры и отключать отдельные части мозга.</p>
<h3>Кто выигрывает лично</h3>
<p>Лучший личный результат показала муха с отключённым сигналом награды (дофаминовые нейроны PAM). Она сотрудничала лишь в 35% партий. В турнире мутантов она заняла первое место в 48 играх из 100.</p>
<p>К концу игры эта муха в среднем увеличивала капитал на 88%. Обычная муха увеличивала его на 44%. В целом чем чаще муха предавала, тем чаще она побеждала.</p>
<h3>Что происходит с группой</h3>
<p>При пониженном базовом доверии (−0.5) доля сотрудничества падала до 28%. Средний капитал мухи сокращался на 26%.</p>
<p>При повышенном базовом доверии (+0.5) мухи сотрудничали в 82% партий. Средний капитал вырастал на 92%. Когда сотрудничают все, выигрывает и группа в целом, и в среднем каждая муха.</p>
<h3>Выводы</h3>
<ul>
<li>Если сотрудничают все, выигрывают все.</li>
<li>Если в группе есть предатель, выигрывает он.</li>
<li>Если предают все, общий выигрыш заметно меньше.</li>
</ul>
<hr class="divider results-divider">
<p class="muted results-note">Это модель на реальной схеме нейронов, а не поведение живых мух. Полный отчёт и данные: ${a(REPORT, 'github.com/vmikh/flies-game-theory/experiments')}</p>`;
  return `
<h3>How it was run</h3>
<p>Virtual flies played a tournament of the iterated prisoner's dilemma. We tested 14 sets of settings with 100 games each. That makes 1,400 games of 35 rounds. The runs were automated and took about 7 hours 45 minutes.</p>
<p>This site runs the same model by hand. You can change the settings and switch off parts of the brain.</p>
<h3>Who wins individually</h3>
<p>The best individual result came from a fly without the reward signal (PAM dopamine neurons). It cooperated in only 35% of games. In the mutant tournament it finished first in 48 games out of 100.</p>
<p>By the end of a game this fly grew its money by 88% on average. An intact fly grew its money by 44%. Overall, the more often a fly defected, the more often it won.</p>
<h3>What happens to the group</h3>
<p>With lowered baseline trust (−0.5), cooperation fell to 28%. The average fly lost 26% of its money.</p>
<p>With raised baseline trust (+0.5), flies cooperated in 82% of games. The average fly's money grew by 92%. When everyone cooperates, both the group and, on average, each fly come out ahead.</p>
<h3>Conclusions</h3>
<ul>
<li>If everyone cooperates, everyone wins.</li>
<li>If the group has a defector, the defector wins.</li>
<li>If everyone defects, there is much less to share.</li>
</ul>
<hr class="divider results-divider">
<p class="muted results-note">This is a model built on a real neural wiring diagram, not the behaviour of living flies. Full report and data: ${a(REPORT, 'github.com/vmikh/flies-game-theory/experiments')}</p>`;
}
