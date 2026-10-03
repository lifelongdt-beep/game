#!/usr/bin/env node
// 카드뉴스 렌더링 검증: 데스크톱(700px)·모바일(390px)에서 가로 스크롤, 텍스트 겹침, 잘림, 카드 이음매, 랭킹 우측 열 충돌을 검사한다.
//   node scripts/card-news/validate-card.js [--file docs/briefing-infographic.html] [--out <스크린샷 폴더>]
// 샌드박스는 외부 네트워크가 막혀 있어 이미지 요청은 16:9 회색 SVG로 대체해 레이아웃만 본다(실제 이미지는 hotlinkOk로 확인).
// 문제가 있으면 종료 코드 1. 스크린샷(JPEG)은 --out 폴더에 저장하며, 필요할 때만 열어 본다.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const argv = process.argv.slice(2);
const getOpt = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const FILE = path.resolve(getOpt('--file') || 'docs/briefing-infographic.html');
const OUT = path.resolve(getOpt('--out') || path.join(os.tmpdir(), 'card-shots'));
fs.mkdirSync(OUT, { recursive: true });

const SEL = [
  '.cover-category', '.cover-headline', '.cover-summary', '.cover-divider', '.tag-pills',
  '.hand-title', '.check-tag', '.split-title', '.split-text', '.split-img', '.slide-footer-label',
  '.overlay-script', '.overlay-lead', '.overlay-body', '.overlay-quote',
  '.bold-sub', '.bold-title', '.rank-item', '.rank-summary-pill',
];

// 설치된 Playwright 버전과 브라우저 버전이 어긋나는 환경이 있어, 후보 모듈을 차례로 시도한다.
async function launch() {
  const candidates = ['playwright', '/opt/node22/lib/node_modules/playwright'];
  try {
    candidates.push(path.join(execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright'));
  } catch (_) {}
  const errors = [];
  for (const c of candidates) {
    try {
      return await require(c).chromium.launch();
    } catch (e) {
      errors.push(`${c}: ${String(e.message).split('\n')[0]}`);
    }
  }
  throw new Error('Playwright를 실행하지 못했습니다.\n' + errors.join('\n'));
}

async function checkWidth(browser, width) {
  const page = await browser.newPage({ viewport: { width, height: 1200 } });
  await page.route('**/*', (route) => {
    const req = route.request();
    if (req.url().startsWith('file:')) return route.continue();
    if (req.resourceType() === 'image') {
      return route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="100%" height="100%" fill="#7a8696"/></svg>',
      });
    }
    return route.abort();
  });
  await page.goto('file://' + FILE, { waitUntil: 'load' });
  await page.waitForTimeout(500);

  const res = await page.evaluate((SEL) => {
    const out = { overflowX: 0, slides: [], seams: [], overlaps: [], clipped: [], outside: [], rankCollisions: 0 };
    const de = document.documentElement;
    out.overflowX = de.scrollWidth - de.clientWidth;
    const slides = [...document.querySelectorAll('.card-slide')];
    slides.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      out.slides.push(`${i + 1}:${Math.round(r.height)}`);
      if (s.scrollHeight > s.clientHeight + 1) out.clipped.push({ slide: i + 1, scrollH: s.scrollHeight, clientH: s.clientHeight });
      const rects = SEL.flatMap((q) => [...s.querySelectorAll(q)]).map((e) => ({ e, r: e.getBoundingClientRect() }));
      rects.forEach(({ e, r }) => {
        if (r.right > window.innerWidth + 1 || r.left < -1) out.outside.push({ slide: i + 1, cls: e.className, left: Math.round(r.left), right: Math.round(r.right) });
      });
      for (let a = 0; a < rects.length; a++) {
        for (let b = a + 1; b < rects.length; b++) {
          const A = rects[a], B = rects[b];
          if (A.e.contains(B.e) || B.e.contains(A.e)) continue;
          const ix = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
          const iy = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
          if (ix > 1 && iy > 1) out.overlaps.push({ slide: i + 1, a: A.e.className, b: B.e.className, ix: Math.round(ix), iy: Math.round(iy) });
        }
      }
    });
    for (let i = 0; i + 1 < slides.length; i++) {
      out.seams.push(Math.round((slides[i + 1].getBoundingClientRect().top - slides[i].getBoundingClientRect().bottom) * 10) / 10);
    }
    document.querySelectorAll('.rank-item').forEach((it) => {
      const m = it.querySelector('.rank-meta'), f = it.querySelector('.rank-figures');
      if (!m || !f) return;
      const mr = m.getBoundingClientRect(), fr = f.getBoundingClientRect();
      const lines = m.querySelectorAll('b, span');
      const textRight = Math.max(...[...lines].map((l) => {
        const rg = document.createRange();
        rg.selectNodeContents(l);
        return rg.getBoundingClientRect().right;
      }));
      if (textRight > fr.left + 1 && Math.min(mr.bottom, fr.bottom) - Math.max(mr.top, fr.top) > 1) out.rankCollisions += 1;
    });
    return out;
  }, SEL);

  const problems = [];
  if (res.overflowX > 0) problems.push(`가로 스크롤 ${res.overflowX}px`);
  if (res.overlaps.length) problems.push(`겹침 ${res.overlaps.length}건 ${JSON.stringify(res.overlaps.slice(0, 5))}`);
  if (res.clipped.length) problems.push(`잘림 ${JSON.stringify(res.clipped)}`);
  if (res.outside.length) problems.push(`폭 이탈 ${JSON.stringify(res.outside.slice(0, 5))}`);
  if (res.seams.some((g) => Math.abs(g) > 0.5)) problems.push(`카드 이음매 간격 ${JSON.stringify(res.seams)}`);
  if (res.rankCollisions) problems.push(`랭킹 이름/가격 열 충돌 ${res.rankCollisions}건`);

  console.log(`[${width}px] ${problems.length ? 'ISSUES' : 'OK'} slides=${res.slides.join(',')} seams=${JSON.stringify(res.seams)}`);
  problems.forEach((p) => console.log('  - ' + p));

  const slides = page.locator('.card-slide');
  const n = await slides.count();
  for (let i = 0; i < n; i++) {
    await slides.nth(i).screenshot({ path: path.join(OUT, `w${width}-slide${i + 1}.jpg`), type: 'jpeg', quality: 70 });
  }
  const top = await page.evaluate(() => document.querySelector('.slide-ranking').getBoundingClientRect().top + scrollY);
  await page.screenshot({ path: path.join(OUT, `w${width}-rank-top.jpg`), type: 'jpeg', quality: 80, fullPage: true, clip: { x: 0, y: top, width, height: 900 } });
  await page.close();
  return problems.length;
}

(async () => {
  const browser = await launch();
  let bad = 0;
  for (const w of [700, 390]) bad += await checkWidth(browser, w);
  await browser.close();
  console.log(`스크린샷: ${OUT}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => {
  console.error(e.message);
  process.exit(2);
});
