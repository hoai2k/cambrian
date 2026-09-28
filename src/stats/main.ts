import { GOATCOUNTER_SITE, dashboardUrl, pathFilter, STATS_VIEWS } from '../shared/config-stats';

/**
 * The /stats/ page's one script (stats/index.html). It lived inline in the page, where no type
 * check reached it; here `tsc` checks it against `config-stats.ts` like everything else.
 *
 * Two pages in one, because the honest answer differs before and after setup. Unconfigured, a
 * blank dashboard would read as "nobody has ever played them" — the single most misleading thing
 * this page could say — so it shows the steps instead and claims no numbers at all.
 */
const url = dashboardUrl(GOATCOUNTER_SITE);
const mount = document.getElementById('mount')!;

if (!url) {
  mount.innerHTML = `
    <div class="panel">
      <p><strong>Not switched on yet.</strong> Nothing is being counted, and nothing has been
      counted in the past — this page cannot show history that was never recorded. Four steps,
      about five minutes:</p>
      <ol>
        <li>Register a site at <a href="https://www.goatcounter.com/signup">goatcounter.com/signup</a>.
          The <em>code</em> you choose becomes the dashboard subdomain.</li>
        <li>Put that code in <code>src/shared/config-stats.ts</code> —
          <code>export const GOATCOUNTER_SITE = 'yourcode';</code></li>
        <li>In GoatCounter, <em>Settings → Sites that can embed GoatCounter</em>, add
          <code>games.hoai.net</code>, so the dashboard can appear on this page rather than
          only on theirs.</li>
        <li>Push to <code>main</code>. The next deploy starts counting.</li>
      </ol>
      <p>One site covers all four counted pages: GoatCounter records the path of every visit,
      so the three games and the trilogy page are told apart by filtering rather
      than by keeping separate counters — and one site can hold other games on the same domain
      without their visits landing in these views. Only the games are counted: the specimen
      viewer, the dev workbench and this page are not. Counting
      starts the moment it is switched on — visits before that are gone, because Pages keeps
      no log to backfill from.</p>
    </div>`;
} else {
  const chips = STATS_VIEWS.map((v, i) =>
    `<button class="chip" data-i="${i}" data-view="${v.id}" aria-pressed="${i === 0}">${v.name}</button>`).join('');
  mount.innerHTML = `
    <div class="panel">
      <p>All four counted pages report to one counter, so <strong>All of it</strong> is the
      trilogy whole — every page under <code>/cambrian/</code>, which is where this site is
      published. The other chips narrow it to one game, and each filter is anchored to the
      path, so a game's view is that game and nothing that merely mentions it. The same
      GoatCounter site may hold other things on this domain; they are not in any of these
      views, and the unfiltered dashboard behind the link below is where they would be.</p>
      <div class="chips">${chips}</div>
      <p class="chip-note" id="note"></p>
    </div>
    <div class="frame-wrap">
      <iframe id="frame" title="GoatCounter dashboard" loading="lazy" referrerpolicy="no-referrer"></iframe>
    </div>
    <p class="sub" style="margin-top:.6rem">Frame blank, or asking you to sign in? A browser
    withholds the GoatCounter session cookie inside a frame on another domain, so a private
    dashboard cannot show here however you are logged in. In GoatCounter,
    <em>Settings → Dashboard viewable by</em>, choose <em>Anyone</em> — or leave it private and
    use the open link above the frame, which carries the same filter. The frame is a
    convenience; their page is the record. (A frame also needs this site listed under
    <em>Settings → Sites that can embed GoatCounter</em>.)</p>`;

  const frame = document.getElementById('frame') as HTMLIFrameElement;
  const note = document.getElementById('note')!;
  const show = (i: number) => {
    const v = STATS_VIEWS[i];
    // hideui= drops the dashboard's own chrome inside the frame; the link out deliberately
    // keeps it, because that page is the record and the filter box should be reachable there.
    const f = encodeURIComponent(pathFilter(v.path, v.exact));
    frame.src = `${url}/?filter=${f}&hideui=1`;
    note.innerHTML = `${v.blurb} <a href="${url}/?filter=${f}"
      target="_blank" rel="noopener">Open this view in GoatCounter ↗</a>`;
    for (const b of document.querySelectorAll<HTMLElement>('.chip')) b.setAttribute('aria-pressed', String(+b.dataset.i! === i));
  };
  for (const b of document.querySelectorAll<HTMLElement>('.chip')) b.addEventListener('click', () => show(+b.dataset.i!));
  show(0);
}
