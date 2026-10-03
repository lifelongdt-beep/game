#!/usr/bin/env node
// docs/index.html의 뉴스 후보를 번호+제목으로만 보여준다(파일을 통째로 읽지 않기 위한 도구).
//   node scripts/card-news/candidates.js [--index docs/index.html]   → 후보 목록(번호, 제목 - 매체)
//   node scripts/card-news/candidates.js 3 7 21 [--index ...]        → 고른 번호의 구글 뉴스 링크(줄바꿈 구분, resolve_image_urls 입력용)
//   node scripts/card-news/candidates.js --prev [--card <html>]      → 직전 카드의 표지·이슈·오버레이 제목(반복 선정 방지용)
const fs = require('fs');
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

const decode = (s) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const stripTags = (s) => decode(s.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

function parseSection(html, heading) {
  const s = html.indexOf(heading);
  if (s < 0) return [];
  const ulS = html.indexOf('<ul>', s);
  const ulE = html.indexOf('</ul>', ulS);
  const block = html.slice(ulS, ulE);
  return [...block.matchAll(/<li class="article"><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/li>/g)].map((m) => ({
    link: decode(m[1]),
    nearby: m[2].includes('tag-nearby'),
    title: stripTags(m[2]),
  }));
}

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

function main() {
  if (argv.includes('--prev')) return prev();
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
      console.error(`${n}. ${all[n - 1].title}`);
      console.log(all[n - 1].link);
    });
    return;
  }
  let n = 0;
  const print = (label, list) => {
    console.log(`[${label}]`);
    list.forEach((a) => console.log(`${++n}. ${a.nearby ? '(인접) ' : ''}${a.title}`));
  };
  print('부동산 뉴스', general);
  print('검단신도시 뉴스', geomdan);
}

main();
