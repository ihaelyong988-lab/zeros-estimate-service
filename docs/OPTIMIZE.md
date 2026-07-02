# OPTIMIZE — zerospipe.co.kr 작업 절차 지침 + 개선 프롬프트
> 2026-07-02 제정 (4폴더 최적화 지시). 새 세션에서 개선 작업 시 **아래 프롬프트를 그대로 복붙**하면 재설명이 필요 없다.

## (a) 작업 절차 지침 — 표준 루프 (요약: 상세는 AGENTS.md)
1. **착수 전**: SessionStart 훅이 state.md 주입 → "이어서" 맥락 연결. 적용 스킬 확인(§0: UI=ui-ux-pro-max·frontend-design / 엑셀=xlsx / PPT=pptx).
2. **시안 먼저**: `show_widget` 시안 → 사용자 확정 → 코드 반영(§2). 다항목 지시는 번호 전수 나열(§1-A).
3. **검증 루프**: `node .claude/hooks/ui-quality-gate.mjs --check` → 수정 → `--pass` + `npm run build` 0에러(§11).
4. **마감처리**: §6 전 과정 자동(빌드→브랜치→worklog·state 같은 커밋→푸시→master 머지→배포). 배포 후 "똑같다" = 캐시 우선 의심(§8).
5. **성장 게이트(2026-07-02 신설)**: Stop 훅 `growth-gate.mjs` — 오늘 커밋이 있는데 worklog/결정로그/state 기록이 없으면 **마감 차단**. "한 번 = 영구"의 기계 강제.

## (b) 앱 개선 프롬프트 (복붙용)

### P1 ★우선 — 고객 업로드 파일 → 자동 견적서 제공 (1단계 반자동)
```
zerospipe 자동 견적서 1단계(반자동)를 구현해줘. docs/OPTIMIZE.md P1 기준.

[현황] 고객 파일은 Supabase Storage `estimate-files` 버킷에 업로드되고 FileMeta가
zeros_estimates.data.submitted_files 에 저장됨(lib/supabase/storage.ts). 견적서는 현재
PrintableScopeSheet 브라우저 인쇄뿐이고 estimated_amount는 수동 입력. types/estimate.ts에
estimate_pdf_url 필드가 예약만 되어 있음.

[구현 — 관리자 승인 게이트 필수(AI 단독 발송 금지)]
1. types/estimate.ts에 line_items: EstimateLineItem[] (품명·규격·수량·단위·단가·금액·비고) 추가.
2. 관리자 상세 모달에 "AI 견적 초안" 버튼: submitted_files(도면·사진) 목록 + 공종·규모 +
   lib/calculations 실적 통계를 근거로 라인아이템 초안을 생성해 편집 가능한 표로 표시.
3. xlsx 스킬로 ZEROS 견적서 양식(.xlsx) 생성 — 회사 헤더·품목표·소계/VAT/합계 수식·±5% 대역 표기.
4. 관리자 "승인·발송" 클릭 시: 견적서를 estimate-files 버킷 quotes/ 폴더에 업로드 →
   estimate_pdf_url 기록 → status를 '견적 발송'으로 → 고객 마이페이지에 "견적서 다운로드" 버튼 노출.
5. 디자인은 AGENTS §10·§10-A 확정 패턴(화이트·좌측 단일축·오렌지 CTA 1개) 준수, ui-ux-pro-max 선호출.
6. 검증: 게이트 --pass + 빌드 0에러 → 마감처리.
```

### P2 — 2단계(완전자동, P1 안정화 후)
```
P1 파이프라인을 Supabase Edge Function으로 서버화해줘: 신규 접수 INSERT 트리거 →
Claude API(claude-fable-5)로 파일 분석·초안 생성 → 초안 상태로 저장(관리자 승인 대기 유지).
알림톡/메일 연동은 기존 백로그(Toss·SMTP)와 함께.
```

### P3 — 기존 백로그 (state.md "다음 할 일" 유지)
est-test-* 삭제 · 공종 이미지 연결 · Toss Payments · 알림톡 SMTP · 비전 스캐너 고도화.
