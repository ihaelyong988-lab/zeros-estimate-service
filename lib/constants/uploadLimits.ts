import { FileMeta } from '@/types/estimate';

// ==========================================
// 파일 업로드 한도 및 형식 정책 (한 곳에서 관리)
// ==========================================
// 숫자를 바꾸려면 이 파일의 상수만 수정하면 된다.

export const MAX_PER_CATEGORY = 5;        // 탭(도면/사진/기타)별 최대 개수
export const MAX_TOTAL_FILES = 15;        // 1인 제출 전체 최대 개수
export const MAX_TOTAL_BYTES = 100 * 1024 * 1024; // 1인 제출 전체 합계 용량 (100MB)
export const MAX_FILE_BYTES = 50 * 1024 * 1024;   // 개당 최대 용량 (50MB)

// 허용 확장자 (이미지 + PDF + 도면 + 엑셀 + 한글 + 압축)
export const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'heic', 'heif', 'webp',
  'pdf',
  'dwg', 'dxf',
  'xlsx', 'xls',
  'hwp', 'hwpx',
  'zip',
];

// 파일 선택창 accept 속성 값
export const ACCEPT_ATTR = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(',');

// 사용자 안내용 라벨
export const ALLOWED_LABEL = '이미지(jpg·png·heic), PDF, 도면(dwg·dxf), 엑셀(xlsx·xls), 한글(hwp), 압축(zip)';

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

// 형식 + 개당 용량만 검사 (관리자 업로드 등 개수 제한이 불필요한 곳에서 사용)
export function validateFileFormat(incoming: File[]): string | null {
  for (const f of incoming) {
    const ext = extOf(f.name);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `'${f.name}'은(는) 허용되지 않는 형식입니다.\n허용 형식: ${ALLOWED_LABEL}`;
    }
    if (f.size > MAX_FILE_BYTES) {
      return `'${f.name}'이(가) ${formatBytes(MAX_FILE_BYTES)}를 초과합니다. 더 작은 파일로 첨부해 주세요.`;
    }
  }
  return null;
}

// 고객 제출용 전체 한도 검사 (형식 + 개당 용량 + 탭별 개수 + 총 개수 + 총 용량)
export function validateUpload(
  existing: FileMeta[],
  incoming: File[],
  category: string
): string | null {
  const formatError = validateFileFormat(incoming);
  if (formatError) return formatError;

  const catCount = existing.filter((e) => e.file_category === category).length;
  if (catCount + incoming.length > MAX_PER_CATEGORY) {
    return `'${category}'은(는) 최대 ${MAX_PER_CATEGORY}개까지 첨부할 수 있습니다. (현재 ${catCount}개)`;
  }

  if (existing.length + incoming.length > MAX_TOTAL_FILES) {
    return `전체 첨부는 최대 ${MAX_TOTAL_FILES}개까지 가능합니다. (현재 ${existing.length}개)`;
  }

  const existingBytes = existing.reduce((s, e) => s + (e.file_size || 0), 0);
  const incomingBytes = incoming.reduce((s, f) => s + f.size, 0);
  if (existingBytes + incomingBytes > MAX_TOTAL_BYTES) {
    return `전체 용량은 최대 ${formatBytes(MAX_TOTAL_BYTES)}까지 가능합니다. (현재 ${formatBytes(existingBytes)})`;
  }

  return null;
}
