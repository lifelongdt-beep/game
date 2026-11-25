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
const REFRESH_MONTHS = Number(process.env.REGION_REFRESH_MONTHS || 3); // 늦은 신고·해제를 반영하려고 매번 다시 받는 최근 달 수
// 공공데이터포털 개발계정은 서비스마다 하루 10,000번이 한도라, 매매·전월세 각각 이만큼만 부른다(나머지는 다음 날 이어 받음).
const CALL_LIMIT = Number(process.env.REGION_CALL_LIMIT || 8000);
// 건축물대장(동별 지상 층수 → 탑층 표시). 따로 받은 키가 있으면 그 키를, 없으면 실거래 키를 쓴다.
const BLD_KEY = process.env.BLD_SERVICE_KEY || SERVICE_KEY;
const BLD_CALL_LIMIT = Number(process.env.BLD_CALL_LIMIT || 8000);
const BLD_MAX_AGE_DAYS = Number(process.env.BLD_MAX_AGE_DAYS || 365); // 층수는 거의 안 바뀌어 1년에 한 번만 다시 받는다
const BLD_ENDPOINTS = [
  'https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo',
  'https://apis.data.go.kr/1613000/BldRgstService_v2/getBrTitleInfo',
];
let bldEndpoint = 0;

const RENT_ENDPOINTS = [
  'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent',
  'https://apis.data.go.kr/1613000/RTMSDataSvcAptRentDev/getRTMSDataSvcAptRentDev',
];
let rentEndpoint = 0;
const calls = { t: 0, r: 0, b: 0 };
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

// 시군구 하나의 기록을 채운다. phase 'recent'는 최근 REFRESH_MONTHS달을 다시 받고, 'backfill'은 그 전 달 중
// 아직 없는 달을 최근 달부터 받는다. 호출부는 모든 시군구의 recent를 먼저 돌린 뒤 backfill을 돌린다
// (하루 호출 한도가 지난 기록 채우기에 먼저 다 쓰여 최근 거래를 못 받는 일이 없게).
// 돌려주는 값: { ok: 맡은 달을 모두 받았는지, missing: 못 받은 달 수 }
async function updateRegion(code, now, deadline, phase) {
  let missing = 0;
  const jobs = [];
  for (const [kind, count] of [['t', TRADE_MONTHS], ['r', RENT_MONTHS]]) {
    monthList(now, count).forEach((ym, i) => {
      const recent = i < REFRESH_MONTHS;
      if (phase === 'recent' ? recent : !recent && !fs.existsSync(rawPath(code, ym, kind))) jobs.push({ kind, ym });
    });
  }
  for (const job of jobs) {
    if (Date.now() >= deadline || calls[job.kind] >= CALL_LIMIT) {
      missing++;
      continue;
    }
    try {
      const rows = job.kind === 't' ? await fetchTradeMonth(code, job.ym, deadline) : await fetchRentMonth(code, job.ym, deadline);
      writeRaw(code, job.ym, job.kind, rows);
    } catch (err) {
      console.error(`[${code}] ${err.message}`);
      missing++;
    }
  }
  return { ok: missing === 0, missing };
}

// 건축물대장 표제부: 필지 하나의 건물(동)별 지상 층수. .cache/regions-raw/bld/<필지>.json = { at, dongs: { 동 이름: 층수 } }
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

async function fetchBldLot(lot, deadline) {
  const [cd, bun, ji] = lot.split('-');
  const dongs = {};
  for (let page = 1; page <= 5; page++) {
    let xml;
    for (;;) {
      calls.b++;
      const url = `${BLD_ENDPOINTS[bldEndpoint]}?serviceKey=${BLD_KEY}&sigunguCd=${cd.slice(0, 5)}&bjdongCd=${cd.slice(5)}&platGbCd=0&bun=${bun}&ji=${ji}&numOfRows=100&pageNo=${page}`;
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
      throw new Error(`건축물대장 API 오류(${lot}): ${msg}`);
    }
    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const it = m[1];
      const floors = num0(xmlTag(it, 'grndFlrCnt'));
      const purpose = xmlTag(it, 'mainPurpsCdNm');
      // 아파트 단지 필지에는 상가·관리동도 함께 있어 주거용 동만 담는다.
      if (!floors || (purpose && !/공동주택|아파트|주거/.test(purpose))) continue;
      const name = normDong(xmlTag(it, 'dongNm')) || '-';
      dongs[name] = Math.max(dongs[name] || 0, floors);
    }
    if (page * 100 >= Number(xmlTag(xml, 'totalCount') || 0)) break;
  }
  return dongs;
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
    if (cur && Date.parse(cur.at) > old) continue;
    if (Date.now() >= deadline || calls.b >= BLD_CALL_LIMIT) {
      missing++;
      continue;
    }
    try {
      const dongs = await fetchBldLot(lot, deadline);
      fs.mkdirSync(path.dirname(bldPath(lot)), { recursive: true });
      fs.writeFileSync(bldPath(lot), JSON.stringify({ at: new Date().toISOString(), dongs }));
    } catch (err) {
      console.error(`[${code}] ${err.message}`);
      missing++;
    }
  }
  return missing;
}

// 거래한 층이 그 동의 꼭대기 층인지. 1 = 탑층, 0 = 아님 또는 모름.
// 동 이름이 맞으면 그 동 층수로, 거래에 동이 없으면 필지의 주거용 동이 모두 같은 높이일 때만 판단한다.
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

// 최근 months개월 매매(브리핑 화면용). 한 줄 = [단지, 법정동, 전용㎡, 금액, 층, "YYYY.MM.DD", 평당가, 신고가]
// 신고가: 같은 단지·같은 넓이(전용㎡ 반올림)에서 계약일이 앞선 기록 속 거래(최대 TRADE_MONTHS개월)의 최고가를 넘으면
// 그 이전 최고가(만원), 아니면 0. 앞선 거래가 하나도 없으면(첫 거래) 신고가로 보지 않는다.
// 기록이 아직 덜 찼으면(처음 며칠) 그 기간 안의 최고가 기준이다.
function recentTrades(code, now, months, cutoff, pricePerPyeong) {
  const cut = ymd(cutoff.getFullYear(), cutoff.getMonth() + 1, cutoff.getDate());
  const out = [];
  const groups = new Map();
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
      const key = `${r[0]}|${r[1]}|${Math.round(r[2])}`;
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
        out.push([r[0], r[1], r[2], r[3], r[4], `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6)}`, pricePerPyeong(r[3], r[2]), best && r[3] > best ? best : 0]);
      }
      dayBest = Math.max(dayBest, r[3]);
    }
  }
  out.sort((a, b) => b[5].localeCompare(a[5]) || b[3] - a[3]);
  return { any, lastAt, items: out };
}

// 법정동별 아파트 기록 파일. 동 번호는 regions-kr.json의 dongs 순서(목록에 없는 동은 "x").
// { d: 법정동, apts: { 단지: { t: [[YYYYMMDD, ㎡, 금액, 층, 동, 탑층 1/0]], r: [[YYYYMMDD, ㎡, 보증금, 월세, 층, 신규/갱신]] } } }
function writeAptFiles(region, now, outDir) {
  const byDong = new Map();
  const slot = (dong, apt) => {
    if (!byDong.has(dong)) byDong.set(dong, {});
    const apts = byDong.get(dong);
    return (apts[apt] = apts[apt] || { t: [], r: [] });
  };
  const bld = new Map();
  for (const ym of monthList(now, TRADE_MONTHS)) {
    for (const r of readRaw(region.code, ym, 't')?.rows || []) slot(r[1], r[0]).t.push([r[5], r[2], r[3], r[4], r[6] || '', topFlag(r, bld)]);
  }
  for (const ym of monthList(now, RENT_MONTHS)) {
    for (const r of readRaw(region.code, ym, 'r')?.rows || []) slot(r[1], r[0]).r.push([r[6], r[2], r[3], r[4], r[5], r[7]]);
  }
  if (!byDong.size) return 0;
  const dir = path.join(outDir, region.code);
  fs.mkdirSync(dir, { recursive: true });
  const groups = new Map();
  for (const [dong, apts] of byDong) {
    const i = region.dongs.indexOf(dong);
    const key = i >= 0 ? String(i) : 'x';
    if (!groups.has(key)) groups.set(key, { d: i >= 0 ? dong : '기타', apts: {} });
    Object.assign(groups.get(key).apts, apts);
  }
  let written = 0;
  for (const [key, data] of groups) {
    for (const a of Object.values(data.apts)) {
      a.t.sort((x, y) => y[0] - x[0] || y[2] - x[2]);
      a.r.sort((x, y) => y[0] - x[0] || y[2] - x[2]);
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

module.exports = { updateRegion, updateBuildings, recentTrades, writeAptFiles, calls, SERVICE_KEY, TRADE_MONTHS, RENT_MONTHS };
