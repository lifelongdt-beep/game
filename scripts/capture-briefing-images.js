#!/usr/bin/env node
'use strict';

// docs/briefing-infographic.html("재부키 부동산 분석" 카드뉴스)이 GitHub
// Pages에 이미 최신 내용으로 배포된 뒤, 그 실제 페이지를 Playwright로 열어
// 카카오톡 이미지 메시지로 보낼 캡처 파일들을 만든다. 반드시 배포가 끝난
// 뒤에 실행해야 한다 — 배포 전에 실행하면 옛날 내용이 찍힌다.
//
// 카카오 '나에게 보내기'의 기본 템플릿은 로컬 이미지를 올리는 API가 없고
// image_url(공개 URL)만 받으므로, 이 스크립트는 캡처만 담당한다. 실제 전송은
// 이 파일들을 docs/에 커밋해 GitHub Pages로 공개한 뒤 scripts/send-kakao-images.js가
// 그 URL을 카카오로 보낸다(워크플로가 순서를 보장한다).
//
// 사용자가 "가로세로 대략 1:1 비율로 잘라 여러 장으로 보내달라"고 요청해서,
// 기존 카드뉴스 슬라이드 경계를 그대로 쓰지 않고 내용 높이 기준으로 다시
// 나눈다: 표지·오버레이는 슬라이드 하나가 이미 정사각형에 가까워 그대로 쓰고,
// 좌우분할(이슈 4건)은 2개씩 묶어 2장으로 나눈다(외톨이 1개가 남으면 가로로
// 어색하게 긴 이미지가 되므로, 홀수로 남는 마지막 조각은 바로 앞 그룹에 합친다).
// 실거래 랭킹은 전체가 아니라 TOP 10까지만 잘라낸다 — 원 페이지의
// "MARKET RANKING TOP N" 라벨은 전체 개수를 말하므로 그대로 크롭에 포함하면
// 개수가 안 맞아 오해를 주니, 캡처 직전 이 브라우저 세션에서만 "TOP 10"
// 라벨을 임시로 끼워 넣고 찍는다(실제 배포 파일은 그대로 둔다).

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BRIEFING_URL =
  process.env.BRIEFING_URL || 'https://lifelongdt-beep.github.io/game/briefing-infographic.html';
const OUT_DIR = process.env.CAPTURE_OUT_DIR || 'docs/kakao-captures';
const VIEWPORT_WIDTH = 650; // .card-flow의 max-width와 동일(데스크톱 기준 렌더링)
const JPEG_QUALITY = Number(process.env.CAPTURE_JPEG_QUALITY || 82);

function clearDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
}

async function main() {
  clearDir(OUT_DIR);

  const browser = await chromium.launch();
  // 뷰포트를 넉넉히 크게 잡아 캡처 대상(표지~랭킹 TOP10)이 전부 스크롤 없이
  // 한 화면 안에 들어오게 한다 — 그래야 getBoundingClientRect() 좌표가
  // 스크린샷 clip 좌표와 어긋나지 않는다.
  const page = await browser.newPage({ viewport: { width: VIEWPORT_WIDTH, height: 3000 } });
  await page.goto(BRIEFING_URL, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(500);

  const geometry = await page.evaluate(() => {
    const rectOf = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, bottom: r.bottom };
    };

    const cover = document.querySelector('.slide-cover');
    const split = document.querySelector('.slide-split');
    const splitFooter = document.querySelector('.slide-split .slide-footer-label');
    const rows = Array.from(document.querySelectorAll('.split-row'));
    const overlay = document.querySelector('.slide-overlay');
    const rankingSlide = document.querySelector('.slide-ranking');
    const rankItems = Array.from(document.querySelectorAll('.rank-item')).slice(0, 10);
    const rankBoldTitle = rankingSlide ? rankingSlide.querySelector('.bold-title') : null;

    let rankingTop10 = null;
    if (rankingSlide && rankBoldTitle && rankItems.length) {
      // 원래 "MARKET RANKING TOP N"(N=전체 고유 단지 수)과 그 아래
      // "전체를 다 보여드립니다" 문구는 10개만 자른 이 이미지와는 안
      // 맞으므로, 캡처 직전에만 정확한 문구로 바꿔치기한다(실제 배포
      // 파일에는 영향 없음 — 이 브라우저 세션은 캡처 후 버려진다).
      const originalTotalText = rankingSlide.querySelector('.bold-sub')?.textContent || '';
      const totalMatch = originalTotalText.match(/\d+/);
      const totalCount = totalMatch ? totalMatch[0] : null;

      const badge = document.createElement('div');
      badge.textContent = `MARKET RANKING TOP ${rankItems.length}`;
      badge.className = 'bold-sub';
      rankBoldTitle.parentElement.insertBefore(badge, rankBoldTitle);

      const subText = rankingSlide.querySelector('.full-list-sub');
      if (subText) {
        subText.textContent = totalCount
          ? `같은 단지 내 최고가만 남기고 정리했습니다. 전체 ${totalCount}곳 중 평당가 상위 10곳입니다.`
          : '같은 단지 내 최고가만 남기고 정리했습니다. 평당가 상위 10곳입니다.';
      }

      const badgeRect = badge.getBoundingClientRect();
      const lastItemRect = rankItems[rankItems.length - 1].getBoundingClientRect();
      const slideRect = rankingSlide.getBoundingClientRect();
      rankingTop10 = {
        x: slideRect.x,
        y: badgeRect.top,
        width: slideRect.width,
        height: lastItemRect.bottom - badgeRect.top + 24,
      };
    }

    return {
      cover: cover ? rectOf(cover) : null,
      split: split ? rectOf(split) : null,
      splitFooter: splitFooter ? rectOf(splitFooter) : null,
      rows: rows.map(rectOf),
      overlay: overlay ? rectOf(overlay) : null,
      rankingTop10,
    };
  });

  const shots = [];
  let n = 0;
  async function shoot(clip, label) {
    const filename = `card-${String(++n).padStart(2, '0')}-${label}.jpg`;
    await page.screenshot({ path: path.join(OUT_DIR, filename), clip, type: 'jpeg', quality: JPEG_QUALITY });
    shots.push(filename);
  }

  if (geometry.cover) {
    await shoot(
      { x: geometry.cover.x, y: geometry.cover.y, width: geometry.cover.width, height: geometry.cover.height },
      'cover'
    );
  }

  if (geometry.split && geometry.rows.length) {
    const { rows, split, splitFooter } = geometry;
    // 2개씩 묶어서 나눈다(외톨이 1개가 남으면 어색하게 가로로 긴 이미지가
    // 되므로, 홀수로 남는 마지막 조각은 바로 앞 그룹에 합쳐 3개짜리로 만든다).
    // 행끼리는 세로 간격 없이 딱 붙어 있어서(다음 행의 top이 이전 행의
    // bottom과 정확히 같음) 그룹 경계에 여유 패딩을 더하면 바로 다음 행을
    // 침범해버린다 — 그래서 마지막 그룹이 아니면 정확히 행 경계에서 자른다.
    let i = 0;
    let groupTop = split.top;
    while (i < rows.length) {
      let end = Math.min(i + 2, rows.length);
      if (rows.length - end === 1) end = rows.length;
      const j = end - 1;
      const isLast = j === rows.length - 1;
      const clipBottom = isLast && splitFooter ? splitFooter.bottom + 16 : rows[j].bottom;
      await shoot(
        { x: split.x, y: groupTop, width: split.width, height: clipBottom - groupTop },
        `issues-${i + 1}to${j + 1}`
      );
      i = end;
      groupTop = rows[i] ? rows[i].top : groupTop;
    }
  }

  if (geometry.overlay) {
    await shoot(
      { x: geometry.overlay.x, y: geometry.overlay.y, width: geometry.overlay.width, height: geometry.overlay.height },
      'overlay'
    );
  }

  if (geometry.rankingTop10) {
    await shoot(geometry.rankingTop10, 'ranking-top10');
  }

  await browser.close();

  for (const f of shots) {
    const size = fs.statSync(path.join(OUT_DIR, f)).size;
    console.log(`CAPTURED ${f} (${(size / 1024).toFixed(1)}KB)`);
  }
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(shots, null, 2));
  console.log(`총 ${shots.length}장 캡처 완료 → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
