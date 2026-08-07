import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ==========================================
// D2 — mock-data 정적 import 금지
// ==========================================
// isSupabaseEnabled 가 항상 true 라 MockZerosService 는 실행되지 않는데,
// 정적 import 하나 때문에 mock-data(1,393줄)가 고객 첫 로드 번들에 실렸다.
// 번들 크기는 빌드 산출물이라 여기서 못 재므로, 원인인 import 형태를 소스로 채점한다
// (test/ui/*Source.test.ts 와 같은 방식).

const SOURCE_PATH = fileURLToPath(new URL('../../lib/supabase/client.ts', import.meta.url));
const source = readFileSync(SOURCE_PATH, 'utf8');
const lines = source.split(/\r?\n/);

describe('lib/supabase/client.ts — mock-data 번들 분리(D2)', () => {
  it('mock-data 를 정적 import 하지 않는다', () => {
    const statics = lines
      .map((line, i) => ({ line: line.trim(), no: i + 1 }))
      .filter(({ line }) => /^import\b[^(]*from\s+['"]\.\/mock-data['"]/.test(line))
      .map(({ line, no }) => `${no}: ${line}`);

    expect(statics).toEqual([]);
  });

  it('Mock 폴백 경로에서만 동적으로 불러온다', () => {
    expect(source).toMatch(/await import\(['"]\.\/mock-data['"]\)/);
  });

  it('시드 대상 5종을 그대로 적재한다 — 동적 전환으로 시드가 빠지면 안 된다', () => {
    for (const name of ['mockEstimates', 'mockCustomers', 'mockPayments', 'mockSiteVisits', 'mockAdminUsers']) {
      expect(source, `${name} 시드가 사라졌다`).toContain(name);
    }
  });
});
