#!/usr/bin/env node
// 카드뉴스(docs/briefing-infographic.html) 조립 스크립트.
//   node scripts/card-news/build-card.js [--content content.json] [--index docs/index.html] [--txn-only] [--card <html>]
//   --content : 슬라이드 1~3 내용(JSON, 형식은 docs/kakao-realestate-news-setup.md 참고). 없으면 슬라이드 1~3은 그대로 둔다.
//   --index   : 뉴스·실거래가 원본(기본 docs/index.html). 슬라이드 4 랭킹과 하단 목록을 여기서 만든다.
//   --links   : 기사 링크 파일(candidates.js 출력 links.txt). https 줄을 순서대로 표지 → 이슈 4건 → 오버레이에 연결한다(content의 url 필드가 우선).
//   --txn-only: 하단 목록 중 실거래가 구간만 교체한다(뉴스 목록은 기존 유지).
//   --og-only : 링크 미리보기용 og 태그만 카드의 표지 사진에 맞춰 다시 쓴다(다른 구간은 건드리지 않음).
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
const LINKS_PATH = getOpt('--links');

function fail(msg) {
  console.error('오류: ' + msg);
  process.exit(1);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');
const withBreaks = (s) => esc(s).replace(/\n/g, '<br>');
const stripBoiler = (s) => String(s).replace(/\s*자세한 내용은 기사 원문에서 확인해 보세요\.?/g, '').trim();
// 사진·글 어디를 눌러도 기사로 이동(display:contents라 레이아웃은 그대로).
const link = (url, inner) => (url ? `<a class="card-link" href="${escAttr(url)}" target="_blank" rel="noopener">${inner}</a>` : inner);
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

// 표지 맨 위 줄. "날짜 · 브랜드" 형태면 날짜는 사진 위에서도 또렷한 알약(.cover-date), 브랜드는 작은 글씨(.cover-brand)로 나눈다.
function renderCategory(text) {
  const [date, ...brand] = text.split(' · ');
  const brandHtml = brand.length ? ` <span class="cover-brand">${esc(brand.join(' · '))}</span>` : '';
  return `<span class="cover-date">${esc(date)}</span>${brandHtml}`;
}

function renderCover(c) {
  const hl = Number.isInteger(c.highlight) ? c.highlight : 1;
  const lines = c.headline.map((l, i) => (i === hl ? `<span class="highlight">${esc(l)}</span>` : esc(l)));
  return `<section class="card-slide slide-cover">
    ${link(c.url, `${c.img ? `<img class="cover-photo" src="${escAttr(c.img)}" alt="${escAttr(c.alt)}">\n    ` : ''}<div class="cover-content">
      <div class="cover-category">${renderCategory(c.category || kstCategory())}</div>
      <h1 class="cover-headline">
        ${lines.join('<br>\n        ')}
      </h1>
      <p class="cover-summary">${esc(stripBoiler(c.summary))}</p>
      <div class="cover-divider"></div>
      <div class="tag-pills">
        <span class="tag-pill tag-yellow">${esc(c.tags[0])}</span>
        <span class="tag-pill tag-white">${esc(c.tags[1])}</span>
        <span class="tag-pill tag-black">${esc(c.tags[2])}</span>
      </div>
    </div>`)}
  </section>`;
}

const ROW_LABELS = ['첫 번째 행: 사진 왼쪽, 글 오른쪽', '두 번째 행: 글 왼쪽, 사진 오른쪽', '세 번째 행: 사진 왼쪽, 글 오른쪽', '네 번째 행: 글 왼쪽, 사진 오른쪽'];

function renderSplit(c) {
  const img = (it) => !it.img ? '' : link(it.url, `<div class="split-img">
        <img src="${escAttr(it.img)}" alt="${escAttr(it.alt)}">
        <div class="source-watermark" style="bottom:6px; right:6px; font-size:9.5px; padding:2px 5px;">기사 사진</div>
      </div>`);
  const txt = (it, n) => link(it.url, `<div class="split-content">
        <span class="check-tag">✔ Issue 0${n}</span>
        <p class="split-title">${withBreaks(it.title)}</p>
        <p class="split-text">${esc(stripBoiler(it.text))}</p>
      </div>`);
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
    ${link(o.url, `${o.img ? `<img class="overlay-photo" src="${escAttr(o.img)}" alt="${escAttr(o.alt)}">\n    ` : ''}<div class="overlay-content">
      <div class="overlay-script">${esc(o.script)}</div>
      <h2 class="overlay-lead">
        ${o.lead.map(esc).join('<br>\n        ')}
      </h2>
      <p class="overlay-body">
        ${esc(stripBoiler(o.body))}
      </p>

      <div class="overlay-quote">
        💡 <b>재부키 인사이트</b><br>
        ${esc(o.insight)}
      </div>

      <div class="slide-footer-label" style="color:rgba(255,255,255,0.6); width:100%;">
        <span>출처: ${esc(o.source)}</span>
      </div>
    </div>`)}
  </section>`;
}

function replaceSection(html, openTag, body) {
  const s = html.indexOf(openTag);
  if (s < 0) fail('카드 HTML에서 찾지 못함: ' + openTag);
  const e = html.indexOf('</section>', s);
  if (e < 0) fail('닫는 </section>을 못 찾음: ' + openTag);
  return html.slice(0, s) + body + html.slice(e + '</section>'.length);
}

function applyLinks(c) {
  if (!LINKS_PATH) return;
  const urls = fs.readFileSync(path.resolve(LINKS_PATH), 'utf8').split('\n').map((l) => l.trim()).filter((l) => /^https:\/\//.test(l));
  const slots = [c.cover, ...c.issues, c.overlay];
  if (urls.length < slots.length) fail(`--links에 https 링크가 ${slots.length}개 필요(현재 ${urls.length}개)`);
  slots.forEach((slot, i) => { if (!slot.url) slot.url = urls[i]; });
}

function applyContent(html, c) {
  checkContent(c);
  applyLinks(c);
  if (!html.includes('.card-link {')) html = html.replace('</style>', '  .card-link { display: contents; color: inherit; text-decoration: none; cursor: pointer; }\n</style>');
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

// scripts/kakao-realestate-news.js의 renderTransactionsHtml이 만드는 두 줄 마크업(윗줄: 순위·단지명·거래금액, 아랫줄: 법정동·전용·층·계약일·평당가).
const TXN_RE =
  /<li class="txn">\s*<div class="txn-top"><span class="txn-rank">(\d+)<\/span><span class="txn-apt">([^<]*)<\/span><span class="txn-amount">([^<]*)<\/span><\/div>\s*<div class="txn-meta"><span class="txn-dong">([^<]*)<\/span> · 전용 ([\d.]+)㎡ · (-?\d+)층 · (\d{4}\.\d{2}\.\d{2}) 계약 · 평당 ([\d,]+)만원<\/div>\s*<\/li>/g;

function parseAmount(s) {
  const m = s.match(/(?:(\d+)억)?\s*(?:([\d,]+)만)?/);
  return (m[1] ? Number(m[1]) * 10000 : 0) + (m[2] ? Number(m[2].replace(/,/g, '')) : 0);
}

function parseTxns(indexHtml) {
  const txns = [...indexHtml.matchAll(TXN_RE)].map((m) => ({
    dong: m[4],
    amountText: m[3],
    amount: parseAmount(m[3]),
    apt: m[2],
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

// 단지명 비교용(공백·괄호 안 덧붙임·대소문자 무시). scripts/kakao-realestate-news.js의 normalizeAptName과 같은 규칙.
const aptKey = (name) => name.replace(/\([^)]*\)/g, '').replace(/\s+/g, '').toLowerCase();

function rankComplexes(txns) {
  const best = new Map();
  for (const t of txns) {
    const key = aptKey(t.apt);
    const cur = best.get(key);
    if (!cur || t.ppy > cur.ppy || (t.ppy === cur.ppy && t.amount > cur.amount)) best.set(key, t);
  }
  return [...best.values()].sort((a, b) => b.ppy - a.ppy || b.amount - a.amount);
}

// index.html에는 목록(건수 상한 GEOMDAN_TRANSACTION_COUNT)과 별개로, 상한에 잘리기 전 전체 거래에서 뽑은 "단지별 최고 거래"가
// 보이지 않는 JSON으로 실려 있다. 조회 기간이 길어 목록이 상한에 걸려도 순위에서 단지가 빠지지 않게 이걸 쓴다.
function parseEmbeddedRanking(indexHtml) {
  const m = indexHtml.match(/<script type="application\/json" id="geomdan-complex-ranking">([\s\S]*?)<\/script>/);
  if (!m) return null;
  let list;
  try {
    list = JSON.parse(m[1]);
  } catch (e) {
    fail(`index.html의 단지 순위 JSON을 읽지 못함: ${e.message}`);
  }
  const ok = (r) =>
    r && typeof r.apt === 'string' && typeof r.dong === 'string' && typeof r.amountText === 'string' && typeof r.floor === 'string' &&
    Number.isFinite(r.amount) && Number.isFinite(r.area) && Number.isFinite(r.ppy);
  if (!Array.isArray(list) || list.length === 0 || !list.every(ok)) fail('index.html의 단지 순위 JSON 형식이 맞지 않습니다.');
  // JSON에는 원래 이름이 들어 있다. 목록 HTML에서 읽은 값(이미 이스케이프됨)과 같은 형태로 맞춘다 — 그래야 비교가 맞고 HTML에도 안전하다.
  return list.map((r) => ({ ...r, apt: escAttr(r.apt), dong: escAttr(r.dong), amountText: escAttr(r.amountText), floor: escAttr(r.floor) }));
}

// 순위(전체 거래 기준)와 목록(상위 N건)이 같은 실행의 데이터인지 확인한다: 목록의 모든 단지가 순위에 있고,
// 순위의 평당가가 목록 안 같은 단지의 어떤 거래보다 낮지 않아야 한다.
function rankFromEmbedded(embedded, txns) {
  const ranked = embedded.slice().sort((a, b) => b.ppy - a.ppy || b.amount - a.amount);
  const byKey = new Map(ranked.map((r) => [aptKey(r.apt), r]));
  for (const t of txns) {
    const r = byKey.get(aptKey(t.apt));
    if (!r || r.ppy < t.ppy) fail(`순위 데이터가 목록과 맞지 않습니다(${t.apt}) — index.html을 워크플로 결과로 다시 받아 오세요.`);
  }
  return ranked;
}

// 1위 단지 이름 옆 왕관. 글꼴에 기대지 않는 인라인 SVG라 카카오톡 캡처 이미지에도 똑같이 나온다.
const CROWN_SVG =
  '<svg class="rank-crown" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 8.5 7.6 12.4 12 5.2l4.4 7.2 5.1-3.9-1.9 10H4.4z" fill="#ffc928" stroke="#d99a00" stroke-width="1.2" stroke-linejoin="round"/><rect x="4.4" y="19.6" width="15.2" height="2.4" rx="1.2" fill="#d99a00"/><circle cx="2.5" cy="7.6" r="1.7" fill="#ffc928" stroke="#d99a00"/><circle cx="12" cy="4.2" r="1.7" fill="#ffc928" stroke="#d99a00"/><circle cx="21.5" cy="7.6" r="1.7" fill="#ffc928" stroke="#d99a00"/></svg>';

// 이름 끝 글자와 왕관을 한 덩어리로 묶어, 이름이 길어 줄이 꺾여도 왕관만 다음 줄에 떨어지지 않게 한다.
// 이름은 이미 HTML 이스케이프된 문자열이라 &amp; 같은 엔티티는 한 글자로 본다.
const withCrown = (name) => name.replace(/(&#?\w+;|[\s\S])$/, (m) => `<span class="rank-name-end">${m}${CROWN_SVG}</span>`);

// index.html에 실린 전체 거래 JSON(geomdan-transactions-detail). 건수 상한이 없고 건축년도·거래유형 같은 추가 항목이 있다.
// 없으면(옛 index.html) 하단 목록에서 파싱한 거래를 쓴다.
function parseEmbeddedDetails(indexHtml) {
  const m = indexHtml.match(/<script type="application\/json" id="geomdan-transactions-detail">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    const list = JSON.parse(m[1]);
    if (!Array.isArray(list) || !list.length) return null;
    const e = (v) => (v === undefined || v === null ? '' : escAttr(v));
    return list.map((r) => ({
      apt: e(r.apt), dong: e(r.dong), area: Number(r.area), amount: Number(r.amount), floor: e(r.floor), date: String(r.date), ppy: Number(r.ppy) || 0,
      amountText: formatWon(Number(r.amount)),
      buildYear: e(r.buildYear), dealType: e(r.dealType), agentSgg: e(r.agentSgg), regDate: e(r.regDate), seller: e(r.seller), buyer: e(r.buyer), aptDong: e(r.aptDong), jibun: e(r.jibun), leasehold: e(r.leasehold),
    }));
  } catch (_) {
    return null;
  }
}

function formatWon(manwon) {
  const eok = Math.floor(manwon / 10000);
  const rest = manwon % 10000;
  if (eok <= 0) return `${num(manwon)}만원`;
  return rest > 0 ? `${eok}억 ${num(rest)}만원` : `${eok}억원`;
}

const shortDate = (d) => String(d).replace(/^\d{2}/, '').replace(/\.$/, '');
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

// 단지를 누르면 그 단지의 거래 전부를 날짜순으로 펼치고, 맨 위에 요약 통계를 보여 준다(기본은 접힘 — 캡처 이미지는 그대로).
function renderRankDetail(t, txns) {
  const key = aptKey(t.apt);
  const rows = txns.filter((x) => aptKey(x.apt) === key).sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount);
  if (!rows.length) return '';
  const withPpy = rows.filter((x) => x.ppy > 0);
  const stats = [];
  stats.push(`<b>${rows.length}건</b> 거래`);
  if (withPpy.length) stats.push(`평균 평당 <b>${num(Math.round(mean(withPpy.map((x) => x.ppy))))}만</b>`);
  const amounts = rows.map((x) => x.amount);
  stats.push(Math.min(...amounts) === Math.max(...amounts) ? `거래가 <b>${formatWon(amounts[0])}</b>` : `거래가 <b>${formatWon(Math.min(...amounts))} ~ ${formatWon(Math.max(...amounts))}</b>`);
  const hi = rows.reduce((m, x) => (x.amount > m.amount ? x : m), rows[0]);
  stats.push(`최고가 ${shortDate(hi.date)} ${hi.floor}층`);
  stats.push(`최근 계약 ${shortDate(rows[0].date)}`);
  const byArea = new Map();
  rows.forEach((x) => byArea.set(Math.round(x.area), (byArea.get(Math.round(x.area)) || 0) + 1));
  if (byArea.size > 1) stats.push('전용 ' + [...byArea.entries()].sort((a, b) => b[1] - a[1]).map(([a, n]) => `${a}㎡ ${n}건`).join(' · '));
  else stats.push(`전용 ${[...byArea.keys()][0]}㎡`);
  const by = [...new Set(rows.map((x) => x.buildYear).filter(Boolean))];
  if (by.length === 1) stats.push(`${by[0]}년 준공`);
  const direct = rows.filter((x) => /직거래/.test(x.dealType)).length;
  if (rows.some((x) => x.dealType)) stats.push(`직거래 ${direct}건 · 중개 ${rows.filter((x) => x.dealType && !/직거래/.test(x.dealType)).length}건`);
  const corp = rows.filter((x) => /법인/.test(x.buyer)).length;
  if (rows.some((x) => x.buyer) && corp) stats.push(`법인 매수 ${corp}건`);
  const reg = rows.filter((x) => x.regDate).length;
  if (rows.some((x) => 'regDate' in x && x.regDate)) stats.push(`등기 완료 ${reg}/${rows.length}건`);

  const lis = rows
    .map((x) => {
      const tags = [];
      if (/직거래/.test(x.dealType)) tags.push('직거래');
      if (x.buyer && /법인/.test(x.buyer)) tags.push('법인 매수');
      if (x.seller && /법인|공공/.test(x.seller)) tags.push(`${x.seller} 매도`);
      const sub = [];
      if (x.aptDong) sub.push(/동$/.test(x.aptDong) ? x.aptDong : `${x.aptDong}동`);
      if (x.jibun) sub.push(`${x.dong} ${x.jibun}`);
      if (x.agentSgg) sub.push(`중개사 ${x.agentSgg}`);
      if (x.regDate) sub.push(`등기 ${shortDate(x.regDate)}`);
      const tagHtml = tags.map((g) => `<i>${g}</i>`).join('');
      return `<li><span class="rd-date">${shortDate(x.date)}</span><span class="rd-info">전용 ${Math.round(x.area * 100) / 100}㎡ · ${x.floor}층${tagHtml}${sub.length ? `<small>${sub.join(' · ')}</small>` : ''}</span><span class="rd-amt">${x.amountText}<em>평당 ${num(x.ppy)}만</em></span></li>`;
    })
    .join('');
  return `
        <div class="rank-detail" hidden><p class="rd-stats">${stats.join(' <span>·</span> ')}</p><p class="rd-head">전체 거래 ${rows.length}건 (계약일 순)</p><ul>${lis}</ul></div>`;
}

function renderRankItems(ranked, txns) {
  return ranked
    .map(
      (t, i) => `      <div class="rank-item" tabindex="0" role="button" aria-expanded="false">
        <span class="rank-idx">${String(i + 1).padStart(2, '0')}</span>
        <div class="rank-meta">
          <b>${i === 0 ? withCrown(t.apt) : t.apt}</b>
          <span>${t.dong} · 전용 ${Math.round(t.area)}㎡ · ${t.floor}층</span>
        </div>
        <div class="rank-figures">
          <span class="rank-val">평당 ${num(t.ppy)}만</span>
          <span class="rank-price">${t.amountText}</span>
        </div>${renderRankDetail(t, txns)}
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

function applyRanking(html, ranked, customPill, period, txns) {
  const boxS = html.indexOf('<div class="ranking-box">');
  const pillS = html.indexOf('<div class="rank-summary-pill">');
  if (boxS < 0 || pillS < 0) fail('카드 HTML에서 ranking-box / rank-summary-pill을 찾지 못함');
  html = html.slice(0, boxS) + `<div class="ranking-box">\n${renderRankItems(ranked, txns)}\n    </div>\n\n    ` + html.slice(pillS);
  const pill = customPill || pillText(ranked, period);
  html = html.replace(/(<div class="rank-summary-pill">\s*)[\s\S]*?(\s*<\/div>)/, (m, a, b) => a + pill + b);
  html = html.replace(/MARKET RANKING TOP \d+/, () => `MARKET RANKING TOP ${ranked.length}`);
  html = html.replace(/(?:오늘|최근 \d+개월간) 집계된 고유 단지가 \d+곳입니다\./, () => `${period}집계된 고유 단지가 ${ranked.length}곳입니다.`);
  html = addRankDetailUi(html);
  return { html, pill };
}

const RANK_DETAIL_CSS = `  .rank-item { cursor: pointer; }
  .rank-item > .rank-detail { grid-column: 1 / -1; margin: 6px 0 4px; padding: 8px 10px; background: #f6f7fb; border-radius: 10px; }
  .rank-detail[hidden] { display: none; }
  .rank-detail .rd-head { margin: 0 0 4px; font-size: 11px; font-weight: 700; color: var(--text-light); }
  .rank-detail ul { list-style: none; margin: 0; padding: 0; }
  .rank-detail li { display: grid; grid-template-columns: 52px 1fr auto; gap: 6px; align-items: baseline; padding: 4px 0; border-top: 1px solid #e6e8ef; font-size: 12px; }
  .rank-detail li:first-child { border-top: none; }
  .rank-detail .rd-date { color: var(--text-light); font-variant-numeric: tabular-nums; }
  .rank-detail .rd-amt { font-weight: 800; text-align: right; }
  .rank-detail .rd-stats { margin: 0 0 8px; font-size: 12px; line-height: 1.7; color: var(--text-dark); }
  .rank-detail .rd-stats span { color: var(--text-light); }
  .rank-detail .rd-info small { display: block; font-size: 10.5px; color: var(--text-light); line-height: 1.4; }
  .rank-detail .rd-info i { font-style: normal; font-size: 10px; font-weight: 700; color: var(--brand-blue); background: rgba(0,102,255,.1); border-radius: 4px; padding: 0 5px; margin-left: 5px; }
  .rank-detail .rd-amt em { display: block; font-style: normal; font-weight: 600; font-size: 11px; color: var(--text-light); }
`;
const RANK_DETAIL_JS = `<script id="rank-detail-js">
(function () {
  function toggle(item) {
    var d = item.querySelector('.rank-detail');
    if (!d) return;
    var open = d.hidden;
    d.hidden = !open;
    item.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  document.addEventListener('click', function (e) {
    var item = e.target.closest && e.target.closest('.rank-item');
    if (item) toggle(item);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var item = e.target.classList && e.target.classList.contains('rank-item') ? e.target : null;
    if (item) { e.preventDefault(); toggle(item); }
  });
})();
</script>
`;

// 랭킹 항목 펼침용 CSS·스크립트(없을 때만 한 번 넣는다).
function addRankDetailUi(html) {
  html = html.replace(/  \.rank-item \{ cursor: pointer; \}[\s\S]*?\.rank-detail \.rd-amt em \{[^}]*\}\n/, '');
  html = html.replace('</style>', () => RANK_DETAIL_CSS + '</style>');
  html = html.replace(/<script id="rank-detail-js">[\s\S]*?<\/script>\n?/, '');
  return html.replace('</body>', () => RANK_DETAIL_JS + '</body>');
}

function applyList(html, indexHtml) {
  const H = TXN_ONLY ? '<h2>🏘️ 검단신도시 아파트 실거래가</h2>' : '<h2>📰 부동산 뉴스</h2>';
  const iS = indexHtml.indexOf(H);
  const iE = indexHtml.indexOf('<p class="source">');
  const cS = html.indexOf(H);
  const cE = html.indexOf('<p class="source">');
  if (iS < 0 || iE < 0) fail('index.html에서 목록 구간을 찾지 못함');
  if (cS < 0 || cE < 0) fail('카드 HTML에서 목록 구간을 찾지 못함');
  // 하단 실거래 목록은 화면에서 숨긴다(단지별 거래는 슬라이드 4 랭킹을 눌러 본다). 개수 검증용으로 DOM에는 남긴다.
  let list = indexHtml.slice(iS, iE);
  const tS = list.indexOf('<h2>🏘️');
  if (tS >= 0) list = list.slice(0, tS) + '<div class="txn-list-hidden" hidden>\n' + list.slice(tS) + '\n</div>\n';
  let out = html.slice(0, cS) + list + html.slice(cE);
  out = out.replace('실제 기사 원문 링크와 검단신도시 실거래가 전체 내역은 아래에서 확인하세요.', '실제 기사 원문 링크는 아래에서 확인하세요. 단지별 실거래 내역은 슬라이드 4의 단지를 누르면 펼쳐집니다.');
  out = out.replace('전체 뉴스·실거래가 목록</p>', '전체 뉴스 목록</p>');
  return out;
}

// ---------- 실행 ----------

// ---------- 링크 미리보기(og 태그) ----------

// 카카오톡 등은 og:image가 없으면 페이지 안에서 알아서 사진을 골라, 표지(첫 그림)가 아닌 사진이 미리보기에 나왔다.
// 그래서 페이지의 첫 그림인 표지 사진을 og:image로 명시한다. 표지 사진이 없으면(글만 있는 표지) og:image는 두지 않는다.
function syncOpenGraph(html) {
  const cover = html.match(/<img class="cover-photo" src="([^"]+)"/);
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  html = html.replace(/\n<meta property="og:(?:type|title|image)" content="[^"]*">/g, '');
  const tags = ['<meta property="og:type" content="website">'];
  if (title) tags.push(`<meta property="og:title" content="${title}">`);
  if (cover) tags.push(`<meta property="og:image" content="${cover[1]}">`);
  return html.replace(/(<title>[^<]*<\/title>)/, `$1\n${tags.join('\n')}`);
}

function main() {
  if (argv.includes('--og-only')) {
    const synced = syncOpenGraph(fs.readFileSync(CARD_PATH, 'utf8'));
    fs.writeFileSync(CARD_PATH, synced);
    console.log(JSON.stringify({ card: path.relative(process.cwd(), CARD_PATH), ogImage: (synced.match(/property="og:image" content="([^"]*)"/) || [])[1] || null }, null, 1));
    return;
  }
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
  const embedded = parseEmbeddedRanking(indexHtml);
  const ranked = embedded ? rankFromEmbedded(embedded, txns) : rankComplexes(txns);
  if (!embedded && /\(상위 \d+건\)/.test(indexHtml)) {
    warnings.push('목록이 상한에 걸려 있는데 단지 순위 데이터(geomdan-complex-ranking)가 index.html에 없어, 평당가가 낮은 단지가 순위에서 빠졌을 수 있습니다.');
  }
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
  const result = applyRanking(html, ranked, customPill, period, parseEmbeddedDetails(indexHtml) || txns);
  html = applyList(result.html, indexHtml);

  const count = (re) => (html.match(re) || []).length;
  if (count(/<section/g) !== 5 || count(/<\/section>/g) !== 5) fail('<section> 개수가 5개가 아닙니다(구조 깨짐).');
  if (count(/class="rank-item"/g) !== ranked.length) fail('랭킹 항목 수가 고유 단지 수와 다릅니다.');
  const listTxns = count(/<li class="txn">/g);
  if (listTxns !== txns.length) fail(`하단 실거래 목록(${listTxns})이 원본(${txns.length})과 다릅니다.`);

  html = syncOpenGraph(html);
  fs.writeFileSync(CARD_PATH, html);
  console.log(
    JSON.stringify(
      {
        card: path.relative(process.cwd(), CARD_PATH),
        ogImage: (html.match(/property="og:image" content="([^"]*)"/) || [])[1] || null,
        transactions: txns.length,
        uniqueComplexes: ranked.length,
        rankingFrom: embedded ? 'index.html의 전체 거래 기준 순위 데이터' : '하단 목록',
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
