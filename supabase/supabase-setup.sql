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

-- ------------------------------------------------------------
-- 6. 접수번호 중복 방지 (2026-08-07)
--    동시 접수 2건이 같은 번호(ZR-YYYYMMDD-NNN)를 받던 경쟁 상태를 DB 제약으로 막는다.
--    서버(app/api/data/route.ts)는 23505 를 받으면 번호를 다시 매겨 최대 5회 재시도한다.
--    멱등 — 이미 있으면 아무 일도 하지 않는다.
--
--    ※ 기존 데이터에 중복 번호가 있으면 인덱스 생성이 실패한다. 아래로 먼저 확인한다:
--      select data->>'estimate_no' as no, count(*) from zeros_estimates
--        group by 1 having count(*) > 1;
-- ------------------------------------------------------------
create unique index if not exists zeros_estimates_no_uniq
  on zeros_estimates ((data->>'estimate_no'));

-- ------------------------------------------------------------
-- 7. 익명 업로드 한도 (2026-08-07)
--    §5-2 로 익명 insert 를 열어 두었는데 버킷에 용량·형식 한도가 없다. 공개 anon 키만
--    있으면 누구나 임의 용량을 무제한 적재해 저장 용량·요금을 소진시킬 수 있다.
--
--    개당 용량 52428800 = lib/constants/uploadLimits.ts 의 MAX_FILE_BYTES(50MB)와 같은 값이며,
--    두 값의 동기는 test/supabase/setupSql.test.ts 가 기계로 채점한다(한쪽만 바꾸면 테스트가 막는다).
--
--    ※ allowed_mime_types 는 **넣지 않는다**(2026-08-07 적대 검증 결과).
--      ① 방어값이 0이다 — MIME 은 lib/supabase/storage.ts 가 file.type 을 그대로 신고하는
--         클라이언트 값이고, dwg·hwp 처럼 브라우저가 모르는 형식 때문에
--         application/octet-stream 을 허용해야 한다. 그 순간 무엇이든 통과한다.
--      ② 정상 업로드만 막는다 — AutoCAD·한컴이 설치된 Windows(= 이 서비스의 주 고객 환경)는
--         레지스트리에서 application/x-dwg·drawing/dwg·application/haansofthwpx 등
--         목록에 없는 값을 보내고, 거부되면 고객 화면에 Supabase 영문 원문이 그대로 뜬다.
--      형식 검증은 확장자 기준(lib/constants/uploadLimits.ts 의 validateFileFormat)이 담당한다.
--      서버 신뢰 검증이 필요하면 /api/data 의 validateSubmittedFiles 에 확장자 검사를 더하는 것이 옳은 자리다.
--    ※ 용량 한도는 개당 상한일 뿐 객체 수·총량·요청 빈도를 제한하지 않는다.
--      50MB × N 회 반복 적재는 여전히 가능하다 — 익명 storage insert 레이트리밋은 별도 과제다.
--    ※ 라이브 DB 반영은 사람이 이 SQL 을 실행하는 시점이다. 실행 전에도 앱은 그대로
--      동작하고(코드는 한도를 읽지 않는다), 실행 후에는 한도를 넘는 업로드만 거부된다.
--      멱등 — 버킷을 새로 만들지 않고 기존 행만 갱신하므로 여러 번 실행해도 결과가 같다.
-- ------------------------------------------------------------
update storage.buckets
   set file_size_limit = 52428800
 where id = 'estimate-files';

-- ------------------------------------------------------------
-- 8. 자기검증 (2026-08-08 — 반드시 마지막에 둔다)
--    근거: 2026-08-08 주인님이 이 파일을 실행했는데 §7 이 반영되지 않았다.
--    SQL Editor 는 **마지막 문장의 결과만** 보여주는데 그 마지막이 update 라
--    "Success. No rows returned" 만 떴다 — 전부 성공했을 때와 중간에서
--    롤백됐을 때가 **화면상 구분되지 않았다.** 사람 눈에 판정을 맡긴 것이 원인이다.
--    처방 = 마지막을 select 로 만들어 **결과 그리드가 곧 판정**이 되게 한다.
--    OK 가 아닌 줄이 하나라도 있으면 실행은 실패한 것이다(제10조 게이트화).
-- ------------------------------------------------------------
select '1. 접수번호 중복방지' as 항목,
       case when exists (select 1 from pg_indexes
                          where tablename = 'zeros_estimates'
                            and indexname = 'zeros_estimates_no_uniq')
            then 'OK' else '실패' end as 결과
union all
select '2. 업로드 용량 50MB',
       case when (select file_size_limit from storage.buckets
                   where id = 'estimate-files') = 52428800
            then 'OK' else '실패' end
union all
select '3. 버킷 비공개',
       case when (select public from storage.buckets
                   where id = 'estimate-files') = false
            then 'OK' else '실패' end
union all
select '4. 익명 업로드 허용',
       case when exists (select 1 from pg_policies
                          where schemaname = 'storage' and tablename = 'objects'
                            and policyname = 'anon_upload_estimate_files')
            then 'OK' else '실패' end
union all
select '5. 익명 테이블 차단',
       case when not exists (select 1 from pg_policies
                              where schemaname = 'public'
                                and tablename like 'zeros_%'
                                and 'anon' = any(roles))
            then 'OK' else '실패' end;

-- ============================================================
-- 완료. 위 결과 그리드 5줄이 **전부 OK** 여야 실행이 끝난 것이다.
-- 파일은 비공개로 저장되며, 관리자 로그인 또는 고객 본인
-- 인증을 거친 경우에만 서명 URL(10분)로 열람·다운로드됩니다.
-- ============================================================
