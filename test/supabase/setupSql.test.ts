import { describe, expect, it } from 'vitest';
import { MAX_FILE_BYTES } from '@/lib/constants/uploadLimits';
import { readSource } from '../support/sourceScan';

// ==========================================
// D7 — estimate-files 버킷 익명 업로드 한도
// ==========================================
// 버킷에 용량 한도가 없으면 공개 anon 키만으로 개당 무제한 크기를 적재할 수 있다.
// 한도는 클라이언트 상수(lib/constants/uploadLimits.ts)와 한 값이어야 한다 —
// 한쪽만 바꾸면 화면은 통과시키고 서버가 거부한다.
// 라이브 DB 반영은 사람이 실행하므로, 기계가 볼 수 있는 것은 이 SQL 문 자체다.
//
// allowed_mime_types 는 의도적으로 넣지 않는다(2026-08-07 적대 검증).
// MIME 은 클라이언트가 신고하는 값이고 dwg·hwp 때문에 application/octet-stream 을
// 허용해야 하므로 방어값이 0인 반면, 목록에 없는 정상 형식(AutoCAD·한컴이 보내는
// application/x-dwg 등)을 거부해 실제 고객 첨부만 막는다. 형식 검증은 확장자 기준
// validateFileFormat 이 담당한다. 아래 테스트가 그 결정을 고정한다.

const { lines } = readSource('supabase/supabase-setup.sql');

// 주석에 적힌 값이 통과시키지 않도록 실행 구문만 남긴다.
const code = lines.filter((line) => !/^\s*--/.test(line)).join('\n');

const bucketStatement =
  (code.match(/update\s+storage\.buckets[\s\S]*?;/gi) || []).find((s) => /file_size_limit/i.test(s)) || '';

describe('supabase-setup.sql — estimate-files 버킷 한도(D7)', () => {
  it('버킷 한도 구문이 estimate-files 만 대상으로 존재한다', () => {
    expect(bucketStatement).not.toBe('');
    expect(bucketStatement).toMatch(/where\s+id\s*=\s*'estimate-files'/i);
  });

  it('개당 용량 한도가 클라이언트 상수(MAX_FILE_BYTES)와 같다', () => {
    const declared = Number((bucketStatement.match(/file_size_limit\s*=\s*(\d+)/i) || [])[1]);
    expect(declared).toBe(MAX_FILE_BYTES);
  });

  it('allowed_mime_types 를 설정하지 않는다 — 정상 첨부를 막는 쪽으로만 작동한다', () => {
    expect(bucketStatement).not.toMatch(/allowed_mime_types/i);
  });

  it('멱등이다 — 버킷을 새로 만들지 않고 기존 행만 갱신한다', () => {
    expect(bucketStatement).toMatch(/^update\b/i);
    expect(bucketStatement).not.toMatch(/insert\s+into\s+storage\.buckets/i);
  });
});
