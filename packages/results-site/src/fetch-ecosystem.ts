import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Fetches ecosystem stats (npm, GitHub, Stack Overflow) for the results site.
// A source that fails keeps its value from the previous file, so one flaky
// API never blanks a section of the site.

const OUTPUT_PATH = join('..', '..', 'results', 'ecosystem.json');

export interface EcosystemData {
  fetchedAt: string;
  /** metric key → framework → value */
  metrics: Record<string, Record<string, number>>;
  /** framework → weekly npm downloads over the last year, oldest first */
  weeklyDownloads: Record<string, number[]>;
  /** First day of each weeklyDownloads bucket (YYYY-MM-DD) */
  weeks: string[];
}

interface Source {
  npm: string;
  keyword: string;
  repo: string;
  soTag: string;
}

const SOURCES: Record<string, Source> = {
  react: { npm: 'react', keyword: 'react', repo: 'facebook/react', soTag: 'reactjs' },
  angular: { npm: '@angular/core', keyword: 'angular', repo: 'angular/angular', soTag: 'angular' },
  vue: { npm: 'vue', keyword: 'vue', repo: 'vuejs/core', soTag: 'vue.js' },
};

async function getJSON<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, {
    headers: { 'user-agent': 'frontend-framework-comparison', ...headers },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return (await res.json()) as T;
}

interface DownloadRange {
  downloads: { day: string; downloads: number }[];
}

async function npmDownloads(pkg: string) {
  const data = await getJSON<DownloadRange>(
    `https://api.npmjs.org/downloads/range/last-year/${pkg}`,
  );
  const days = data.downloads;
  // Whole weeks only, counted back from the last day, so every bucket has 7 days
  const start = days.length % 7;
  const weekly: number[] = [];
  const weeks: string[] = [];
  for (let i = start; i < days.length; i += 7) {
    weeks.push(days[i].day);
    weekly.push(days.slice(i, i + 7).reduce((sum, d) => sum + d.downloads, 0));
  }
  if (weekly.length < 8) throw new Error(`Only ${weekly.length} weeks of downloads for ${pkg}`);
  // Growth compares the last 4 weeks with the first 4, which evens out holiday dips
  const first = weekly.slice(0, 4).reduce((a, b) => a + b, 0);
  const last = weekly.slice(-4).reduce((a, b) => a + b, 0);
  return {
    weekly,
    weeks,
    lastWeek: weekly[weekly.length - 1],
    growth: first > 0 ? last / first - 1 : 0,
  };
}

async function npmKeywordPackages(keyword: string): Promise<number> {
  const data = await getJSON<{ total: number }>(
    `https://registry.npmjs.org/-/v1/search?text=keywords:${encodeURIComponent(keyword)}&size=1`,
  );
  return data.total;
}

async function npmStableReleases(pkg: string): Promise<number> {
  const data = await getJSON<{ time: Record<string, string> }>(`https://registry.npmjs.org/${pkg}`);
  const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
  return Object.entries(data.time).filter(
    ([version, time]) => /^\d+\.\d+\.\d+$/.test(version) && Date.parse(time) >= cutoff,
  ).length;
}

async function githubStars(repo: string): Promise<number> {
  const token = process.env.GITHUB_TOKEN;
  const data = await getJSON<{ stargazers_count: number }>(
    `https://api.github.com/repos/${repo}`,
    token ? { authorization: `Bearer ${token}` } : {},
  );
  return data.stargazers_count;
}

async function stackOverflowQuestions(tags: string[]): Promise<Record<string, number>> {
  const data = await getJSON<{ items: { name: string; count: number }[] }>(
    `https://api.stackexchange.com/2.3/tags/${tags.map(encodeURIComponent).join(';')}/info?site=stackoverflow`,
  );
  return Object.fromEntries(data.items.map((t) => [t.name, t.count]));
}

async function main() {
  const outputPath = join(process.cwd(), OUTPUT_PATH);
  const previous: EcosystemData | undefined = existsSync(outputPath)
    ? JSON.parse(readFileSync(outputPath, 'utf8'))
    : undefined;

  const data: EcosystemData = {
    fetchedAt: new Date().toISOString(),
    metrics: {},
    weeklyDownloads: {},
    weeks: previous?.weeks ?? [],
  };
  let failures = 0;

  const set = (metric: string, fw: string, value: number | undefined) => {
    const v = value ?? previous?.metrics[metric]?.[fw];
    if (v !== undefined) (data.metrics[metric] ??= {})[fw] = v;
  };
  const attempt = async <T>(label: string, fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (err) {
      failures++;
      console.warn(`⚠ ${label}: ${(err as Error).message} (keeping previous value)`);
      return undefined;
    }
  };

  const tagCounts = await attempt('Stack Overflow', () =>
    stackOverflowQuestions(Object.values(SOURCES).map((s) => s.soTag)),
  );

  for (const [fw, src] of Object.entries(SOURCES)) {
    const downloads = await attempt(`npm downloads (${src.npm})`, () => npmDownloads(src.npm));
    set('weekly_downloads', fw, downloads?.lastWeek);
    set('download_growth', fw, downloads?.growth);
    const weekly = downloads?.weekly ?? previous?.weeklyDownloads[fw];
    if (weekly) data.weeklyDownloads[fw] = weekly;
    if (downloads) data.weeks = downloads.weeks;

    set(
      'npm_packages',
      fw,
      await attempt(`npm search (${src.keyword})`, () => npmKeywordPackages(src.keyword)),
    );
    set(
      'stable_releases',
      fw,
      await attempt(`npm releases (${src.npm})`, () => npmStableReleases(src.npm)),
    );
    set('github_stars', fw, await attempt(`GitHub (${src.repo})`, () => githubStars(src.repo)));
    set('so_questions', fw, tagCounts?.[src.soTag]);
  }

  writeFileSync(outputPath, JSON.stringify(data, null, 2) + '\n');
  console.log(
    `Ecosystem stats written to ${outputPath}${failures ? ` (${failures} source(s) failed)` : ''}`,
  );
}

main();
