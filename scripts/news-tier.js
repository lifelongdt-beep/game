// 뉴스 가치 등급 — 검단 카드뉴스 후보 고르기(card-news/candidates.js)와 지역 브리핑 카드뉴스(regional-briefing.js)가 같이 쓴다.
// 사람들이 보고 싶은 건 "부동산 흐름을 판단하게 해 주는 뉴스"다. 제목 키워드로 대략 등급을 매긴다.
//   P: 정부·금융당국 부동산 정책(대책·규제·세제·공급·대출) — 가장 중요
//   A: 가격·거래·수급 지표, 대출·세제·공급 정책, 기준금리
//   B: 검단·인천·인접 개발·교통 직접 관련(검단 카드에서만 쓰는 구분)
//   X: 지자체 행사·설명회, 분양 광고, 정치 공방, 기업·금융상품, 해외·코인 등
//   -: 판단 불가
const { TRANSPORT_PLAN_RE } = require('./geomdan-common');

const TIER_EXCLUDE = /설명회|견본주택|\[부동산 AD\]|AD\]|모집|개소|감사패|간담회|특강|소식지|조례|구의회|의장|지지율|블랙리스트|사찰|기업대출|동산담보|대부업|온투업|연체액|코인|퇴직금|시간외|폐기물|유통혁신|홍콩 특징주/;
const TIER_A = /아파트값|집값|매매가|전세|전셋값|전월세|월세|거래량|매물|미분양|입주 ?물량|청약|분양가|공급|인허가|착공|재건축|재개발|한국부동산원|KB|시세|상승률|하락|주택|DSR|대출 ?규제|주담대|LTV|세제|종부세|양도세|취득세|보유세|토허제|토지거래허가|규제지역|대책|공시가격|기준금리|금리 (인상|인하)|동결|변동금리|국채금리|금통위/;
const TIER_POLICY = /LH|매입확약|정부|국토부|국토교통부|금융위|금감원|한국은행|한은|대통령|장관|총리|정책|대책|지시|규제|세제|공급|DSR|LTV|토허제|종부세|양도세|취득세/;
const TIER_B = /검단|인천|서구|계양|청라|김포|루원|GTX|광역급행|인천2호선/;

const headOf = (title) => (title.lastIndexOf(' - ') > 0 ? title.slice(0, title.lastIndexOf(' - ')) : title);

// 국가 교통 인프라 계획(국가철도망 구축계획 등)은 의견수렴 행사 기사여도 정책 뉴스로 본다(2026-11-08 사용자 요청).
function tierOf(title, { local = TIER_B } = {}) {
  const head = headOf(title);
  if (TRANSPORT_PLAN_RE.test(head)) return 'P';
  if (TIER_EXCLUDE.test(head)) return 'X';
  if (TIER_A.test(head) && TIER_POLICY.test(head)) return 'P';
  if (TIER_A.test(head)) return 'A';
  if (local && local.test(head)) return 'B';
  return '-';
}

module.exports = { tierOf, headOf, TIER_EXCLUDE, TIER_A, TIER_POLICY, TIER_B };
