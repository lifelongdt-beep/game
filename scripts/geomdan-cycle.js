#!/usr/bin/env node
'use strict';

// 검단신도시 아파트 단지별 사이클 페이지(docs/geomdan-cycle.html)를 만든다.
// 카드뉴스·다이제스트는 최근 4개월 실거래만 보지만, 사이클은 몇 년 치가 있어야
// 보이므로 국토부 실거래가를 달마다 받아 docs/geomdan-history-cache.json에 쌓아 두고
// (지난 달들은 한 번 받으면 재사용, 최근 몇 달만 매번 다시 받음) 그 기록으로
// 네 가지 지표를 계산해 SVG 차트로 그린다.
//
//  1) 평당가 이동평균선: 3개월·12개월 이동 중위 평당가와 둘의 교차
//  2) 고점 대비 낙폭: 3개월 이동 중위 평당가의 역대 최고점 대비 현재 수준
//  3) 거래량·가격 4분면: 최근 3개월과 그 전 3개월의 거래량·평당가 변화
//  4) 상대강도: 단지 평당가 ÷ 검단 전체 평당가(=100)와 6개월 전 대비 변화
//
// 필요한 환경 변수: DATA_GO_KR_SERVICE_KEY(없으면 캐시만으로 페이지를 만든다).

const fs = require('fs');
const { normalizeAptName, loadExcludedApartments, pricePerPyeong, makeRecordChecker } = require('./geomdan-common');

const SERVICE_KEY = process.env.DATA_GO_KR_SERVICE_KEY || '';
// 2026-07-01 행정구역 개편으로 검단 지역은 서구(28260)에서 검단구(28290)로 나뉘었다.
// 개편 전 달의 기록이 어느 코드로 조회되는지 확실하지 않아 두 코드를 모두 조회하고
// 법정동으로 거른 뒤 중복을 없앤다.
const LAWD_CODES = (process.env.CYCLE_LAWD_CODES || '28290,28260').split(',').map((s) => s.trim()).filter(Boolean);
const GEOMDAN_DONGS = (process.env.GEOMDAN_DONGS || '당하동,마전동,불로동,원당동').split(',').map((s) => s.trim()).filter(Boolean);
const CYCLE_MONTHS = Number(process.env.CYCLE_MONTHS || 36); // 분석 기간(기준월 포함)
const REFRESH_RECENT_MONTHS = Number(process.env.CYCLE_REFRESH_MONTHS || 3); // 매번 다시 받는 최근 달 수(늦은 신고·해제 반영)
const FETCH_BUDGET_MS = Number(process.env.CYCLE_FETCH_BUDGET_MS || 8 * 60 * 1000);
const FETCH_TIMEOUT_MS = 20000;
const CACHE_PATH = process.env.CYCLE_CACHE_PATH || 'docs/geomdan-history-cache.json';
const OUT_PATH = process.env.CYCLE_OUT_PATH || 'docs/geomdan-cycle.html';

const EXCLUDED = loadExcludedApartments();

// ── 달 계산 ────────────────────────────────────────────────────────────────
const ymIndex = (ym) => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(4, 6)) - 1;
const indexYm = (i) => `${Math.floor(i / 12)}${String((i % 12) + 1).padStart(2, '0')}`;
const ymLabel = (ym) => `${ym.slice(2, 4)}.${ym.slice(4, 6)}`;
const ymKorean = (ym) => `${ym.slice(0, 4)}년 ${Number(ym.slice(4, 6))}월`;
function kstNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
}

// ── 수집 ───────────────────────────────────────────────────────────────────
function xmlTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  if (!m) return '';
  return m[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function fetchText(url, deadline) {
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    if (Date.now() >= deadline) throw new Error('수집 예산 시간 초과');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      const text = await res.text();
      if ([429, 500, 502, 503, 504].includes(res.status)) throw new Error(`HTTP ${res.status}`);
      return { ok: res.ok, status: res.status, text };
    } catch (err) {
      lastErr = err;
      await sleep(1000 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

// 한 법정동 코드·한 달의 거래를 모두 받는다(1000건이 넘으면 다음 쪽까지).
// 인증키는 공공데이터포털 '일반 인증키(Encoding)' 값을 그대로 이어붙인다(이중 인코딩 방지).
async function fetchMonth(lawd, ym, deadline) {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const url =
      'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev' +
      `?serviceKey=${SERVICE_KEY}&LAWD_CD=${lawd}&DEAL_YMD=${ym}&numOfRows=1000&pageNo=${page}`;
    const { ok, status, text } = await fetchText(url, deadline);
    if (!ok || text.includes('<cmmMsgHeader>')) {
      throw new Error(`실거래가 API 오류(${lawd} ${ym}): ${xmlTag(text, 'returnAuthMsg') || xmlTag(text, 'errMsg') || `HTTP ${status}`}`);
    }
    const code = xmlTag(text, 'resultCode');
    if (code && !['00', '000'].includes(code)) throw new Error(`실거래가 API 오류(${lawd} ${ym}, ${code}): ${xmlTag(text, 'resultMsg')}`);
    const items = [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
    for (const item of items) {
      if (xmlTag(item, 'cdealType') === 'O') continue; // 해제된 계약
      const dong = xmlTag(item, 'umdNm');
      if (!GEOMDAN_DONGS.some((d) => dong.includes(d))) continue;
      out.push({
        a: xmlTag(item, 'aptNm'),
        d: dong,
        ar: Number(xmlTag(item, 'excluUseAr')),
        p: Number(xmlTag(item, 'dealAmount').replace(/,/g, '')),
        f: xmlTag(item, 'floor'),
        ad: xmlTag(item, 'aptDong'),
        dt: `${xmlTag(item, 'dealYear')}-${xmlTag(item, 'dealMonth').padStart(2, '0')}-${xmlTag(item, 'dealDay').padStart(2, '0')}`,
      });
    }
    const total = Number(xmlTag(text, 'totalCount') || 0);
    if (page * 1000 >= total) break;
  }
  return out;
}

function loadCache() {
  try {
    const data = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    return data && data.months ? data : { months: {} };
  } catch {
    return { months: {} };
  }
}

// 오래된 달부터가 아니라 최근 달부터 받는다 — 예산이 모자라도 최신 흐름은 먼저 확보한다.
async function updateCache(cache, refIdx) {
  if (!SERVICE_KEY) {
    console.log('DATA_GO_KR_SERVICE_KEY가 없어 새로 받지 않고 캐시만으로 페이지를 만듭니다.');
    return;
  }
  const deadline = Date.now() + FETCH_BUDGET_MS;
  const nowIdx = refIdx + 1; // 이번 달(신고 기한 전이라 분석엔 쓰지 않지만 받아 둔다)
  const startIdx = refIdx - CYCLE_MONTHS + 1;
  let fetched = 0;
  let failed = 0;
  for (let i = nowIdx; i >= startIdx; i--) {
    const ym = indexYm(i);
    const cached = cache.months[ym];
    const recent = i > nowIdx - REFRESH_RECENT_MONTHS;
    if (cached && cached.complete && !recent) continue;
    if (Date.now() >= deadline) {
      console.log(`수집 예산(${Math.round(FETCH_BUDGET_MS / 1000)}초)을 다 써서 ${ym} 이전 달은 다음 실행에 받습니다.`);
      break;
    }
    try {
      const seen = new Set();
      const items = [];
      for (const lawd of LAWD_CODES) {
        for (const t of await fetchMonth(lawd, ym, deadline)) {
          const key = [t.a, t.ar, t.f, t.ad, t.dt, t.p].join('|');
          if (seen.has(key)) continue;
          seen.add(key);
          items.push(t);
        }
      }
      cache.months[ym] = { complete: true, fetchedAt: new Date().toISOString(), items };
      fetched++;
    } catch (err) {
      failed++;
      console.error(`${ym} 수집 실패(기존 캐시 유지): ${err.message}`);
    }
  }
  console.log(`실거래가 기록: ${fetched}개월 새로 받음, ${failed}개월 실패`);
}

function saveCache(cache, refIdx) {
  // 분석 기간보다 오래된 달은 지운다(캐시가 끝없이 커지지 않게).
  const keepFrom = refIdx - CYCLE_MONTHS + 1;
  const months = {};
  for (const ym of Object.keys(cache.months).sort()) if (ymIndex(ym) >= keepFrom) months[ym] = cache.months[ym];
  // 한 달을 한 줄로 써서, 매번 최근 몇 달만 바뀔 때 git 변경분이 그 줄들로만 잡히게 한다.
  const lines = Object.entries(months).map(([ym, v]) => `${JSON.stringify(ym)}:${JSON.stringify(v)}`);
  fs.writeFileSync(CACHE_PATH, `{"updatedAt":${JSON.stringify(new Date().toISOString())},"months":{\n${lines.join(',\n')}\n}}\n`);
}

// ── 지표 계산 ──────────────────────────────────────────────────────────────
function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// 달별 평당가 목록(byMonth)에서 이동 중위값을 만든다. 거래가 드문 단지가 많아
// 달별 중위값의 평균이 아니라 창 안의 모든 거래를 모아 중위값을 낸다.
function rolling(byMonth, window, minCount) {
  return byMonth.map((_, i) => {
    if (i < window - 1) return null;
    const vals = byMonth.slice(i - window + 1, i + 1).flat();
    return vals.length >= minCount ? median(vals) : null;
  });
}

function lastNonNull(arr, from, back) {
  for (let i = from; i >= Math.max(0, from - back); i--) if (arr[i] != null) return { i, v: arr[i] };
  return null;
}

const QUADRANTS = {
  up: { label: '회복·상승', desc: '거래도 늘고 값도 오름' },
  late: { label: '과열·막바지', desc: '값은 오르는데 거래가 줄어듦' },
  down: { label: '하락', desc: '거래도 줄고 값도 내림' },
  bottom: { label: '바닥 다지기', desc: '값은 내렸지만 거래가 늘어남' },
};

function analyzeSeries(byMonth, minRoll3, minRoll12, region) {
  const n = byMonth.length;
  const last = n - 1;
  const count = byMonth.map((v) => v.length);
  const monthly = byMonth.map((v) => median(v));
  const roll3 = rolling(byMonth, 3, minRoll3);
  const roll12 = rolling(byMonth, 12, minRoll12);
  const total = count.reduce((a, b) => a + b, 0);

  const cur = lastNonNull(roll3, last, 2);
  const res = { count, monthly, roll3, roll12, total, current: cur ? cur.v : null };

  // 1) 이동평균선
  if (roll3[last] != null && roll12[last] != null) {
    const gap = roll3[last] / roll12[last] - 1;
    const DEAD = 0.015;
    res.ma = { gap, state: gap >= DEAD ? 'up' : gap <= -DEAD ? 'down' : 'flat' };
    if (res.ma.state !== 'flat') {
      const sign = Math.sign(gap);
      for (let i = last - 1; i >= 0; i--) {
        if (roll3[i] == null || roll12[i] == null) break;
        const g = roll3[i] / roll12[i] - 1;
        if (Math.sign(g) !== sign) {
          res.ma.crossAgo = last - i;
          break;
        }
      }
    }
  }

  // 2) 고점 대비
  let peak = null;
  roll3.forEach((v, i) => {
    if (v != null && (!peak || v > peak.v)) peak = { v, i };
  });
  if (peak && res.current != null) res.peak = { value: peak.v, idx: peak.i, ratio: res.current / peak.v };

  // 3) 거래량·가격 4분면(최근 3개월 vs 그 전 3개월)
  const volRecent = count.slice(n - 3).reduce((a, b) => a + b, 0);
  const volPrev = count.slice(n - 6, n - 3).reduce((a, b) => a + b, 0);
  const pPrev = lastNonNull(roll3, last - 3, 1);
  if (volPrev >= 2 && roll3[last] != null && pPrev) {
    const x = ((volRecent - volPrev) / volPrev) * 100;
    const y = (roll3[last] / pPrev.v - 1) * 100;
    const q = x >= 0 ? (y >= 0 ? 'up' : 'bottom') : y >= 0 ? 'late' : 'down';
    res.quad = { x, y, q, volRecent, volPrev };
  }

  // 4) 상대강도(검단 전체 = 100)
  if (region) {
    const rel = roll3.map((v, i) => (v != null && region.roll3[i] != null ? (v / region.roll3[i]) * 100 : null));
    res.rel = rel;
    const now = lastNonNull(rel, last, 2);
    const before = lastNonNull(rel, last - 6, 1);
    if (now) {
      res.rs = { value: now.v };
      if (before) {
        const delta = now.v - before.v;
        res.rs.delta = delta;
        res.rs.state = delta >= 2 ? 'up' : delta <= -2 ? 'down' : 'flat';
      }
    }
  }
  return res;
}

function analyze(cache, refIdx) {
  const startIdx = refIdx - CYCLE_MONTHS + 1;
  const months = Array.from({ length: CYCLE_MONTHS }, (_, i) => indexYm(startIdx + i));
  const regionByMonth = months.map(() => []);
  const groups = new Map();
  let coveredMonths = 0;
  // 신고가: 같은 단지·같은 평형의 이전 최고가(기록 전체 기준)를 넘긴 거래
  const isNewHigh = makeRecordChecker(Object.values(cache.months).flatMap((m) => m.items));
  const regionNewHighs = [];

  months.forEach((ym, mi) => {
    const entry = cache.months[ym];
    if (!entry) return;
    coveredMonths++;
    for (const t of entry.items) {
      const key = normalizeAptName(t.a);
      if (EXCLUDED.has(key)) continue;
      const ppy = pricePerPyeong(t.p, t.ar);
      if (!ppy) continue;
      regionByMonth[mi].push(ppy);
      if (!groups.has(key)) groups.set(key, { names: new Map(), dongs: new Map(), byMonth: months.map(() => []), newHighs: [] });
      const g = groups.get(key);
      if (isNewHigh(t.a, t.ar, t.p, t.dt)) {
        const nh = { mi, ppy, amount: t.p, area: t.ar, floor: t.f, dt: t.dt };
        g.newHighs.push(nh);
        regionNewHighs.push(nh);
      }
      g.names.set(t.a, (g.names.get(t.a) || 0) + 1);
      g.dongs.set(t.d, (g.dongs.get(t.d) || 0) + 1);
      g.byMonth[mi].push(ppy);
    }
  });

  const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const region = analyzeSeries(regionByMonth, 5, 20, null);
  const complexes = [];
  const thin = [];
  for (const g of groups.values()) {
    const a = analyzeSeries(g.byMonth, 2, 4, region);
    const recentNH = g.newHighs.filter((h) => h.mi >= months.length - 3).sort((x, y) => (x.dt < y.dt ? 1 : -1));
    const item = { name: top(g.names), dong: top(g.dongs), ...a, newHighs: g.newHighs, recentNH };
    // 기록 전체 8건 이상, 최근 3개월 안에 3개월 이동 중위값이 있어야 지표를 낸다.
    if (a.total >= 8 && a.current != null) complexes.push(item);
    else thin.push(item);
  }
  complexes.sort((a, b) => b.current - a.current);
  thin.sort((a, b) => b.total - a.total);
  region.recentNH = regionNewHighs.filter((h) => h.mi >= months.length - 3).length;
  region.recentTrades = region.count.slice(-3).reduce((x, y) => x + y, 0);
  return { months, region, complexes, thin, coveredMonths };
}

// ── 그리기 ─────────────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const won = (v) => `${Math.round(v).toLocaleString('ko-KR')}`;
const fmtWon = (manwon) => {
  const eok = Math.floor(manwon / 10000);
  const rest = manwon % 10000;
  return eok > 0 ? `${eok}억${rest ? ` ${rest.toLocaleString('ko-KR')}만` : ''}원` : `${manwon.toLocaleString('ko-KR')}만원`;
};
const pct = (v, digits = 1) => `${v >= 0 ? '+' : ''}${v.toFixed(digits)}%`;
const fmt = (v) => (v == null ? '' : v.toFixed(1));

function niceTicks(min, max, count) {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(v);
  return out;
}

// 평당가 추세 차트: 달별 중위(점) + 3개월선 + 12개월선 + 고점선 + 아래쪽 거래량 막대.
function trendChart(months, s, { height = 280, showPeak = true, newHighs = [] } = {}) {
  const W = 560;
  const H = height;
  const pad = { l: 64, r: 14, t: 16, b: 26 };
  const volH = 46;
  const priceBottom = H - pad.b - volH - 10;
  const vals = [...s.roll3, ...s.roll12, ...s.monthly].filter((v) => v != null);
  if (!vals.length) return '';
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  const padV = (hi - lo) * 0.08 || hi * 0.05;
  lo -= padV;
  hi += padV;
  const n = months.length;
  const x = (i) => pad.l + ((W - pad.l - pad.r) * (i + 0.5)) / n;
  const y = (v) => pad.t + ((hi - v) / (hi - lo)) * (priceBottom - pad.t);
  const maxVol = Math.max(1, ...s.count);
  const barW = Math.max(2, ((W - pad.l - pad.r) / n) * 0.6);
  const volBase = H - pad.b;

  const ticks = niceTicks(lo, hi, 4);
  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="평당가 추세 차트">`;
  for (const t of ticks) {
    svg += `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>`;
    svg += `<text class="axis" x="${pad.l - 6}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end">${won(t)}</text>`;
  }
  // 거래량 막대
  s.count.forEach((c, i) => {
    if (!c) return;
    const h = (c / maxVol) * volH;
    svg += `<rect class="vol" x="${(x(i) - barW / 2).toFixed(1)}" y="${(volBase - h).toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}"><title>${ymKorean(months[i])} 거래 ${c}건</title></rect>`;
  });
  svg += `<text class="axis" x="${pad.l - 6}" y="${volBase - volH + 8}" text-anchor="end">거래</text>`;
  // x축 라벨(6개월마다)
  months.forEach((ym, i) => {
    if ((n - 1 - i) % 6 === 0) svg += `<text class="axis" x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${ymLabel(ym)}</text>`;
  });
  // 고점선
  if (showPeak && s.peak) {
    const py = y(s.peak.value).toFixed(1);
    svg += `<line class="peak" x1="${pad.l}" x2="${W - pad.r}" y1="${py}" y2="${py}"/>`;
    svg += `<text class="peak-label" x="${W - pad.r}" y="${(Number(py) - 5).toFixed(1)}" text-anchor="end">고점 ${won(s.peak.value)}</text>`;
  }
  // 달별 중위 점
  s.monthly.forEach((v, i) => {
    if (v == null) return;
    svg += `<circle class="dot" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.6"><title>${ymKorean(months[i])} 중위 ${won(v)}만원/평 · ${s.count[i]}건</title></circle>`;
  });
  const path = (arr) => {
    let d = '';
    let pen = false;
    arr.forEach((v, i) => {
      if (v == null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  svg += `<path class="ma12" d="${path(s.roll12)}"/>`;
  svg += `<path class="ma3" d="${path(s.roll3)}"/>`;
  // 신고가 거래(▲). 차트 범위를 넘으면 위쪽 끝에 붙인다.
  for (const h of newHighs) {
    const cx = x(h.mi);
    const cy = Math.max(pad.t + 4, y(h.ppy));
    svg += `<path class="nh-mark" d="M${cx.toFixed(1)},${(cy - 6).toFixed(1)}l5,8.5h-10z"><title>신고가 ${h.dt.replace(/-/g, '.')} 전용 ${Math.round(h.area)}㎡ ${h.floor}층 ${fmtWon(h.amount)} (평당 ${won(h.ppy)}만원)</title></path>`;
  }
  const lastIdx = s.roll3.length - 1;
  if (s.roll3[lastIdx] != null) svg += `<circle class="ma3-end" cx="${x(lastIdx).toFixed(1)}" cy="${y(s.roll3[lastIdx]).toFixed(1)}" r="4"/>`;
  svg += '</svg>';
  return svg;
}

function sparkline(values, { w = 120, h = 30 } = {}) {
  const pts = values.map((v, i) => [i, v]).filter(([, v]) => v != null);
  if (pts.length < 2) return '';
  const vs = pts.map(([, v]) => v);
  let lo = Math.min(...vs, 100);
  let hi = Math.max(...vs, 100);
  if (hi - lo < 4) {
    lo -= 2;
    hi += 2;
  }
  const n = values.length;
  const X = (i) => 2 + ((w - 4) * i) / (n - 1);
  const Y = (v) => 3 + ((hi - v) / (hi - lo)) * (h - 6);
  const d = pts.map(([i, v], k) => `${k ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  const [li, lv] = pts[pts.length - 1];
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><line class="spark-base" x1="0" x2="${w}" y1="${Y(100).toFixed(1)}" y2="${Y(100).toFixed(1)}"/><path d="${d}"/><circle cx="${X(li).toFixed(1)}" cy="${Y(lv).toFixed(1)}" r="2.5"/></svg>`;
}

function quadrantChart(points) {
  const W = 560;
  const H = 420;
  const pad = { l: 62, r: 16, t: 30, b: 38 };
  const XMIN = -100;
  const XMAX = 200;
  const yAbs = Math.min(30, Math.max(8, ...points.map((p) => Math.abs(p.y))) * 1.15);
  const X = (v) => pad.l + ((Math.max(XMIN, Math.min(XMAX, v)) - XMIN) / (XMAX - XMIN)) * (W - pad.l - pad.r);
  const Y = (v) => pad.t + ((yAbs - Math.max(-yAbs, Math.min(yAbs, v))) / (2 * yAbs)) * (H - pad.t - pad.b);
  const x0 = X(0);
  const y0 = Y(0);
  let svg = `<svg class="chart quad" viewBox="0 0 ${W} ${H}" role="img" aria-label="거래량·가격 4분면">`;
  svg += `<rect class="qbg q-late" x="${pad.l}" y="${pad.t}" width="${(x0 - pad.l).toFixed(1)}" height="${(y0 - pad.t).toFixed(1)}"/>`;
  svg += `<rect class="qbg q-up" x="${x0.toFixed(1)}" y="${pad.t}" width="${(W - pad.r - x0).toFixed(1)}" height="${(y0 - pad.t).toFixed(1)}"/>`;
  svg += `<rect class="qbg q-down" x="${pad.l}" y="${y0.toFixed(1)}" width="${(x0 - pad.l).toFixed(1)}" height="${(H - pad.b - y0).toFixed(1)}"/>`;
  svg += `<rect class="qbg q-bottom" x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${(W - pad.r - x0).toFixed(1)}" height="${(H - pad.b - y0).toFixed(1)}"/>`;
  svg += `<text class="qname t-late" x="${pad.l + 8}" y="${pad.t + 18}">과열·막바지</text>`;
  svg += `<text class="qname t-up" x="${W - pad.r - 8}" y="${pad.t + 18}" text-anchor="end">회복·상승</text>`;
  svg += `<text class="qname t-down" x="${pad.l + 8}" y="${H - pad.b - 10}">하락</text>`;
  svg += `<text class="qname t-bottom" x="${W - pad.r - 8}" y="${H - pad.b - 10}" text-anchor="end">바닥 다지기</text>`;
  for (const v of [-100, -50, 0, 50, 100, 150, 200]) {
    svg += `<text class="axis" x="${X(v).toFixed(1)}" y="${H - pad.b + 16}" text-anchor="middle">${v > 0 ? '+' : ''}${v}${v === 200 ? '%↑' : '%'}</text>`;
  }
  for (const v of niceTicks(-yAbs, yAbs, 4)) {
    svg += `<text class="axis" x="${pad.l - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${v > 0 ? '+' : ''}${Number(v.toFixed(1))}%</text>`;
  }
  svg += `<line class="axis-line" x1="${pad.l}" x2="${W - pad.r}" y1="${y0.toFixed(1)}" y2="${y0.toFixed(1)}"/>`;
  svg += `<line class="axis-line" x1="${x0.toFixed(1)}" x2="${x0.toFixed(1)}" y1="${pad.t}" y2="${H - pad.b}"/>`;
  svg += `<text class="axis-title" x="${(W + pad.l) / 2}" y="${H - 4}" text-anchor="middle">거래량 변화 (최근 3개월 vs 그 전 3개월) →</text>`;
  svg += `<text class="axis-title" x="${pad.l}" y="${pad.t - 10}">↑ 평당가 변화 (3개월선)</text>`;

  const maxVol = Math.max(1, ...points.map((p) => p.vol));
  const placed = points.map((p) => ({ ...p, cx: X(p.x), cy: Y(p.y), r: 4 + Math.sqrt(p.vol / maxVol) * 10 }));
  // 원은 큰 것(거래 많은 단지)부터 그리고, 이름표는 거래가 많은 순으로 겹치지 않는 자리에만 단다.
  const sorted = [...placed].sort((a, b) => b.vol - a.vol);
  // 점 위에 마우스를 올리거나(휴대폰은 탭하거나) 포커스하면 단지 이름과 수치를 말풍선으로 보여 준다.
  let dots = '';
  for (const p of sorted) {
    const sub = `거래 ${pct(p.x, 0)} · 평당가 ${pct(p.y)} · 최근 3개월 ${p.vol}건`;
    const tw = Math.max(p.name.length * 17.5, sub.length * 13) + 20;
    const th = 48;
    const tx = Math.min(Math.max(p.cx - tw / 2, pad.l), W - pad.r - tw);
    const above = p.cy - p.r - 10 - th >= pad.t;
    const ty = above ? p.cy - p.r - 10 - th : p.cy + p.r + 10;
    dots += `<g class="qpt" tabindex="0" role="img" aria-label="${esc(p.name)}"><circle class="qdot q-${p.q}" cx="${p.cx.toFixed(1)}" cy="${p.cy.toFixed(1)}" r="${p.r.toFixed(1)}"/><g class="qtip" transform="translate(${tx.toFixed(1)},${ty.toFixed(1)})"><rect class="qtip-box" width="${tw.toFixed(1)}" height="${th}" rx="6"/><text class="qtip-name" x="10" y="20">${esc(p.name)}</text><text class="qtip-sub" x="10" y="38">${esc(sub)}</text></g></g>`;
  }
  // 네 귀퉁이의 국면 이름 자리는 비워 둔다(휴대폰에서 커지는 글자 크기 기준).
  const nameW = (t) => t.length * 21;
  const boxes = [
    { x1: pad.l, x2: pad.l + 8 + nameW('과열·막바지'), y1: pad.t, y2: pad.t + 26 },
    { x1: W - pad.r - 8 - nameW('회복·상승'), x2: W - pad.r, y1: pad.t, y2: pad.t + 26 },
    { x1: pad.l, x2: pad.l + 8 + nameW('하락'), y1: H - pad.b - 30, y2: H - pad.b },
    { x1: W - pad.r - 8 - nameW('바닥 다지기'), x2: W - pad.r, y1: H - pad.b - 30, y2: H - pad.b },
  ];
  const overlaps = (b) => boxes.some((o) => b.x1 < o.x2 && b.x2 > o.x1 && b.y1 < o.y2 && b.y2 > o.y1);
  let labels = 0;
  let labelSvg = '';
  for (const p of sorted) {
    if (labels >= 10) break;
    const text = shortName(p.name);
    const tw = text.length * 17.5; // 휴대폰에서 커지는 글자 크기 기준으로 자리를 잡는다
    for (const side of ['right', 'left']) {
      const x1 = side === 'right' ? p.cx + p.r + 3 : p.cx - p.r - 3 - tw;
      const b = { x1, x2: x1 + tw, y1: p.cy - 11, y2: p.cy + 9 };
      if (b.x1 < pad.l || b.x2 > W - pad.r || overlaps(b)) continue;
      boxes.push(b);
      labelSvg += `<text class="qlabel${labels >= 5 ? ' minor' : ''}" x="${x1.toFixed(1)}" y="${(p.cy + 4).toFixed(1)}">${esc(text)}</text>`;
      labels++;
      break;
    }
  }
  svg += labelSvg + dots;
  svg += '</svg>';
  return svg;
}

const shortName = (name) => name.replace(/^검단신도시|^인천검단|^검단/, '').replace(/\(.*?\)/g, '').trim() || name;

function chip(state, text) {
  return `<span class="chip chip-${state}">${esc(text)}</span>`;
}
function maChip(ma) {
  if (!ma) return chip('na', '기록 부족');
  const label = { up: '상승 추세', down: '하락 추세', flat: '보합' }[ma.state];
  return chip(ma.state, label);
}
function maNote(ma) {
  if (!ma) return '';
  const cross = ma.crossAgo ? ` · ${ma.crossAgo}개월 전 ${ma.state === 'up' ? '골든' : '데드'}크로스` : '';
  return `3개월선이 12개월선보다 ${pct(ma.gap * 100)}${cross}`;
}
function quadChip(quad) {
  if (!quad) return chip('na', '거래 부족');
  return chip(`q-${quad.q}`, QUADRANTS[quad.q].label);
}
function rsChip(rs) {
  if (!rs || !rs.state) return '';
  return chip(rs.state, { up: '강세', down: '약세', flat: '유지' }[rs.state]);
}

function drawdownBar(peak) {
  if (!peak) return '<span class="muted">-</span>';
  const ratio = Math.min(1, peak.ratio);
  const dd = (peak.ratio - 1) * 100;
  const atPeak = dd > -1;
  return `<div class="dd"><div class="dd-track"><div class="dd-fill${atPeak ? ' at-peak' : ''}" style="width:${(ratio * 100).toFixed(1)}%"></div></div><span class="dd-num">${atPeak ? '고점권' : pct(dd)}</span></div>`;
}

function renderPage(result, refYm, cacheInfo) {
  const { months, region, complexes, thin, coveredMonths } = result;
  const startYm = months[0];
  const quadPoints = complexes.filter((c) => c.quad).map((c) => ({ name: c.name, x: c.quad.x, y: c.quad.y, q: c.quad.q, vol: c.quad.volRecent }));
  const quadCounts = Object.fromEntries(Object.keys(QUADRANTS).map((k) => [k, quadPoints.filter((p) => p.q === k).length]));
  const generated = kstNow().toLocaleString('ko-KR', { dateStyle: 'long', timeStyle: 'short' });

  const rows = complexes
    .map((c, i) => {
      const rel = c.rs ? `${c.rs.value.toFixed(0)}` : '-';
      const relDelta = c.rs && c.rs.delta != null ? `<span class="muted"> (${c.rs.delta >= 0 ? '+' : ''}${c.rs.delta.toFixed(1)})</span>` : '';
      const nh = c.recentNH.length;
      return `<details class="row" data-price="${c.current}" data-dd="${c.peak ? c.peak.ratio : 0}" data-rs="${c.rs ? c.rs.value : 0}" data-vol="${c.quad ? c.quad.volRecent : 0}" data-nh="${nh}">
  <summary>
    <span class="c-name"><b>${esc(c.name)}${nh ? `<em class="nh-badge">신고가 ${nh}</em>` : ''}</b><small>${esc(c.dong)} · 기록 ${c.total}건</small></span>
    <span class="c-price"><b>${won(c.current)}</b><small>만원/평</small></span>
    <span class="c-ma">${maChip(c.ma)}</span>
    <span class="c-dd">${drawdownBar(c.peak)}</span>
    <span class="c-quad">${quadChip(c.quad)}</span>
    <span class="c-rs"><span class="rs-num">${rel}${relDelta}</span>${sparkline(c.rel || [])}${rsChip(c.rs)}</span>
  </summary>
  <div class="detail">
    ${trendChart(months, c, { newHighs: c.newHighs })}
    <ul class="facts">
      <li><b>신고가</b> ${nh ? `최근 3개월 ${nh}건 · 가장 최근 ${c.recentNH[0].dt.replace(/-/g, '.')} 전용 ${Math.round(c.recentNH[0].area)}㎡ ${c.recentNH[0].floor}층 ${fmtWon(c.recentNH[0].amount)}` : '최근 3개월에는 없음'}${c.newHighs.length ? ` (분석 기간 전체 ${c.newHighs.length}건, 차트의 ▲)` : ''}</li>
      <li><b>이동평균선</b> ${c.ma ? maNote(c.ma) : '12개월치 기록이 모자랍니다'}</li>
      <li><b>고점 대비</b> ${c.peak ? `${ymKorean(months[c.peak.idx])} 고점 ${won(c.peak.value)}만원 대비 ${pct((c.peak.ratio - 1) * 100)}` : '-'}</li>
      <li><b>4분면</b> ${c.quad ? `최근 3개월 거래 ${c.quad.volRecent}건(그 전 ${c.quad.volPrev}건, ${pct(c.quad.x, 0)}) · 평당가 ${pct(c.quad.y)} → ${QUADRANTS[c.quad.q].label}` : '비교할 거래가 모자랍니다'}</li>
      <li><b>상대강도</b> ${c.rs ? `검단 전체를 100으로 볼 때 ${c.rs.value.toFixed(1)}${c.rs.delta != null ? `, 6개월 전보다 ${c.rs.delta >= 0 ? '+' : ''}${c.rs.delta.toFixed(1)}` : ''}` : '-'}</li>
    </ul>
  </div>
</details>`;
    })
    .join('\n');

  const thinList = thin.length
    ? `<p class="thin"><b>기록이 적어 지표를 내지 않은 단지 ${thin.length}곳</b> · ${thin.map((t) => `${esc(t.name)}(${t.total}건)`).join(', ')}</p>`
    : '';

  const regionDD = region.peak ? (region.peak.ratio - 1) * 100 : null;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>검단 아파트 사이클</title>
<meta name="description" content="검단신도시 아파트 단지별 평당가 이동평균선·고점 대비 낙폭·거래량 4분면·상대강도">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
:root {
  --bg: #f3f1ec;
  --surface: #ffffff;
  --surface-2: #f8f7f3;
  --ink: #17171a;
  --ink-2: #4a4a52;
  --ink-3: #8a8a93;
  --line: #e4e1d9;
  --accent: #0d6b5e;
  --up: #d63a2f;
  --up-bg: #fde9e6;
  --down: #2563c9;
  --down-bg: #e5eefc;
  --flat: #6b6b74;
  --flat-bg: #eeeeef;
  --late: #c27a05;
  --late-bg: #fdf1dc;
  --bottom: #13866f;
  --bottom-bg: #dff3ec;
  --ma12: #2b2b31;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #141416; --surface: #1d1d21; --surface-2: #232328; --ink: #f0efeb; --ink-2: #bdbcc4; --ink-3: #8a8a93; --line: #303037;
    --accent: #3fc1aa; --up: #ff6b5e; --up-bg: #3a1f1c; --down: #6c9dff; --down-bg: #1b2740; --flat: #a0a0a8; --flat-bg: #2a2a30;
    --late: #f0a73a; --late-bg: #382a14; --bottom: #3fc1aa; --bottom-bg: #15312b; --ma12: #e6e5e0;
  }
}
:root[data-theme="dark"] {
  --bg: #141416; --surface: #1d1d21; --surface-2: #232328; --ink: #f0efeb; --ink-2: #bdbcc4; --ink-3: #8a8a93; --line: #303037;
  --accent: #3fc1aa; --up: #ff6b5e; --up-bg: #3a1f1c; --down: #6c9dff; --down-bg: #1b2740; --flat: #a0a0a8; --flat-bg: #2a2a30;
  --late: #f0a73a; --late-bg: #382a14; --bottom: #3fc1aa; --bottom-bg: #15312b; --ma12: #e6e5e0;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif; line-height: 1.55; }
.wrap { max-width: 860px; margin: 0 auto; padding: 28px 16px 64px; display: grid; gap: 22px; }
header h1 { margin: 6px 0 4px; font-size: 30px; letter-spacing: -0.02em; text-wrap: balance; }
.eyebrow { font-size: 12px; letter-spacing: 0.12em; color: var(--accent); font-weight: 700; }
.meta { color: var(--ink-3); font-size: 13px; }
section { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 20px; display: grid; gap: 14px; }
section h2 { margin: 0; font-size: 19px; letter-spacing: -0.01em; }
section .lead { margin: 0; color: var(--ink-2); font-size: 14px; max-width: 65ch; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.stat { background: var(--surface-2); border-radius: 10px; padding: 12px 14px; display: grid; gap: 4px; }
.stat small { color: var(--ink-3); font-size: 12px; }
.stat b { font-size: 20px; font-variant-numeric: tabular-nums; }
.chart { width: 100%; height: auto; display: block; }
.chart text { font-family: inherit; }
.axis { fill: var(--ink-3); font-size: 12px; font-variant-numeric: tabular-nums; }
.axis-title { fill: var(--ink-2); font-size: 12px; font-weight: 600; }
.grid { stroke: var(--line); stroke-width: 1; }
.axis-line { stroke: var(--ink-3); stroke-width: 1; }
.vol { fill: var(--ink-3); opacity: 0.35; }
.dot { fill: var(--ink-3); opacity: 0.55; }
.ma3 { fill: none; stroke: var(--accent); stroke-width: 2.6; stroke-linejoin: round; }
.ma12 { fill: none; stroke: var(--ma12); stroke-width: 1.6; stroke-dasharray: 5 4; }
.ma3-end { fill: var(--accent); stroke: var(--surface); stroke-width: 2; }
.peak { stroke: var(--up); stroke-width: 1; stroke-dasharray: 2 3; }
.peak-label { fill: var(--up); font-size: 11px; font-weight: 600; }
.legend { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12px; color: var(--ink-2); }
.legend i { display: inline-block; width: 18px; height: 0; border-top: 3px solid var(--accent); vertical-align: middle; margin-right: 6px; }
.legend i.l12 { border-top: 2px dashed var(--ma12); }
.legend i.lpk { border-top: 1px dashed var(--up); }
.legend i.ldot { width: 7px; height: 7px; border: 0; border-radius: 50%; background: var(--ink-3); opacity: .6; }
.legend i.lvol { width: 8px; height: 10px; border: 0; background: var(--ink-3); opacity: .35; }
.qbg.q-up { fill: var(--up-bg); } .qbg.q-late { fill: var(--late-bg); } .qbg.q-down { fill: var(--down-bg); } .qbg.q-bottom { fill: var(--bottom-bg); }
.qname { font-size: 13px; font-weight: 700; }
.t-up { fill: var(--up); } .t-late { fill: var(--late); } .t-down { fill: var(--down); } .t-bottom { fill: var(--bottom); }
.qdot { stroke: var(--surface); stroke-width: 1.5; opacity: 0.88; }
.qdot.q-up { fill: var(--up); } .qdot.q-late { fill: var(--late); } .qdot.q-down { fill: var(--down); } .qdot.q-bottom { fill: var(--bottom); }
.qlabel { fill: var(--ink); font-size: 11.5px; font-weight: 600; paint-order: stroke; stroke: var(--surface); stroke-width: 3px; }
.qpt { outline: none; cursor: default; }
.qpt:focus-visible .qdot { stroke: var(--ink); stroke-width: 2.5; }
.qtip { opacity: 0; pointer-events: none; transition: opacity .12s; }
.qpt:hover .qtip, .qpt:focus .qtip { opacity: 1; }
.qtip-box { fill: #1c1f26; }
.qtip-name { fill: #fff; font-size: 13px; font-weight: 800; }
.qtip-sub { fill: #d8dbe3; font-size: 11px; font-weight: 500; }
.qsum { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
.qsum div { border-radius: 10px; padding: 10px 12px; font-size: 13px; display: grid; gap: 2px; }
.qsum b { font-size: 15px; }
.qsum .q-up { background: var(--up-bg); color: var(--up); } .qsum .q-late { background: var(--late-bg); color: var(--late); }
.qsum .q-down { background: var(--down-bg); color: var(--down); } .qsum .q-bottom { background: var(--bottom-bg); color: var(--bottom); }
.qsum small { color: var(--ink-2); }
.chip { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
.chip-up { background: var(--up-bg); color: var(--up); } .chip-down { background: var(--down-bg); color: var(--down); }
.chip-flat, .chip-na { background: var(--flat-bg); color: var(--flat); }
.chip-q-up { background: var(--up-bg); color: var(--up); } .chip-q-late { background: var(--late-bg); color: var(--late); }
.chip-q-down { background: var(--down-bg); color: var(--down); } .chip-q-bottom { background: var(--bottom-bg); color: var(--bottom); }
.sorter { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 13px; color: var(--ink-3); }
.sorter button { font: inherit; font-size: 13px; padding: 5px 11px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--ink-2); cursor: pointer; }
.sorter button[aria-pressed="true"] { background: var(--ink); color: var(--surface); border-color: var(--ink); }
.sorter button:focus-visible, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.head, summary { display: grid; grid-template-columns: minmax(0, 2.2fr) 1fr 1fr 1.4fr 1.1fr 1.5fr; gap: 10px; align-items: center; }
.head { font-size: 12px; color: var(--ink-3); padding: 0 12px; }
.list { display: grid; gap: 6px; }
.row { border: 1px solid var(--line); border-radius: 10px; background: var(--surface); }
.row[open] { border-color: var(--accent); }
summary { list-style: none; cursor: pointer; padding: 11px 12px; }
summary::-webkit-details-marker { display: none; }
.c-name { display: grid; min-width: 0; }
.c-name b { font-size: 14.5px; overflow-wrap: anywhere; }
.c-name small, .c-price small { color: var(--ink-3); font-size: 11.5px; }
.c-price { display: grid; font-variant-numeric: tabular-nums; }
.c-price b { font-size: 15px; }
.c-rs { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.rs-num { font-weight: 700; font-variant-numeric: tabular-nums; font-size: 14px; }
.spark { width: 64px; height: 22px; }
.spark path { fill: none; stroke: var(--accent); stroke-width: 1.6; }
.spark circle { fill: var(--accent); }
.spark-base { stroke: var(--ink-3); stroke-dasharray: 2 2; stroke-width: 1; opacity: .7; }
.dd { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; }
.dd-track { height: 8px; border-radius: 99px; background: var(--flat-bg); overflow: hidden; }
.dd-fill { height: 100%; background: var(--down); border-radius: 99px; }
.dd-fill.at-peak { background: var(--up); }
.dd-num { font-size: 12.5px; font-weight: 700; font-variant-numeric: tabular-nums; min-width: 46px; text-align: right; }
.detail { padding: 4px 14px 16px; display: grid; gap: 10px; border-top: 1px solid var(--line); }
.facts { margin: 0; padding-left: 18px; color: var(--ink-2); font-size: 13.5px; display: grid; gap: 4px; }
.facts b { color: var(--ink); margin-right: 4px; }
.muted { color: var(--ink-3); font-weight: 400; }
.nh-badge { display: inline-block; margin-left: 6px; padding: 0 6px; border-radius: 4px; font-size: 11px; font-style: normal; font-weight: 800; line-height: 1.6; color: #fff; background: var(--up); vertical-align: 1px; white-space: nowrap; }
.nh-mark { fill: var(--up); stroke: var(--surface); stroke-width: 1; }
.nh-num { color: var(--up); }
.nh-tri { color: var(--up); font-size: 11px; margin-right: 4px; }
.thin { margin: 0; font-size: 12.5px; color: var(--ink-3); }
.howto { display: grid; gap: 10px; font-size: 14px; color: var(--ink-2); }
.howto dt { font-weight: 700; color: var(--ink); }
.howto dd { margin: 2px 0 0; max-width: 65ch; }
footer { font-size: 12px; color: var(--ink-3); text-align: center; }
footer a { color: var(--accent); }
@media (max-width: 700px) {
  header h1 { font-size: 25px; }
  section { padding: 16px; }
  .head { display: none; }
  summary { grid-template-columns: 1fr auto; grid-template-areas: "name price" "ma quad" "dd dd" "rs rs"; row-gap: 8px; }
  .c-name { grid-area: name; } .c-price { grid-area: price; text-align: right; }
  .c-ma { grid-area: ma; } .c-quad { grid-area: quad; text-align: right; }
  .c-dd { grid-area: dd; } .c-rs { grid-area: rs; }
  .c-dd::before { content: '고점 대비'; font-size: 11.5px; color: var(--ink-3); display: block; margin-bottom: 3px; }
  .c-rs::before { content: '상대강도(검단=100)'; font-size: 11.5px; color: var(--ink-3); margin-right: 4px; }
  /* SVG 글자 크기는 viewBox 단위라 좁은 화면에서 작아진다 — 휴대폰에서는 키워서 읽히게 한다. */
  .axis, .axis-title { font-size: 19px; }
  .peak-label { font-size: 17px; }
  .qname { font-size: 20px; }
  .qlabel { font-size: 17px; }
  .qtip-name { font-size: 17px; }
  .qtip-sub { font-size: 14px; }
  .qlabel.minor { display: none; }
}
</style>
</head>
<body>
<div class="wrap">
<header>
  <div class="eyebrow">GEOMDAN APARTMENT CYCLE</div>
  <h1>검단 아파트 사이클</h1>
  <div class="meta">${ymKorean(refYm)}까지 계약 기준 · 분석 기간 ${ymKorean(startYm)}~${ymKorean(refYm)} · 단지 ${complexes.length}곳 · ${generated} 갱신</div>
  ${coveredMonths < months.length ? `<div class="meta">아직 실거래 기록을 쌓는 중입니다(${coveredMonths}/${months.length}개월 확보). 기록이 쌓일수록 12개월선과 고점이 정확해집니다.</div>` : ''}
</header>

<section>
  <h2>검단신도시 전체 흐름</h2>
  <div class="stats">
    <div class="stat"><small>3개월 중위 평당가</small><b>${region.current ? `${won(region.current)}만원` : '-'}</b></div>
    <div class="stat"><small>이동평균선</small><b>${maChip(region.ma)}</b><small>${region.ma ? maNote(region.ma) : ''}</small></div>
    <div class="stat"><small>고점 대비</small><b>${regionDD == null ? '-' : regionDD > -1 ? '고점권' : pct(regionDD)}</b><small>${region.peak ? `${ymKorean(months[region.peak.idx])} 고점 ${won(region.peak.value)}만원` : ''}</small></div>
    <div class="stat"><small>최근 3개월 신고가</small><b class="nh-num">${region.recentNH}건</b><small>${region.recentTrades ? `같은 기간 거래 ${region.recentTrades}건의 ${((region.recentNH / region.recentTrades) * 100).toFixed(1)}%` : ''}</small></div>
    <div class="stat"><small>4분면</small><b>${quadChip(region.quad)}</b><small>${region.quad ? `거래 ${pct(region.quad.x, 0)} · 평당가 ${pct(region.quad.y)}` : ''}</small></div>
  </div>
  ${trendChart(months, region)}
  <div class="legend"><span><i></i>3개월 이동 중위</span><span><i class="l12"></i>12개월 이동 중위</span><span><i class="ldot"></i>달별 중위</span><span><i class="lpk"></i>3개월선 최고점</span><span><i class="lvol"></i>월 거래 건수</span><span><b class="nh-tri">▲</b>신고가(단지 상세 차트)</span></div>
</section>

<section>
  <h2>거래량·가격 4분면</h2>
  <p class="lead">최근 3개월(${ymLabel(months[months.length - 3])}~${ymLabel(refYm)})을 그 전 3개월과 비교했습니다. 오른쪽일수록 거래가 늘었고 위쪽일수록 평당가가 올랐습니다. 원이 클수록 최근 거래가 많은 단지입니다. 거래가 늘며 값이 오르면 회복·상승, 거래는 줄었는데 값만 오르면 과열·막바지로 봅니다.</p>
  ${quadPoints.length ? quadrantChart(quadPoints) : '<p class="lead">비교할 거래가 아직 모자랍니다.</p>'}
  <div class="qsum">
    ${['up', 'late', 'down', 'bottom'].map((k) => `<div class="q-${k}"><b>${QUADRANTS[k].label} ${quadCounts[k]}곳</b><small>${QUADRANTS[k].desc}</small></div>`).join('')}
  </div>
</section>

<section>
  <h2>단지별 사이클</h2>
  <p class="lead">단지를 누르면 평당가 이동평균선 차트와 지표별 설명이 펼쳐집니다. 상대강도는 단지의 3개월 중위 평당가를 검단 전체(100)와 비교한 값이고, 괄호는 6개월 전보다 얼마나 변했는지입니다.</p>
  <div class="sorter" role="group" aria-label="정렬">정렬
    <button type="button" data-sort="price" aria-pressed="true">평당가</button>
    <button type="button" data-sort="dd" aria-pressed="false">고점 근접</button>
    <button type="button" data-sort="rs" aria-pressed="false">상대강도</button>
    <button type="button" data-sort="vol" aria-pressed="false">최근 거래</button>
    <button type="button" data-sort="nh" aria-pressed="false">신고가</button>
  </div>
  <div class="head"><span>단지</span><span>평당가(3개월)</span><span>이동평균선</span><span>고점 대비</span><span>4분면</span><span>상대강도(검단=100)</span></div>
  <div class="list" id="list">
${rows}
  </div>
  ${thinList}
</section>

<section>
  <h2>이렇게 계산했어요</h2>
  <dl class="howto">
    <div><dt>평당가</dt><dd>국토교통부 실거래가(해제 계약 제외)를 전용면적 구간별 전용률로 공급면적을 추정해 평당가로 바꿨습니다. 카드뉴스 실거래 순위와 같은 계산입니다.</dd></div>
    <div><dt>이동평균선</dt><dd>최근 3개월·12개월 안의 거래를 모두 모아 중위값을 냈습니다. 거래가 드문 단지가 많아 평균 대신 중위값을 씁니다. 3개월선이 12개월선보다 1.5% 넘게 위면 상승 추세, 아래면 하락 추세로 봅니다.</dd></div>
    <div><dt>고점 대비</dt><dd>3개월선이 분석 기간 안에서 가장 높았던 값과 지금 값을 비교했습니다. 한두 건의 높은 거래에 흔들리지 않도록 단일 거래가 아닌 3개월선 기준입니다.</dd></div>
    <div><dt>4분면</dt><dd>최근 3개월과 그 전 3개월의 거래 건수 변화(가로)와 3개월선 변화(세로)로 국면을 나눴습니다. 그 전 3개월 거래가 2건 미만이면 표시하지 않습니다.</dd></div>
    <div><dt>상대강도</dt><dd>단지 3개월선 ÷ 검단 전체 3개월선 × 100입니다. 6개월 전보다 2 이상 오르면 강세, 2 이상 내리면 약세입니다.</dd></div>
    <div><dt>신고가</dt><dd>같은 단지·같은 평형(전용면적 ㎡ 반올림)에서 계약일이 앞선 거래들의 최고가를 넘긴 거래입니다. 쌓아 둔 기록(최근 3년) 안에서의 최고가 기준이고, 그 평형의 첫 거래는 신고가로 세지 않습니다. 목록에는 최근 3개월 건수를, 단지 차트에는 분석 기간 전체를 ▲로 표시합니다.</dd></div>
    <div><dt>주의할 점</dt><dd>${ymKorean(refYm)} 계약은 신고 기한(30일)이 남아 일부가 아직 빠져 있을 수 있습니다. 같은 단지라도 층·향·평형에 따라 값이 다르므로 거래가 적은 단지일수록 지표가 크게 흔들립니다. 기록 전체 8건 미만이거나 최근 3개월에 거래가 모자란 단지는 지표를 내지 않았습니다.</dd></div>
  </dl>
</section>

<footer>자료: 국토교통부 아파트 매매 실거래가 · <a href="briefing-infographic.html">재부키 부동산 분석 카드뉴스</a> · <a href="index.html">오늘의 부동산 뉴스</a></footer>
</div>
<script>
(function () {
  var list = document.getElementById('list');
  var buttons = document.querySelectorAll('.sorter button');
  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-sort');
      var rows = Array.prototype.slice.call(list.children);
      rows.sort(function (a, b) { return Number(b.dataset[key]) - Number(a.dataset[key]); });
      rows.forEach(function (r) { list.appendChild(r); });
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
    });
  });
})();
</script>
</body>
</html>
`;
}

async function main() {
  const refIdx = (() => {
    const now = kstNow();
    return now.getFullYear() * 12 + now.getMonth() - 1; // 지난달까지(이번 달은 신고 기한 전)
  })();
  const refYm = indexYm(refIdx);
  const cache = loadCache();
  await updateCache(cache, refIdx);
  if (SERVICE_KEY) saveCache(cache, refIdx);

  const result = analyze(cache, refIdx);
  if (!result.coveredMonths) {
    console.error('실거래 기록이 하나도 없어 사이클 페이지를 만들지 않습니다.');
    process.exitCode = 1;
    return;
  }
  fs.writeFileSync(OUT_PATH, renderPage(result, refYm));
  console.log(`사이클 페이지 생성: ${OUT_PATH} (단지 ${result.complexes.length}곳, 기록 ${result.coveredMonths}/${result.months.length}개월)`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}

module.exports = { analyze, renderPage, indexYm, ymIndex, kstNow, trendChart, quadrantChart, maNote, QUADRANTS, CACHE_PATH };
