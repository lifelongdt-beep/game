#!/usr/bin/env node
'use strict';

// docs/briefing-infographic.html("재부키 부동산 분석" 카드뉴스)이 GitHub
// Pages에 이미 최신 내용으로 배포된 뒤, 그 실제 페이지를 Playwright로 열어
// 표지부터 검단신도시 실거래 평당가 순위 TOP10까지를 이어붙인 세로로 긴
// 이미지 한 장으로 캡처한다. 반드시 배포가 끝난 뒤에 실행해야 한다 —
// 배포 전에 실행하면 옛날 내용이 찍힌다.
//
// 카카오 '나에게 보내기'의 기본 템플릿은 로컬 이미지를 올리는 API가 없고
// image_url(공개 URL)만 받으므로, 이 스크립트는 캡처만 담당한다. 실제 전송은
// 이 파일을 docs/에 커밋해 GitHub Pages로 공개한 뒤 scripts/send-kakao-images.js가
// 그 URL을 카카오로 보낸다(워크플로가 순서를 보장한다).
//
// 예전에는 "가로세로 대략 1:1 비율로 잘라 여러 장으로 보내달라"는 요청에
// 맞춰 5장으로 쪼갰지만, 사진이 비율을 맞추려 잘리거나 줄어드는 게 싫다는
// 이후 피드백에 따라 docs/briefing-infographic.html 자체가 사진 원본 비율만큼
// 세로로 늘어나도록 바뀌었다(고정 높이 박스 대신 사진이 스스로 카드 높이를
// 정함). 그래서 더 이상 특정 비율에 맞춰 여러 조각으로 나눌 이유가 없어졌고,
// "사진은 하나만 보내달라"는 요청에 맞춰 표지~실거래 랭킹 TOP10까지를 자르지
// 않고 이어서 한 장으로만 캡처한다 — 그만큼 세로로 길어질 수 있지만 의도된
// 동작이다. 실거래 랭킹은 페이지 전체가 아니라 TOP10까지만 포함한다 — 원
// 페이지의 "MARKET RANKING TOP N" 라벨은 전체 고유 단지 수를 말하므로 그대로
// 포함하면 개수가 안 맞아 오해를 주니, 캡처 직전 이 브라우저 세션에서만
// "TOP 10" 라벨과 안내 문구로 바꿔치기하고 찍는다(실제 배포 파일은 그대로 둔다).

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
  // 카드뉴스가 사진 비율에 따라 세로로 얼마든지 늘어날 수 있어(의도된
  // 설계) 뷰포트 높이를 넉넉히 크게 잡는다 — 그래야 캡처 대상 전체가
  // 스크롤 없이 한 화면 안에 들어와 getBoundingClientRect() 좌표가
  // 스크린샷 clip 좌표와 어긋나지 않는다.
  const page = await browser.newPage({ viewport: { width: VIEWPORT_WIDTH, height: 8000 } });
  await page.goto(BRIEFING_URL, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(500);

  const geometry = await page.evaluate(() => {
    const cover = document.querySelector('.slide-cover');
    const rankingSlide = document.querySelector('.slide-ranking');
    const rankItems = Array.from(document.querySelectorAll('.rank-item')).slice(0, 10);
    const rankBoldTitle = rankingSlide ? rankingSlide.querySelector('.bold-title') : null;

    let bottom = null;
    if (rankingSlide && rankBoldTitle && rankItems.length) {
      // 원래 "MARKET RANKING TOP N"(N=전체 고유 단지 수)과 그 아래
      // "전체를 다 보여드립니다" 문구는 TOP10까지만 담는 이 캡처와는 안
      // 맞으므로, 캡처 직전에만 정확한 문구로 바꿔치기한다(실제 배포
      // 파일에는 영향 없음 — 이 브라우저 세션은 캡처 후 버려진다).
      const boldSub = rankingSlide.querySelector('.bold-sub');
      const originalTotalText = boldSub?.textContent || '';
      const totalMatch = originalTotalText.match(/\d+/);
      const totalCount = totalMatch ? totalMatch[0] : null;

      // 이 캡처는 표지부터 이어지는 연속 스크린샷이라(랭킹 영역 시작
      // 지점부터 잘라내는 게 아니라) 기존 라벨 위에 새 라벨을 추가로
      // 끼워 넣으면 "TOP 26"과 "TOP 10"이 나란히 둘 다 보여버린다 —
      // 그래서 새 엘리먼트를 만들지 않고 기존 라벨의 문구 자체를 바꾼다.
      if (boldSub) {
        boldSub.textContent = `MARKET RANKING TOP ${rankItems.length}`;
      }

      const subText = rankingSlide.querySelector('.full-list-sub');
      if (subText) {
        subText.textContent = totalCount
          ? `같은 단지 내 최고가만 남기고 정리했습니다. 전체 ${totalCount}곳 중 평당가 상위 10곳입니다.`
          : '같은 단지 내 최고가만 남기고 정리했습니다. 평당가 상위 10곳입니다.';
      }

      const lastItemRect = rankItems[rankItems.length - 1].getBoundingClientRect();
      bottom = lastItemRect.bottom + 24;
    }

    const coverRect = cover ? cover.getBoundingClientRect() : null;
    return {
      cover: coverRect ? { x: coverRect.x, y: coverRect.y, width: coverRect.width } : null,
      bottom,
    };
  });

  if (!geometry.cover || geometry.bottom == null) {
    throw new Error('카드뉴스 표지 또는 실거래 랭킹 영역을 찾지 못했습니다.');
  }

  const clip = {
    x: geometry.cover.x,
    y: geometry.cover.y,
    width: geometry.cover.width,
    height: geometry.bottom - geometry.cover.y,
  };
  const filename = 'briefing-full.jpg';
  await page.screenshot({ path: path.join(OUT_DIR, filename), clip, type: 'jpeg', quality: JPEG_QUALITY });

  await browser.close();

  const size = fs.statSync(path.join(OUT_DIR, filename)).size;
  console.log(
    `CAPTURED ${filename} (${(size / 1024).toFixed(1)}KB, ${Math.round(clip.width)}x${Math.round(clip.height)})`
  );
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify([filename], null, 2));
  console.log(`캡처 완료 → ${OUT_DIR}/${filename}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
