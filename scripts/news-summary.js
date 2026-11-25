// 지역 브리핑 뉴스에 "핵심 내용"(기사 앞부분 요약 한두 문장)을 붙인다.
//
// 구글 뉴스 RSS는 제목과 링크만 주고, 링크(news.google.com/rss/articles/...)는 진짜 브라우저에서만 언론사
// 기사로 넘어간다(resolve-article-images.js 주석 참고). 그래서 Playwright로 기사를 열어 대표 설명
// (og:description)과 본문 첫 문단을 읽고, 기자 이름·매체 머리말을 떼어 2~3문장(180자 안쪽)으로 줄인다.
// AI 요약이 아니라 기사 첫머리를 그대로 옮긴 것이다.
//
// 기사 하나는 한 번만 읽는다: 링크별 결과를 .cache/regions-raw/news-x.json에 14일 동안 보관하고(Actions 캐시),
// 매일 실행에서는 시간 예산 안에서 새 기사만 읽는다(전국 뉴스 먼저, 그다음 시군구 뉴스). 다 못 읽은 기사는
// 다음 날 이어서 읽거나, 제목만 보인다. Playwright가 없으면 아무것도 하지 않는다.
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '..', '.cache', 'regions-raw', 'news-x.json');
const KEEP_DAYS = 14;
const RETRY_FAILED_DAYS = 2;
const MAX_LEN = 180;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const squash = (s) => String(s || '').replace(/\s+/g, ' ').trim();

// 기사 첫머리의 매체·기자 머리말과 이메일, 사진 설명 꼬리를 뗀다.
function cleanLead(text) {
  let s = squash(text);
  for (let i = 0; i < 3; i++) {
    const before = s;
    s = s
      .replace(/^[[【(<][^\]】)>]{0,40}[\]】)>]\s*/, '') // [서울경제] (인천=연합뉴스) 【파이낸셜뉴스】
      .replace(/^[^.,!?]{0,25}?기자\s*[=|:\-–]?\s*/, '') // 홍길동 기자 = / 홍길동 기자 |
      .replace(/^[가-힣A-Za-z0-9 ]{1,15}=\s*/, '') // 아시아경제=
      .replace(/^[▲△■□●○◆◇▶▷※·\-–]+\s*/, '');
    if (s === before) break;
  }
  return s
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '')
    .replace(/\s*(사진|그래픽|자료)\s*=\s*[^.]{0,30}$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 문장 경계(…다. / …요. / ?!)에서 끊어 MAX_LEN 안쪽으로 줄인다. 한 문장도 안 들어가면 말줄임표로 자른다.
function shorten(text, max = MAX_LEN) {
  if (text.length <= max) return text;
  const sentences = text.match(/[^.!?]+?(?:다|요|음|함|임|됨)\.(?=\s|$)|[^.!?]+?[!?](?=\s|$)/g) || [];
  let out = '';
  for (const s of sentences) {
    if ((out + s).trim().length > max) break;
    out = (out + s).trim() + ' ';
  }
  out = out.trim();
  if (out.length >= 40) return out;
  return text.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

// 카드뉴스 배경으로 쓸 대표 사진: 다른 사이트에서 그대로 걸어도(Referer 없이) 뜨는지 확인하고, 로고·작은 썸네일은 버린다.
// 검단 카드뉴스(resolve-article-images.js)와 같은 보정: //주소 → https, http → https, 작은 썸네일 → 원본 주소.
async function usableImage(image) {
  if (!image) return '';
  let base = image.startsWith('//') ? `https:${image}` : image;
  if (!/^https?:\/\//.test(base) || /\/logo\/|snslogo|favicon|\/common\//i.test(base)) return '';
  const cands = [];
  if (/\/news\/thumbnail\/.*_v\d+\.\w+$/.test(base)) cands.push(base.replace('/news/thumbnail/', '/news/photo/').replace(/_v\d+(\.\w+)$/, '$1'));
  if (/\/\.cache\/\d+\//.test(base)) cands.push(base.replace(/\/\.cache\/\d+\//, '/'));
  cands.push(base);
  // 화면이 https라 http 사진은 막히므로 https 주소만 쓴다.
  for (const u of [...new Set(cands.map((c) => c.replace(/^http:\/\//, 'https://')))]) {
    try {
      const res = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
      const type = res.headers.get('content-type') || '';
      if (!res.ok || !type.startsWith('image/')) continue;
      const bytes = (await res.arrayBuffer()).byteLength;
      if (bytes >= 15000) return u;
    } catch (_) {
      // 다음 후보
    }
  }
  return '';
}

const normForCompare = (s) => s.replace(/[^가-힣A-Za-z0-9]/g, '');

// 대표 설명이 충분히 길고 제목을 되풀이한 게 아니면 그것을, 아니면 본문 앞부분을 쓴다.
function pickSummary({ desc, body }, title = '') {
  const t = normForCompare(title);
  const ok = (s) => {
    const n = normForCompare(s);
    return n.length >= 40 && !(t && (n === t || (t.includes(n) && n.length < t.length + 10)));
  };
  const d = cleanLead(desc);
  const b = cleanLead(body);
  const chosen = ok(d) && !/\.\.\.$|…$/.test(d) ? d : ok(b) ? b : ok(d) ? d : '';
  if (!chosen) return '';
  const x = shorten(chosen);
  // 제목만 다시 적은 요약은 버린다.
  return ok(x) ? x : '';
}

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveCache(cache, now = Date.now()) {
  const keep = {};
  for (const [link, v] of Object.entries(cache)) if (now - v.at < KEEP_DAYS * 864e5) keep[link] = v;
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(keep));
}

// 브라우저 안에서 도는 함수: 대표 설명과 본문 앞부분을 읽는다.
function readArticleInPage() {
  const content = (sel) => {
    const m = document.querySelector(sel);
    return m ? (m.getAttribute('content') || '').trim() : '';
  };
  const desc = content('meta[property="og:description"]') || content('meta[name="description"]') || content('meta[name="twitter:description"]');
  const root = document.querySelector(
    '[itemprop="articleBody"], #articleBody, #article-view-content-div, .article_body, .article-body, #newsct_article, #dic_area, #cont_newstext, .detail-body, .view_cont, .news_view, #news_body_area, .article_txt, #articleBodyContents, .article-view-content, .news_text, #news_text, .art_cont, .article-content, article'
  );
  const image = content('meta[property="og:image"]') || content('meta[name="twitter:image"]');
  if (!root) return { desc, body: '', image };
  const paras = [...root.querySelectorAll('p')].map((p) => p.innerText.replace(/\s+/g, ' ').trim()).filter((t) => t.length >= 30);
  let body = paras.join(' ');
  if (body.length < 120) body = (root.innerText || '').replace(/\s+/g, ' ').trim();
  return { desc, body: body.slice(0, 1200), image };
}

async function readArticle(browser, link) {
  const page = await browser.newPage({ userAgent: UA });
  try {
    await page.route('**/*', (route) => (['image', 'media', 'font'].includes(route.request().resourceType()) ? route.abort() : route.continue()));
    await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 20000 });
    if (/news\.google\.com/.test(page.url())) {
      await page.waitForURL((u) => !u.hostname.includes('news.google.com'), { timeout: 8000 }).catch(() => {});
      await page.waitForLoadState('domcontentloaded').catch(() => {});
    }
    await page.waitForTimeout(800);
    return await page.evaluate(readArticleInPage);
  } finally {
    await page.close().catch(() => {});
  }
}

// lists: 기사 배열들(우선순위 순서). 기사 {t, l}에 핵심 내용 x를 붙인다(배열을 그대로 고친다).
async function addSummaries(lists, { deadline, concurrency = 4, launch } = {}) {
  const cache = loadCache();
  const now = Date.now();
  const stats = { withX: 0, read: 0, found: 0, images: 0, skipped: 0 };
  const todo = [];
  const seen = new Set();
  for (const list of lists) {
    for (const a of list || []) {
      if (!a || !a.l) continue;
      const c = cache[a.l];
      if (c && (c.x || now - c.at < RETRY_FAILED_DAYS * 864e5)) continue;
      if (!seen.has(a.l)) { seen.add(a.l); todo.push(a); }
    }
  }
  if (todo.length) {
    let browser = null;
    try {
      browser = launch ? await launch() : await require('playwright').chromium.launch();
    } catch (err) {
      console.log(`뉴스 핵심 내용: 브라우저를 열 수 없어 건너뜁니다(${err.message.split('\n')[0]})`);
    }
    if (browser) {
      let next = 0;
      const worker = async () => {
        while (next < todo.length && Date.now() < deadline) {
          const a = todo[next++];
          stats.read++;
          let x = '';
          let i = '';
          try {
            const art = await readArticle(browser, a.l);
            x = pickSummary(art, a.t);
            i = await usableImage(art.image);
          } catch (_) {
            x = '';
          }
          if (x) stats.found++;
          if (i) stats.images++;
          cache[a.l] = { x, i, at: Date.now() };
        }
      };
      await Promise.all(Array.from({ length: concurrency }, worker));
      stats.skipped = todo.length - stats.read;
      await browser.close().catch(() => {});
    } else stats.skipped = todo.length;
  }
  for (const list of lists) for (const a of list || []) {
    if (a && cache[a.l] && cache[a.l].x) { a.x = cache[a.l].x; stats.withX++; }
    if (a && cache[a.l] && cache[a.l].i) a.i = cache[a.l].i;
  }
  saveCache(cache);
  return stats;
}

module.exports = { addSummaries, usableImage, pickSummary, cleanLead, shorten, readArticleInPage };
