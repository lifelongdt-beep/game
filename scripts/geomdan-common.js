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

module.exports = { normalizeAptName, loadExcludedApartments, pricePerPyeong };
