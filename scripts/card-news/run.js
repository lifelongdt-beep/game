#!/usr/bin/env node
// 카드뉴스 루틴 묶음 도구: 호출 횟수·출력 길이를 줄이려고 고정 절차를 한 번에 돌린다(토큰 절약).
//   node scripts/card-news/run.js prepare <작업폴더>
//       데이터 수집(dispatch) → 인덱스 내려받기(<폴더>/index.html) → 후보(--compact)·직전 카드·인사이트 자료 목록 출력
//   node scripts/card-news/run.js images <작업폴더> <번호 6개: 표지 1 → 이슈 4 → 오버레이 1> [--limit 600]
//       links.txt 생성 → 이미지 추출 dispatch → 항목별 image 상태 한 줄 + 본문 발췌(기본 600자)
//   node scripts/card-news/run.js finalize <작업폴더> --title <PR 제목>
//       <폴더>/content.json으로 조립·검증 → docs/briefing-infographic.html(+docs/insight-facts.md 변경분) 커밋 → 푸시 → PR 병합
//       → Pages 배포 대기 → 작업 브랜치를 새 main으로 재동기화. 결과는 몇 줄로만 출력한다.
//   node scripts/card-news/run.js facts
//       docs/insight-facts.md의 주제와 확인일(30일 지난 것은 STALE 표시)만 출력
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const BRANCH = 'claude/morning-realestate-news-kakao-q55sf2';
const SESSION_LINE = 'Claude-Session: https://claude.ai/code/session_019NuGQV5FeP5r8Lhr7jgjne';
const HERE = __dirname;
const ROOT = path.resolve(HERE, '..', '..');
const script = (name) => path.join(HERE, name);

function die(msg) {
  console.error('오류: ' + msg);
  process.exit(1);
}
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  return { code: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}
function must(cmd, args, what) {
  const r = run(cmd, args);
  if (r.code !== 0) die(`${what} 실패: ${(r.err || r.out).split('\n').slice(-6).join('\n')}`);
  return r;
}
const node = (name, args) => run('node', [script(name), ...args]);

function workdir(arg) {
  if (!arg) die('작업 폴더가 필요합니다(저장소 밖 scratchpad나 /tmp).');
  const d = path.resolve(arg);
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function facts() {
  const f = path.join(ROOT, 'docs/insight-facts.md');
  if (!fs.existsSync(f)) return console.log('(docs/insight-facts.md 없음)');
  const today = new Date(Date.now() + 9 * 3600 * 1000);
  console.log('[인사이트 자료 — 주제·확인일. 주제가 맞고 STALE이 아니면 docs/insight-facts.md의 해당 항목을 읽어 쓰고 WebSearch는 생략]');
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/^## (.+?) \(확인 (\d{4}-\d{2}-\d{2})\)/gm)) {
    const age = Math.round((today - Date.parse(m[2])) / 86400000);
    console.log(`- ${m[1]} · 확인 ${m[2]}${age > 30 ? ' · STALE(다시 검색)' : ''}`);
  }
}

function prepare(dir) {
  const d = node('actions.js', ['dispatch', BRANCH, 'skip_kakao_send=true']);
  if (d.code !== 0) die('데이터 수집 실패: ' + (d.err || d.out).slice(-400));
  must('git', ['fetch', '-q', 'origin', BRANCH], '브랜치 가져오기');
  const idx = must('git', ['show', `origin/${BRANCH}:docs/index.html`], 'index.html 받기');
  fs.writeFileSync(path.join(dir, 'index.html'), idx.out);
  console.log(`TZ=Asia/Seoul ${run('date', ['+%Y-%m-%d %H:%M'], { env: { ...process.env, TZ: 'Asia/Seoul' } }).out}`);
  console.log(node('candidates.js', ['--index', path.join(dir, 'index.html'), '--compact']).out);
  console.log('\n' + node('candidates.js', ['--prev']).out);
  console.log('');
  facts();
}

function images(dir, args) {
  const li = args.indexOf('--limit');
  const limit = li >= 0 ? Number(args[li + 1]) : 600;
  const nums = args.filter((a, i) => /^\d+$/.test(a) && (li < 0 || i !== li + 1));
  if (nums.length !== 6) die('번호 6개(표지 1 → 이슈 4 → 오버레이 1)가 필요합니다.');
  const c = node('candidates.js', ['--index', path.join(dir, 'index.html'), ...nums]);
  if (c.code !== 0) die(c.err);
  fs.writeFileSync(path.join(dir, 'links.txt'), c.out + '\n');
  console.log(c.err);
  const d = node('actions.js', ['dispatch', BRANCH, 'skip_kakao_send=true', '--links', path.join(dir, 'links.txt')]);
  const m = /run=(\d+)/.exec(d.out);
  if (d.code !== 0 || !m) die('이미지 추출 실패: ' + (d.err || d.out).slice(-300));
  const r = node('actions.js', ['resolved', m[1], '--text']);
  if (r.code !== 0) die(r.err);
  fs.writeFileSync(path.join(dir, 'resolved.txt'), r.out);
  const lines = r.out.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('{')) {
      const j = JSON.parse(lines[i]);
      const flags = [!j.hotlinkOk && 'HOTLINK_NG', !j.image && '이미지없음', j.note && `note:${j.note}`, j.error && `error:${j.error}`].filter(Boolean);
      console.log(`#${j.n} ${j.host || '-'} ${flags.length ? '⚠ ' + flags.join(',') : 'OK'}${j.image ? ' ' + j.image : ''}`);
    } else if (lines[i].startsWith('  TEXT ')) {
      console.log('  ' + lines[i].slice(7, 7 + limit));
    }
  }
}

function finalize(dir, args) {
  const ti = args.indexOf('--title');
  const title = ti >= 0 ? args[ti + 1] : '';
  if (!title) die('--title이 필요합니다.');
  const contentFile = path.join(dir, 'content.json');
  if (!fs.existsSync(contentFile)) die(`${contentFile}가 없습니다.`);
  const content = JSON.parse(fs.readFileSync(contentFile, 'utf8'));

  // 인사이트 자료(docs/insight-facts.md) 변경분은 체크아웃 전에 보존한다.
  const factsPath = path.join(ROOT, 'docs/insight-facts.md');
  const keepFacts = fs.existsSync(factsPath) ? fs.readFileSync(factsPath, 'utf8') : null;
  must('git', ['fetch', '-q', 'origin'], 'git fetch');
  must('git', ['checkout', '-q', '-f', '-B', BRANCH, 'origin/main'], '브랜치 맞추기');
  const mainFacts = fs.existsSync(factsPath) ? fs.readFileSync(factsPath, 'utf8') : null;
  if (keepFacts !== null && keepFacts !== mainFacts) fs.writeFileSync(factsPath, keepFacts);

  const build = node('build-card.js', ['--content', contentFile, '--index', path.join(dir, 'index.html'), '--links', path.join(dir, 'links.txt')]);
  if (build.code !== 0) die('조립 실패:\n' + (build.err || build.out).slice(-600));
  const warn = /"warnings":\s*(\[[^\]]*\])/.exec(build.out);
  if (warn && warn[1].replace(/\s/g, '') !== '[]') console.log('조립 경고: ' + warn[1].slice(0, 400));
  const val = node('validate-card.js', []);
  const lines = val.out.split('\n').filter((l) => /^\[\d+px\]/.test(l));
  lines.forEach((l) => console.log(l.slice(0, 160)));
  if (val.code !== 0 || lines.some((l) => !/ OK /.test(l))) die('레이아웃 검증 실패 — content.json을 고쳐 다시 실행하세요.\n' + (val.err || val.out).slice(-500));

  const headline = (content.cover.headline || []).join(' ');
  const msg = `${title}\n\n표지: ${headline}\n\n${SESSION_LINE}\n`;
  const body = `## 요약\n- ${title}\n- 표지: ${headline}\n- 카카오톡 발송 없이 웹 카드만 갱신\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nhttps://claude.ai/code/session_019NuGQV5FeP5r8Lhr7jgjne\n`;
  fs.writeFileSync(path.join(dir, 'commit-msg.txt'), msg);
  fs.writeFileSync(path.join(dir, 'pr-body.md'), body);

  const add = ['docs/briefing-infographic.html'];
  if (run('git', ['status', '--porcelain', 'docs/insight-facts.md']).out) add.push('docs/insight-facts.md');
  must('git', ['add', ...add], 'git add');
  must('git', ['commit', '-q', '-F', path.join(dir, 'commit-msg.txt')], 'git commit');
  must('git', ['fetch', '-q', 'origin', BRANCH], '브랜치 fetch');
  must('git', ['push', '-q', '--force-with-lease', 'origin', BRANCH], 'git push');
  const pr = node('actions.js', ['pr-merge', '--head', BRANCH, '--title', title, '--body-file', path.join(dir, 'pr-body.md'), '--commit-file', path.join(dir, 'commit-msg.txt')]);
  console.log(pr.out.split('\n').slice(-2).join('\n'));
  const sha = /sha=([0-9a-f]{40})/.exec(pr.out);
  if (pr.code !== 0 || !sha) die('PR 병합 실패: ' + (pr.err || pr.out).slice(-300));
  const pg = node('actions.js', ['pages', sha[1]]);
  console.log(pg.out.split('\n').slice(-1)[0] || pg.err);
  if (pg.code !== 0) die('Pages 배포 확인 실패');
  must('git', ['fetch', '-q', 'origin'], 'git fetch');
  must('git', ['checkout', '-q', '-B', BRANCH, 'origin/main'], '브랜치 재동기화');
  must('git', ['push', '-q', '--force-with-lease', 'origin', BRANCH], '재동기화 푸시');
  console.log('완료: 웹 카드 배포됨, 브랜치 재동기화됨');
}

(function main() {
  const [cmd, a, ...rest] = process.argv.slice(2);
  if (cmd === 'facts') return facts();
  if (cmd === 'prepare') return prepare(workdir(a));
  if (cmd === 'images') return images(workdir(a), rest);
  if (cmd === 'finalize') return finalize(workdir(a), rest);
  die('사용법: prepare <폴더> | images <폴더> <번호6개> | finalize <폴더> --title <제목> | facts (파일 상단 주석 참고)');
})();
