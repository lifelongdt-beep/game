#!/usr/bin/env node
'use strict';

// 매일 아침 부동산 관련 뉴스를 모아 카카오톡 '나에게 보내기'로 전송한다.
// 필요한 환경 변수는 docs/kakao-realestate-news-setup.md 참고.

const fs = require('fs');

const ARTICLE_COUNT = Number(process.env.ARTICLE_COUNT || 5);
// "부동산" 같은 일반 언급뿐 아니라, 그 단어 없이 지표명만으로 쓰이는 기사도
// 잡아내려고 시장 지표·정책·거래 관련 키워드를 폭넓게 OR로 추가했다.
const NEWS_QUERY =
  process.env.NEWS_QUERY ||
  '(부동산 OR 매매가격지수 OR 전세가격지수 OR 전세가율 OR 매매수급지수 OR 거래량 OR 미분양 OR "준공 후 미분양" OR "인허가 실적" OR "착공 실적" OR "분양 실적" OR "입주 물량" OR 기준금리 OR 대출금리 OR "스트레스 DSR" OR 대출한도 OR "다주택자 양도세 중과" OR 취득세 OR 종합부동산세 OR "공시가격 현실화" OR 공정시장가액비율 OR 토지거래허가구역 OR 소비자심리지수 OR 매수우위지수 OR 급매물 OR 전세난 OR 갭투자 OR 역전세 OR "임대차 2법" OR 계약갱신청구권 OR PIR OR 청약경쟁률 OR 분양가상한제 OR 재건축 OR 재개발 OR "규제지역 해제" OR "지방 미분양" OR "서울 신축 공급") when:1d';
const DIGEST_PAGE_URL = process.env.DIGEST_PAGE_URL || 'https://lifelongdt-beep.github.io/game/';

// 검단신도시 뉴스는 두 갈래로 찾는다.
// ① GEOMDAN_QUERY: "검단신도시"/"인천 검단"/"서구 검단"과 반드시 함께 언급된
//    기사만 — 교통/분양·청약/시세·거래/생활 인프라/정책·금융 각 분야의 구체적인
//    키워드로 좁힌다. 본문이 아니라 제목 기준으로만 GEOMDAN_KEYWORD를 한 번 더
//    검사한다(이 스크립트는 기사 본문을 읽지 않고 구글 뉴스 제목/링크만 다룬다).
// ② GEOMDAN_NEARBY_QUERY: "검단" 언급이 없어도, 생활권·교통망을 공유해 검단신도시에
//    영향을 줄 만한 인접 지역(3기 신도시·인접 택지지구 등) 개발 이슈는 별도로 찾는다.
//    ①에는 안 걸리고 ②에서만 걸린 기사는 "인접 지역 호재" 딱지만 붙이고, 실제
//    영향 내용은 요약하지 않는다(본문 접근·요약 기능이 없어 딱지만 붙이기로
//    사용자와 합의함).
// fetchGeomdanArticles가 두 결과를 합쳐 유사 헤드라인은 하나로 묶고, 발행 시각
// 최신순으로 정리한다.
const GEOMDAN_ARTICLE_COUNT = Number(process.env.GEOMDAN_ARTICLE_COUNT || 5);
const GEOMDAN_QUERY =
  process.env.GEOMDAN_QUERY ||
  '(검단신도시 OR "인천 검단" OR "서구 검단") ("인천1호선 연장" OR 검단선 OR "계양역 환승" OR 아라역 OR 신검단중앙역 OR 검단호수공원역 OR GTX-D OR "서울지하철 5호선 연장" OR "검단~드림로 연결도로" OR "마곡 접근성" OR "DMC 접근성" OR "강남 접근성" OR 청약경쟁률 OR "1순위 청약" OR 미분양 OR "악성 미분양" OR 입주물량 OR "AA블록 분양" OR "검단 센트럴시티" OR 분양가 OR "초기 분양률" OR 실거래가 OR "매매가 상승" OR 갭투자 OR "역세권 프리미엄" OR "검단신도시 시세" OR 인구증가 OR "상업시설 입지" OR 대형마트 OR 학군 OR "규제지역 해제" OR 대출한도 OR DSR OR "수도권 서북부 부동산") when:1d';
const GEOMDAN_KEYWORD = process.env.GEOMDAN_KEYWORD || '검단';
const GEOMDAN_NEARBY_QUERY =
  process.env.GEOMDAN_NEARBY_QUERY ||
  '(계양신도시 OR "계산지구 도시개발사업" OR "김포 콤팩트시티" OR 청라국제도시 OR 루원시티 OR "왕길1구역 재개발" OR "검단3·5구역 재개발" OR 에코메타시티 OR "한들3구역" OR "인천국제공항고속도로 검단IC 개통" OR "서부권 광역급행철도" OR GTX-D OR "수도권 제2순환고속도로" OR "인천2호선 고양지선" OR 대장신도시 OR 마곡신도시) when:1d';
// GEOMDAN_NEARBY_QUERY는 "검단" 언급이 없어도 매칭되므로, 구글의 느슨한 OR
// 매칭에만 기대면 무관한 기사가 섞인다(위 titleMatchesKeyword 설명 참고). 검색
// 뒤 제목이 이 목록 중 하나라도 실제로 포함하는지 다시 검증한다 — 쿼리보다 짧은
// 핵심 단어를 쓴 항목도 있다(예: 전체 문구 대신 "검단IC"만), 매체마다 문구가
// 조금씩 달라도 걸리게 하려는 의도다. GEOMDAN_NEARBY_QUERY를 커스터마이즈하면
// 이 목록도 함께 맞춰야 한다.
const GEOMDAN_NEARBY_TERMS = [
  '계양신도시', '계산지구', '김포 콤팩트시티', '청라국제도시', '루원시티',
  '왕길1구역', '검단3·5구역', '에코메타시티', '한들3구역', '검단IC',
  '서부권 광역급행철도', 'GTX-D', '수도권 제2순환고속도로', '인천2호선 고양지선',
  '대장신도시', '마곡신도시',
];
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
const GEOMDAN_TRANSACTION_DAYS = Number(process.env.GEOMDAN_TRANSACTION_DAYS || 14);

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

// 구글 뉴스는 OR로 묶은 키워드를 정확히 일치가 아니라 느슨하게(의미 기반)
// 매칭한다 — 예를 들어 GEOMDAN_NEARBY_QUERY에 "인천국제공항고속도로 검단IC
// 개통"을 넣었더니 라코스테 인천공항 매장 오픈, 유류할증료 인상처럼 전혀 무관한
// "인천국제공항" 관련 기사까지 걸린 걸 실제 라이브 데이터로 확인했다. 그래서
// 제목에 requireKeyword(문자열 또는 배열 중 하나)가 실제로 포함돼 있는지 다시
// 검증한다.
function titleMatchesKeyword(title, requireKeyword) {
  if (!requireKeyword) return true;
  const keywords = Array.isArray(requireKeyword) ? requireKeyword : [requireKeyword];
  return keywords.some((k) => title.includes(k));
}

// RSS XML을 기사 후보 목록(제목/링크/발행시각)으로 만든다. 아직 중복 제거는 하지
// 않는다 — 검단신도시 뉴스는 검색을 두 번(①직접/②인접 지역) 해서 합친 뒤 한
// 번에 중복을 걸러야 하므로, 파싱과 중복 제거 단계를 분리해뒀다.
function parseNewsItems(xml, requireKeyword) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  const candidates = [];
  for (const item of items) {
    const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
    if (!titleMatch || !linkMatch) continue;

    const title = decodeEntities(titleMatch[1].trim());
    const link = decodeEntities(linkMatch[1].trim());
    if (!titleMatchesKeyword(title, requireKeyword)) continue;

    const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const pubDate = pubDateMatch ? new Date(pubDateMatch[1].trim()) : null;

    candidates.push({ title, link, pubDate });
  }
  return candidates;
}

async function fetchNewsCandidates(query, requireKeyword) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    throw new Error(`뉴스 조회 실패: ${res.status}`);
  }
  const xml = await res.text();
  return parseNewsItems(xml, requireKeyword);
}

// 같은 사건을 다루는 후보가 여러 건 모이면, 그중 헤드라인이 가장 긴(=가장 자세히
// 쓴) 기사만 대표로 남긴다. 클러스터를 판정하는 기준(grams)은 그 클러스터에 처음
// 들어온 후보로 고정해서, 나중에 대표가 바뀌어도 판정 기준 자체는 흔들리지 않게
// 한다. candidate.nearby가 true인 후보만으로 이뤄진 클러스터는 결과에도
// nearby:true로 남긴다(검단이 직접 언급된 후보가 하나라도 섞이면 더 이상
// "인접 지역"만의 소식이 아니므로 딱지를 떼어낸다). sortByDate를 주면 각
// 클러스터 대표 기사의 발행 시각 최신순으로 정리하고, 아니면 구글 뉴스가 이미
// 준 순서(관련도/최신순)를 그대로 쓴다. 마지막에 대표만 골라야 하므로 `limit`에
// 도달해도 중간에 끊지 않고 후보를 전부 훑는다.
function clusterArticles(candidates, limit, { sortByDate = false } = {}) {
  const clusters = [];
  for (const candidate of candidates) {
    const dedupKey = newsDedupKey(candidate.title);
    const grams = charBigrams(dedupKey);
    const cluster = clusters.find((c) => isSimilarHeadline(grams, c.grams));
    if (!cluster) {
      clusters.push({ grams, article: candidate, detailLen: dedupKey.length, anyDirect: !candidate.nearby });
    } else {
      if (!candidate.nearby) cluster.anyDirect = true;
      if (dedupKey.length > cluster.detailLen) {
        cluster.article = candidate;
        cluster.detailLen = dedupKey.length;
      }
    }
  }

  let result = clusters.map((c) => ({ title: c.article.title, link: c.article.link, pubDate: c.article.pubDate, nearby: !c.anyDirect }));
  if (sortByDate) {
    result.sort((a, b) => (b.pubDate?.getTime() || 0) - (a.pubDate?.getTime() || 0));
  }
  return result.slice(0, limit).map(({ title, link, nearby }) => (nearby ? { title, link, nearby } : { title, link }));
}

async function fetchNews(query, limit, requireKeyword) {
  const candidates = await fetchNewsCandidates(query, requireKeyword);
  return clusterArticles(candidates, limit);
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

// 검단신도시 뉴스는 ①직접 언급(GEOMDAN_QUERY, GEOMDAN_KEYWORD로 제목 재검증)과
// ②인접 지역 호재(GEOMDAN_NEARBY_QUERY, "검단" 언급 불필요) 두 검색을 합친다.
// 한쪽이 실패해도(예: 일시적 API 오류) 다른 쪽 결과는 그대로 살리도록 각각
// 독립적으로 실패를 처리한다.
async function fetchGeomdanArticles(limit) {
  const [directCandidates, nearbyCandidates] = await Promise.all([
    fetchNewsCandidates(GEOMDAN_QUERY, GEOMDAN_KEYWORD).catch((err) => {
      console.error(`검단신도시 뉴스(직접) 조회 실패: ${err.message}`);
      return [];
    }),
    fetchNewsCandidates(GEOMDAN_NEARBY_QUERY, GEOMDAN_NEARBY_TERMS).then(
      (candidates) => candidates.map((c) => ({ ...c, nearby: true })),
      (err) => {
        console.error(`검단신도시 뉴스(인접 지역) 조회 실패: ${err.message}`);
        return [];
      }
    ),
  ]);

  return clusterArticles([...directCandidates, ...nearbyCandidates], limit, { sortByDate: true });
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

  // 오늘(KST) 포함 최근 GEOMDAN_TRANSACTION_DAYS일 안에 계약된 건만 남긴다.
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (GEOMDAN_TRANSACTION_DAYS - 1));
  const recentOnly = newTownOnly.filter(
    (t) => new Date(Number(t.year), Number(t.month) - 1, Number(t.day)) >= cutoff
  );

  console.log(
    `실거래가: 검단구 ${all.length}건 중 검단신도시(${GEOMDAN_DONGS.join('/')}) ${newTownOnly.length}건, ` +
      `최근 ${GEOMDAN_TRANSACTION_DAYS}일 이내 ${recentOnly.length}건`
  );
  recentOnly.sort((a, b) => Number(b.amount) - Number(a.amount));
  return recentOnly.slice(0, GEOMDAN_TRANSACTION_COUNT);
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
    const prefix = article.nearby ? '🔗 ' : '';
    const line = truncate(`${lines.length}. ${prefix}${article.title}`, 42);
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
        .map((a) => {
          const badge = a.nearby ? '<span class="tag-nearby">🔗 인접 지역 호재</span>' : '';
          return `    <li class="article"><a href="${escapeHtml(a.link)}" target="_blank" rel="noopener">${badge}${escapeHtml(a.title)}</a></li>`;
        })
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
  .tag-nearby { display: inline-block; font-size: 11px; font-weight: 700; color: #3b6fd6; background: rgba(59,111,214,.12); border-radius: 4px; padding: 1px 6px; margin-right: 6px; }
  @media (prefers-color-scheme: dark) {
    body { background: #17181a; color: #eee; }
    .article, .txn { background: #232427; box-shadow: none; }
    .article a { color: #eee; }
    .updated, .txn-dong, .txn-meta, .source { color: #999; }
    .txn-amount { color: #ff8a5c; }
    .tag-nearby { color: #7ea6ff; background: rgba(126,166,255,.15); }
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
  const geomdanArticles = await fetchGeomdanArticles(GEOMDAN_ARTICLE_COUNT);
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
