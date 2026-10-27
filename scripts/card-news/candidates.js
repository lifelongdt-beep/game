#!/usr/bin/env node
// docs/index.html의 뉴스 후보를 번호+제목으로만 보여준다(파일을 통째로 읽지 않기 위한 도구).
//   node scripts/card-news/candidates.js [--index docs/index.html]   → 후보 목록(번호, 제목 - 매체)
//   node scripts/card-news/candidates.js 3 7 21 [--index ...]        → 고른 번호의 구글 뉴스 링크(줄바꿈 구분, resolve_image_urls 입력용)
//   (목록에는 최근 카드에 이미 쓴 기사가 [최근사용 N회전전]으로 표시된다 — --no-history로 끈다. 고를 때는 건너뛴다)
//   node scripts/card-news/candidates.js --prev [--card <html>]      → 직전 카드의 표지·이슈·오버레이 제목(반복 선정 방지용)
//   node scripts/card-news/candidates.js --geomdan [--index ...]     → 검단 실거래가 요약(검단 부동산 기사가 없는 날 이슈 한 칸을 채울 자료)
const fs = require('fs');
const { execFileSync } = require('child_process');
const path = require('path');

const argv = process.argv.slice(2);
const getOpt = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const INDEX_PATH = path.resolve(getOpt('--index') || 'docs/index.html');
const CARD_PATH = path.resolve(getOpt('--card') || 'docs/briefing-infographic.html');
const optValues = new Set(['--index', '--card'].map(getOpt).filter(Boolean));
const picks = argv.filter((a) => /^\d+$/.test(a) && !optValues.has(a)).map(Number);
// 발행 후 이만큼 지난 기사는 오래된 것으로 본다(카드는 당일 발행 뉴스가 기본). 고를 때는 막고, --allow-old로만 넘긴다.
const STALE_DAYS = 3;
const allowOld = argv.includes('--allow-old');

const decode = (s) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const stripTags = (s) => decode(s.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

function parseSection(html, heading) {
  const s = html.indexOf(heading);
  if (s < 0) return [];
  const ulS = html.indexOf('<ul>', s);
  const ulE = html.indexOf('</ul>', ulS);
  const block = html.slice(ulS, ulE);
  return [...block.matchAll(/<li class="article"(?: data-pub="([^"]*)")?(?: data-src="(\d+)")?><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/li>/g)].map((m) => ({
    pub: m[1] || '',
    src: m[2] ? Number(m[2]) : 0,
    link: decode(m[3]),
    nearby: m[4].includes('tag-nearby'),
    title: stripTags(m[4]),
  }));
}

// 발행일(YYYY-MM-DD, 한국 날짜)과 오늘(한국 날짜) 사이의 일수. 발행일을 모르면 null.
function daysSince(pub) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pub)) return null;
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  return Math.round((Date.parse(today) - Date.parse(pub)) / 86400000);
}
// 같은 사건을 다룬 매체 수(많을수록 지금 핫한 뉴스). 목록은 이 수가 많은 순으로 정렬돼 있다.
const srcTag = (a) => (a.src > 0 ? `[매체 ${a.src}] ` : '');
const pubTag = (a) => {
  if (!a.pub) return '';
  const d = daysSince(a.pub);
  const md = a.pub.slice(5).replace('-', '.');
  return d !== null && d >= STALE_DAYS ? `[오래됨 ${md}] ` : `[${md}] `;
};

function prev() {
  const html = fs.readFileSync(CARD_PATH, 'utf8');
  const pick = (re) => {
    const m = html.match(re);
    return m ? stripTags(m[1]) : '(못 찾음)';
  };
  console.log('[직전 카드]', pick(/class="cover-category">([\s\S]*?)<\/div>/));
  console.log('표지:', pick(/<h1 class="cover-headline">([\s\S]*?)<\/h1>/));
  [...html.matchAll(/<p class="split-title">([\s\S]*?)<\/p>/g)].forEach((m, i) => console.log(`이슈${i + 1}:`, stripTags(m[1])));
  console.log('오버레이:', pick(/<h2 class="overlay-lead">([\s\S]*?)<\/h2>/));
}

// ---- 최근 카드에 쓴 기사 표시 ----
// 카드에는 기사 제목이 아니라 다시 쓴 문구가 실려 있어 제목끼리 비교하면 못 잡는다. 대신 "후보 제목의
// 2글자 조각(bigram) 중 얼마나 카드 본문(표지·이슈·오버레이 글)에 들어 있는지"를 본다. 같은 기사를 다룬
// 카드는 제목 핵심어를 그대로 쓰므로 비율이 높다. 최근 HISTORY_CARDS개 카드(사이클당 1개)를 git 이력에서 읽는다.
const HISTORY_CARDS = 8;
const USED_THRESHOLD = 0.45;
const bigrams = (t) => {
  const s = t.replace(/[\s'"‘’“”·,.…\-–—:;!?()\[\]%]/g, '');
  const g = new Set();
  for (let i = 0; i < s.length - 1; i++) g.add(s.slice(i, i + 2));
  return g;
};
function cardText(html) {
  const parts = [];
  for (const re of [
    /<h1 class="cover-headline">([\s\S]*?)<\/h1>/,
    /<p class="cover-summary">([\s\S]*?)<\/p>/,
    /<h2 class="overlay-lead">([\s\S]*?)<\/h2>/,
  ]) {
    const m = html.match(re);
    if (m) parts.push(stripTags(m[1]));
  }
  for (const re of [/<p class="split-title">([\s\S]*?)<\/p>/g, /<p class="split-text">([\s\S]*?)<\/p>/g, /<p class="overlay-body">([\s\S]*?)<\/p>/g]) {
    for (const m of html.matchAll(re)) parts.push(stripTags(m[1]));
  }
  return parts.join(' ');
}
function recentCards() {
  try {
    const rel = path.relative(process.cwd(), CARD_PATH);
    const shas = execFileSync('git', ['log', '--format=%H', `-n${HISTORY_CARDS}`, '--', rel], { encoding: 'utf8' }).split('\n').filter(Boolean);
    return shas.map((sha, i) => ({
      age: i + 1,
      grams: bigrams(cardText(execFileSync('git', ['show', `${sha}:${rel}`], { encoding: 'utf8', maxBuffer: 64e6 }))),
    }));
  } catch (_) {
    return [];
  }
}
function usedMark(title, cards) {
  const head = title.lastIndexOf(' - ') > 0 ? title.slice(0, title.lastIndexOf(' - ')) : title;
  const g = bigrams(head);
  if (g.size === 0) return '';
  for (const c of cards) {
    let hit = 0;
    for (const x of g) if (c.grams.has(x)) hit++;
    if (hit / g.size >= USED_THRESHOLD) return `[최근사용 ${c.age}회전] `;
  }
  return '';
}

// ---- 가치 등급 표시 ----
// 사람들이 보고 싶은 건 "부동산 흐름을 판단하게 해 주는 뉴스"다. 제목 키워드로 대략 등급을 매겨 앞에 붙인다.
//   [A정책] 정부·금융당국 부동산 정책(대책·규제·세제·공급·대출) — 가장 중요, 표지 1순위
//   [A] 가격·거래·수급 지표, 대출·세제·공급 정책, 기준금리  → 표지·이슈·오버레이 우선
//   [B] 검단·인천·인접 개발·교통 직접 관련              → 시장·정책과 이어질 때만 이슈로, 아니면 하단 목록에만
//   [제외] 지자체 행사·설명회, 분양 광고, 정치 공방, 기업·금융상품, 해외·코인 등
//   [-]  판단 불가(제목을 읽고 직접 판단)
const TIER_EXCLUDE = /설명회|견본주택|\[부동산 AD\]|AD\]|모집|개소|감사패|간담회|특강|소식지|조례|구의회|의장|지지율|블랙리스트|사찰|기업대출|동산담보|대부업|온투업|연체액|코인|퇴직금|시간외|폐기물|유통혁신|홍콩 특징주/;
const TIER_A = /아파트값|집값|매매가|전세|전셋값|전월세|월세|거래량|매물|미분양|입주 ?물량|청약|분양가|공급|인허가|착공|재건축|재개발|한국부동산원|KB|시세|상승률|하락|주택|DSR|대출 ?규제|주담대|LTV|세제|종부세|양도세|취득세|보유세|토허제|토지거래허가|규제지역|대책|공시가격|기준금리|금리 (인상|인하)|동결|변동금리|국채금리|금통위/;
// 정부·금융당국의 부동산·대출·세제·공급 정책은 가장 중요한 뉴스라 별도로 표시한다(정치 공방·지지율은 제외 쪽).
const TIER_POLICY = /LH|매입확약|정부|국토부|국토교통부|금융위|금감원|한국은행|한은|대통령|장관|총리|정책|대책|지시|규제|세제|공급|DSR|LTV|토허제|종부세|양도세|취득세/;
const TIER_B = /검단|인천|서구|계양|청라|김포|루원|GTX|광역급행|인천2호선/;
function tierMark(title) {
  const head = title.lastIndexOf(' - ') > 0 ? title.slice(0, title.lastIndexOf(' - ')) : title;
  if (TIER_EXCLUDE.test(head)) return '[제외] ';
  if (TIER_A.test(head) && TIER_POLICY.test(head)) return '[A정책] ';
  if (TIER_A.test(head)) return '[A] ';
  if (TIER_B.test(head)) return '[B] ';
  return '[-] ';
}

// 검단신도시 부동산 정보 — 카드에 무조건 담는다. 제목에 "검단"이 있고 부동산 키워드(분양·청약·입주·실거래·교통·개발 등)가
// 있으면 필수 후보로 본다. 행사·홍보·인사 같은 [제외] 소식이나 부동산과 무관한 행정·재정 공방은 키워드가 없어 걸러진다.
const GEOMDAN_RE = /검단/;
const GEOMDAN_REALESTATE_RE = /분양|청약|입주|아파트|단지|실거래|시세|집값|매매|전세|월세|재건축|재개발|정비|개통|도로|노선|철도|GTX|지하철|역세권|택지|개발|호재|공급|미분양|임대|부동산|상가|오피스텔|학교 ?신설|병원|대형 ?마트/;
const GEOMDAN_NOISE_RE = /행사|캠페인|산책|교육|페스티벌|축제|기부제|공연|봉사|위촉|개최|출범|소식지|시상|협약|기념|체험|전시|공모전|반려/;
const isGeomdanRealEstate = (title) => {
  const head = title.lastIndexOf(' - ') > 0 ? title.slice(0, title.lastIndexOf(' - ')) : title;
  return GEOMDAN_RE.test(head) && GEOMDAN_REALESTATE_RE.test(head) && !TIER_EXCLUDE.test(head) && !GEOMDAN_NOISE_RE.test(head);
};

// 검단 실거래가 요약: 검단 부동산 기사가 하나도 없는 날, 이슈 한 칸을 이 숫자로 채운다(숫자는 모두 index.html 데이터).
function geomdanStats() {
  const html = fs.readFileSync(INDEX_PATH, 'utf8');
  const m = html.match(/<script type="application\/json" id="geomdan-complex-ranking">([\s\S]*?)<\/script>/);
  if (!m) {
    console.error('오류: index.html에 단지 순위 데이터(geomdan-complex-ranking)가 없습니다.');
    process.exit(1);
  }
  const list = JSON.parse(m[1]).sort((a, b) => b.ppy - a.ppy);
  const months = (html.match(/최근 (\d+)개월 이내 계약/) || [])[1];
  const trades = (html.match(/<li class="txn">/g) || []).length;
  console.log(`[검단 실거래가 요약] 최근 ${months || '?'}개월 · 거래 ${trades}건 · 고유 단지 ${list.length}곳`);
  list.slice(0, 3).forEach((r, i) => console.log(`평당가 ${i + 1}위: ${r.apt}(${r.dong}) 평당 ${r.ppy.toLocaleString('en-US')}만 · ${r.amountText} · 전용 ${Math.round(r.area)}㎡ ${r.floor}층`));
  const mid = list[Math.floor(list.length / 2)];
  if (mid) console.log(`중간 순위 단지: ${mid.apt} 평당 ${mid.ppy.toLocaleString('en-US')}만`);
}

function main() {
  if (argv.includes('--prev')) return prev();
  if (argv.includes('--geomdan')) return geomdanStats();
  const html = fs.readFileSync(INDEX_PATH, 'utf8');
  const general = parseSection(html, '<h2>📰 부동산 뉴스</h2>');
  const geomdan = parseSection(html, '<h2>🏙️ 검단신도시 뉴스</h2>');
  const all = [...general, ...geomdan];
  if (all.length === 0) {
    console.error('오류: 후보를 하나도 못 찾았습니다(index.html 마크업 확인).');
    process.exit(1);
  }
  if (picks.length) {
    picks.forEach((n) => {
      if (!all[n - 1]) {
        console.error(`오류: ${n}번 후보가 없습니다(1~${all.length}).`);
        process.exit(1);
      }
      const a = all[n - 1];
      const d = daysSince(a.pub);
      if (d !== null && d >= STALE_DAYS && !allowOld) {
        console.error(`오류: ${n}번 기사는 발행 ${d}일 전(${a.pub})이라 카드에 쓰지 않습니다. 다른 후보를 고르세요(정말 써야 하면 --allow-old).`);
        process.exit(1);
      }
      console.error(`${n}. ${a.title}${a.pub ? ` (발행 ${a.pub})` : ''}`);
      console.log(a.link);
    });
    return;
  }
  const cards = argv.includes('--no-history') ? [] : recentCards();
  let n = 0;
  const print = (label, list) => {
    console.log(`[${label}]`);
    list.forEach((a) => console.log(`${++n}. ${srcTag(a)}${pubTag(a)}${tierMark(a.title)}${usedMark(a.title, cards)}${a.nearby ? '(인접) ' : ''}${a.title}`));
  };
  print('부동산 뉴스', general);
  print('검단신도시 뉴스', geomdan);
  const goods = all.map((a, i) => [i + 1, a]).filter(([, a]) => tierMark(a.title).startsWith('[A') && !usedMark(a.title, cards));
  console.log(`\n[A·A정책 미사용 번호] ${goods.map(([i]) => i).join(' ') || '(없음)'}  ← 표지·이슈·오버레이는 여기서 먼저 고른다`);
  const gd = all.map((a, i) => [i + 1, a]).filter(([, a]) => isGeomdanRealEstate(a.title) && !usedMark(a.title, cards));
  if (gd.length) {
    console.log(`[검단 부동산 우선 후보 번호] ${gd.map(([i]) => i).join(' ')}  ← 같은 가치의 다른 후보보다 먼저 고른다(쓸 만한 기사일 때만)`);
  } else {
    console.log('[검단 부동산 우선 후보 번호] (없음)  ← 쓸 만한 검단 기사가 없으면 억지로 넣지 않는다');
  }
}

main();
