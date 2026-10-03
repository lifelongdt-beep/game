#!/usr/bin/env node
// 카드뉴스(docs/briefing-infographic.html) 조립 스크립트.
//   node scripts/card-news/build-card.js [--content content.json] [--index docs/index.html] [--txn-only] [--card <html>]
//   --content : 슬라이드 1~3 내용(JSON, 형식은 docs/kakao-realestate-news-setup.md 참고). 없으면 슬라이드 1~3은 그대로 둔다.
//   --index   : 뉴스·실거래가 원본(기본 docs/index.html). 슬라이드 4 랭킹과 하단 목록을 여기서 만든다.
//   --txn-only: 하단 목록 중 실거래가 구간만 교체한다(뉴스 목록은 기존 유지).
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const getOpt = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const CARD_PATH = path.resolve(getOpt('--card') || 'docs/briefing-infographic.html');
const INDEX_PATH = path.resolve(getOpt('--index') || 'docs/index.html');
const CONTENT_PATH = getOpt('--content');
const TXN_ONLY = argv.includes('--txn-only');

function fail(msg) {
  console.error('오류: ' + msg);
  process.exit(1);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');
const withBreaks = (s) => esc(s).replace(/\n/g, '<br>');
const num = (n) => n.toLocaleString('en-US');

// ---------- 슬라이드 1~3 ----------

function need(cond, msg) {
  if (!cond) fail('content JSON: ' + msg);
}

function checkContent(c) {
  need(c.cover && Array.isArray(c.cover.headline) && c.cover.headline.length >= 1, 'cover.headline[] 필요');
  need(typeof c.cover.summary === 'string' && c.cover.summary, 'cover.summary 필요');
  need(Array.isArray(c.cover.tags) && c.cover.tags.length === 3, 'cover.tags는 정확히 3개');
  need(Array.isArray(c.issues) && c.issues.length === 4, 'issues는 정확히 4건(2건으로 되돌리지 말 것)');
  c.issues.forEach((it, i) => need(it.title && it.text && (!it.img || it.alt), `issues[${i}]에 title, text 필요(img가 있으면 alt도)`));
  need(typeof c.outlets === 'string' && c.outlets, 'outlets(출처 매체, 예: "문화일보 / 연합뉴스") 필요');
  const o = c.overlay;
  need(o && o.script && Array.isArray(o.lead) && o.body && o.insight && o.source && (!o.img || o.alt), 'overlay.script, lead[], body, insight, source 필요(img가 있으면 alt도)');
  need(!c.cover.img || c.cover.alt, 'cover.img가 있으면 cover.alt도 필요');

  const images = [c.cover.img, ...c.issues.map((i) => i.img), o.img].filter(Boolean);
  images.forEach((u) => need(/^https:\/\//.test(u), `이미지 주소는 https여야 함(혼합 콘텐츠 방지): ${u}`));

  const texts = JSON.stringify(c);
  need(!/[぀-ヿ]/.test(texts), '일본어(가나) 문자가 섞여 있음 — 한국어로만 작성');
}

function kstCategory() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const p = (n) => String(n).padStart(2, '0');
  const wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  const period = d.getHours() < 12 ? '아침' : '저녁';
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${wd}요일 ${period} · Daily Real Estate Briefing`;
}

function renderCover(c) {
  const hl = Number.isInteger(c.highlight) ? c.highlight : 1;
  const lines = c.headline.map((l, i) => (i === hl ? `<span class="highlight">${esc(l)}</span>` : esc(l)));
  return `<section class="card-slide slide-cover">
    ${c.img ? `<img class="cover-photo" src="${escAttr(c.img)}" alt="${escAttr(c.alt)}">\n    ` : ''}<div class="cover-content">
      <div class="cover-category">${esc(c.category || kstCategory())}</div>
      <h1 class="cover-headline">
        ${lines.join('<br>\n        ')}
      </h1>
      <p class="cover-summary">${esc(c.summary)}</p>
      <div class="cover-divider"></div>
      <div class="tag-pills">
        <span class="tag-pill tag-yellow">${esc(c.tags[0])}</span>
        <span class="tag-pill tag-white">${esc(c.tags[1])}</span>
        <span class="tag-pill tag-black">${esc(c.tags[2])}</span>
      </div>
    </div>
  </section>`;
}

const ROW_LABELS = ['첫 번째 행: 사진 왼쪽, 글 오른쪽', '두 번째 행: 글 왼쪽, 사진 오른쪽', '세 번째 행: 사진 왼쪽, 글 오른쪽', '네 번째 행: 글 왼쪽, 사진 오른쪽'];

function renderSplit(c) {
  const img = (it) => !it.img ? '' : `<div class="split-img">
        <img src="${escAttr(it.img)}" alt="${escAttr(it.alt)}">
        <div class="source-watermark" style="bottom:6px; right:6px; font-size:9.5px; padding:2px 5px;">기사 사진</div>
      </div>`;
  const txt = (it, n) => `<div class="split-content">
        <span class="check-tag">✔ Issue 0${n}</span>
        <p class="split-title">${withBreaks(it.title)}</p>
        <p class="split-text">${esc(it.text)}</p>
      </div>`;
  const rows = c.issues
    .map((it, i) => {
      const reverse = i % 2 === 1;
      if (!it.img) return `    <!-- ${ROW_LABELS[i]} (사진 없음) -->
    <div class="split-row" style="grid-template-columns:1fr">
      ${txt(it, i + 1)}
    </div>`;
      return `    <!-- ${ROW_LABELS[i]} -->
    <div class="split-row${reverse ? ' reverse' : ''}">
      ${reverse ? txt(it, i + 1) + '\n      ' + img(it) : img(it) + '\n      ' + txt(it, i + 1)}
    </div>`;
    })
    .join('\n\n');
  return `<section class="card-slide slide-split">
    <h2 class="hand-title">오늘의 주요 시장 이슈</h2>

${rows}

    <div class="slide-footer-label">
      <span>출처: ${esc(c.outlets)}</span>
    </div>
  </section>`;
}

function renderOverlay(o) {
  return `<section class="card-slide slide-overlay">
    ${o.img ? `<img class="overlay-photo" src="${escAttr(o.img)}" alt="${escAttr(o.alt)}">\n    ` : ''}<div class="overlay-content">
      <div class="overlay-script">${esc(o.script)}</div>
      <h2 class="overlay-lead">
        ${o.lead.map(esc).join('<br>\n        ')}
      </h2>
      <p class="overlay-body">
        ${esc(o.body)}
      </p>

      <div class="overlay-quote">
        💡 <b>재부키 인사이트</b><br>
        ${esc(o.insight)}
      </div>

      <div class="slide-footer-label" style="color:rgba(255,255,255,0.6); width:100%;">
        <span>출처: ${esc(o.source)}</span>
      </div>
    </div>
  </section>`;
}

function replaceSection(html, openTag, body) {
  const s = html.indexOf(openTag);
  if (s < 0) fail('카드 HTML에서 찾지 못함: ' + openTag);
  const e = html.indexOf('</section>', s);
  if (e < 0) fail('닫는 </section>을 못 찾음: ' + openTag);
  return html.slice(0, s) + body + html.slice(e + '</section>'.length);
}

function applyContent(html, c) {
  checkContent(c);
  html = replaceSection(html, '<section class="card-slide slide-cover">', renderCover(c.cover));
  html = replaceSection(html, '<section class="card-slide slide-split">', renderSplit(c));
  html = replaceSection(html, '<section class="card-slide slide-overlay">', renderOverlay(c.overlay));
  const s = c.sources || {};
  if (s.cover) html = html.replace(/배경 사진: .*? 보도 사진 \(Playwright로 실제 추출\)/, () => `배경 사진: ${s.cover} 보도 사진 (Playwright로 실제 추출)`);
  if (s.split) html = html.replace(/(SLIDE 2: 좌우 분할형\s*\n\s*)사진: .*? 보도 사진 \(Playwright로 실제 추출\)/, (m, a) => `${a}사진: ${s.split} 보도 사진 (Playwright로 실제 추출)`);
  if (s.overlay) html = html.replace(/(SLIDE 3: 전체 배경 오버레이형\s*\n\s*)사진: .*? 보도 사진 \(Playwright로 실제 추출\)/, (m, a) => `${a}사진: ${s.overlay} 보도 사진 (Playwright로 실제 추출)`);
  return html;
}

// ---------- 슬라이드 4 · 하단 목록 ----------

const TXN_RE =
  /<li class="txn">\s*<div class="txn-top"><span class="txn-left"><span class="txn-rank">(\d+)<\/span><span class="txn-dong">([^<]*)<\/span><\/span><span class="txn-amount">([^<]*)<\/span><\/div>\s*<div class="txn-apt">([^<]*)<\/div>\s*<div class="txn-meta">전용 ([\d.]+)㎡ · (-?\d+)층 · (\d{4}\.\d{2}\.\d{2}) 계약 · 평당 ([\d,]+)만원<\/div>\s*<\/li>/g;

function parseAmount(s) {
  const m = s.match(/(?:(\d+)억)?\s*(?:([\d,]+)만)?/);
  return (m[1] ? Number(m[1]) * 10000 : 0) + (m[2] ? Number(m[2].replace(/,/g, '')) : 0);
}

function parseTxns(indexHtml) {
  const txns = [...indexHtml.matchAll(TXN_RE)].map((m) => ({
    dong: m[2],
    amountText: m[3],
    amount: parseAmount(m[3]),
    apt: m[4],
    area: Number(m[5]),
    floor: m[6],
    date: m[7],
    ppy: Number(m[8].replace(/,/g, '')),
  }));
  const liCount = (indexHtml.match(/<li class="txn">/g) || []).length;
  if (txns.length !== liCount) fail(`실거래 파싱 불일치: li=${liCount}, parsed=${txns.length} (index.html 마크업이 바뀌었는지 확인)`);
  if (txns.length === 0) fail('index.html에 실거래가가 0건입니다 — 데이터 수집이 실패했을 수 있어 랭킹을 비우지 않고 중단합니다.');
  return txns;
}

function rankComplexes(txns) {
  const best = new Map();
  for (const t of txns) {
    const cur = best.get(t.apt);
    if (!cur || t.ppy > cur.ppy || (t.ppy === cur.ppy && t.amount > cur.amount)) best.set(t.apt, t);
  }
  return [...best.values()].sort((a, b) => b.ppy - a.ppy || b.amount - a.amount);
}

function renderRankItems(ranked) {
  return ranked
    .map(
      (t, i) => `      <div class="rank-item">
        <span class="rank-idx">${String(i + 1).padStart(2, '0')}</span>
        <div class="rank-meta">
          <b>${t.apt}</b>
          <span>${t.dong} · 전용 ${Math.round(t.area)}㎡ · ${t.floor}층</span>
        </div>
        <div class="rank-figures">
          <span class="rank-price">${t.amountText}</span>
          <span class="rank-val">평당 ${num(t.ppy)}만</span>
        </div>
      </div>`
    )
    .join('\n\n');
}

function pillText(ranked, period) {
  const N = ranked.length;
  const a = ranked.filter((t) => t.ppy >= 2000).length;
  const b = ranked.filter((t) => t.ppy >= 1500).length;
  let first;
  if (b === 0) first = `${period}집계된 고유 단지 ${N}곳의 평당가는 모두 1,500만 원 미만입니다.`;
  else if (a === 0) first = `${period}집계된 고유 단지 ${N}곳 중 ${b}곳이 평당 1,500만 원 이상입니다.`;
  else if (b === N) first = `${period}집계된 고유 단지 ${N}곳 중 ${a}곳이 평당 2,000만 원 이상이고, 전 단지가 1,500만 원 이상입니다.`;
  else first = `${period}집계된 고유 단지 ${N}곳 중 ${a}곳이 평당 2,000만 원 이상, ${b}곳이 1,500만 원 이상입니다.`;

  const top = ranked[0];
  const last = ranked[N - 1];
  const gap = Math.round((top.ppy - last.ppy) / 50) * 50;
  const topN = ranked.slice(0, Math.min(10, N));
  const byDong = {};
  topN.forEach((t) => (byDong[t.dong] = (byDong[t.dong] || 0) + 1));
  const [dong, k] = Object.entries(byDong).sort((x, y) => y[1] - x[1])[0];

  let second = `1위 ${top.apt}(평당 ${num(top.ppy)}만)과 ${N}위(평당 ${num(last.ppy)}만)의 격차는 약 ${num(gap)}만 원`;
  second += k >= 2 ? `이며, 상위 ${topN.length}곳 중 ${k}곳이 ${dong}에 몰려 있습니다.` : '입니다.';
  return `💡 ${first} ${second}`;
}

function applyRanking(html, ranked, customPill, period) {
  const boxS = html.indexOf('<div class="ranking-box">');
  const pillS = html.indexOf('<div class="rank-summary-pill">');
  if (boxS < 0 || pillS < 0) fail('카드 HTML에서 ranking-box / rank-summary-pill을 찾지 못함');
  html = html.slice(0, boxS) + `<div class="ranking-box">\n${renderRankItems(ranked)}\n    </div>\n\n    ` + html.slice(pillS);
  const pill = customPill || pillText(ranked, period);
  html = html.replace(/(<div class="rank-summary-pill">\s*)[\s\S]*?(\s*<\/div>)/, (m, a, b) => a + pill + b);
  html = html.replace(/MARKET RANKING TOP \d+/, () => `MARKET RANKING TOP ${ranked.length}`);
  html = html.replace(/(?:오늘|최근 \d+개월간) 집계된 고유 단지가 \d+곳입니다\./, () => `${period}집계된 고유 단지가 ${ranked.length}곳입니다.`);
  return { html, pill };
}

function applyList(html, indexHtml) {
  const H = TXN_ONLY ? '<h2>🏘️ 검단신도시 아파트 실거래가</h2>' : '<h2>📰 부동산 뉴스</h2>';
  const iS = indexHtml.indexOf(H);
  const iE = indexHtml.indexOf('<p class="source">');
  const cS = html.indexOf(H);
  const cE = html.indexOf('<p class="source">');
  if (iS < 0 || iE < 0) fail('index.html에서 목록 구간을 찾지 못함');
  if (cS < 0 || cE < 0) fail('카드 HTML에서 목록 구간을 찾지 못함');
  return html.slice(0, cS) + indexHtml.slice(iS, iE) + html.slice(cE);
}

// ---------- 실행 ----------

function main() {
  let html = fs.readFileSync(CARD_PATH, 'utf8');
  const indexHtml = fs.readFileSync(INDEX_PATH, 'utf8');
  const warnings = [];
  if (/class="stale-notice"/.test(indexHtml)) warnings.push('index.html의 실거래가가 캐시(임시) 데이터입니다 — 수집이 실패했을 수 있습니다.');

  let customPill;
  if (CONTENT_PATH) {
    let content;
    try {
      content = JSON.parse(fs.readFileSync(path.resolve(CONTENT_PATH), 'utf8'));
    } catch (e) {
      fail(`content JSON을 읽지 못함: ${e.message}`);
    }
    html = applyContent(html, content);
    customPill = content.rankPill;
  }

  const txns = parseTxns(indexHtml);
  const ranked = rankComplexes(txns);
  // 집계 기간 문구는 index.html 안내문("최근 N개월 이내 계약 건…")에서 읽는다(옛 형식이면 "오늘").
  const months = indexHtml.match(/최근 (\d+)개월 이내 계약/);
  const period = months ? `최근 ${months[1]}개월간 ` : '오늘 ';
  // 평당 1,500만 이하 단지는 신도시가 아닌 기존 단지일 가능성이 높다(사용자 판단) — 제외 목록에 빠진 단지가 없는지 알린다.
  const low = ranked.filter((t) => t.ppy <= 1500);
  if (low.length) {
    warnings.push(
      `평당 1,500만 이하 단지 ${low.length}곳이 순위에 있습니다. 검단신도시가 아닌 기존 단지면 scripts/geomdan-excluded-apartments.txt에 추가해야 합니다: ${low.map((t) => t.apt).join(', ')}`
    );
  }
  const result = applyRanking(html, ranked, customPill, period);
  html = applyList(result.html, indexHtml);

  const count = (re) => (html.match(re) || []).length;
  if (count(/<section/g) !== 5 || count(/<\/section>/g) !== 5) fail('<section> 개수가 5개가 아닙니다(구조 깨짐).');
  if (count(/class="rank-item"/g) !== ranked.length) fail('랭킹 항목 수가 고유 단지 수와 다릅니다.');
  const listTxns = count(/<li class="txn">/g);
  if (listTxns !== txns.length) fail(`하단 실거래 목록(${listTxns})이 원본(${txns.length})과 다릅니다.`);

  fs.writeFileSync(CARD_PATH, html);
  console.log(
    JSON.stringify(
      {
        card: path.relative(process.cwd(), CARD_PATH),
        transactions: txns.length,
        uniqueComplexes: ranked.length,
        top: ranked.slice(0, 3).map((t) => `${t.apt} ${t.amountText} 평당 ${num(t.ppy)}만`),
        pill: result.pill,
        warnings,
      },
      null,
      1
    )
  );
}

main();
