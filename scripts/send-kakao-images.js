#!/usr/bin/env node
'use strict';

// scripts/capture-briefing-images.js가 docs/kakao-captures/에 만들어 둔
// 카드뉴스 캡처 이미지(보통 표지~실거래 랭킹 TOP10을 이어붙인 긴 이미지
// 한 장)를 카카오톡 '나에게 보내기'로 전송한다.
//
// 카카오 기본 템플릿(default template)에서 이미지가 있는 건 feed 템플릿뿐이다
// (3장까지 되는 커스텀 템플릿은 카카오 개발자 콘솔에 미리 template_id를
// 등록해둬야 하는 별도 방식이라 이 자동화처럼 매번 내용이 바뀌는 이미지에는
// 안 맞는다). manifest.json에 이미지가 여러 개 담기면 그 개수만큼 feed
// 메시지를 순서대로 보내도록 루프를 돌지만, 지금은 캡처 스크립트가 이미지를
// 한 장만 만들어서 실제로는 메시지도 한 통만 나간다(여러 장이 아니라 사진
// 하나만 보내달라는 요청에 따라 캡처 쪽을 바꿨다).
//
// 이미지는 반드시 공개적으로 접근 가능한 URL이어야 한다 — 카카오 서버가 전송
// 시점에 그 주소로 이미지를 직접 가져오며, 로컬 파일을 올리는 API는 없다.
// 그래서 워크플로가 캡처 파일을 GitHub Pages에 먼저 배포하고 그 배포가 끝난
// 뒤에야 이 스크립트를 실행해야 한다.
//
// access_token은 이 스크립트가 새로 발급받지 않고, 같은 워크플로 실행 안에서
// kakao-realestate-news.js가 이미 발급받은 값을 그대로 넘겨받는다(둘 다 각자
// refresh_token으로 토큰을 새로 받으면, 그 사이 카카오가 refresh_token을
// 회전시켰을 때 두 번째 호출이 이미 무효화된 옛 토큰을 쓰게 될 위험이 있어
// 이를 피하려는 의도).

const fs = require('fs');

const ACCESS_TOKEN = requireEnv('KAKAO_ACCESS_TOKEN');
const LINK_URL = process.env.LINK_URL || 'https://lifelongdt-beep.github.io/game/briefing-infographic.html';
const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL || 'https://lifelongdt-beep.github.io/game/kakao-captures';
const MANIFEST_PATH = process.env.CAPTURE_MANIFEST || 'docs/kakao-captures/manifest.json';
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS || 15000);
const SEND_INTERVAL_MS = Number(process.env.SEND_INTERVAL_MS || 400);

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`필수 환경 변수 ${name} 가 설정되지 않았습니다.`);
    process.exit(1);
  }
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, timeoutMs, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// 카카오 기본 템플릿은 전부(feed 포함) link가 필수라 사진에서 링크를 완전히
// 뗄 수는 없다 — 대신 이 사진 메시지 하나에 링크가 이미 포함돼 있으므로,
// 링크만 따로 문자 메시지로 또 보내지 않는다(카카오톡 발송 절차에서
// notify_message는 비워두고 skip_kakao_send만 켜서 이 스크립트가 유일한
// 메시지가 되게 한다). description·buttons는 빼서 카드 느낌을 최대한 줄이고,
// title은 이미지가 여러 장이어도 항상 같은 문구를 쓴다.
async function sendFeedImage(imageUrl, title) {
  const templateObject = {
    object_type: 'feed',
    content: {
      title,
      image_url: imageUrl,
      link: { web_url: LINK_URL, mobile_web_url: LINK_URL },
    },
  };
  const res = await fetchWithTimeout('https://kapi.kakao.com/v2/api/talk/memo/default/send', FETCH_TIMEOUT_MS, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
    body: new URLSearchParams({ template_object: JSON.stringify(templateObject) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`카카오톡 이미지 전송 실패(${imageUrl}): ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

const SHARED_TITLE = '재부키 부동산 분석';

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  if (!Array.isArray(manifest) || manifest.length === 0) {
    console.log('캡처된 이미지가 없어 전송을 건너뜁니다.');
    return;
  }

  for (const filename of manifest) {
    const imageUrl = `${IMAGE_BASE_URL}/${filename}`;
    await sendFeedImage(imageUrl, SHARED_TITLE);
    console.log(`전송 완료: ${filename}`);
    await sleep(SEND_INTERVAL_MS);
  }
  console.log(`카드뉴스 이미지 ${manifest.length}장을 카카오톡으로 전송했습니다.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
