# 카드뉴스 루틴 프롬프트 (매번 새 세션)

오전 7시·오후 7시 카드뉴스 루틴이 쓰는 프롬프트입니다. 루틴이 한 세션에 계속 이어 붙으면 대화가 쌓여 매 실행의 비용이 점점 커지므로, **실행마다 새 세션**으로 돌리고 이 프롬프트만 넘깁니다. 절차·도구 사용법은 [`kakao-realestate-news-setup.md`](kakao-realestate-news-setup.md) 9~12번 문단과 `scripts/card-news/`에 있습니다.

루틴을 만들 때(claude.ai의 Routines 화면)는 저장소 `lifelongdt-beep/game`을 선택하고, 일정은 한국시간 매일 06:53·18:53(사진 한 통이 7시 전후에 도착하도록), 아래 구분선 사이 내용을 프롬프트로 붙여 넣습니다.

--- 프롬프트 시작 ---

[자동 실행 · 오전 7시/오후 7시 큐레이션 카드뉴스 — 매번 새 세션]
저장소 lifelongdt-beep/game에서 "재부키 부동산 분석" 카드뉴스(docs/briefing-infographic.html)를 오늘 날짜 기준으로 새로 갱신해 카카오톡으로 발송해줘. 절차·도구 사용법은 docs/kakao-realestate-news-setup.md의 9~12번 문단("skip_kakao_send로 자동 발송만 건너뛰기", "사람이 직접 고르는 큐레이션 카드뉴스", "카드뉴스를 이미지 파일로도 카카오톡에 전송하기", "조립·검증 스크립트")을 그대로 따라.

준비 (이 세션은 매번 새로 시작하므로 이전 대화 기억이 없다):
- 저장소가 세션에 없으면 add_repo(owner: lifelongdt-beep, repo: game, access: push)로 추가하고 안내대로 클론한 뒤 register_repo_root를 호출해. 저장소 루트에서 `git fetch origin`부터 해.
- 작업 브랜치는 claude/morning-realestate-news-kakao-q55sf2 하나만 쓴다(이 브랜치에 푸시하는 것을 허락한다). 매 실행마다 origin/main 기준으로 새로 맞춘다.
- GitHub 작업은 MCP 도구 대신 `node scripts/card-news/actions.js`(gh api 사용)로 한다. 오래 걸리는 명령은 Bash timeout을 600000으로 줘.
- 토큰을 아끼려고 docs/index.html·docs/briefing-infographic.html·워크플로 로그를 통째로 읽지 마. 후보는 candidates.js로, 이미지 추출 결과는 actions.js resolved로, 발송 결과는 actions.js steps로 확인해. 임시 파일(index.html 사본, links.txt, content.json, PR 본문)은 저장소 밖(scratchpad나 /tmp)에 둬. 서브에이전트는 쓰지 마.

순서:
1. TZ=Asia/Seoul 기준 오늘 날짜·시각을 확인해(자정을 막 넘긴 시점일 수도 있으니 반드시).
2. 최신 뉴스 후보·검단신도시 실거래가(최근 4개월, 기존 단지 제외, 평당가 높은 순 최대 800건)를 새로 받아: `node scripts/card-news/actions.js dispatch claude/morning-realestate-news-kakao-q55sf2 skip_kakao_send=true`. 끝나면 그 브랜치에 올라온 데이터를 임시 파일로 받아 둬: `git fetch origin claude/morning-realestate-news-kakao-q55sf2 && git show origin/claude/morning-realestate-news-kakao-q55sf2:docs/index.html > <임시>/index.html`. docs/index.html·docs/geomdan.html·docs/geomdan-transactions-cache.json은 커밋하지 않는다(origin/main 버전을 유지, 되돌리지 않기).
3. `node scripts/card-news/candidates.js --index <임시>/index.html`로 후보를 보고, `node scripts/card-news/candidates.js --prev`로 직전 카드에 쓴 이슈를 확인한 뒤, 사람처럼 직접 판단해서 고른다:
   - 표지(슬라이드1)에 쓸 오늘의 헤드라인 이슈 1건
   - 좌우분할(슬라이드2)에 쓸 핵심 이슈 4건 (처음엔 2건이었는데 "이슈가 2개뿐이니 4개로 늘려달라"는 요청으로 4건으로 늘었음 — 절대 2건으로 되돌리지 말 것)
   - 오버레이(슬라이드3)에 쓸 시장 경고·트렌드 1건
   광고성·얕은 재탕 기사는 빼고, 검단신도시 직접 언급 기사가 있으면 우선 반영해(부동산 시장 얘기가 아니어도 검단 관련이면 후보로 고려해). 검단 관련 이슈가 없는 날은 억지로 끼워 맞추지 말고 다른 좋은 후보로 채워. 직전 사이클(오늘 아침 또는 어제 저녁)에 이미 쓴 기사·같은 사건의 후속 기사는 반복해서 고르지 말고 새 후보로 채워. 검단구 구청장·구의원·구의장 등 특정 인물의 개인 비위·정치적 스캔들성 기사(수의계약 논란, 선거법 수사, 조례 찬성 논란 등)는 카드뉴스 소재로 쓰지 말 것.
4. 고른 6건의 번호(표지 1 → 좌우분할 4 → 오버레이 1 순서)로 `node scripts/card-news/candidates.js --index <임시>/index.html <번호들> > <임시>/links.txt`를 실행해 구글 뉴스 링크 파일을 만들고, `node scripts/card-news/actions.js dispatch claude/morning-realestate-news-kakao-q55sf2 skip_kakao_send=true --links <임시>/links.txt`로 각 기사의 실제 대표 이미지를 가져와(이 도구가 skip_kakao_send=true 누락을 막아 준다 — 빠지면 옛 방식 자동 텍스트 다이제스트가 그대로 발송된다). 끝나면 `node scripts/card-news/actions.js resolved <run_id>`로 image와 hotlinkOk를 확인해. hotlinkOk가 false이거나 image가 없으면 그 이슈는 다른 후보로 바꾸는 걸 우선 시도하고(카드뉴스는 사진이 있는 게 기본, 바꾼 후보만 다시 추출), 정 안 되면 content.json에서 그 항목의 img를 비워 사진 없이 텍스트로 구성해. hotlinkOk가 true여도 이미지 경로가 사이트 공용 로고/아이콘으로 보이거나(예: images/common/사이트명.png), 150px 안팎의 작은 썸네일(예: ..._v150.jpg)이면 다른 후보로 교체해. image가 http 주소면 https여야 하므로 같은 주소를 https로 바꿔 쓰되 확신이 없으면 교체해.
5. 고른 이슈는 원문 그대로 베끼지 말고 카드뉴스 톤(짧고 임팩트 있는 헤드라인 + 1~2문장 요약)으로 직접 써서 <임시>/content.json에 작성해(형식은 문서 12번 문단). 제목·기사에 없는 숫자나 사실을 지어내지 말고, 제목에서 확인되는 내용만 쓴다. 슬라이드 구조·CSS는 build-card.js가 맡으니 건드리지 마(사진은 원본 비율 그대로 폭 100%·높이 auto 구조이며 cover/contain·고정 높이 박스로 되돌리지 말 것. 휴대폰 폭에서 이슈 사진이 항상 글 위에 오는 CSS 순서도 되돌리지 말 것. 카드 페이지 <head>의 og:image(링크 미리보기 사진 = 표지 사진)는 build-card.js가 매번 맞춰 주니 지우지 말 것. 예전에 있던 "검단 핵심 호재" 고정 소개 슬라이드는 되살리지 말 것).
   - 오버레이(슬라이드3) 밑 "💡 재부키 인사이트"(insight)는 검단신도시와 실제로 관련 없는 기사를 다룰 때 특히 주의: 억지로 검단과 엮는 서술을 절대 쓰지 마(예: "7호선 청라국제도시 연장"은 검단신도시와 계획 단계로도 이어지지 않는 완전히 무관한 별개 노선인데 연관성을 지어내는 실수를 세 번 반복한 적 있음). 실제 연관이 없으면 그 기사 자체가 주는 보편적 시사점으로 채워(예: "지하철 7호선 공사 일시 중단 뉴스를 통해 지하철 공사는 여러 가지 이유로 연기될 수 있다는 점을 항상 인지하고 있어야 합니다" — 검단을 언급하지 않고 일반 교훈만). 검단신도시 자체와 실제로 관련된 기사를 다룰 때만 서부권 광역급행철도·GTX-D처럼 진짜 관련 사업을 근거로 인사이트를 써.
6. `git checkout -B claude/morning-realestate-news-kakao-q55sf2 origin/main`으로 작업 브랜치를 origin/main 기준으로 맞춘 뒤 `node scripts/card-news/build-card.js --content <임시>/content.json --index <임시>/index.html`을 실행해. 슬라이드 1~3, 슬라이드 4(실거래 랭킹: 상한 없이 고유 단지 전체 — index.html에 함께 실린 전체 거래 기준 "단지별 최고 거래"로 만들어 하단 목록이 건수 상한으로 잘려도 단지가 빠지지 않음, 각 줄 오른쪽에 평당가(위)·실거래가(아래), 1위 단지 이름 옆 왕관 아이콘(SVG, build-card.js가 자동으로 넣음 — 지우거나 이모지로 바꾸지 말 것), "MARKET RANKING TOP N"의 N은 그날 나온 고유 단지 수, 요약 문구는 데이터로 자동 생성), 하단 "전체 뉴스·실거래가 목록"이 오늘자 데이터로 한 번에 갱신된다. 랭킹을 TOP4·TOP20·TOP30 같은 고정 상한으로 되돌리거나 직접 다시 계산하지 말고, 전체 목록의 "🔗 인접지역" 딱지 문구("호재"를 뺀 상태)도 그대로 둬.
7. `node scripts/card-news/validate-card.js`로 데스크톱(~700px)·모바일(~390px)에서 가로 스크롤·텍스트 겹침·잘림·카드 이음매를 확인해(문제가 있으면 content.json을 고쳐 6단계부터 다시). 이미지는 샌드박스 네트워크 제약으로 로컬에서 안 뜨는 게 정상이고, 4단계의 hotlinkOk 확인으로 대신한다.
8. git은 항상 하던 대로: docs/briefing-infographic.html만 커밋(임시 파일·데이터 파일 제외) → `git push --force-with-lease origin claude/morning-realestate-news-kakao-q55sf2`(원격 브랜치에 워크플로 자동 커밋이 쌓여 있으므로 먼저 `git fetch origin` 해 둘 것) → `node scripts/card-news/actions.js pr-merge --head claude/morning-realestate-news-kakao-q55sf2 --title "<제목>" --body-file <임시>/pr-body.md --commit-file <임시>/commit-msg.txt`(PR 생성·draft 해제·squash 머지) → `node scripts/card-news/actions.js pages <머지 sha>`로 GitHub Pages 배포 완료까지 기다려. PR 본문·커밋 메시지는 한국어로 짧게 쓰고 마지막에 이 세션이 안내하는 서명 줄을 넣어. 머지 충돌이 나면(직전 워크플로가 main에 자동 커밋한 경우 등) 최신 main 위에 다시 적용(rebase)하고 docs/index.html 등 자동 생성 파일은 main 버전을 유지해. 머지 후에는 로컬·원격 작업 브랜치를 새 main으로 다시 동기화해(`git fetch origin && git checkout -B claude/morning-realestate-news-kakao-q55sf2 origin/main && git push --force-with-lease origin claude/morning-realestate-news-kakao-q55sf2`) — 그대로 두면 브랜치가 뒤처져 다음 실행 때 불필요한 충돌이 남는다.
9. 배포 확인 후 `node scripts/card-news/actions.js dispatch main skip_kakao_send=true send_briefing_images=true`를 실행하고 끝나면 `node scripts/card-news/actions.js steps <run_id>`로 "Send briefing card images to KakaoTalk"가 success인지 확인해. 이렇게 하면 방금 배포한 카드뉴스(표지부터 검단 실거래 평당가 TOP10까지 자르지 않고 이어붙인 세로로 긴 이미지 한 장)와 링크가 함께 담긴 카카오톡 메시지 한 통이 전송된다. notify_message는 절대 채우지 마(채우면 링크만 담은 별도 문자 메시지가 먼저 따로 나가버린다 — 2026-09-17에 "링크 따로 보내지 말고 사진도 하나만 보내달라"는 요청으로 바뀌었으니 예전처럼 notify_message+텍스트 링크 메시지+이미지 여러 장으로 되돌리지 말 것). resolve_image_urls도 이 단계에서는 넣지 마.

지켜야 할 것:
- 전부 한국어로만 작성해. 일본어 등 다른 언어는 절대 섞지 마(이전에 실수한 적 있어서 특히 조심할 것).
- resolve_image_urls를 워크플로에 넣을 때는 반드시 skip_kakao_send=true도 같이 넣어(actions.js가 막아 주지만 직접 실행할 때도 마찬가지).
- 애매하거나 크게 막히는 문제가 아니면 나(사용자)한테 확인받지 말고 알아서 끝까지 진행해.
- 끝나면 오늘 고른 헤드라인·핵심 이슈가 무엇인지, 검단 이슈 반영 여부, 이미지 추출 성공 여부, 카카오톡 발송(사진 1장+링크 한 통) 완료 여부만 짧게 한국어로 알려줘. 6단계에서 build-card.js가 평당 1,500만 이하 단지 경고(warnings)를 출력했다면 그 단지 이름만 한 줄 덧붙여(신도시가 아닌 기존 단지는 scripts/geomdan-excluded-apartments.txt에 추가해야 하지만 이 루틴에서는 건드리지 말고 알리기만 해). 문제없이 잘 끝났으면 길게 쓸 필요 없어.

--- 프롬프트 끝 ---
