import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ALLOWED_EXTENSIONS, MAX_FILE_BYTES } from '@/lib/constants/uploadLimits';

// ==========================================
// D7 — estimate-files 버킷 익명 업로드 한도
// ==========================================
// 버킷에 용량·형식 한도가 없으면 공개 anon 키만으로 무제한 적재가 가능하다.
// 한도는 클라이언트 상수(lib/constants/uploadLimits.ts)와 한 값이어야 한다 —
// 한쪽만 바꾸면 화면은 통과시키고 서버가 거부하거나, 서버가 그대로 열린다.
// 라이브 DB 반영은 사람이 실행하므로, 기계가 볼 수 있는 것은 이 SQL 문 자체다.

const SQL_PATH = fileURLToPath(new URL('../../supabase/supabase-setup.sql', import.meta.url));
const sql = readFileSync(SQL_PATH, 'utf8');

// 주석에 적힌 값이 통과시키지 않도록 실행 구문만 남긴다.
const code = sql
  .split(/\r?\n/)
  .filter((line) => !/^\s*--/.test(line))
  .join('\n');

const bucketStatement =
  (code.match(/update\s+storage\.buckets[\s\S]*?;/gi) || []).find((s) => /file_size_limit/i.test(s)) || '';

const listedMimes = (bucketStatement.match(/'[a-z0-9.+_-]+\/[a-z0-9.+_-]+'/gi) || []).map((s) =>
  s.slice(1, -1).toLowerCase()
);

// 확장자 → 대표 MIME. ALLOWED_EXTENSIONS 에 항목이 늘면 여기서 먼저 걸려 SQL 갱신을 강제한다.
const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  heif: 'image/heif',
  webp: 'image/webp',
  pdf: 'application/pdf',
  dwg: 'image/vnd.dwg',
  dxf: 'image/vnd.dxf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  hwp: 'application/x-hwp',
  hwpx: 'application/vnd.hancom.hwpx',
  zip: 'application/zip',
};

describe('supabase-setup.sql — estimate-files 버킷 한도(D7)', () => {
  it('버킷 한도 구문이 estimate-files 만 대상으로 존재한다', () => {
    expect(bucketStatement).not.toBe('');
    expect(bucketStatement).toMatch(/where\s+id\s*=\s*'estimate-files'/i);
  });

  it('개당 용량 한도가 클라이언트 상수(MAX_FILE_BYTES)와 같다', () => {
    const declared = Number((bucketStatement.match(/file_size_limit\s*=\s*(\d+)/i) || [])[1]);
    expect(declared).toBe(MAX_FILE_BYTES);
  });

  it('허용 형식 목록이 ALLOWED_EXTENSIONS 를 전부 덮는다', () => {
    const missing = ALLOWED_EXTENSIONS.filter((ext) => {
      const mime = MIME_BY_EXT[ext];
      return !mime || !listedMimes.includes(mime);
    });
    expect(missing).toEqual([]);
  });

  it('형식을 모르는 첨부(dwg·hwp 등)의 기본값을 막지 않는다', () => {
    // storage.ts 는 file.type 이 비면 application/octet-stream 으로 올린다.
    // 목록에서 빠지면 도면·한글 첨부가 통째로 거부된다.
    expect(listedMimes).toContain('application/octet-stream');
  });

  it('멱등이다 — 버킷을 새로 만들지 않고 기존 행만 갱신한다', () => {
    expect(bucketStatement).toMatch(/^update\b/i);
    expect(bucketStatement).not.toMatch(/insert\s+into\s+storage\.buckets/i);
  });
});
