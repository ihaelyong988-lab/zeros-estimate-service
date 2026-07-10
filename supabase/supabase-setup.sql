-- ============================================================
-- ZEROS 사전진단 서비스 - Supabase 초기 설정 SQL
-- ============================================================
-- 사용법:
--   1) Supabase 대시보드 → 왼쪽 메뉴 'SQL Editor' 클릭
--   2) 'New query' 클릭
--   3) 이 파일 내용 전체를 복사 → 붙여넣기 → 우측 하단 'Run' 클릭
--   4) "Success. No rows returned" 이 뜨면 완료
-- ============================================================

-- ------------------------------------------------------------
-- 1. 데이터 테이블 6개 생성
--    (각 테이블은 id + data(jsonb) + created_at 구조)
-- ------------------------------------------------------------
create table if not exists zeros_estimates (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists zeros_customers (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists zeros_payments (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists zeros_site_visits (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists zeros_admin_users (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists zeros_notification_logs (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. RLS(행 수준 보안) 활성화
-- ------------------------------------------------------------
alter table zeros_estimates         enable row level security;
alter table zeros_customers         enable row level security;
alter table zeros_payments          enable row level security;
alter table zeros_site_visits       enable row level security;
alter table zeros_admin_users       enable row level security;
alter table zeros_notification_logs enable row level security;

-- ------------------------------------------------------------
-- 3. 접근 정책 (2026-07-11 보안 잠금)
--    ⚠️ 과거에는 anon(공개) 키로 전 테이블 읽기/쓰기를 허용했으나(MVP), 이는 공개
--    번들의 anon 키만으로 전 고객 개인정보(이름·전화·주소·견적)를 조회·수정·삭제할 수
--    있는 심각한 노출이었다. 이제 모든 데이터 접근은 서버 라우트(/api/data,
--    service_role 키 + 신원 검증)로만 수행한다. service_role 은 RLS 를 우회하므로
--    테이블에는 어떤 anon 정책도 두지 않는다(= anon 전면 차단).
--    ▶ 반드시 앱 배포(서버 게이트웨이 코드) 후 이 SQL 을 실행할 것.
--      순서: (1) master 배포 → (2) 이 SQL 실행. 코드가 먼저 올라가 있어야 화면이
--      끊기지 않는다(코드는 이미 anon 을 쓰지 않으므로 SQL 실행 즉시 누출이 닫힌다).
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'zeros_estimates','zeros_customers','zeros_payments',
    'zeros_site_visits','zeros_admin_users','zeros_notification_logs'
  ]
  loop
    -- 과거 anon 전체 허용 정책 제거 (재생성하지 않음 → anon 접근 없음)
    execute format('drop policy if exists "anon_all_%1$s" on %1$I;', t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 4. Storage 업로드 정책 (estimate-files 버킷)
--    버킷은 Public 으로 만들었으므로 '읽기'는 이미 허용됨.
--    여기서는 anon 이 '업로드(insert)' 할 수 있도록 허용한다.
-- ------------------------------------------------------------
drop policy if exists "anon_upload_estimate_files" on storage.objects;
create policy "anon_upload_estimate_files"
  on storage.objects
  for insert to anon
  with check (bucket_id = 'estimate-files');

-- (선택) anon 이 자신이 올린 파일을 갱신/삭제할 수 있게 하려면 아래도 실행
drop policy if exists "anon_modify_estimate_files" on storage.objects;
create policy "anon_modify_estimate_files"
  on storage.objects
  for update to anon
  using (bucket_id = 'estimate-files');

-- ------------------------------------------------------------
-- 5. 파일 보안 잠금 (2026-07-05 — 관리자·본인만 열람)
--    버킷을 비공개로 전환한다. 이후 파일 열람은 서버 서명 URL
--    (/api/files/sign, 관리자 토큰·고객 본인 인증 필수)로만 가능.
--    방문자 업로드(insert)는 계속 허용, 수정/삭제/읽기는 차단.
-- ------------------------------------------------------------
-- 5-1. estimate-files 관련 기존 스토리지 정책 전부 정리
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') like '%estimate-files%'
           or coalesce(with_check, '') like '%estimate-files%')
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

-- 5-2. 업로드(insert)만 익명 허용 (신청서 첨부가 계속 작동해야 함)
create policy "anon_upload_estimate_files"
  on storage.objects
  for insert to anon
  with check (bucket_id = 'estimate-files');

-- 5-3. 버킷 비공개 전환 — 기존 공개 URL 전부 무효화
update storage.buckets set public = false where id = 'estimate-files';

-- ============================================================
-- 완료. 파일은 비공개로 저장되며, 관리자 로그인 또는 고객 본인
-- 인증을 거친 경우에만 서명 URL(10분)로 열람·다운로드됩니다.
-- ============================================================
