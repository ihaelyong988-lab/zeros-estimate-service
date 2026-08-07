import { describe, expect, it } from 'vitest';
import { readSource } from '../support/sourceScan';

// 입력 8칸이 같은 골격(`div.gap-1.5` + 라벨 + 컨트롤)을 복붙하고 있었다(B8).
// 골격을 공용 `FormField` 한 곳으로 모았으므로, 여기서는 그 계약을 소스로 채점한다 —
// 렌더 테스트 수단이 없는 저장소라 판정 방식은 requestWizardChips.test.ts 와 같다.
const { source, occurrences, gateViolations } = readSource('components/forms/RequestWizard.tsx');

// 화면에 나오는 순서 그대로가 곧 이 목록이다. §10-A request 탭은 입력 순서·라벨 문구를 확정했으므로
// 여기 값을 고치는 것은 곧 확정 조문을 고치는 일이다.
const FIELDS: { id: string; control: 'input' | 'select' | 'textarea'; label: string; placeholder?: string }[] = [
  { id: 'site_address', control: 'input', label: "'출장 지역 (현장 주소) · 필수' : '지역 (현장 주소) · 필수'", placeholder: '경기도 화성시 향남읍 식품공단로 42' },
  { id: 'company_name', control: 'input', label: '사업체 (선택)', placeholder: 'ABC식품 (주)' },
  { id: 'industry', control: 'select', label: '업종 (선택)' },
  { id: 'expected_budget_range', control: 'select', label: '예상 공사금액 (선택)' },
  { id: 'customer_name', control: 'input', label: '담당자 성함', placeholder: '홍길동' },
  { id: 'phone', control: 'input', label: '담당자 연락처 (필수)', placeholder: '010-0000-0000' },
  { id: 'email', control: 'input', label: '이메일 회신처 (필수)', placeholder: 'name@example.com' },
  { id: 'description', control: 'textarea', label: '간단한 참조 사항 (선택 · 200자 이내)', placeholder: '예) 80A 배관 신규 설치 및 기존 라인 분기 검토를 요청드립니다.' },
];

// 호출부마다 id 가 첫 prop 이므로 `<FormField` 뒤 첫 id 가 그 칸의 id 다.
const renderedFieldIds = (): string[] =>
  [...source.matchAll(/<FormField\b/g)].map((m) => {
    const found = /id="([a-z_]+)"/.exec(source.slice(m.index));
    if (!found) throw new Error(`id 없는 FormField 호출이 있다 (offset ${m.index})`);
    return found[1];
  });

describe('RequestWizard 입력 칸 — 필드 목록', () => {
  it('필드 목록과 순서가 기대와 일치한다', () => {
    expect(renderedFieldIds()).toEqual(FIELDS.map((f) => f.id));
  });

  it('칸마다 컨트롤 종류가 기대와 일치한다', () => {
    // input 은 기본값이라 control prop 을 쓰지 않는다.
    expect(occurrences('control="select"')).toBe(FIELDS.filter((f) => f.control === 'select').length);
    expect(occurrences('control="textarea"')).toBe(FIELDS.filter((f) => f.control === 'textarea').length);
    expect(occurrences('<FormField')).toBe(FIELDS.length);
  });

  it('라벨 문구와 예시 문구가 그대로 남아 있다', () => {
    for (const field of FIELDS) {
      expect(source).toContain(field.label);
      if (field.placeholder) expect(source).toContain(`placeholder="${field.placeholder}"`);
    }
  });

  it('칸마다 다른 부분은 prop 으로만 갈린다', () => {
    // 이메일·연락처만 text 가 아니고, 글자수 제한은 참조 사항 한 칸뿐이다.
    expect(occurrences('type="email"')).toBe(1);
    expect(occurrences('type="tel"')).toBe(1);
    expect(occurrences('maxLength={200}')).toBe(1);
    // 연락처는 인증을 마치면 읽기 전용이 된다 — 값이 바뀌어 인증과 어긋나는 것을 막는다.
    expect(source).toContain('readOnly={verified}');
    expect(source).toContain("extraClassName={verified ? 'bg-bg-subtle text-gray' : ''}");
  });
});

describe('RequestWizard 입력 칸 — 골격 단일화', () => {
  it('골격은 공용 컴포넌트 한 곳에만 산다', () => {
    expect(occurrences('htmlFor={id}')).toBe(1);
    // name 을 id 에서 파생해 둘이 어긋날 수 없게 한다(옛 블록은 칸마다 두 번 적었다).
    expect(occurrences('name: id')).toBe(1);
  });

  it('칸마다 복붙하던 옛 골격이 남아 있지 않다', () => {
    for (const field of FIELDS) expect(source).not.toContain(`name="${field.id}"`);
    // 클래스도 칸마다 다시 적지 않는다 — 덧대는 부분만 extraClassName 으로 넘긴다.
    expect(source).not.toContain('className={inputCls}');
  });

  it('공용화 범위 밖(방문일·동의)은 그대로 둔다', () => {
    expect(source).toContain('name="visit_date"');
    expect(source).toContain('name="agreePrivacy"');
  });
});

describe('RequestWizard 입력 칸 — 접근성·터치 계약', () => {
  it('공용 골격이 본문 16px 이상과 포커스 가시를 그대로 싣는다', () => {
    expect(source).toContain("const inputCls = 'w-full border border-border p-3.5 rounded-custom text-[16.5px] focus:outline-none focus:border-steel transition-all'");
    expect(source).toContain("const labelCls = 'text-[14.5px] font-bold text-navy flex items-center gap-1.5'");
  });

  it('입력 칸은 모바일 탭 지연 없이 눌린다', () => {
    expect(source).toContain("style: { touchAction: 'manipulation' } as const");
  });

  it('게이트 차단룰 R1(에러 announce)에 위반이 없다', () => {
    expect(gateViolations('R1')).toEqual([]);
  });
});

describe('RequestWizard 오류 배너 — 배선 보존', () => {
  // 단계 높이가 1,200px 을 넘어 화면 밖에 렌더되던 배너를 시야로 끌어온 봉합분(2026-08-07).
  // 입력 칸을 공용화하면서 이 배선이 끊기면 고객에게는 '다음' 버튼이 무반응으로 보인다.
  it('배너가 스스로 시야로 들어와 포커스를 받는다', () => {
    expect(source).toContain('ref={errorRef}');
    expect(source).toContain('role="alert"');
    expect(source).toContain('aria-live="assertive"');
    expect(source).toContain("el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })");
    expect(source).toContain('el.focus({ preventScroll: true })');
  });
});
