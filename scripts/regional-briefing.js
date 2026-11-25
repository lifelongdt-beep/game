#!/usr/bin/env node
'use strict';

// 지역 선택형 아침 브리핑 데이터 수집.
// 전국 시군구(scripts/regions-kr.json)마다 동네 부동산 뉴스와 최근 실거래를 모으고,
// 주제별 전국 부동산 뉴스를 모아 docs/regions/data/에 JSON으로 쓴다. 화면(docs/regions/index.html)은 이 JSON을
// 읽어 동네·주제·법정동 선택과 '나만의 동네'(여러 법정동 + 아파트 넣고 빼기, 기기에 저장)를 브라우저에서 처리한다. 기존 검단 카드뉴스·카카오톡(kakao-realestate-news.js)과는
// 따로 돌고, 그쪽의 뉴스 수집·실거래 조회 함수만 가져다 쓴다.
//
// 환경 변수
//   DATA_GO_KR_SERVICE_KEY     국토부 실거래가 키. 없으면 실거래는 건너뛴다(뉴스는 그대로).
//   REGION_CODES               쉼표로 고른 시군구 코드만 새로 모은다(기본: 전부). 시험 실행용.
//   REGION_SKIP_NEWS=true      동네 뉴스 수집을 건너뛴다(실거래만 확인할 때).
//   REGION_TX_MONTHS           실거래 기간(개월, 기본 3).
//   REGION_TX_CONCURRENCY      실거래를 동시에 받는 시군구 수(기본 3).
//   REGION_TX_BUDGET_MS        시군구 하나에 쓰는 실거래 조회 시간(기본 60000).
//   REGION_TOTAL_BUDGET_MS     실거래 전체 시간 예산(기본 3600000 = 60분). 넘으면 남은 곳은 지난 자료를 쓴다.
//   REGION_OUT_DIR             출력 폴더(기본 docs/regions). 데이터는 그 아래 data/.

const fs = require('fs');
const path = require('path');
const { NEWS_QUERY, fetchNewsSafe, fetchTransactionsForMonth, windowStart, sleep } = require('./kakao-realestate-news');
const { pricePerPyeong, isRealEstateNews } = require('./geomdan-common');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.resolve(ROOT, process.env.REGION_OUT_DIR || 'docs/regions');
const DATA_DIR = path.join(OUT_DIR, 'data');
const SERVICE_KEY = process.env.DATA_GO_KR_SERVICE_KEY || '';
const TX_MONTHS = Number(process.env.REGION_TX_MONTHS || 3);
const TX_CONCURRENCY = Number(process.env.REGION_TX_CONCURRENCY || 3);
const TX_BUDGET_MS = Number(process.env.REGION_TX_BUDGET_MS || 60000);
const TOTAL_BUDGET_MS = Number(process.env.REGION_TOTAL_BUDGET_MS || 3600000);
const SKIP_NEWS = process.env.REGION_SKIP_NEWS === 'true';
const LOCAL_NEWS_COUNT = 15;
const TOPIC_NEWS_COUNT = 8;
const MAIN_NEWS_COUNT = 10;
const NEWS_DELAY_MS = Number(process.env.REGION_NEWS_DELAY_MS || 400); // 구글 뉴스에 한꺼번에 몰리지 않게 요청 사이를 띄운다.

// 뉴스 방향(주제). 화면에서 고른 주제의 기사만 보여준다. 기사 하나가 여러 주제에 걸릴 수 있다.
// query는 주제별 전국 뉴스 검색어, re는 제목으로 주제를 붙이는 기준.
const TOPICS = [
  { key: 'subscription', label: '청약·분양', re: /청약|분양|입주자 ?모집|당첨|경쟁률|무순위|줍줍|견본주택|모델하우스/,
    query: '(청약 OR 분양 OR 무순위 OR 경쟁률 OR "입주자 모집") 아파트' },
  { key: 'policy', label: '정책·대출·세금', re: /대책|규제|대출|DSR|LTV|금리|주담대|세금|보유세|종부세|종합부동산세|양도세|취득세|재산세|토지거래허가|토허|조정대상|투기과열|국토부|국토교통부|금융위|기준금리/,
    query: '("부동산 대책" OR 주택담보대출 OR DSR OR 보유세 OR 양도세 OR 토지거래허가 OR 기준금리) 부동산' },
  { key: 'price', label: '시세·실거래', re: /시세|집값|매매가|실거래|신고가|거래량|아파트값|가격지수|호가|급매|미분양|상승세|하락세|오름세|내림세/,
    query: '(아파트값 OR 집값 OR 실거래 OR 신고가 OR 거래량 OR 매매가격지수 OR 미분양)' },
  { key: 'redevelop', label: '재개발·재건축', re: /재개발|재건축|정비사업|리모델링|정비구역|조합|안전진단|모아타운|신속통합|선도지구/,
    query: '(재건축 OR 재개발 OR 정비사업 OR 리모델링 OR 선도지구 OR 모아타운)' },
  { key: 'rent', label: '전월세', re: /전세|월세|임대차|역전세|갭투자|임대주택|보증금/,
    query: '(전세 OR 월세 OR 전월세 OR 임대차 OR 역전세 OR 전세가율) 아파트' },
  { key: 'transport', label: '교통·개발', re: /GTX|철도|지하철|전철|노선|개통|착공|역세권|광역교통|고속도로|도로|신도시|택지|산업단지|개발사업|트램|BRT/,
    query: '(GTX OR 광역철도 OR "지하철 연장" OR 개통 OR 착공 OR 신도시 OR 택지) 부동산' },
];
const LOCAL_TOPIC_QUERY = '(부동산 OR 아파트 OR 분양 OR 청약 OR 재건축 OR 재개발 OR 전세 OR 집값 OR 실거래 OR 개통 OR 착공 OR 신도시)';

const headOf = (title) => (title.lastIndexOf(' - ') > 0 ? title.slice(0, title.lastIndexOf(' - ')) : title);
const topicsOf = (title) => TOPICS.filter((t) => t.re.test(headOf(title))).map((t) => t.key);

function kstNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data) + '\n');
}

// ── 지역 목록 ──────────────────────────────────────────

// 동네 뉴스로 볼 제목 기준. "수원시 장안구"처럼 시 아래 구는 구 이름이나 시 이름(수원)이 있으면 되고,
// 같은 이름이 여러 곳에 있는 중구·고성군 등은 시·도 이름(인천)도 함께 있어야 한다.
function newsRuleFor(region, duplicateNames) {
  // 세 글자 이상이면 끝의 시·군·구를 뗀 이름도 인정한다(강남구 → 강남, 분당구 → 분당, 화성시 → 화성).
  const strip = (n) => (n.length >= 3 ? n.replace(/[시군구]$/, '') : n);
  const uniq = (list) => [...new Set(list)];
  const orQuery = (list) => (list.length === 1 ? list[0] : `(${list.join(' OR ')})`);
  const parts = region.name.split(' ');
  if (parts.length === 2) {
    const any = uniq([parts[1], strip(parts[1]), strip(parts[0])]);
    return { query: orQuery(any), any, all: [] };
  }
  const any = uniq([region.name, strip(region.name)]);
  if (duplicateNames.has(region.name)) {
    return { query: orQuery(any.map((n) => `"${region.sido} ${n}"`)), any, all: [region.sido] };
  }
  return { query: orQuery(any), any, all: [] };
}

function loadRegions() {
  const all = readJson(path.join(__dirname, 'regions-kr.json')).regions;
  const counts = new Map();
  for (const r of all) counts.set(r.name, (counts.get(r.name) || 0) + 1);
  const dup = new Set([...counts].filter(([, c]) => c > 1).map(([n]) => n));
  for (const r of all) r.news = newsRuleFor(r, dup);
  return all;
}

// ── 뉴스 ──────────────────────────────────────────────

function compactArticle(a) {
  const idx = a.title.lastIndexOf(' - ');
  return {
    t: headOf(a.title),
    s: idx > 0 ? a.title.slice(idx + 3) : '',
    l: a.link,
    n: a.sourceCount || 1,
    d: a.pubDate && !isNaN(new Date(a.pubDate)) ? new Date(a.pubDate).toISOString() : null,
    tp: topicsOf(a.title),
  };
}

async function fetchLocalNewsForRegion(rule) {
  const filter = (title) => {
    const head = headOf(title);
    return rule.any.some((k) => head.includes(k)) && rule.all.every((k) => head.includes(k)) && isRealEstateNews(head);
  };
  return (await fetchNewsSafe(`${rule.query} ${LOCAL_TOPIC_QUERY} when:1d`, LOCAL_NEWS_COUNT, filter)).map(compactArticle);
}

async function fetchNationalNews() {
  const main = (await fetchNewsSafe(NEWS_QUERY, MAIN_NEWS_COUNT)).map(compactArticle);
  const topics = {};
  for (const t of TOPICS) {
    await sleep(NEWS_DELAY_MS);
    topics[t.key] = (await fetchNewsSafe(`${t.query} when:1d`, TOPIC_NEWS_COUNT, (title) => t.re.test(headOf(title)))).map(compactArticle);
  }
  return { main, topics };
}

// ── 실거래가 ──────────────────────────────────────────

function monthsToFetch(now) {
  return Array.from({ length: TX_MONTHS + 1 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

// 시군구 하나의 최근 거래. 화면에서 법정동별로 다시 거를 수 있게 거래를 그대로 담는다.
// 한 줄 = [단지, 법정동, 전용㎡, 거래금액(만원), 층, 계약일 YYYY.MM.DD, 평당가(만원)]
async function fetchRegionTransactions(code, now, globalDeadline) {
  const deadline = Math.min(Date.now() + TX_BUDGET_MS, globalDeadline);
  const raw = [];
  let tried = 0;
  let failed = 0;
  for (const ym of monthsToFetch(now)) {
    for (let page = 1; page <= 10; page++) {
      if (Date.now() >= deadline) {
        failed++;
        break;
      }
      tried++;
      try {
        const items = await fetchTransactionsForMonth(ym, deadline, code, page);
        raw.push(...items);
        if (items.length < 1000) break;
      } catch (err) {
        console.error(`[${code}] ${err.message}`);
        failed++;
        break;
      }
    }
  }
  const cutoff = windowStart(now, TX_MONTHS);
  const seen = new Set();
  const items = [];
  for (const t of raw) {
    if (t.cancelType === 'O') continue;
    if (new Date(Number(t.year), Number(t.month) - 1, Number(t.day)) < cutoff) continue;
    const row = [t.apt, t.dong, Number(t.area), Number(t.amount), t.floor, `${t.year}.${t.month}.${t.day}`, pricePerPyeong(t.amount, t.area)];
    const key = row.join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(row);
  }
  items.sort((a, b) => b[5].localeCompare(a[5]) || b[3] - a[3]);
  const status = tried === 0 || failed >= tried ? 'error' : failed > 0 ? 'partial' : 'ok';
  return { status, raw: raw.length, items };
}

async function pool(list, size, worker) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, list.length) }, async () => {
      while (next < list.length) {
        const i = next++;
        await worker(list[i], i);
      }
    })
  );
}

// ── 실행 ──────────────────────────────────────────────

async function main() {
  const startedAt = Date.now();
  const all = loadRegions();
  const only = (process.env.REGION_CODES || '').split(',').map((s) => s.trim()).filter(Boolean);
  const targets = only.length ? all.filter((r) => only.includes(r.code)) : all;
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const now = kstNow();
  const generatedAt = new Date().toISOString();
  const generatedAtText = `${now.getMonth() + 1}월 ${now.getDate()}일 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // 1) 전국 뉴스(주요 + 주제별)
  const national = await fetchNationalNews();
  writeJson(path.join(DATA_DIR, 'national.json'), { generatedAt, generatedAtText, ...national });
  console.log(`전국 뉴스: 주요 ${national.main.length}건, ${TOPICS.map((t) => `${t.label} ${national.topics[t.key].length}`).join(', ')}`);

  // 2) 실거래(시군구 단위, 동시에 몇 곳씩)
  const txByCode = new Map();
  const report = { ok: 0, partial: 0, error: 0, stale: 0, empty: [] };
  if (SERVICE_KEY) {
    const globalDeadline = startedAt + TOTAL_BUDGET_MS;
    await pool(targets, TX_CONCURRENCY, async (r) => {
      const tx = await fetchRegionTransactions(r.code, now, globalDeadline);
      report[tx.status]++;
      if (tx.status !== 'error' && tx.raw === 0) report.empty.push(`${r.sido} ${r.name}(${r.code})`);
      txByCode.set(r.code, tx);
    });
    console.log(`실거래: 성공 ${report.ok}, 일부 실패 ${report.partial}, 실패 ${report.error} / ${targets.length}곳`);
    if (report.empty.length) console.log(`::warning::실거래가 한 건도 오지 않은 시군구(코드 확인 필요): ${report.empty.join(', ')}`);
  } else {
    console.log('DATA_GO_KR_SERVICE_KEY가 없어 실거래는 건너뜁니다.');
  }

  // 3) 시군구별 파일(뉴스 + 실거래). 실거래 조회가 실패한 곳은 지난 파일의 실거래를 "지난 자료"로 이어 쓴다.
  const staleOf = (prev) => ({ ...prev.tx, stale: true, staleFrom: prev.tx.staleFrom || prev.generatedAtText });
  const txFor = (code, prev) => {
    const tx = txByCode.get(code);
    if (tx && tx.status !== 'error') return { status: tx.status, months: TX_MONTHS, items: tx.items };
    if (prev?.tx?.items?.length) {
      report.stale++;
      return staleOf(prev);
    }
    return { status: SERVICE_KEY ? 'error' : 'nokey', months: TX_MONTHS, items: [] };
  };

  for (const r of targets) {
    const file = path.join(DATA_DIR, `${r.code}.json`);
    const prev = readJson(file, null);
    let news = prev?.news || [];
    if (!SKIP_NEWS) {
      await sleep(NEWS_DELAY_MS);
      news = await fetchLocalNewsForRegion(r.news);
    }
    writeJson(file, { code: r.code, sido: r.sido, name: r.name, generatedAt, generatedAtText, news, tx: txFor(r.code, prev) });
  }
  console.log(`시군구 ${targets.length}곳 저장(지난 실거래 사용 ${report.stale}곳)`);

  // 4) 화면이 처음 읽는 목록(나만의 동네 설정에서 법정동을 고를 수 있게 동 목록도 싣는다)
  writeJson(path.join(DATA_DIR, 'index.json'), {
    generatedAt,
    generatedAtText,
    topics: TOPICS.map(({ key, label }) => ({ key, label })),
    regions: all.map((r) => ({ code: r.code, sido: r.sido, name: r.name, dongs: r.dongs })),
  });
  console.log(`완료: ${path.relative(ROOT, DATA_DIR)} (${Math.round((Date.now() - startedAt) / 1000)}초)`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main, TOPICS, topicsOf, newsRuleFor };
