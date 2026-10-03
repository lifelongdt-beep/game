#!/usr/bin/env node
// 카드뉴스 루틴용 GitHub Actions·PR 보조 도구. `gh api`만 쓰므로 MCP 도구가 없는 새 세션에서도 동작하고, 출력이 짧다.
//   node scripts/card-news/actions.js dispatch <ref> [key=value ...] [--links <파일>]
//       morning-realestate-kakao.yml을 실행하고 끝날 때까지 기다린 뒤 run id·결과를 출력한다(Bash timeout을 600000으로).
//       resolve_image_urls는 --links 파일(한 줄에 링크 하나)로 넣는다. 위험한 입력 조합은 실행 전에 거부한다.
//   node scripts/card-news/actions.js resolved <run_id>    이미지 추출 결과(RESOLVED 주석)를 한 줄씩 출력
//   node scripts/card-news/actions.js steps <run_id>       건너뛰지 않은 스텝의 결과 출력(발송 성공 확인용)
//   node scripts/card-news/actions.js pr-merge --head <브랜치> --title <제목> --body-file <파일> [--commit-file <파일>]
//       PR(draft) 생성 → ready → squash 머지 후 머지 커밋 sha 출력
//   node scripts/card-news/actions.js pages <sha>          그 커밋의 Pages 배포(pages build and deployment) 완료까지 대기
const fs = require('fs');
const { spawnSync } = require('child_process');

const REPO = 'lifelongdt-beep/game';
const WORKFLOW = 'morning-realestate-kakao.yml';
const PAGES_WORKFLOW_ID = '347049654';

function die(msg) {
  console.error('오류: ' + msg);
  process.exit(1);
}

function gh(args, input) {
  const r = spawnSync('gh', ['api', ...args], { encoding: 'utf8', input });
  if (r.status !== 0) die(`gh api ${args.join(' ')} 실패: ${(r.stderr || r.stdout || '').trim().slice(0, 300)}`);
  return r.stdout.trim();
}
const ghJson = (args, input) => {
  const out = gh(args, input);
  return out ? JSON.parse(out) : null;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readLinks(file) {
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n');
}

function checkInputs(ref, inputs) {
  if (inputs.resolve_image_urls && inputs.skip_kakao_send !== 'true') {
    die('resolve_image_urls에는 skip_kakao_send=true를 반드시 함께 넣어야 합니다(안 그러면 옛 방식 텍스트 다이제스트가 그대로 발송됩니다).');
  }
  if (inputs.resolve_image_urls && inputs.resolve_image_urls.split('\n').length > 10) {
    die('resolve_image_urls는 한 번에 10건 이하로 넣으세요(결과 주석이 스텝당 10개로 제한됩니다).');
  }
  if (inputs.send_briefing_images === 'true') {
    if (inputs.skip_kakao_send !== 'true') die('send_briefing_images=true에는 skip_kakao_send=true도 함께 넣어야 합니다.');
    if (inputs.notify_message) die('notify_message는 비워야 합니다(채우면 링크만 담은 별도 문자 메시지가 먼저 나갑니다).');
    if (inputs.resolve_image_urls) die('발송 단계에는 resolve_image_urls를 넣지 마세요.');
    if (ref !== 'main') die('send_briefing_images는 Pages가 서빙하는 main에서 실행해야 합니다(ref=main).');
  }
}

async function dispatch(ref, kvs, linksFile) {
  const inputs = {};
  for (const kv of kvs) {
    const i = kv.indexOf('=');
    if (i < 1) die(`key=value 형식이 아닙니다: ${kv}`);
    inputs[kv.slice(0, i)] = kv.slice(i + 1);
  }
  if (linksFile) inputs.resolve_image_urls = readLinks(linksFile);
  checkInputs(ref, inputs);

  const listUrl = `repos/${REPO}/actions/workflows/${WORKFLOW}/runs?branch=${encodeURIComponent(ref)}&event=workflow_dispatch&per_page=10`;
  const before = new Set(ghJson([listUrl]).workflow_runs.map((r) => r.id));
  gh(['-X', 'POST', `repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, '--input', '-'], JSON.stringify({ ref, inputs }));

  let run = null;
  for (let i = 0; i < 20 && !run; i++) {
    await sleep(3000);
    run = ghJson([listUrl]).workflow_runs.find((r) => !before.has(r.id));
  }
  if (!run) die('디스패치한 실행을 찾지 못했습니다.');
  console.log(`dispatched run=${run.id} ref=${ref} inputs=${Object.keys(inputs).join(',')}`);

  for (let i = 0; i < 100; i++) {
    const r = ghJson([`repos/${REPO}/actions/runs/${run.id}`]);
    if (r.status === 'completed') {
      console.log(`run=${r.id} conclusion=${r.conclusion} head=${r.head_sha.slice(0, 7)}`);
      process.exit(r.conclusion === 'success' ? 0 : 1);
    }
    await sleep(6000);
  }
  die(`실행이 10분 안에 끝나지 않았습니다(run=${run.id}).`);
}

function firstJob(runId) {
  const jobs = ghJson([`repos/${REPO}/actions/runs/${runId}/jobs`]).jobs;
  if (!jobs.length) die('잡을 찾지 못했습니다.');
  return jobs[0];
}

function resolved(runId) {
  const job = firstJob(runId);
  const ann = ghJson([`repos/${REPO}/check-runs/${job.id}/annotations?per_page=100`]) || [];
  const rows = ann
    .filter((a) => a.title === 'RESOLVED')
    .map((a) => JSON.parse(a.message))
    .sort((a, b) => a.n - b.n);
  if (!rows.length) die('RESOLVED 주석이 없습니다(이 실행에 resolve_image_urls가 없었거나 스크립트가 오래된 버전입니다).');
  rows.forEach((r) => {
    let host = '';
    try {
      host = new URL(r.finalUrl).hostname;
    } catch (_) {}
    console.log(JSON.stringify({ n: r.n, hotlinkOk: r.hotlinkOk, host, image: r.image, error: r.error }));
  });
}

function steps(runId) {
  firstJob(runId)
    .steps.filter((s) => s.conclusion !== 'skipped')
    .forEach((s) => console.log(`${s.conclusion}\t${s.name}`));
}

async function prMerge(opts) {
  for (const k of ['head', 'title', 'body-file']) if (!opts[k]) die(`--${k}가 필요합니다.`);
  const body = fs.readFileSync(opts['body-file'], 'utf8');
  const pr = ghJson(['-X', 'POST', `repos/${REPO}/pulls`, '--input', '-'], JSON.stringify({ title: opts.title, head: opts.head, base: 'main', body, draft: true }));
  console.log(`PR #${pr.number} 생성(draft): ${pr.html_url}`);
  gh(['-X', 'POST', `repos/${REPO}/pulls/${pr.number}/ccr/ready_for_review`]);
  let head = pr.head.sha;
  for (let i = 0; i < 15; i++) {
    const p = ghJson([`repos/${REPO}/pulls/${pr.number}`]);
    head = p.head.sha;
    if (p.mergeable === false) die(`머지 충돌입니다(PR #${pr.number}). main을 가져와 충돌을 정리한 뒤 다시 푸시하세요.`);
    if (p.mergeable === true) break;
    await sleep(2000);
  }
  const message = opts['commit-file'] ? fs.readFileSync(opts['commit-file'], 'utf8') : '';
  const merged = ghJson(
    ['-X', 'PUT', `repos/${REPO}/pulls/${pr.number}/merge`, '--input', '-'],
    JSON.stringify({ merge_method: 'squash', sha: head, commit_title: `${opts.title} (#${pr.number})`, commit_message: message })
  );
  console.log(`merged=${merged.merged} sha=${merged.sha}`);
  if (!merged.merged) process.exit(1);
}

async function pages(sha) {
  for (let i = 0; i < 60; i++) {
    const runs = ghJson([`repos/${REPO}/actions/workflows/${PAGES_WORKFLOW_ID}/runs?branch=main&per_page=5`]).workflow_runs;
    const run = runs.find((r) => r.head_sha.startsWith(sha) || sha.startsWith(r.head_sha.slice(0, 7)));
    if (run && run.status === 'completed') {
      console.log(`pages run=${run.id} conclusion=${run.conclusion}`);
      process.exit(run.conclusion === 'success' ? 0 : 1);
    }
    await sleep(6000);
  }
  die('Pages 배포가 6분 안에 끝나지 않았습니다.');
}

function parseOpts(args) {
  const opts = {};
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) opts[args[i].slice(2)] = args[++i];
    else rest.push(args[i]);
  }
  return { opts, rest };
}

(async () => {
  const [cmd, ...args] = process.argv.slice(2);
  const { opts, rest } = parseOpts(args);
  if (cmd === 'dispatch') {
    if (!rest[0]) die('사용법: dispatch <ref> [key=value ...] [--links <파일>]');
    return dispatch(rest[0], rest.slice(1), opts.links);
  }
  if (cmd === 'resolved' && rest[0]) return resolved(rest[0]);
  if (cmd === 'steps' && rest[0]) return steps(rest[0]);
  if (cmd === 'pr-merge') return prMerge(opts);
  if (cmd === 'pages' && rest[0]) return pages(rest[0]);
  die('사용법: dispatch | resolved <run_id> | steps <run_id> | pr-merge --head --title --body-file | pages <sha> (파일 상단 주석 참고)');
})();
