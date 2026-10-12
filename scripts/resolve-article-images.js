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
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// 이미지가 정말 뜨는지(Referer 없이) 확인하고 바이트 수도 돌려준다. 실패하면 null.
async function probeImage(imageUrl) {
  try {
    const res = await fetch(imageUrl, { headers: { 'User-Agent': UA } });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.startsWith('image/')) return null;
    const bytes = (await res.arrayBuffer()).byteLength;
    return { bytes };
  } catch (_) {
    return null;
  }
}

async function checkHotlinkable(imageUrl) {
  return (await probeImage(imageUrl)) !== null;
}

// 카드뉴스 루틴에서 매번 손으로 하던 보정을 자동화한다. 후보 주소를 차례로 시험해
// 처음으로 실제 이미지가 뜨는 것을 고른다(원래 주소가 이미 정상이면 그대로 둔다).
//  - 프로토콜 없는 주소(//cdn...) → https
//  - http 주소 → https
//  - 작은 썸네일(/news/thumbnail/..._v150.jpg, .cache/512/) → 원본 크기 주소
// 사이트 로고·아이콘으로 보이는 주소(/logo/, snslogo, favicon)는 note에 표시만 한다.
function candidateImages(image) {
  let base = image.startsWith('//') ? `https:${image}` : image;
  const list = [];
  const httpsVariant = (u) => u.replace(/^http:\/\//, 'https://');
  const originals = [];
  if (/\/news\/thumbnail\/.*_v\d+\.\w+$/.test(base)) {
    originals.push(base.replace('/news/thumbnail/', '/news/photo/').replace(/_v\d+(\.\w+)$/, '$1'));
  }
  if (/\/\.cache\/\d+\//.test(base)) originals.push(base.replace(/\/\.cache\/\d+\//, '/'));
  // 원본 후보를 먼저(작은 썸네일이면 원본이 더 좋다), 그다음 https 변형, 마지막으로 원래 주소.
  for (const u of [...originals, base]) {
    list.push(httpsVariant(u));
    if (u !== httpsVariant(u)) list.push(u);
  }
  return [...new Set(list)];
}

async function improveImage(image) {
  const tried = candidateImages(image);
  for (const cand of tried) {
    const probe = await probeImage(cand);
    if (probe) {
      const notes = [];
      if (cand !== image) notes.push('주소 보정');
      if (/\/logo\/|snslogo|favicon|\/common\//i.test(cand)) notes.push('로고로 보임(교체 권장)');
      if (/_v\d+\.\w+$|\/\.cache\/\d+\//.test(cand)) notes.push('작은 썸네일(교체 권장)');
      if (probe.bytes < 15000) notes.push(`용량 작음(${probe.bytes}B)`);
      return { image: cand, hotlinkOk: true, bytes: probe.bytes, note: notes.join(', ') || undefined };
    }
  }
  return { image, hotlinkOk: false };
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
    const { image, text } = await page.evaluate(() => {
      const meta =
        document.querySelector('meta[property="og:image"]') ||
        document.querySelector('meta[name="twitter:image"]');
      const content = (sel) => {
        const m = document.querySelector(sel);
        return m ? (m.getAttribute('content') || '').trim() : '';
      };
      // 카드뉴스 본문 문장을 정확하게 쓰기 위한 기사 내용: 대표 설명(og:description)과 본문 앞부분.
      const desc = content('meta[property="og:description"]') || content('meta[name="description"]');
      const root =
        document.querySelector('[itemprop="articleBody"], #articleBody, #article-view-content-div, .article_body, .article-body, #newsct_article, #dic_area, #cont_newstext, .detail-body, .view_cont, .news_view, #news_body_area, .article_txt, #articleBodyContents, .article-view-content, .news_text, #news_text, .art_cont, .article-content') || null;
      // 본문 영역을 못 찾으면(메뉴·관련기사 목록이 섞이므로) 대표 설명만 쓴다.
      if (!root) return { image: meta ? meta.getAttribute('content') : null, text: { desc, body: desc } };
      const paras = [...root.querySelectorAll('p')]
        .map((p) => p.innerText.replace(/\s+/g, ' ').trim())
        .filter((t) => t.length >= 30 && !/기자|저작권|무단 ?전재|구독|Copyright/i.test(t.slice(-40)) || t.length >= 80);
      let body = paras.join(' ');
      if (body.length < 200) body = (root.innerText || '').replace(/\s+/g, ' ').trim();
      if (body.length < desc.length) body = desc;
      return { image: meta ? meta.getAttribute('content') : null, text: { desc, body: body.slice(0, 1400) } };
    });
    if (!image) return { url, finalUrl: page.url(), image: null, hotlinkOk: null, ...text };
    const improved = await improveImage(image);
    return { url, finalUrl: page.url(), ...improved, ...(improved.image !== image ? { rawImage: image } : {}), ...text };
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
    let n = 0;
    for (const url of urls) {
      n += 1;
      // 로그를 짧게 읽도록 긴 입력 링크는 빼고 입력 순서(n, 1부터)로 구분한다.
      const { url: _input, desc, body, ...result } = await resolveOne(browser, url);
      const line = JSON.stringify({ n, ...result });
      // 기사 본문 발췌는 주석 길이 제한(약 2천 자) 때문에 RESOLVED와 따로 남긴다.
      if (body || desc) {
        const t = JSON.stringify({ n, text: (body && body.length >= (desc || '').length ? body : desc || '').slice(0, 1300) });
        console.log('ARTICLE_TEXT ' + t);
        console.log('::notice title=ARTICLE_TEXT::' + t.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A'));
      }
      console.log('RESOLVED ' + line);
      // 로그를 못 읽는 세션도 gh api(check-runs/<job_id>/annotations)로 결과만 읽게 주석(notice)으로도 남긴다.
      console.log('::notice title=RESOLVED::' + line.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A'));
    }
  } finally {
    await browser.close();
  }
})();
