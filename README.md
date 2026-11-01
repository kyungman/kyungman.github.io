# kyungman · 개발 기록

개발 중 마주친 문제와 해결 과정을 남기는 한국어 기술 블로그입니다.

- 블로그: https://kyungman.github.io/
- Markdown 원문: `posts/`
- 생성기: `scripts/build.mjs`
- 스타일: `assets/style.css`

## 로컬에서 보기

Node.js 22 이상과 Python 3이 필요합니다.

```sh
npm ci
npm run build
npm run preview
```

브라우저에서 http://localhost:4173/ 을 엽니다. 파일을 수정한 뒤 `npm run build`를 다시 실행하고 새로고침합니다. 서버는 `Ctrl+C`로 종료합니다.

`dist/`에는 공개할 HTML과 정적 파일만 생성되며 Git에 저장하지 않습니다. 외부 글꼴, 분석 도구, 댓글 시스템을 사용하지 않습니다.

## 새 글 작성하기

1. 최신 `main`에서 `codex/<글-주제>` 브랜치를 만듭니다.
2. `posts/YYYY-MM-DD-주제.md` 파일을 추가합니다.
3. 아래 메타데이터와 본문을 작성합니다. 날짜는 따옴표로 감싼 `YYYY-MM-DD` 문자열, `slug`는 중복되지 않는 영문 소문자·숫자·하이픈 조합을 사용합니다.

```md
---
title: "글 제목"
date: "2026-11-01"
slug: "my-development-note"
description: "글의 내용을 설명하는 짧은 문장입니다."
tags: ["iOS", "트러블슈팅"]
---

도입 문단을 작성합니다.

## 첫 번째 소제목

본문을 작성합니다.
```

글 제목은 자동으로 표시되므로 본문은 문단과 `##` 소제목부터 시작합니다. 코드 블록과 표를 사용할 수 있습니다. 안전한 렌더링을 위해 Markdown 안의 HTML은 실행하지 않습니다.

4. `npm ci && npm run build`로 확인한 뒤 로컬에서 글 목록, 본문, 좁은 화면과 키보드 이동을 확인합니다.
5. 개인 정보와 명령어를 검토하고 브랜치를 커밋·푸시한 뒤 `main`을 대상으로 PR을 만듭니다.
6. 빌드 검증과 리뷰가 끝나면 GitHub에서 PR을 병합합니다. `main`의 배포 작업이 성공하면 게시됩니다.

PR에서는 빌드만 실행하고 공개하지 않습니다. GitHub Pages 설정은 **GitHub Actions**를 배포 소스로 사용해야 합니다. 배포 내역은 저장소의 Actions 탭에서 확인할 수 있습니다.
