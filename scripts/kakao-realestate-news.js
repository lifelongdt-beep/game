#!/usr/bin/env node
'use strict';

// 매일 아침 부동산 관련 뉴스를 모아 카카오톡 '나에게 보내기'로 전송한다.
// 필요한 환경 변수는 docs/kakao-realestate-news-setup.md 참고.

const fs = require('fs');

const ARTICLE_COUNT = Number(process.env.ARTICLE_COUNT || 5);
const NEWS_QUERY = process.env.NEWS_QUERY || '부동산 when:1d';
const DIGEST_PAGE_URL = process.env.DIGEST_PAGE_URL || 'https://lifelongdt-beep.github.io/game/';

const REST_API_KEY = requireEnv('KAKAO_REST_API_KEY');
const REFRESH_TOKEN = requireEnv('KAKAO_REFRESH_TOKEN');
const CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET || '';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`필수 환경 변수 ${name} 가 설정되지 않았습니다.`);
    process.exit(1);
  }
  return value;
}

async function refreshAccessToken() {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: REST_API_KEY,
    refresh_token: REFRESH_TOKEN,
  });
  if (CLIENT_SECRET) body.set('client_secret', CLIENT_SECRET);

  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`카카오 토큰 갱신 실패: ${res.status} ${JSON.stringify(data)}`);
  }
  return data; // { access_token, expires_in, refresh_token?, refresh_token_expires_in?, ... }
}

function decodeEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

async function fetchNews(limit) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(NEWS_QUERY)}&hl=ko&gl=KR&ceid=KR:ko`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`뉴스 조회 실패: ${res.status}`);
  }
  const xml = await res.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);

  const articles = [];
  const seenTitles = new Set();
  for (const item of items) {
    const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
    if (!titleMatch || !linkMatch) continue;

    const title = decodeEntities(titleMatch[1].trim());
    const link = decodeEntities(linkMatch[1].trim());
    if (seenTitles.has(title)) continue;
    seenTitles.add(title);

    articles.push({ title, link });
    if (articles.length >= limit) break;
  }
  return articles;
}

async function sendKakaoTemplate(accessToken, templateObject) {
  const res = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
    body: new URLSearchParams({ template_object: JSON.stringify(templateObject) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`카카오톡 전송 실패: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function sendKakaoText(accessToken, text, link) {
  return sendKakaoTemplate(accessToken, {
    object_type: 'text',
    text,
    link: { web_url: link, mobile_web_url: link },
    button_title: '기사 보기',
  });
}

function truncate(str, max) {
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

// 카카오 '나에게 보내기'는 text 타입(제목 + 링크 1개)만 안정적으로 클릭이 된다.
// list 타입은 이미지가 있어도 눌리지 않는 평면 카드로만 뜨는 걸 실제 테스트로 확인해서
// 기사 제목을 전부 한 메시지 본문에 나열하고, 링크는 전체 기사가 있는 다이제스트
// 페이지 하나로 보내는 방식으로 대신한다. (페이지 안 링크는 각각 정상 클릭됨)
async function sendArticlesDigest(accessToken, articles) {
  const header = '🏠 오늘의 부동산 뉴스';
  const maxTotalLen = 180; // 카카오 text 타입 안전 길이
  const lines = [header];
  let used = header.length;
  for (const article of articles) {
    const line = truncate(`• ${article.title}`, 42);
    if (used + line.length + 1 > maxTotalLen) break;
    lines.push(line);
    used += line.length + 1;
  }

  await sendKakaoText(accessToken, lines.join('\n'), DIGEST_PAGE_URL);
  console.log(`기사 ${lines.length - 1}건을 메시지 한 통으로 전송했습니다 (전체 목록은 링크로 연결).`);
}

function writeOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  fs.appendFileSync(outputPath, `${name}<<KAKAO_EOF\n${value}\nKAKAO_EOF\n`);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 재부키 오픈채팅방 방장봇 공지에 걸어둘 고정 링크용 페이지.
// 카카오는 오픈채팅방에 대신 글을 올려주는 API를 제공하지 않으므로,
// 링크 하나는 고정해두고 그 안의 내용만 매일 아침 갱신하는 방식으로 우회한다.
function renderDigestPage(articles, generatedAt) {
  const itemsHtml = articles.length
    ? articles
        .map(
          (a) => `      <li class="article"><a href="${escapeHtml(a.link)}" target="_blank" rel="noopener">${escapeHtml(a.title)}</a></li>`
        )
        .join('\n')
    : '      <li class="empty">오늘은 새로 조회된 부동산 뉴스가 없어요.</li>';

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>오늘의 부동산 뉴스</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; padding: 24px 16px 40px; font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; background: #f7f7f8; color: #1a1a1a; }
  main { max-width: 560px; margin: 0 auto; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .updated { color: #666; font-size: 13px; margin: 0 0 20px; }
  ul { list-style: none; margin: 0; padding: 0; }
  .article { background: #fff; border-radius: 10px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,.06); }
  .article a { display: block; padding: 14px 16px; color: #111; text-decoration: none; font-size: 15px; line-height: 1.4; }
  .empty { color: #666; padding: 14px 0; }
  @media (prefers-color-scheme: dark) {
    body { background: #17181a; color: #eee; }
    .article { background: #232427; box-shadow: none; }
    .article a { color: #eee; }
    .updated { color: #999; }
  }
</style>
</head>
<body>
<main>
  <h1>🏠 오늘의 부동산 뉴스</h1>
  <p class="updated">${escapeHtml(generatedAt)} 기준 자동 업데이트</p>
  <ul>
${itemsHtml}
  </ul>
</main>
</body>
</html>
`;
}

function publishDigestPage(articles) {
  const generatedAt = new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'long',
    timeStyle: 'short',
  });
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync('docs/index.html', renderDigestPage(articles, generatedAt));
  console.log('docs/index.html 갱신 완료 (GitHub Pages로 공개되면 재부키 방 공지 링크로 사용 가능)');
}

async function main() {
  const tokenData = await refreshAccessToken();
  const accessToken = tokenData.access_token;

  if (tokenData.refresh_token && tokenData.refresh_token !== REFRESH_TOKEN) {
    console.log('카카오 refresh_token이 새로 발급되었습니다.');
    writeOutput('new_refresh_token', tokenData.refresh_token);
  }

  const articles = await fetchNews(ARTICLE_COUNT);
  publishDigestPage(articles);

  if (articles.length === 0) {
    await sendKakaoText(accessToken, '🏠 오늘은 새로 조회된 부동산 뉴스가 없어요.', DIGEST_PAGE_URL);
    console.log('전송할 기사가 없어 안내 메시지만 보냈습니다.');
    return;
  }

  await sendArticlesDigest(accessToken, articles);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
