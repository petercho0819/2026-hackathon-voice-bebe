@AGENTS.md

# 보이스 베베 (AI Hackathon 2026)

영유아 자녀를 둔 예비·신규 부모를 위한 모바일 웹 앱.
음성 녹음 → ETRI STT → 기록 관리 흐름을 제공한다.

## 기술 스택

- **Next.js 16** (App Router) — `node_modules/next/dist/docs/` 참고 필수
- **React 19**
- **TypeScript**
- **Ionic React** (`@ionic/react`) — IonIcon 등 아이콘 컴포넌트에만 사용. IonHeader/IonToolbar 등 레이아웃 컴포넌트는 사용하지 않음
- **Tailwind CSS v4**
- **ETRI Open API** — 음성 인식(STT)

## 프로젝트 구조

```
src/
├── app/
│   ├── layout.tsx          # 루트 레이아웃, IonicProvider 주입
│   ├── page.tsx            # 앱 셸: 상단 헤더("보이스 베베") + 탭 콘텐츠 + 하단 탭바
│   ├── globals.css         # Tailwind + Ionic CSS 임포트
│   └── api/
│       └── transcribe/
│           └── route.ts    # ETRI STT API 프록시 (POST)
├── components/
│   ├── IonicProvider.tsx   # setupIonicReact 클라이언트 초기화 (마운트 후 렌더)
│   └── tabs/
│       ├── RecordingTab.tsx   # 녹음 → 미리 듣기 → STT 전송
│       ├── StatusTab.tsx      # 현재 상태 (미구현)
│       ├── TimelineTab.tsx    # 시간별 기록 (미구현)
│       └── SettingsTab.tsx    # 아이 등록 + 앱 설정
```

## 레이아웃 규칙

- 최상위 컨테이너: `display:flex; flex-direction:column; height:100dvh`
- 콘텐츠 영역: `flex:1; min-height:0; overflow:hidden`
- 하단 탭바: `flex-shrink:0; padding-bottom:env(safe-area-inset-bottom)`
- 상단 헤더: `padding-top:calc(16px + env(safe-area-inset-top))`
- `position:fixed/absolute` 기반 레이아웃 사용 금지 (Ionic structure.css 충돌)
- 각 탭 컴포넌트는 IonHeader 없이 `display:flex; flex-direction:column; height:100%` 사용

## 환경 변수 (`.env.local`)

| 변수 | 설명 |
|------|------|
| `ETRI_ACCESS_KEY` | ETRI Open API 액세스 키 |

## ETRI STT API

- **엔드포인트**: `http://epretx.etri.re.kr:8000/api/WiseASR_Recognition` (POST)
- **헤더**: `Authorization: {ETRI_ACCESS_KEY}`
- **요청 바디**: `{ request_id, argument: { language_code: "korean", audio: "<base64>" } }`
- **응답**: `{ result: 0, return_object: { recognized: "..." } }`
- 클라이언트에서 오디오 Blob → FormData로 `/api/transcribe` 전송 → 서버에서 base64 변환 후 ETRI 호출

## RecordingTab 상태 흐름

```
idle → (녹음 버튼) → recording → (정지 버튼) → preview → (음성 인식 시작) → transcribing → idle
                                                         ↑ (다시 녹음)
```

- `preview` 상태에서 `<audio controls>`로 녹음 파일 재생 가능
- 오디오 오브젝트 URL은 `URL.revokeObjectURL`로 해제

## SettingsTab — 아이 등록

- `Child` 타입: `{ id, name, nicknames: string[], gender, birthDate, height, weight }`
- localStorage 키: `"registered-children"`
- 구 데이터 마이그레이션: `nickname: string` → `nicknames: string[]` 자동 처리
- 애칭 최대 3개
- 모달: 바텀 시트 스타일 (`position:fixed; bottom:0; max-height:90dvh`)

## 주의사항

- Ionic `structure.css`가 `body { position:fixed; transform:translateZ(0) }`를 주입하므로 자식에서 `position:fixed` 사용 시 viewport 기준이 아닌 body 기준이 됨 → 레이아웃은 flexbox로만 구성
- `IonicProvider`는 SSR 방지를 위해 `mounted` 상태 이후에만 렌더링함
- 새 API 라우트 작성 전 `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` 확인
