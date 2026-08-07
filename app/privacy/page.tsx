import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: '개인정보처리방침 — ZEROS',
  description: 'ZEROS 예상견적 서비스가 수집하는 개인정보 항목과 이용 목적, 보관·파기 기준입니다.',
  alternates: { canonical: '/privacy' },
};

// 최종 수정일 — 본문을 고칠 때 이 상수도 함께 갱신한다(표기는 문서 하단 한 곳뿐).
const LAST_UPDATED = '2026-08-07';

// 수집 항목 — 이 저장소의 실제 수집 지점만 옮겼다(창작 금지).
//  · 접수 입력: components/forms/RequestWizard.tsx STEP 1~3
//  · 본인확인: components/forms/PhoneVerifyGate.tsx · lib/otp/token.ts
//  · 첨부 자료 분류: lib/supabase/storage.ts (도면·사진·기타)
//  · 처리 중 생성 필드: types/estimate.ts (Estimate · NotificationLog)
const COLLECTED: { group: string; items: string }[] = [
  { group: '접수 정보 (필수)', items: '현장 주소 · 공사 종류 · 현장 유형 · 담당자 성함 · 담당자 연락처 · 이메일' },
  { group: '접수 정보 (선택)', items: '사업체명 · 업종 · 예상 공사금액 · 참조 사항' },
  { group: '출장요청 추가', items: '방문 희망일 · 방문 시간대 · 첨부 자료(도면 · 사진 · 기타)' },
  { group: '본인확인', items: '휴대폰 번호 · 성함 · 인증번호' },
  { group: '접수 처리 중 생성', items: '접수번호 · 접수일시 · 견적 규모 분류 · 진행 상태 · 견적 금액 · 알림 발송 이력' },
];

const PURPOSES: string[] = [
  '예상견적 검토와 결과 회신',
  '현장 방문 일정 조율 (출장요청 접수 건)',
  '본인확인과 접수 진행 상태 안내',
  '접수 이력 관리와 재문의 응대',
];

// 위탁 — 코드가 실제로 호출하는 사업자만 적는다.
// TODO(주인님 확정 필요): 수탁사 정식 상호·소재지와 그 밖의 위탁(호스팅 등) 포함 여부.
const PROCESSORS: { task: string; vendor: string }[] = [
  { task: '데이터베이스·첨부 자료 보관', vendor: 'Supabase' },
  { task: '휴대폰 인증번호 문자 발송', vendor: '솔라피' },
];

function Section({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-6 flex flex-col gap-3">
      <h2 className="text-[19px] font-bold text-navy tracking-tight">
        <span className="text-steel tabular-nums mr-2.5">{String(index).padStart(2, '0')}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

const bodyCls = 'text-[16px] leading-relaxed text-gray text-pretty';

export default function PrivacyPage() {
  return (
    <main className="min-h-full bg-bg break-keep">
      <div className="mx-auto w-full max-w-3xl px-5 md:px-8 py-8 md:py-14 flex flex-col gap-8">

        <header className="flex flex-col gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 w-fit min-h-[44px] text-[15px] font-bold text-steel hover:text-navy transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            ZEROS 홈
          </Link>
          <h1 className="text-[28px] md:text-[34px] font-extrabold text-navy tracking-tight leading-tight">
            개인정보처리방침
          </h1>
          <p className={bodyCls}>
            ZEROS 예상견적 서비스가 수집하는 정보와 처리 기준입니다. 접수 화면의 개인정보 수집·이용 동의는 이 문서를 대상으로 합니다.
          </p>
        </header>

        <Section index={1} title="수집 항목">
          <dl className="flex flex-col">
            {COLLECTED.map(({ group, items }) => (
              <div
                key={group}
                className="py-3 border-b border-border/70 last:border-b-0 flex flex-col gap-1 sm:grid sm:grid-cols-[176px_1fr] sm:gap-5 sm:items-baseline"
              >
                <dt className="text-[16px] font-bold text-navy">{group}</dt>
                <dd className={bodyCls}>{items}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section index={2} title="이용 목적">
          <ul className="flex flex-col gap-2">
            {PURPOSES.map((p) => (
              <li key={p} className={`${bodyCls} flex gap-2.5`}>
                <span aria-hidden="true" className="text-steel shrink-0">·</span>
                {p}
              </li>
            ))}
          </ul>
        </Section>

        {/* TODO(주인님 확정 필요): 항목별 보유 기간(접수 건·첨부 자료·알림 이력)과 관계 법령상 의무 보관 기간.
            확정 전까지 화면에는 기간을 적지 않는다 — 지어낸 기간을 고지하면 그 자체가 허위 고지다. */}
        <Section index={3} title="보관 기간">
          <p className={bodyCls}>
            수집한 정보는 이용 목적을 달성하면 파기합니다. 항목별 보유 기간은 확정되는 대로 이 문서에 표기합니다.
          </p>
          <p className={bodyCls}>
            작성 중인 접수 내용은 이용자 브라우저에만 임시 저장되고 접수가 끝나면 삭제됩니다. 본인확인 세션 정보는 이용자 브라우저에 최대 30일 보관됩니다.
          </p>
        </Section>

        {/* TODO(주인님 확정 필요): 업로드 파일 실물(스토리지 객체) 파기는 현재 관리자 삭제 경로에 포함돼 있지 않다.
            자동 삭제를 붙일지, 요청 기반 수동 파기로 운영할지 확정한 뒤 이 절을 갱신한다. */}
        <Section index={4} title="파기 절차">
          <p className={bodyCls}>
            파기는 관리자 화면의 삭제 절차로 처리합니다. 접수 건을 삭제하면 그 건에 연결된 결제·방문·알림 이력이 함께 삭제됩니다.
          </p>
          <p className={bodyCls}>
            업로드한 도면·사진의 파기는 아래 문의 경로로 접수받아 처리합니다.
          </p>
        </Section>

        <Section index={5} title="제3자 제공">
          <p className={bodyCls}>
            수집한 정보를 제3자에게 제공하거나 판매하지 않습니다. 서비스 운영에 필요한 아래 업무만 위탁합니다.
          </p>
          <dl className="flex flex-col">
            {PROCESSORS.map(({ task, vendor }) => (
              <div
                key={vendor}
                className="py-3 border-b border-border/70 last:border-b-0 flex flex-col gap-1 sm:grid sm:grid-cols-[176px_1fr] sm:gap-5 sm:items-baseline"
              >
                <dt className="text-[16px] font-bold text-navy">{vendor}</dt>
                <dd className={bodyCls}>{task}</dd>
              </div>
            ))}
          </dl>
        </Section>

        {/* TODO(주인님 확정 필요): 개인정보 보호책임자 성명·직위와 전용 연락처(이메일·전화), 사업자 정보.
            확정 전까지는 앱 안의 실재 경로(문의하기)만 안내한다 — 없는 연락처를 적지 않는다. */}
        <Section index={6} title="문의 경로">
          <p className={bodyCls}>
            수집 항목 열람·정정·삭제 요청은 문의하기로 접수합니다.
          </p>
          <Link
            href="/?tab=request"
            className="inline-flex items-center gap-1.5 w-fit min-h-[44px] text-[16px] font-bold text-steel hover:text-navy transition-colors"
          >
            문의하기
            <ArrowRight className="w-4 h-4 shrink-0" />
          </Link>
        </Section>

        <p className="border-t border-border pt-5 text-[14px] font-medium text-gray tabular-nums">
          최종 수정 {LAST_UPDATED}
        </p>

      </div>
    </main>
  );
}
