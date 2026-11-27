'use strict';

// 지역 브리핑의 아파트별 과거 거래(매매·전세·월세) 기록.
// 시군구·달마다 받은 원자료를 .cache/regions-raw/<코드>/<YYYYMM>-t.json(매매)·-r.json(전월세)에 쌓아 두고
// (워크플로가 actions/cache로 실행 사이에 보존한다), 지난 달은 한 번 받으면 재사용하고 최근 몇 달만 매번 다시 받는다.
// 처음에는 기록이 없어 하루 호출 한도 안에서 며칠에 걸쳐 채운다. 쌓인 기록으로
//   - 최근 거래(브리핑 화면의 실거래가)와
//   - 법정동별 아파트 기록 파일 docs/regions/apt/<코드>/<동 번호>.json(아파트 상세 화면의 그래프·거래 목록)
// 을 만든다.

const fs = require('fs');
const path = require('path');
const { fetchTransactionsForMonth, fetchWithRetry, xmlTag } = require('./kakao-realestate-news');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.resolve(ROOT, process.env.REGION_RAW_DIR || '.cache/regions-raw');
const SERVICE_KEY = process.env.DATA_GO_KR_SERVICE_KEY || '';
const TRADE_MONTHS = Number(process.env.REGION_HIST_TRADE_MONTHS || 36); // 매매 기록 기간
const RENT_MONTHS = Number(process.env.REGION_HIST_RENT_MONTHS || 24); // 전월세 기록 기간
const PRESALE_MONTHS = Number(process.env.REGION_HIST_PRESALE_MONTHS || 36); // 분양권·입주권 전매 기록 기간(0이면 받지 않음)
// 지도 3년·5년·10년 변동용: 그만큼 전의 3개월(LONG_YEARS년 전 달부터 3달) 매매만 따로 받아 둔다(기록 파일에는 넣지 않고 long.json에 중앙값만).
const LONG_YEARS = [3, 5, 10];
const longMonths = (now) => LONG_YEARS.flatMap((y) => monthList(now, y * 12 + 3).slice(y * 12));
const REFRESH_MONTHS = Number(process.env.REGION_REFRESH_MONTHS || 3); // 늦은 신고·해제를 반영하려고 매번 다시 받는 최근 달 수
// 공공데이터포털 개발계정은 서비스마다 하루 10,000번이 한도라, 매매·전월세 각각 이만큼만 부른다(나머지는 다음 날 이어 받음).
const CALL_LIMIT = Number(process.env.REGION_CALL_LIMIT || 8000);
// 건축물대장(동별 지상 층수 → 탑층 표시). 따로 받은 키가 있으면 그 키를, 없으면 실거래 키를 쓴다.
const BLD_KEY = process.env.BLD_SERVICE_KEY || SERVICE_KEY;
// 분양권전매 실거래가. 사용자가 비밀값 BUNYANGGUAN에 넣은 키를 먼저 쓰고, 없으면 실거래 키를 쓴다(같은 공공데이터포털 키라도 된다).
const PRESALE_KEY = process.env.BUNYANGGUAN || SERVICE_KEY;
const BLD_CALL_LIMIT = Number(process.env.BLD_CALL_LIMIT || 8000);
const BLD_MAX_AGE_DAYS = Number(process.env.BLD_MAX_AGE_DAYS || 365); // 층수는 거의 안 바뀌어 1년에 한 번만 다시 받는다
// 주소기반서비스(juso.go.kr) 좌표제공 API 승인키(비밀값 JUSO_KEY). 건축물대장의 도로명 코드로 단지 좌표를 받아 지도에 점을 찍는다.
const JUSO_KEY = process.env.JUSO_KEY || '';
const JUSO_COORD_URL = 'https://business.juso.go.kr/addrlink/addrCoordApi.do';
const JUSO_CALL_LIMIT = Number(process.env.JUSO_CALL_LIMIT || 5000);
const BLD_ENDPOINTS = ['https://apis.data.go.kr/1613000/BldRgstHubService', 'https://apis.data.go.kr/1613000/BldRgstService_v2'];
let bldEndpoint = 0;

const RENT_ENDPOINTS = [
  'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent',
  'https://apis.data.go.kr/1613000/RTMSDataSvcAptRentDev/getRTMSDataSvcAptRentDev',
];
let rentEndpoint = 0;
// 분양권·입주권 전매 실거래(아파트 매매 자료에는 들어 있지 않아 따로 받는다).
const PRESALE_ENDPOINT = 'https://apis.data.go.kr/1613000/RTMSDataSvcSilvTrade/getRTMSDataSvcSilvTrade';
let presaleFails = 0; // 연달아 실패하면(활용 신청 전 등) 이번 실행에서는 더 부르지 않는다

const calls = { t: 0, r: 0, b: 0, s: 0, j: 0 };
const num0 = (v) => Number(String(v || '0').replace(/[,\s]/g, '')) || 0;
const ymd = (y, m, d) => Number(`${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`);

function monthList(now, count) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

const rawPath = (code, ym, kind) => path.join(RAW_DIR, code, `${ym}-${kind}.json`);
function readRaw(code, ym, kind) {
  try {
    return JSON.parse(fs.readFileSync(rawPath(code, ym, kind), 'utf8'));
  } catch {
    return null;
  }
}
function writeRaw(code, ym, kind, rows) {
  fs.mkdirSync(path.join(RAW_DIR, code), { recursive: true });
  fs.writeFileSync(rawPath(code, ym, kind), JSON.stringify({ at: new Date().toISOString(), rows }));
}

// 매매 한 줄 = [단지, 법정동, 전용㎡, 거래금액(만원), 층, 계약일 YYYYMMDD, 동(아파트 동), 필지 "시군구+법정동코드-본번-부번"]
async function fetchTradeMonth(code, ym, deadline) {
  const rows = [];
  for (let page = 1; page <= 10; page++) {
    calls.t++;
    const items = await fetchTransactionsForMonth(ym, deadline, code, page);
    for (const t of items) {
      if (t.cancelType === 'O') continue;
      const lot = t.sggCd && t.umdCd && t.bonbun ? `${t.sggCd}${t.umdCd}-${t.bonbun.padStart(4, '0')}-${(t.bubun || '0').padStart(4, '0')}` : '';
      rows.push([t.apt, t.dong, Number(t.area), Number(t.amount), t.floor, ymd(t.year, t.month, t.day), t.aptDong || '', lot]);
    }
    if (items.length < 1000) break;
  }
  return rows;
}

// 전월세 한 줄 = [단지, 법정동, 전용㎡, 보증금(만원), 월세(만원), 층, 계약일 YYYYMMDD, 신규/갱신]
async function fetchRentMonth(code, ym, deadline) {
  const rows = [];
  for (let page = 1; page <= 10; page++) {
    let xml;
    for (;;) {
      calls.r++;
      const url = `${RENT_ENDPOINTS[rentEndpoint]}?serviceKey=${SERVICE_KEY}&LAWD_CD=${code}&DEAL_YMD=${ym}&numOfRows=1000&pageNo=${page}`;
      const res = await fetchWithRetry(url, 5, deadline);
      const text = await res.text();
      const rc = xmlTag(text, 'resultCode');
      if (res.ok && !text.includes('<cmmMsgHeader>') && (!rc || ['00', '000'].includes(rc))) {
        xml = text;
        break;
      }
      const msg = xmlTag(text, 'returnAuthMsg') || xmlTag(text, 'errMsg') || xmlTag(text, 'resultMsg') || `HTTP ${res.status}`;
      if (rentEndpoint + 1 < RENT_ENDPOINTS.length) {
        rentEndpoint++;
        continue;
      }
      throw new Error(`전월세 API 오류(${code} ${ym}): ${msg}`);
    }
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
    for (const it of items) {
      rows.push([
        xmlTag(it, 'aptNm'), xmlTag(it, 'umdNm'), Number(xmlTag(it, 'excluUseAr')), num0(xmlTag(it, 'deposit')), num0(xmlTag(it, 'monthlyRent')),
        xmlTag(it, 'floor'), ymd(xmlTag(it, 'dealYear'), xmlTag(it, 'dealMonth'), xmlTag(it, 'dealDay')), xmlTag(it, 'contractType'),
      ]);
    }
    if (page * 1000 >= Number(xmlTag(xml, 'totalCount') || 0)) break;
  }
  return rows;
}

// 분양권·입주권 한 줄 = [단지, 법정동, 전용㎡, 거래금액(만원), 층, 계약일 YYYYMMDD, 구분(분/입)]
async function fetchPresaleMonth(code, ym, deadline) {
  const rows = [];
  for (let page = 1; page <= 10; page++) {
    calls.s++;
    const url = `${PRESALE_ENDPOINT}?serviceKey=${PRESALE_KEY}&LAWD_CD=${code}&DEAL_YMD=${ym}&numOfRows=1000&pageNo=${page}`;
    const res = await fetchWithRetry(url, 5, deadline);
    const xml = await res.text();
    const rc = xmlTag(xml, 'resultCode');
    if (!res.ok || xml.includes('<cmmMsgHeader>') || (rc && !['00', '000'].includes(rc))) {
      const msg = xmlTag(xml, 'returnAuthMsg') || xmlTag(xml, 'errMsg') || xmlTag(xml, 'resultMsg') || `HTTP ${res.status}`;
      throw new Error(`분양권 API 오류(${code} ${ym}): ${msg}`);
    }
    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const it = m[1];
      if (xmlTag(it, 'cdealType') === 'O') continue;
      rows.push([
        xmlTag(it, 'aptNm'), xmlTag(it, 'umdNm'), Number(xmlTag(it, 'excluUseAr')), num0(xmlTag(it, 'dealAmount')), xmlTag(it, 'floor'),
        ymd(xmlTag(it, 'dealYear'), xmlTag(it, 'dealMonth'), xmlTag(it, 'dealDay')), xmlTag(it, 'ownershipGbn'),
      ]);
    }
    if (page * 1000 >= Number(xmlTag(xml, 'totalCount') || 0)) break;
  }
  presaleFails = 0;
  return rows;
}

// 시군구 하나의 기록을 채운다. phase 'recent'는 최근 REFRESH_MONTHS달을 다시 받고, 'backfill'은 그 전 달 중
// 아직 없는 달을 최근 달부터 받는다. 호출부는 모든 시군구의 recent를 먼저 돌린 뒤 backfill을 돌린다
// (하루 호출 한도가 지난 기록 채우기에 먼저 다 쓰여 최근 거래를 못 받는 일이 없게).
// 돌려주는 값: { ok: 맡은 달을 모두 받았는지, missing: 못 받은 달 수 }
async function updateRegion(code, now, deadline, phase) {
  let missing = 0;
  const jobs = [];
  for (const [kind, count] of [['t', TRADE_MONTHS], ['r', RENT_MONTHS], ['s', PRESALE_MONTHS]]) {
    monthList(now, count).forEach((ym, i) => {
      const recent = i < REFRESH_MONTHS;
      if (phase === 'recent' ? recent : !recent && !fs.existsSync(rawPath(code, ym, kind))) jobs.push({ kind, ym });
    });
  }
  if (phase === 'backfill') for (const ym of longMonths(now)) if (!fs.existsSync(rawPath(code, ym, 't'))) jobs.push({ kind: 't', ym });
  for (const job of jobs) {
    if (Date.now() >= deadline || calls[job.kind] >= CALL_LIMIT || (job.kind === 's' && presaleFails >= 3)) {
      missing++;
      continue;
    }
    try {
      const fetcher = { t: fetchTradeMonth, r: fetchRentMonth, s: fetchPresaleMonth }[job.kind];
      const rows = await fetcher(code, job.ym, deadline);
      writeRaw(code, job.ym, job.kind, rows);
    } catch (err) {
      if (job.kind === 's') {
        presaleFails++;
        if (presaleFails === 3) console.error(`[${code}] ${err.message} — 분양권 API가 연달아 실패해 이번 실행에서는 건너뜁니다(공공데이터포털 '분양권전매 실거래가' 활용 신청 확인).`);
        // 분양권은 부가 정보라 못 받아도 최근 거래 갱신 실패로 치지 않는다
        continue;
      }
      console.error(`[${code}] ${err.message}`);
      missing++;
    }
  }
  return { ok: missing === 0, missing };
}

// 건축물대장: 필지 하나의 건물(동)별 지상 층수와 단지 정보. .cache/regions-raw/bld/<필지>.json = { at, dongs: { 동 이름: 층수 }, info }
const bldPath = (lot) => path.join(RAW_DIR, 'bld', `${lot}.json`);
function readBld(lot) {
  try {
    return JSON.parse(fs.readFileSync(bldPath(lot), 'utf8'));
  } catch {
    return null;
  }
}
// "101동", "101", "제101동" → "101". 비교용.
const normDong = (s) => String(s || '').replace(/\s/g, '').replace(/^제/, '').replace(/동$/, '');

// 건축물대장 조회 한 가지(op)의 item 목록. 첫 주소가 안 되면 예전 서비스 주소로 바꿔 계속 쓴다.
async function bldItems(op, lot, deadline, rows = 100, maxPages = 5) {
  const [cd, bun, ji] = lot.split('-');
  const out = [];
  out.complete = false;
  for (let page = 1; page <= maxPages; page++) {
    let xml;
    for (;;) {
      calls.b++;
      const url = `${BLD_ENDPOINTS[bldEndpoint]}/${op}?serviceKey=${BLD_KEY}&sigunguCd=${cd.slice(0, 5)}&bjdongCd=${cd.slice(5)}&platGbCd=0&bun=${bun}&ji=${ji}&numOfRows=${rows}&pageNo=${page}`;
      const res = await fetchWithRetry(url, 5, deadline);
      const text = await res.text();
      const rc = xmlTag(text, 'resultCode');
      if (res.ok && !text.includes('<cmmMsgHeader>') && (!rc || ['00', '000'].includes(rc))) {
        xml = text;
        break;
      }
      const msg = xmlTag(text, 'returnAuthMsg') || xmlTag(text, 'errMsg') || xmlTag(text, 'resultMsg') || `HTTP ${res.status}`;
      if (bldEndpoint + 1 < BLD_ENDPOINTS.length) {
        bldEndpoint++;
        continue;
      }
      throw new Error(`건축물대장 API 오류(${op} ${lot}): ${msg}`);
    }
    const got = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
    out.push(...got);
    const total = Number(xmlTag(xml, 'totalCount') || 0);
    if (out.length >= total || !got.length) {
      out.complete = out.length >= total;
      break;
    }
  }
  return out;
}

const isHome = (purpose) => !purpose || /공동주택|아파트|주거/.test(purpose);
const parking = (it) => ['indrAutoUtcnt', 'oudrAutoUtcnt', 'indrMechUtcnt', 'oudrMechUtcnt'].reduce((n, k) => n + num0(xmlTag(it, k)), 0);
const ratio = (v) => Math.round(Number(v || 0) * 10) / 10 || 0;

// 필지 하나: 동별 지상 층수(탑층 표시)와 단지 정보.
// info = { apr: 사용승인일 YYYYMMDD, hh: 세대수, bld: 주거동 수, park: 주차 대수, far: 용적률 %, bcr: 건폐율 %, top: 최고층, ug: 지하층, elv: 승강기 }
// 단지 합계는 총괄표제부(getBrRecapTitleInfo)를 먼저 쓰고, 없으면(동이 하나뿐인 필지 등) 동별 표제부를 더해 만든다.
async function fetchBldLot(lot, deadline) {
  const dongs = {};
  const sum = { apr: 0, hh: 0, bld: 0, park: 0, far: 0, bcr: 0, top: 0, ug: 0, elv: 0 };
  let road = null; // 좌표제공 API용 도로명 코드: { adm: 법정동코드 10자리, rn: 도로명코드 12자리, ug: 지하 0/1, mn: 건물 본번, sn: 부번 }
  for (const it of await bldItems('getBrTitleInfo', lot, deadline)) {
    const rn = xmlTag(it, 'naRoadCd');
    if (!road && /^\d{12}$/.test(rn) && num0(xmlTag(it, 'naMainBun'))) {
      road = { adm: lot.slice(0, 5) + (xmlTag(it, 'naBjdongCd') || lot.slice(5, 10)), rn, ug: xmlTag(it, 'naUgrndCd') === '1' ? 1 : 0, mn: num0(xmlTag(it, 'naMainBun')), sn: num0(xmlTag(it, 'naSubBun')) };
    }
    const floors = num0(xmlTag(it, 'grndFlrCnt'));
    sum.park += parking(it);
    if (!sum.far) sum.far = ratio(xmlTag(it, 'vlRat'));
    if (!sum.bcr) sum.bcr = ratio(xmlTag(it, 'bcRat'));
    // 아파트 단지 필지에는 상가·관리동도 함께 있어 층수·세대수는 주거용 동만 센다.
    if (!floors || !isHome(xmlTag(it, 'mainPurpsCdNm'))) continue;
    const name = normDong(xmlTag(it, 'dongNm')) || '-';
    dongs[name] = Math.max(dongs[name] || 0, floors);
    sum.bld++;
    sum.hh += num0(xmlTag(it, 'hhldCnt'));
    sum.top = Math.max(sum.top, floors);
    sum.ug = Math.max(sum.ug, num0(xmlTag(it, 'ugrndFlrCnt')));
    sum.elv += num0(xmlTag(it, 'rideUseElvtCnt')) + num0(xmlTag(it, 'emgenUseElvtCnt'));
    const apr = num0(xmlTag(it, 'useAprDay'));
    if (apr && (!sum.apr || apr < sum.apr)) sum.apr = apr;
  }
  if (!sum.bld) return { dongs, info: null, road, pil: {} };
  let recap = [];
  try {
    recap = await bldItems('getBrRecapTitleInfo', lot, deadline);
  } catch (err) {
    console.error(err.message); // 총괄표제부가 안 돼도 동별 합계로 보여준다
  }
  // 필로티: 층별개요에서 1층이 필로티뿐이고(1층에 세대 없음) 그 위가 첫 세대 층인 동 → { 동: 첫 세대 층 }.
  // 층별개요를 끝까지 받지 못하면 잘못 표시하지 않으려고 비워 둔다.
  const pil = {};
  try {
    const flr = await bldItems('getBrFlrOulnInfo', lot, deadline, 1000, 10);
    if (flr.complete) {
      const by = {};
      for (const it of flr) {
        if (!/지상/.test(xmlTag(it, 'flrGbCdNm'))) continue;
        const no = num0(xmlTag(it, 'flrNo'));
        const name = normDong(xmlTag(it, 'dongNm')) || '-';
        const purpose = `${xmlTag(it, 'mainPurpsCdNm')} ${xmlTag(it, 'etcPurps')}`;
        const d = (by[name] = by[name] || { pil1: false, home: Infinity });
        const isPil = /필로티/.test(purpose);
        if (no === 1 && isPil) d.pil1 = true;
        if (!isPil && /공동주택|아파트/.test(purpose)) d.home = Math.min(d.home, no);
      }
      for (const [name, d] of Object.entries(by)) if (d.pil1 && d.home > 1 && d.home < Infinity) pil[name] = d.home;
    }
  } catch (err) {
    console.error(err.message);
  }
  const r = recap[0];
  if (r) {
    sum.hh = num0(xmlTag(r, 'hhldCnt')) || sum.hh;
    sum.bld = num0(xmlTag(r, 'mainBldCnt')) || sum.bld;
    sum.park = num0(xmlTag(r, 'totPkngCnt')) || parking(r) || sum.park;
    sum.far = ratio(xmlTag(r, 'vlRat')) || sum.far;
    sum.bcr = ratio(xmlTag(r, 'bcRat')) || sum.bcr;
    sum.apr = num0(xmlTag(r, 'useAprDay')) || sum.apr;
  }
  return { dongs, info: sum, road, pil };
}

// 시군구 하나의 매매 기록에 나온 필지 중 층수를 아직 모르는(또는 오래된) 곳을 건축물대장에서 받는다.
// 돌려주는 값: 못 받은 필지 수
async function updateBuildings(code, now, deadline) {
  if (!BLD_KEY) return 0;
  const lots = new Set();
  for (const ym of monthList(now, TRADE_MONTHS)) {
    for (const r of readRaw(code, ym, 't')?.rows || []) if (r[7]) lots.add(r[7]);
  }
  const old = Date.now() - BLD_MAX_AGE_DAYS * 86400000;
  let missing = 0;
  for (const lot of lots) {
    const cur = readBld(lot);
    // 도로명 코드(road)가 없는 예전 기록은 좌표를 받으려고 한 번 다시 받는다(JUSO_KEY가 있을 때만).
    // 필로티 정보(pil)가 없는 예전 기록도 한 번 다시 받는다.
    if (cur && 'info' in cur && 'pil' in cur && (!JUSO_KEY || 'road' in cur) && Date.parse(cur.at) > old) continue;
    if (Date.now() >= deadline || calls.b >= BLD_CALL_LIMIT) {
      missing++;
      continue;
    }
    try {
      const got = await fetchBldLot(lot, deadline);
      fs.mkdirSync(path.dirname(bldPath(lot)), { recursive: true });
      fs.writeFileSync(bldPath(lot), JSON.stringify({ at: new Date().toISOString(), ...got }));
    } catch (err) {
      console.error(`[${code}] ${err.message}`);
      missing++;
    }
  }
  return missing;
}

// 단지 좌표: .cache/regions-raw/coord/<필지>.json = { at, lat, lon } 또는 { at, none: 1 }(찾지 못함, 30일 뒤 다시).
const coordPath = (lot) => path.join(RAW_DIR, 'coord', `${lot}.json`);
function readCoord(lot) {
  try {
    return JSON.parse(fs.readFileSync(coordPath(lot), 'utf8'));
  } catch {
    return null;
  }
}
// UTM-K(EPSG:5179, GRS80 횡메르카토르: 원점 38°N 127.5°E, 축척 0.9996, 가산 1,000,000 / 2,000,000) → 위경도.
function utmkToWgs84(x, y) {
  const a = 6378137, f = 1 / 298.257222101, k0 = 0.9996, lat0 = (38 * Math.PI) / 180, lon0 = (127.5 * Math.PI) / 180;
  const e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const M = (p) => a * ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * p - ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * p) + ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * p) - ((35 * e2 ** 3) / 3072) * Math.sin(6 * p));
  const m = M(lat0) + (y - 2000000) / k0;
  const mu = m / (a * (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const p1 = mu + ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) + ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) + ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) + ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
  const s1 = Math.sin(p1), c1 = Math.cos(p1), t1 = Math.tan(p1);
  const C1 = ep2 * c1 * c1, T1 = t1 * t1, N1 = a / Math.sqrt(1 - e2 * s1 * s1), R1 = (a * (1 - e2)) / (1 - e2 * s1 * s1) ** 1.5;
  const D = (x - 1000000) / (N1 * k0);
  const lat = p1 - ((N1 * t1) / R1) * ((D * D) / 2 - ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4) / 24 + ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D ** 6) / 720);
  const lon = lon0 + (D - ((1 + 2 * T1 + C1) * D ** 3) / 6 + ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D ** 5) / 120) / c1;
  return [(lat * 180) / Math.PI, (lon * 180) / Math.PI];
}
let jusoFails = 0;
async function fetchCoord(road, deadline) {
  calls.j++;
  const q = new URLSearchParams({ confmKey: JUSO_KEY, admCd: road.adm, rnMgtSn: road.rn, udrtYn: String(road.ug), buldMnnm: String(road.mn), buldSlno: String(road.sn), resultType: 'json' });
  const res = await fetchWithRetry(`${JUSO_COORD_URL}?${q}`, 3, deadline);
  const data = await res.json();
  const common = data?.results?.common || {};
  if (String(common.errorCode) !== '0') throw new Error(`좌표제공 API 오류: ${common.errorCode} ${common.errorMessage || ''}`);
  const j = (data.results.juso || [])[0];
  if (!j || !j.entX || !j.entY) return null;
  return utmkToWgs84(Number(j.entX), Number(j.entY));
}
// 시군구 하나의 매매 필지 중 좌표를 아직 모르는 곳을 받는다(건축물대장 도로명 코드가 있는 필지만). 돌려주는 값: 못 받은 필지 수
async function updateCoords(code, now, deadline) {
  if (!JUSO_KEY || jusoFails >= 5) return 0;
  const lots = new Set();
  for (const ym of monthList(now, TRADE_MONTHS)) for (const r of readRaw(code, ym, 't')?.rows || []) if (r[7]) lots.add(r[7]);
  let missing = 0;
  for (const lot of lots) {
    const cur = readCoord(lot);
    if (cur && (cur.lat || Date.now() - Date.parse(cur.at) < 30 * 864e5)) continue;
    const road = readBld(lot)?.road;
    if (!road) continue;
    if (Date.now() >= deadline || calls.j >= JUSO_CALL_LIMIT || jusoFails >= 5) {
      missing++;
      continue;
    }
    try {
      const p = await fetchCoord(road, deadline);
      fs.mkdirSync(path.dirname(coordPath(lot)), { recursive: true });
      fs.writeFileSync(coordPath(lot), JSON.stringify(p ? { at: new Date().toISOString(), lat: +p[0].toFixed(6), lon: +p[1].toFixed(6) } : { at: new Date().toISOString(), none: 1 }));
      jusoFails = 0;
    } catch (err) {
      jusoFails++;
      if (jusoFails === 5) console.error(`[${code}] ${err.message} — 좌표제공 API가 연달아 실패해 이번 실행에서는 건너뜁니다(비밀값 JUSO_KEY 확인).`);
      missing++;
    }
  }
  return missing;
}

// 거래한 층이 그 동의 꼭대기 층인지. 1 = 탑층, 0 = 아님 또는 모름.
// 동 이름이 맞으면 그 동 층수로, 거래에 동이 없으면 필지의 주거용 동이 모두 같은 높이일 때만 판단한다.
// 필로티 위 첫 세대 층 거래인지(1층이 필로티라 실제로는 그 동의 가장 낮은 세대 층). 1 = 그렇다, 0 = 아님 또는 모름.
function pilFlag(row, cache) {
  const lot = row[7];
  if (!lot) return 0;
  const k = `pil:${lot}`;
  if (!cache.has(k)) cache.set(k, readBld(lot)?.pil || null);
  const pil = cache.get(k);
  if (!pil) return 0;
  const floor = parseInt(row[4], 10);
  if (!floor) return 0;
  const d = normDong(row[6]);
  if (d && d in pil) return pil[d] === floor ? 1 : 0;
  if (d) return 0;
  // 거래에 동이 없으면 필지의 모든 주거동이 같은 층부터 세대가 있을 때만
  const dongs = readBld(lot)?.dongs || {};
  const names = Object.keys(dongs);
  return names.length && names.every((n) => pil[n] === floor) ? 1 : 0;
}

function topFlag(row, cache) {
  const lot = row[7];
  if (!lot) return 0;
  if (!cache.has(lot)) cache.set(lot, readBld(lot)?.dongs || null);
  const dongs = cache.get(lot);
  if (!dongs) return 0;
  const floor = parseInt(row[4], 10);
  if (!floor) return 0;
  const d = normDong(row[6]);
  if (d && dongs[d]) return dongs[d] === floor ? 1 : 0;
  const hs = [...new Set(Object.values(dongs))];
  return hs.length === 1 && hs[0] === floor ? 1 : 0;
}

// 최근 months개월 매매(브리핑 화면용). 한 줄 = [단지, 법정동, 전용㎡, 금액, 층, "YYYY.MM.DD", 평당가, 신고가, 0(자리), 층 표시(1 탑층, 2 필로티 위, 0 없음)]
// 신고가: 같은 단지·같은 넓이(전용㎡ 소수점 버림)에서 계약일이 앞선 기록 속 거래(최대 TRADE_MONTHS개월)의 최고가를 넘으면
// 그 이전 최고가(만원), 아니면 0. 앞선 거래가 하나도 없으면(첫 거래) 신고가로 보지 않는다.
// 기록이 아직 덜 찼으면(처음 며칠) 그 기간 안의 최고가 기준이다.
function recentTrades(code, now, months, cutoff, pricePerPyeong) {
  const cut = ymd(cutoff.getFullYear(), cutoff.getMonth() + 1, cutoff.getDate());
  const out = [];
  const groups = new Map();
  const bld = new Map();
  let lastAt = '';
  let any = false;
  monthList(now, TRADE_MONTHS).forEach((ym, i) => {
    const raw = readRaw(code, ym, 't');
    if (!raw) return;
    if (i <= months) {
      any = true;
      if (raw.at > lastAt) lastAt = raw.at;
    }
    for (const r of raw.rows) {
      const key = `${r[0]}|${r[1]}|${Math.floor(r[2])}`; // 넓이는 소수점을 버려 묶는다(84.5㎡와 84.9㎡는 같은 84㎡)
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
  });
  for (const list of groups.values()) {
    list.sort((a, b) => a[5] - b[5]);
    let best = 0; // 앞선 날짜까지의 최고가
    let dayBest = 0; // 같은 날 거래끼리는 서로 비교하지 않는다
    let day = 0;
    for (const r of list) {
      if (r[5] !== day) {
        best = Math.max(best, dayBest);
        dayBest = 0;
        day = r[5];
      }
      if (r[5] >= cut) {
        const s = String(r[5]);
        out.push([r[0], r[1], r[2], r[3], r[4], `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6)}`, pricePerPyeong(r[3], r[2]), best && r[3] > best ? best : 0, 0, topFlag(r, bld) ? 1 : pilFlag(r, bld) ? 2 : 0]);
      }
      dayBest = Math.max(dayBest, r[3]);
    }
  }
  out.sort((a, b) => b[5].localeCompare(a[5]) || b[3] - a[3]);
  return { any, lastAt, items: out };
}

// 법정동별 아파트 기록 파일. 동 번호는 regions-kr.json의 dongs 순서(목록에 없는 동은 "x").
// { d: 법정동, apts: { 단지: { b: 단지 정보(fetchBldLot의 info, 없으면 생략), p: [위도, 경도](좌표제공 API, 없으면 생략), s: 분양권·입주권 [[YYYYMMDD, ㎡, 금액, 층, 분/입]](없으면 생략), t: [[YYYYMMDD, ㎡, 금액, 층, 동, 탑층 1/0, 필로티 위 1/0]], r: [[YYYYMMDD, ㎡, 보증금, 월세, 층, 신규/갱신]] } } }
function writeAptFiles(region, now, outDir) {
  const byDong = new Map();
  const slot = (dong, apt) => {
    if (!byDong.has(dong)) byDong.set(dong, {});
    const apts = byDong.get(dong);
    return (apts[apt] = apts[apt] || { t: [], r: [], s: [] });
  };
  const bld = new Map();
  for (const ym of monthList(now, TRADE_MONTHS)) {
    for (const r of readRaw(region.code, ym, 't')?.rows || []) slot(r[1], r[0]).t.push([r[5], r[2], r[3], r[4], r[6] || '', topFlag(r, bld), pilFlag(r, bld)]);
  }
  for (const ym of monthList(now, RENT_MONTHS)) {
    for (const r of readRaw(region.code, ym, 'r')?.rows || []) slot(r[1], r[0]).r.push([r[6], r[2], r[3], r[4], r[5], r[7]]);
  }
  for (const ym of monthList(now, PRESALE_MONTHS)) {
    for (const r of readRaw(region.code, ym, 's')?.rows || []) slot(r[1], r[0]).s.push([r[5], r[2], r[3], r[4], r[6]]);
  }
  // 단지 정보: 그 단지 매매에 가장 많이 나온 필지의 건축물대장 정보
  const lotCount = new Map();
  for (const ym of monthList(now, TRADE_MONTHS)) {
    for (const r of readRaw(region.code, ym, 't')?.rows || []) {
      if (!r[7]) continue;
      const k = `${r[1]}|${r[0]}`;
      if (!lotCount.has(k)) lotCount.set(k, new Map());
      const m = lotCount.get(k);
      m.set(r[7], (m.get(r[7]) || 0) + 1);
    }
  }
  for (const [k, m] of lotCount) {
    const [dong, apt] = k.split('|');
    const lot = [...m].sort((a, b) => b[1] - a[1])[0][0];
    const info = readBld(lot)?.info;
    if (info) slot(dong, apt).b = info;
    const c = readCoord(lot);
    if (c && c.lat) slot(dong, apt).p = [c.lat, c.lon];
  }
  if (!byDong.size) return 0;
  const dir = path.join(outDir, region.code);
  fs.mkdirSync(dir, { recursive: true });
  let written = writeLongFile(region, now, dir);
  const groups = new Map();
  for (const [dong, apts] of byDong) {
    const i = region.dongs.indexOf(dong);
    const key = i >= 0 ? String(i) : 'x';
    if (!groups.has(key)) groups.set(key, { d: i >= 0 ? dong : '기타', apts: {} });
    Object.assign(groups.get(key).apts, apts);
  }
  for (const [key, data] of groups) {
    for (const a of Object.values(data.apts)) {
      a.t.sort((x, y) => y[0] - x[0] || y[2] - x[2]);
      a.r.sort((x, y) => y[0] - x[0] || y[2] - x[2]);
      if (a.s.length) a.s.sort((x, y) => y[0] - x[0] || y[2] - x[2]);
      else delete a.s;
    }
    const file = path.join(dir, `${key}.json`);
    const text = JSON.stringify(data) + '\n';
    let old = '';
    try {
      old = fs.readFileSync(file, 'utf8');
    } catch {}
    if (old !== text) {
      fs.writeFileSync(file, text);
      written++;
    }
  }
  return written;
}

// 지도 3년·5년·10년 변동용 기준값: LONG_YEARS년 전 3개월 매매를 단지·넓이(전용㎡ 소수점 버림)마다 중앙값과 건수로.
// { y: [3, 5, 10], d: { 법정동: { 단지: { 넓이: [[중앙값, 건수] 또는 0, ...] } } } } — y 순서대로. 받은 달이 하나도 없으면 파일을 쓰지 않는다.
function writeLongFile(region, now, dir) {
  const d = {};
  let any = false;
  LONG_YEARS.forEach((y, yi) => {
    const groups = new Map();
    for (const ym of monthList(now, y * 12 + 3).slice(y * 12)) {
      const raw = readRaw(region.code, ym, 't');
      if (!raw) continue;
      any = true;
      for (const r of raw.rows || []) {
        const k = `${r[1]}|${r[0]}|${Math.floor(Number(r[2]))}`;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(r[3]);
      }
    }
    for (const [k, prices] of groups) {
      const [dong, apt, area] = k.split('|');
      const s = prices.slice().sort((a, b) => a - b);
      const slotArr = (((d[dong] = d[dong] || {})[apt] = d[dong][apt] || {})[area] = d[dong][apt][area] || LONG_YEARS.map(() => 0));
      slotArr[yi] = [s[Math.floor(s.length / 2)], s.length];
    }
  });
  if (!any) return 0;
  const file = path.join(dir, 'long.json');
  const text = JSON.stringify({ y: LONG_YEARS, d }) + '\n';
  let old = '';
  try {
    old = fs.readFileSync(file, 'utf8');
  } catch {}
  if (old === text) return 0;
  fs.writeFileSync(file, text);
  return 1;
}

module.exports = { updateRegion, updateBuildings, updateCoords, utmkToWgs84, JUSO_KEY, recentTrades, writeAptFiles, calls, SERVICE_KEY, TRADE_MONTHS, RENT_MONTHS, PRESALE_MONTHS };
