# 아침 부동산 뉴스 카카오톡 알림 설정 가이드

매일 아침 부동산 관련 뉴스를 자동으로 모아 카카오톡 "나에게 보내기"로 전송하는 GitHub Actions 자동화입니다.

- 워크플로: [`.github/workflows/morning-realestate-kakao.yml`](../.github/workflows/morning-realestate-kakao.yml)
- 스크립트: [`scripts/kakao-realestate-news.js`](../scripts/kakao-realestate-news.js)
- 이 저장소의 학습 게임 콘텐츠와는 무관한 개인용 자동화이며, 독립적으로 동작합니다.

카카오톡으로 메시지를 보내려면 카카오 계정 로그인 동의가 필요해서, **아래 1단계는 반드시 본인이 브라우저에서 직접 진행**해야 합니다. 이 부분만 완료하면 나머지는 자동으로 매일 실행됩니다.

## 1. 카카오 개발자 앱 생성 및 토큰 발급 (최초 1회, 직접 진행)

1. [카카오 개발자 사이트](https://developers.kakao.com)에 접속해 카카오 계정으로 로그인합니다.
2. **내 애플리케이션 → 애플리케이션 추가하기**로 앱을 만듭니다. (앱 이름 예: `부동산 뉴스 알림`)
3. 생성된 앱 → **제품 설정 → 카카오 로그인**에서 활성화를 `ON`으로 변경합니다.
4. 같은 화면의 **Redirect URI**에 아무 값이나 하나 등록합니다. 실제로 그 주소에 서버가 떠 있을 필요는 없고, 다음 단계에서 인가 코드를 복사하는 용도로만 씁니다.
   - 예: `https://localhost:3000`
5. **카카오 로그인 → 동의항목**에서 `카카오톡 메시지 전송` 항목을 확인 상태(필수 동의 또는 선택 동의)로 설정합니다.
   - "나에게 보내기" 용도는 별도 비즈니스 심사 없이 앱 관리자 본인 계정으로 바로 사용할 수 있습니다. (다른 사람에게 보내거나 정식 서비스로 배포하려면 카카오의 별도 심사가 필요하지만, 이 자동화는 본인에게만 보내므로 해당 없습니다.)
6. **앱 설정 → 앱 키**에서 `REST API 키` 값을 복사해 둡니다. → 이후 `KAKAO_REST_API_KEY`로 사용합니다.
7. **카카오 로그인 → 보안**에서 `Client Secret`을 발급/활성화했다면 그 값도 복사해 둡니다. → `KAKAO_CLIENT_SECRET` (활성화하지 않았다면 이 값은 필요 없습니다.)
8. 아래 주소의 `{REST_API_KEY}`와 `{REDIRECT_URI}`를 본인 값으로 바꾼 뒤, 브라우저 주소창에 붙여넣어 이동합니다.

   ```
   https://kauth.kakao.com/oauth/authorize?client_id={REST_API_KEY}&redirect_uri={REDIRECT_URI}&response_type=code&scope=talk_message
   ```

9. 카카오 로그인 후 동의 화면에서 동의하면 등록해둔 Redirect URI로 이동합니다. "사이트에 연결할 수 없음" 같은 오류 페이지가 떠도 정상입니다 — 주소창에 남아있는 `?code=` 뒤의 문자열을 복사합니다.
10. 터미널(맥/리눅스 터미널, 윈도우는 WSL이나 Git Bash)에서 아래 명령을 본인 값으로 바꿔 실행합니다. (`client_secret`을 발급하지 않았다면 해당 줄은 빼고 실행)

    ```bash
    curl -s -X POST https://kauth.kakao.com/oauth/token \
      -H "Content-Type: application/x-www-form-urlencoded" \
      -d "grant_type=authorization_code" \
      -d "client_id={REST_API_KEY}" \
      -d "redirect_uri={REDIRECT_URI}" \
      -d "code={복사한 인가 코드}" \
      -d "client_secret={CLIENT_SECRET}"
    ```

11. 응답 JSON에서 `refresh_token` 값을 복사해 둡니다. (`access_token`은 몇 시간 뒤 만료되므로 따로 저장할 필요가 없습니다 — 자동화가 매번 `refresh_token`으로 새 `access_token`을 발급받습니다.)

## 2. GitHub 저장소에 Secrets 등록

저장소 **Settings → Secrets and variables → Actions → New repository secret**에서 아래를 등록합니다.

| Secret 이름 | 값 | 필수 여부 |
| --- | --- | --- |
| `KAKAO_REST_API_KEY` | 1-6단계에서 복사한 REST API 키 | 필수 |
| `KAKAO_REFRESH_TOKEN` | 1-11단계에서 복사한 refresh_token | 필수 |
| `KAKAO_CLIENT_SECRET` | 1-7단계 Client Secret (발급했다면) | 발급한 경우만 |
| `GH_PAT` | 아래 "3. 토큰 자동 갱신" 참고 | 선택 |

## 3. 토큰 자동 갱신 (선택, 권장)

카카오 `refresh_token`은 정책상 유효기간(기본 약 60일)이 얼마 남지 않으면 갱신 시 새 값으로 재발급됩니다. 워크플로는 새 `refresh_token`을 받으면 자동으로 저장소 Secret을 덮어쓰려고 시도하는데, 여기에는 저장소 Secret을 쓸 수 있는 권한이 필요합니다 (기본 `GITHUB_TOKEN`에는 이 권한이 없습니다).

- **자동 갱신을 원하면**: GitHub에서 `repo` 권한(또는 이 저장소에 대한 Secrets 쓰기 권한을 포함한 fine-grained 권한)을 가진 [Personal Access Token](https://github.com/settings/tokens)을 발급해 `GH_PAT`라는 이름의 Secret으로 등록하세요.
- **등록하지 않으면**: 자동 갱신은 건너뛰고 Actions 로그에 경고만 남습니다. 이 경우 약 2개월에 한 번씩 1단계의 8~11번을 반복해 `KAKAO_REFRESH_TOKEN`을 수동으로 갱신해야 합니다. (갱신을 잊고 있다가 만료되면 알림이 조용히 멈추니, Actions 탭을 가끔 확인해주세요.)

## 4. 동작 확인

Secrets 등록 후 저장소 **Actions → Morning Real Estate News to KakaoTalk → Run workflow** 로 수동 실행해 카카오톡으로 메시지가 오는지 확인하세요. 예약된 스케줄을 기다리지 않고 언제든 이 방법으로 즉시 테스트할 수 있습니다.

## 5. 커스터마이징

`.github/workflows/morning-realestate-kakao.yml` 파일에서 다음을 바로 수정할 수 있습니다.

- **발송 시각**: `cron: '30 22 * * *'` — GitHub Actions 스케줄은 UTC 기준이라 한국시간(KST, UTC+9)에서 9시간을 뺀 값을 씁니다. 예: 오전 8시(KST)에 받고 싶으면 `0 23 * * *`. (참고: 예약 실행은 GitHub 서버 상황에 따라 몇 분 정도 늦어질 수 있습니다.)
- **기사 개수**: `ARTICLE_COUNT` 값 (기본 5)
- **검색어**: `NEWS_QUERY` 값 (기본 `부동산 when:1d`, 구글 뉴스 검색 문법을 그대로 사용합니다. 예: `서울 아파트 when:1d`, `청약 OR 분양 when:1d`)

## 참고

- 뉴스는 별도 API 키가 필요 없는 Google 뉴스 RSS 검색을 사용합니다.
- 이 저장소는 60일 이상 아무 커밋도 없으면 GitHub가 예약 워크플로를 자동으로 비활성화합니다. 저장소를 계속 사용 중이라면 문제되지 않지만, 알림이 갑자기 멈추면 Actions 탭에서 워크플로가 비활성화되지 않았는지 먼저 확인하세요.
