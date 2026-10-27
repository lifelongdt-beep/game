'use strict';

// 검단신도시 실거래가를 다루는 스크립트들(kakao-realestate-news.js, geomdan-cycle.js)이
// 같은 기준으로 단지를 거르고 평당가를 계산하도록 공통 함수를 모아 둔다.

const fs = require('fs');
const path = require('path');

// GEOMDAN_DONGS(법정동) 안에 있어도 검단신도시로 개발된 단지가 아닌 기존 단지는
// 실거래가에서 뺀다. 법정동 단위로는 신도시와 옛 동네가 갈리지 않아 단지 이름으로
// 걸러야 한다. 목록은 scripts/geomdan-excluded-apartments.txt에 한 줄에 한 단지씩
// 적는다(실거래가 API의 단지명 기준, 비교할 때 공백·괄호 안 덧붙임·대소문자는 무시).
// 단지명에 쉼표가 들어가는 경우가 있어 환경 변수가 아니라 파일로 둔다.
const EXCLUDED_APARTMENTS_PATH = path.join(__dirname, 'geomdan-excluded-apartments.txt');
const normalizeAptName = (name) => name.replace(/\([^)]*\)/g, '').replace(/\s+/g, '').toLowerCase();
function loadExcludedApartments() {
  try {
    return new Set(
      fs
        .readFileSync(EXCLUDED_APARTMENTS_PATH, 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map(normalizeAptName)
    );
  } catch (err) {
    // 목록이 없다고 매일 발송까지 멈추지는 않는다 — 기존 단지가 섞여 보일 뿐이다.
    console.error(`제외 단지 목록을 읽지 못해 제외 없이 진행합니다: ${err.message}`);
    return new Set();
  }
}

// 1평 = 3.3058㎡(공식 환산값).
const SQM_PER_PYEONG = 3.3058;

// 국토교통부 실거래가 API(RTMSDataSvcAptTradeDev)는 전용면적만 제공하지만,
// 국내에서 통용되는 "평당가"·"OO평형" 표기는 전용면적이 아니라 공급면적
// (전용면적 + 계단실·복도 등 주거공용면적) 기준이다. 검단신도시 여러 단지의
// 실제 분양·관리비 고지 면적을 찾아 전용률(전용면적÷공급면적)을 확인해보니
// 전용면적 구간별로 74~79% 안팎에 모여 있었다(예: 검단신도시푸르지오더베뉴
// 전용 75.84㎡→공급 99.07㎡, 유승한내들에듀파크 전용 84.24㎡→공급
// 109.43㎡, 검단신도시예미지트리플에듀 전용 102.85㎡→공급 130.65㎡). 이
// 구간별 전용률로 공급면적을 역산해서 평당가를 계산한다. 단지마다 등록된
// 정확한 공급면적과는 소수점 단위로 다를 수 있는 추정값이다.
const EXCLUSIVE_RATIO_BANDS = [
  { belowM2: 60, ratio: 0.75 },
  { belowM2: 80, ratio: 0.765 },
  { belowM2: 95, ratio: 0.768 },
  { belowM2: 120, ratio: 0.785 },
  { belowM2: Infinity, ratio: 0.8 },
];
function estimateSupplyArea(exclusiveAreaM2) {
  const band = EXCLUSIVE_RATIO_BANDS.find((b) => exclusiveAreaM2 < b.belowM2);
  return exclusiveAreaM2 / band.ratio;
}
function pricePerPyeong(amountManwonStr, areaM2Str) {
  const amount = Number(amountManwonStr);
  const exclusiveArea = Number(areaM2Str);
  if (!Number.isFinite(amount) || !Number.isFinite(exclusiveArea) || exclusiveArea <= 0) return null;
  const supplyArea = estimateSupplyArea(exclusiveArea);
  return Math.round(amount / (supplyArea / SQM_PER_PYEONG));
}

// 신고가 판정. 쌓아 둔 실거래 기록(docs/geomdan-history-cache.json의 달별 items: {a, ar, p, dt})에서
// 같은 단지·같은 평형(전용면적을 ㎡ 단위로 반올림)의 이전 거래 최고가를 넘으면 신고가로 본다.
// "이전"은 계약일이 앞선 거래만 센다(같은 날 거래끼리는 서로 비교하지 않는다). 이전 거래가 하나도
// 없으면(첫 거래) 신고가로 보지 않는다. 기록이 최근 몇 년 치뿐이라 그 기간 안의 최고가 기준이다.
const areaBucket = (area) => Math.round(Number(area));
function makeRecordChecker(items) {
  const groups = new Map();
  for (const t of items) {
    const k = `${normalizeAptName(t.a)}|${areaBucket(t.ar)}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push([t.dt, Number(t.p)]);
  }
  for (const arr of groups.values()) {
    arr.sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
    let max = -Infinity;
    for (const e of arr) e.push((max = Math.max(max, e[1])));
  }
  // date는 'YYYY-MM-DD'(또는 'YYYY.MM.DD')
  return (apt, area, amount, date) => {
    const arr = groups.get(`${normalizeAptName(apt)}|${areaBucket(area)}`);
    if (!arr) return false;
    const d = String(date).replace(/\./g, '-');
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid][0] < d) lo = mid + 1;
      else hi = mid;
    }
    return lo > 0 && Number(amount) > arr[lo - 1][2];
  };
}

// 기록 파일의 모든 달 거래를 한 배열로. 파일이 없으면 null.
function loadHistoryItems(cachePath) {
  try {
    const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    return Object.values(data.months || {}).flatMap((m) => m.items || []);
  } catch {
    return null;
  }
}

// 검단 뉴스는 부동산과 관련된 기사만 남긴다(사용자 피드백: 기부·복지관 수업·사고·행정 갈등 같은 지역 동정은 필요 없음).
// 예전처럼 걸러낼 단어만 나열하면 새 유형의 동정 기사가 계속 새어 들어와, 부동산 단어가 제목에 있어야 통과하는 방식으로 바꿨다.
const GEOMDAN_REALESTATE_RE = /분양|청약|입주|아파트|단지|실거래|시세|집값|매매|전세|월세|재건축|재개발|정비사업|개통|도로|노선|철도|GTX|지하철|역세권|택지|신도시|개발|호재|공급|미분양|임대|부동산|상가|오피스텔|주택|부지|착공|준공|학교 ?신설|대형 ?마트|예타|호선|고속도로|IC|광역|역 ?신설/;
const GEOMDAN_NOISE_RE = /행사|캠페인|산책|교육|수업|페스티벌|축제|기부|기탁|나눔|복지관|공연|봉사|위촉|개최|출범|소식지|시상|협약|기념|체험|전시|공모전|반려|심폐소생|응급처치|구의회|의장|현장 ?점검|간담회|감사패|특강|설명회|폭발|화재|사고|부상|사망|화상|정산금/;
// 제목 끝의 " - 매체명"은 빼고 본다(매체명에 "부동산" 등이 들어가 잘못 통과하지 않게).
function isRealEstateNews(title) {
  const t = String(title);
  const head = t.lastIndexOf(' - ') > 0 ? t.slice(0, t.lastIndexOf(' - ')) : t;
  return GEOMDAN_REALESTATE_RE.test(head) && !GEOMDAN_NOISE_RE.test(head);
}

module.exports = { isRealEstateNews, GEOMDAN_REALESTATE_RE, GEOMDAN_NOISE_RE, normalizeAptName, loadExcludedApartments, pricePerPyeong, estimateSupplyArea, SQM_PER_PYEONG, makeRecordChecker, loadHistoryItems };
