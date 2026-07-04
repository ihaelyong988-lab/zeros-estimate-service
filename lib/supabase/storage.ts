'use client';

import { FileMeta } from '@/types/estimate';
import { getSupabase, STORAGE_BUCKET, isSupabaseEnabled } from './supabaseBrowser';

// ==========================================
// 실제 파일 업로드 (Supabase Storage)
// ==========================================
// 고객/관리자가 선택한 실제 파일을 estimate-files 버킷(비공개)에 업로드하고
// Storage 경로(file_path)를 포함한 FileMeta 메타데이터를 반환한다.
// 열람·다운로드는 공개 URL이 아니라 /api/files/sign 서명 URL(관리자·본인만)로 한다.

// 파일명에서 한글/공백/특수문자를 안전한 형태로 정리 (Storage key 호환)
function sanitizeName(name: string): string {
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot) : '';
  const base = (dot >= 0 ? name.slice(0, dot) : name)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 60);
  return `${base || 'file'}${ext.toLowerCase()}`;
}

// Storage 경로는 ASCII만 허용되므로 한글 카테고리를 영문 폴더명으로 매핑
function categoryFolder(category: string): string {
  const map: Record<string, string> = {
    '도면': 'drawings',
    '사진': 'photos',
    '기타': 'etc',
    '견적서': 'quotes',
  };
  return map[category] || 'etc';
}

export type UploadResult = FileMeta;

/**
 * 단일 파일을 Storage에 업로드한다.
 * @param file 브라우저 File 객체
 * @param category '도면' | '사진' | '기타'
 * @param estimateId 연결할 견적 ID (없으면 빈 문자열)
 */
export async function uploadEstimateFile(
  file: File,
  category: string,
  estimateId = ''
): Promise<FileMeta> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseEnabled) {
    throw new Error('Supabase가 설정되지 않아 실제 업로드를 할 수 없습니다.');
  }

  const safe = sanitizeName(file.name);
  const rand = Math.random().toString(36).slice(2, 9);
  const path = `${categoryFolder(category)}/${Date.now()}-${rand}-${safe}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });

  if (error) {
    throw new Error(`업로드 실패: ${error.message}`);
  }

  return {
    id: `file-${Date.now()}-${rand}`,
    estimate_id: estimateId,
    file_name: file.name,
    file_type: file.type || 'application/octet-stream',
    file_url: '', // 공개 URL 발급 금지 — 열람은 서명 URL로만
    file_path: path,
    file_category: category,
    file_size: file.size,
    uploaded_at: new Date().toISOString(),
  };
}

/** 여러 파일을 순차 업로드 */
export async function uploadEstimateFiles(
  files: File[],
  category: string,
  estimateId = ''
): Promise<FileMeta[]> {
  const results: FileMeta[] = [];
  for (const f of files) {
    results.push(await uploadEstimateFile(f, category, estimateId));
  }
  return results;
}
