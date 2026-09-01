#!/usr/bin/env node
'use strict';

// 매일 아침 부동산 관련 뉴스를 모아 카카오톡 '나에게 보내기'로 전송한다.
// 필요한 환경 변수는 docs/kakao-realestate-news-setup.md 참고.

const fs = require('fs');

const ARTICLE_COUNT = Number(process.env.ARTICLE_COUNT || 5);
const NEWS_QUERY = process.env.NEWS_QUERY || '부동산 when:1d';
const DIGEST_PAGE_URL = process.env.DIGEST_PAGE_URL || 'https://lifelongdt-beep.github.io/game/';

// "검단신도시"/"검단구" 둘 중 하나를 포함하면서(2026-07-01 개편 이후 기사는
// 점점 "검단구"로 부르게 될 것), 부동산 가격에 영향을 주는 폭넓은 주제
// (거래·가격, 개발·교통 호재, 붕괴·하자 같은 악재까지)를 모두 잡아낸다.
const GEOMDAN_ARTICLE_COUNT = Number(process.env.GEOMDAN_ARTICLE_COUNT || 5);
const GEOMDAN_QUERY =
  process.env.GEOMDAN_QUERY ||
  '("검단신도시" OR "검단구") (청약 OR 분양 OR 실거래가 OR 시세 OR 매매 OR 전세 OR 입주 OR 미분양 OR 개발 OR 도시계획 OR 지구단위계획 OR 택지 OR 재개발 OR 교통 OR 철도 OR 지하철 OR GTX OR 도로 OR 학교 OR 상권 OR 인프라 OR 병원 OR 붕괴 OR 하자 OR 안전진단 OR 침수) when:1d';
const GEOMDAN_KEYWORD = process.env.GEOMDAN_KEYWORD || '검단';
const GEOMDAN_PAGE_URL = process.env.GEOMDAN_PAGE_URL || 'https://lifelongdt-beep.github.io/game/geomdan.html';

// 국토교통부 아파트 매매 실거래가 상세 자료(공공데이터포털). 키가 아직 없으면
// (발급 전이면) 이 섹션만 조용히 건너뛰고 나머지 뉴스 발송은 그대로 진행한다.
//
// LAWD_CD=28290은 검단구. 2026-07-01 인천시 행정구역 개편으로 서구에서 분리된
// 별도 자치구다(예전 서구 코드 28260은 더 이상 이 지역 실거래를 포함하지 않는다
// — 실제 API 응답을 여러 후보 코드로 스캔해서 확인한 값이다). 다만 검단구
// 관할 전체(오류동/왕길동/금곡동/마전동/당하동/원당동/불로동/대곡동/백석동/
// 시천동)가 "검단신도시"는 아니다 — 신도시로 개발된 지역은 그중 당하동/마전동/
// 불로동/원당동뿐이라, 검단구 조회 결과를 GEOMDAN_DONGS로 한 번 더 좁힌다.
const DATA_GO_KR_SERVICE_KEY = process.env.DATA_GO_KR_SERVICE_KEY || '';
const LAWD_CD = process.env.LAWD_CD || '28290'; // 인천광역시 검단구
const GEOMDAN_DONGS = (process.env.GEOMDAN_DONGS || '당하동,마전동,불로동,원당동')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const GEOMDAN_TRANSACTION_COUNT = Number(process.env.GEOMDAN_TRANSACTION_COUNT || 20);

const REST_API_KEY = requireEnv('KAKAO_REST_API_KEY');
const REFRESH_TOKEN = requireEnv('KAKAO_REFRESH_TOKEN');
const CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET || '';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`필수 환경 변수 ${name} 가 설정되지 않았습니다.`);
    process.exit(1);
  }
  return value;
}

async function refreshAccessToken() {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: REST_API_KEY,
    refresh_token: REFRESH_TOKEN,
  });
  if (CLIENT_SECRET) body.set('client_secret', CLIENT_SECRET);

  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`카카오 토큰 갱신 실패: ${res.status} ${JSON.stringify(data)}`);
  }
  return data; // { access_token, expires_in, refresh_token?, refresh_token_expires_in?, ... }
}

function decodeEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 구글 뉴스/실거래가 API 둘 다 가끔 일시적으로 실패한다 — HTTP 상태코드로
// 오기도 하고(503 등), fetch 자체가 예외를 던지며 죽기도 한다(네트워크 오류).
// 특히 실거래가 API(apis.data.go.kr)는 한 번 불안정해지면 시도당 10초 안팎이
// 걸리며 여러 번 연속 실패하는 걸 실제로 관측해서, 재시도 횟수를 5번으로 늘렸다.
async function fetchWithRetry(url, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok || !RETRYABLE_STATUS.has(res.status) || attempt === maxAttempts) return res;
    } catch (err) {
      if (attempt === maxAttempts) throw err;
    }
    await sleep(attempt * 1000);
  }
}

// 구글 뉴스 제목은 "헤드라인 - 언론사명" 형식이라, 같은 기사가 여러 매체에
// 동시 게재되면 언론사명만 다른 제목으로 중복 노출된다. 마지막 " - "만 잘라내
// 헤드라인만 비교해야 이런 경우를 같은 기사로 인식한다(헤드라인 자체에 " - "가
// 있어도 언론사명은 항상 맨 끝에 붙으므로 마지막 구분자만 잘라내는 게 안전하다).
function newsDedupKey(title) {
  const idx = title.lastIndexOf(' - ');
  return idx === -1 ? title : title.slice(0, idx);
}

// 매체마다 같은 사건을 문구·띄어쓰기만 바꿔 보도하는 경우가 많다(예: "검단구,
// 소규모 공장 밀집지역 찾아 화재 예방…" vs "인천 검단구, 소규모 공장밀집지역
// 화재예방…"). 완전히 같은 문자열이 아니어도 겹치는 기사로 봐야 하므로, 공백과
// 인용부호를 지운 뒤 2글자 단위로 쪼갠 부분 문자열(문자 bigram) 집합의 겹치는
// 비율을 본다 — 단어 단위 비교와 달리 언론사마다 다른 띄어쓰기에 영향을 받지 않는다.
function charBigrams(title) {
  const s = title.replace(/[\s'"‘’“”]/g, '');
  const grams = new Set();
  for (let i = 0; i < s.length - 1; i++) grams.add(s.slice(i, i + 2));
  return grams;
}

// 0.45는 실제 검단구 기사로 확인한 값이다: 진짜 같은 사건(세 매체가 각자 다른
// 문구로 보도한 "소규모 공장 화재예방·안전점검" 캠페인)은 겹침이 0.50 안팎이었고,
// 서로 다른 사건인데 "검단구" 같은 짧고 흔한 표현만 겹치는 경우는 0.40을 넘지
// 않았다 — 그 사이인 0.45를 기준으로 삼는다.
const HEADLINE_SIMILARITY_THRESHOLD = 0.45;
function isSimilarHeadline(gramsA, gramsB) {
  if (gramsA.size === 0 || gramsB.size === 0) return false;
  const [small, big] = gramsA.size <= gramsB.size ? [gramsA, gramsB] : [gramsB, gramsA];
  let overlap = 0;
  for (const gram of small) if (big.has(gram)) overlap++;
  return overlap / small.size >= HEADLINE_SIMILARITY_THRESHOLD;
}

// requireKeyword를 주면, 구글 뉴스 검색이 느슨하게 매칭한(제목에 그 키워드가 아예
// 없는) 무관한 기사를 한 번 더 걸러낸다. 검단신도시처럼 좁은 주제에서 특히 필요하다.
async function fetchNews(query, limit, requireKeyword) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    throw new Error(`뉴스 조회 실패: ${res.status}`);
  }
  const xml = await res.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);

  // 같은 사건을 다루는 기사가 여러 건 모이면, 그중 헤드라인이 가장 긴(=가장
  // 자세히 쓴) 기사만 대표로 남긴다. 클러스터를 판정하는 기준(grams)은 그
  // 클러스터에 처음 들어온 기사로 고정해서, 나중에 대표 기사가 바뀌어도 판정
  // 기준 자체는 흔들리지 않게 한다. 마지막에 대표만 골라야 하므로 `limit`에
  // 도달해도 중간에 끊지 않고 전체 기사를 다 훑는다.
  const clusters = [];
  for (const item of items) {
    const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
    if (!titleMatch || !linkMatch) continue;

    const title = decodeEntities(titleMatch[1].trim());
    const link = decodeEntities(linkMatch[1].trim());
    if (requireKeyword && !title.includes(requireKeyword)) continue;

    const dedupKey = newsDedupKey(title);
    const grams = charBigrams(dedupKey);
    const cluster = clusters.find((c) => isSimilarHeadline(grams, c.grams));
    if (!cluster) {
      clusters.push({ grams, title, link, detailLen: dedupKey.length });
    } else if (dedupKey.length > cluster.detailLen) {
      cluster.title = title;
      cluster.link = link;
      cluster.detailLen = dedupKey.length;
    }
  }
  return clusters.slice(0, limit).map(({ title, link }) => ({ title, link }));
}

// 재시도까지 다 실패해도(예: 구글 뉴스 장애) 그 쪽 뉴스만 빈 목록으로 처리하고
// 카카오톡 발송·페이지 갱신 등 나머지 파이프라인은 그대로 진행한다.
async function fetchNewsSafe(query, limit, requireKeyword) {
  try {
    return await fetchNews(query, limit, requireKeyword);
  } catch (err) {
    console.error(err.message);
    return [];
  }
}

function xmlTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? decodeEntities(m[1].trim()) : '';
}

// 계약월 하나에 대해 실거래가 상세 자료를 조회한다. 인증키는 공공데이터포털의
// '일반 인증키(Encoding)' 값을 그대로 써야 하므로, URLSearchParams로 다시
// 인코딩하지 않고 URL 문자열에 직접 이어붙인다(이중 인코딩되면 인증에 실패한다).
async function fetchTransactionsForMonth(dealYmd) {
  const url =
    'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev' +
    `?serviceKey=${DATA_GO_KR_SERVICE_KEY}&LAWD_CD=${LAWD_CD}&DEAL_YMD=${dealYmd}&numOfRows=1000&pageNo=1`;

  const res = await fetchWithRetry(url);
  const xml = await res.text();

  if (!res.ok || xml.includes('<cmmMsgHeader>')) {
    const errMsg = xmlTag(xml, 'returnAuthMsg') || xmlTag(xml, 'errMsg') || `HTTP ${res.status}`;
    throw new Error(`실거래가 API 오류(${dealYmd}): ${errMsg}`);
  }
  // 이 API는 성공 시 resultCode를 '00'이 아니라 '000'으로 내려준다(데이터포털
  // 공통 규격과 다른, 이 데이터셋 특유의 표기). 실제 응답으로 확인된 값이라 둘 다 허용한다.
  const resultCode = xmlTag(xml, 'resultCode');
  if (resultCode && !['00', '000'].includes(resultCode)) {
    throw new Error(`실거래가 API 오류(${dealYmd}, ${resultCode}): ${xmlTag(xml, 'resultMsg')}`);
  }

  const itemBlocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);

  return itemBlocks.map((item) => ({
    apt: xmlTag(item, 'aptNm'),
    dong: xmlTag(item, 'umdNm'),
    area: xmlTag(item, 'excluUseAr'),
    amount: xmlTag(item, 'dealAmount').replace(/,/g, ''),
    floor: xmlTag(item, 'floor'),
    year: xmlTag(item, 'dealYear'),
    month: xmlTag(item, 'dealMonth').padStart(2, '0'),
    day: xmlTag(item, 'dealDay').padStart(2, '0'),
  }));
}

// 이번 달 + 지난달을 함께 조회한다(신고 기한 때문에 이번 달 초에는 자료가 거의 없다).
// LAWD_CD가 검단구 전체를 가리키므로, 그중 신도시로 개발된 법정동(GEOMDAN_DONGS)만
// 한 번 더 걸러낸다.
async function fetchGeomdanTransactions() {
  if (!DATA_GO_KR_SERVICE_KEY) {
    console.log('DATA_GO_KR_SERVICE_KEY가 없어 실거래가 조회를 건너뜁니다.');
    return [];
  }

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const months = [0, -1].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const all = [];
  for (const dealYmd of months) {
    try {
      all.push(...(await fetchTransactionsForMonth(dealYmd)));
    } catch (err) {
      console.error(err.message);
    }
  }

  const newTownOnly = all.filter((t) => GEOMDAN_DONGS.some((dong) => t.dong.includes(dong)));
  console.log(`실거래가: 검단구 ${all.length}건 중 검단신도시(${GEOMDAN_DONGS.join('/')}) ${newTownOnly.length}건`);
  newTownOnly.sort((a, b) => Number(b.amount) - Number(a.amount));
  return newTownOnly.slice(0, GEOMDAN_TRANSACTION_COUNT);
}

function formatAmount(manwonStr) {
  const n = Number(manwonStr);
  if (!Number.isFinite(n)) return `${manwonStr}만원`;
  const eok = Math.floor(n / 10000);
  const rest = n % 10000;
  if (eok <= 0) return `${n.toLocaleString('ko-KR')}만원`;
  return rest > 0 ? `${eok}억 ${rest.toLocaleString('ko-KR')}만원` : `${eok}억원`;
}

async function sendKakaoTemplate(accessToken, templateObject) {
  const res = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
    body: new URLSearchParams({ template_object: JSON.stringify(templateObject) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`카카오톡 전송 실패: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function sendKakaoText(accessToken, text, link) {
  return sendKakaoTemplate(accessToken, {
    object_type: 'text',
    text,
    link: { web_url: link, mobile_web_url: link },
    button_title: '기사 보기',
  });
}

function truncate(str, max) {
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

function currentPeriodLabel() {
  const hour = Number(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul', hour: '2-digit', hour12: false })
  );
  return hour < 12 ? '오전' : '오후';
}

// 카카오 '나에게 보내기'는 text 타입(제목 + 링크 1개)만 안정적으로 클릭이 된다.
// list 타입은 이미지가 있어도 눌리지 않는 평면 카드로만 뜨는 걸 실제 테스트로 확인해서
// 기사 제목을 전부 한 메시지 본문에 나열하고, 링크는 전체 기사가 있는 다이제스트
// 페이지 하나로 보내는 방식으로 대신한다. (페이지 안 링크는 각각 정상 클릭됨)
async function sendArticlesDigest(accessToken, header, articles, link) {
  const maxTotalLen = 180; // 카카오 text 타입 안전 길이
  const lines = [header];
  let used = header.length;
  for (const article of articles) {
    const line = truncate(`${lines.length}. ${article.title}`, 42);
    if (used + line.length + 1 > maxTotalLen) break;
    lines.push(line);
    used += line.length + 1;
  }

  await sendKakaoText(accessToken, lines.join('\n'), link);
  console.log(`[${header}] 기사 ${lines.length - 1}건을 메시지 한 통으로 전송했습니다 (전체 목록은 링크로 연결).`);
}

function writeOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  fs.appendFileSync(outputPath, `${name}<<KAKAO_EOF\n${value}\nKAKAO_EOF\n`);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 일반 부동산 뉴스와 검단신도시 소식은 서로 다른 메시지/독립된 화제라, 페이지도 완전히
// 분리한다(공유 섹션 없이 각자 자기 내용만 담은 별도 HTML 파일).
// 재부키 오픈채팅방 방장봇 공지에는 이 중 일반 뉴스 페이지 링크를 걸어둔다.
// 카카오는 오픈채팅방에 대신 글을 올려주는 API를 제공하지 않으므로,
// 링크는 고정해두고 그 안의 내용만 매일 갱신하는 방식으로 우회한다.
function renderArticlesHtml(articles) {
  return articles.length
    ? articles
        .map(
          (a) => `    <li class="article"><a href="${escapeHtml(a.link)}" target="_blank" rel="noopener">${escapeHtml(a.title)}</a></li>`
        )
        .join('\n')
    : '    <li class="empty">오늘은 새로 조회된 소식이 없어요.</li>';
}

function renderTransactionsHtml(transactions) {
  return transactions.length
    ? transactions
        .map(
          (t) => `    <li class="txn">
      <div class="txn-top"><span class="txn-dong">${escapeHtml(t.dong)}</span><span class="txn-amount">${escapeHtml(formatAmount(t.amount))}</span></div>
      <div class="txn-apt">${escapeHtml(t.apt)}</div>
      <div class="txn-meta">${escapeHtml(t.area)}㎡ · ${escapeHtml(t.floor)}층 · ${t.year}.${t.month}.${t.day} 계약</div>
    </li>`
        )
        .join('\n')
    : '    <li class="empty">최근 조회된 실거래 내역이 없어요.</li>';
}

const PAGE_STYLE = `
  :root { color-scheme: light dark; }
  body { margin: 0; padding: 24px 16px 40px; font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; background: #f7f7f8; color: #1a1a1a; }
  main { max-width: 560px; margin: 0 auto; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 28px 0 10px; }
  .updated { color: #666; font-size: 13px; margin: 0 0 20px; }
  ul { list-style: none; margin: 0; padding: 0; }
  .article, .txn { background: #fff; border-radius: 10px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,.06); }
  .article a { display: block; padding: 14px 16px; color: #111; text-decoration: none; font-size: 15px; line-height: 1.4; }
  .txn { padding: 12px 16px; }
  .txn-top { display: flex; justify-content: space-between; align-items: baseline; }
  .txn-dong { font-size: 12px; color: #888; }
  .txn-amount { font-size: 15px; font-weight: 700; color: #d3552b; }
  .txn-apt { font-size: 15px; margin-top: 2px; }
  .txn-meta { font-size: 12px; color: #888; margin-top: 2px; }
  .empty { color: #666; padding: 14px 0; }
  .source { color: #999; font-size: 12px; margin-top: 4px; }
  @media (prefers-color-scheme: dark) {
    body { background: #17181a; color: #eee; }
    .article, .txn { background: #232427; box-shadow: none; }
    .article a { color: #eee; }
    .updated, .txn-dong, .txn-meta, .source { color: #999; }
    .txn-amount { color: #ff8a5c; }
  }
`;

function renderPage(title, articles, generatedAt) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${PAGE_STYLE}</style>
</head>
<body>
<main>
  <h1>${escapeHtml(title)}</h1>
  <p class="updated">${escapeHtml(generatedAt)} 기준 자동 업데이트</p>
  <ul>
${renderArticlesHtml(articles)}
  </ul>
</main>
</body>
</html>
`;
}

// 검단신도시 페이지는 뉴스와 실거래가 두 섹션으로 구성한다. 둘 다 검단신도시라는
// 같은 주제를 다루되 정보의 종류(기사 vs 국토부 공식 거래 기록)만 다르므로 한 페이지
// 안에서 나눈다 (일반 부동산 뉴스 페이지와는 완전히 분리된 상태를 그대로 유지한다).
function renderGeomdanPage(articles, transactions, generatedAt) {
  const title = '🏙️ 인천 검단신도시 청약·거래 소식';
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${PAGE_STYLE}</style>
</head>
<body>
<main>
  <h1>${escapeHtml(title)}</h1>
  <p class="updated">${escapeHtml(generatedAt)} 기준 자동 업데이트</p>

  <h2>📰 관련 뉴스</h2>
  <ul>
${renderArticlesHtml(articles)}
  </ul>

  <h2>🏘️ 아파트 실거래가</h2>
  <ul>
${renderTransactionsHtml(transactions)}
  </ul>
  <p class="source">자료: 국토교통부 아파트 매매 실거래가 상세 자료(공공데이터포털)</p>
</main>
</body>
</html>
`;
}

function publishPage(filename, title, articles) {
  const generatedAt = new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'long',
    timeStyle: 'short',
  });
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync(`docs/${filename}`, renderPage(title, articles, generatedAt));
  console.log(`docs/${filename} 갱신 완료`);
}

function publishGeomdanPage(articles, transactions) {
  const generatedAt = new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'long',
    timeStyle: 'short',
  });
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync('docs/geomdan.html', renderGeomdanPage(articles, transactions, generatedAt));
  console.log('docs/geomdan.html 갱신 완료');
}

async function main() {
  const tokenData = await refreshAccessToken();
  const accessToken = tokenData.access_token;

  if (tokenData.refresh_token && tokenData.refresh_token !== REFRESH_TOKEN) {
    console.log('카카오 refresh_token이 새로 발급되었습니다.');
    writeOutput('new_refresh_token', tokenData.refresh_token);
  }

  const articles = await fetchNewsSafe(NEWS_QUERY, ARTICLE_COUNT);
  const geomdanArticles = await fetchNewsSafe(GEOMDAN_QUERY, GEOMDAN_ARTICLE_COUNT, GEOMDAN_KEYWORD);
  const geomdanTransactions = await fetchGeomdanTransactions();

  publishPage('index.html', '🏠 오늘의 부동산 뉴스', articles);
  publishGeomdanPage(geomdanArticles, geomdanTransactions);

  const period = currentPeriodLabel();

  if (articles.length === 0) {
    await sendKakaoText(accessToken, `🏠 ${period}에는 새로 조회된 부동산 뉴스가 없어요.`, DIGEST_PAGE_URL);
    console.log('전송할 기사가 없어 안내 메시지만 보냈습니다.');
  } else {
    await sendArticlesDigest(accessToken, `🏠 ${period} 부동산 뉴스`, articles, DIGEST_PAGE_URL);
  }

  // 검단신도시 메시지도 일반 부동산 뉴스와 동일하게 오전/오후 발송 모두 보낸다.
  if (geomdanArticles.length > 0) {
    await sendArticlesDigest(
      accessToken,
      `🏙️ ${period} 인천 검단신도시 청약·거래 소식`,
      geomdanArticles,
      GEOMDAN_PAGE_URL
    );
  } else {
    console.log('검단신도시 관련 소식이 없어 별도 메시지는 보내지 않았습니다.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
