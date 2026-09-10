// 구글 뉴스 RSS 링크(news.google.com/rss/articles/...)는 실제 언론사 기사로
// 자바스크립트 SPA 방식으로만 리다이렉트된다 — 일반 HTTP fetch로는 항상
// 구글 자체 페이지(모든 기사가 동일한 구글 아이콘)만 돌아오는 것을 실제
// 테스트로 확인했다. 이 스크립트는 진짜 브라우저(Playwright)로 그 SPA
// 리다이렉트를 실행시켜 최종 기사 URL과 대표 이미지(og:image, 없으면
// twitter:image)를 가져온다. 매 정기 실행마다 쓰는 게 아니라, 카드뉴스에
// 쓸 소수의 기사(하루 최대 4~5건)에 대해서만 workflow_dispatch로 필요할
// 때만 호출한다 — CI 시간·복잡도를 감안해 평소 다이제스트 실행에는
// 관여하지 않는다.
const { chromium } = require('playwright');

const NAV_TIMEOUT_MS = 20000;
const REDIRECT_WAIT_MS = 8000;
const SETTLE_WAIT_MS = 1500;

// 언론사 CDN 상당수가 Referer 검사로 핫링크를 막는다. 카드뉴스 페이지는
// news.google.com도 언론사 도메인도 아닌 별도 GitHub Pages 도메인에서
// <img src="...">로 이 URL을 그대로 쓰므로, "제3자 사이트에서 이 이미지를
// 그대로 걸어도 실제로 뜨는지"를 Referer 없이 직접 확인해야 한다.
async function checkHotlinkable(imageUrl) {
  try {
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const contentType = res.headers.get('content-type') || '';
    return res.ok && contentType.startsWith('image/');
  } catch (_) {
    return false;
  }
}

async function resolveOne(browser, url) {
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    try {
      await page.waitForURL((u) => !u.hostname.includes('news.google.com'), {
        timeout: REDIRECT_WAIT_MS,
      });
    } catch (_) {
      // 리다이렉트가 안 끝났어도(예: 언론사 사이트가 느림) 일단 현재
      // 상태에서 이미지 추출을 시도한다 — 실패하면 null로 귀결된다.
    }
    await page.waitForTimeout(SETTLE_WAIT_MS);
    const image = await page.evaluate(() => {
      const meta =
        document.querySelector('meta[property="og:image"]') ||
        document.querySelector('meta[name="twitter:image"]');
      return meta ? meta.getAttribute('content') : null;
    });
    const hotlinkOk = image ? await checkHotlinkable(image) : null;
    return { url, finalUrl: page.url(), image, hotlinkOk };
  } catch (err) {
    return { url, error: err.message };
  } finally {
    await page.close();
  }
}

(async () => {
  const input = process.env.RESOLVE_IMAGE_URLS || '';
  const urls = input
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  if (urls.length === 0) {
    console.log('RESOLVE_IMAGE_URLS가 비어 있어 건너뜁니다.');
    return;
  }
  const browser = await chromium.launch();
  try {
    for (const url of urls) {
      const result = await resolveOne(browser, url);
      console.log('RESOLVED ' + JSON.stringify(result));
    }
  } finally {
    await browser.close();
  }
})();
