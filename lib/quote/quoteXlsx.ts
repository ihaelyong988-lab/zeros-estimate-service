'use client';

import { Estimate, EstimateLineItem } from '@/types/estimate';
import { sumSubtotal } from './quoteDraft';

// ==========================================
// ZEROS 견적서(예상 원가 검토서) 엑셀 생성기
// ==========================================
// exceljs는 번들이 커서 사용 시점에 동적 로드한다.
// 금액 셀은 하드코딩이 아닌 살아있는 수식(qty*단가, SUM, VAT)으로 넣어
// 고객이 수량을 조정해도 합계가 자동 재계산되게 한다.

const NAVY = 'FF0F1E35';
const STEEL = 'FF1E4D8C';
const HAIR = 'FFE4EAF2';
const THIN = { style: 'thin' as const, color: { argb: HAIR } };
const BOX = { top: THIN, left: THIN, bottom: THIN, right: THIN };

export async function buildQuoteXlsxBlob(est: Estimate, items: EstimateLineItem[]): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ZEROS';
  const ws = wb.addWorksheet('견적서', { properties: { defaultRowHeight: 18 } });

  ws.columns = [
    { width: 5 },   // A No
    { width: 26 },  // B 품명
    { width: 22 },  // C 규격
    { width: 8 },   // D 수량
    { width: 7 },   // E 단위
    { width: 14 },  // F 단가
    { width: 16 },  // G 금액
    { width: 18 },  // H 비고
  ];

  // 제목
  ws.mergeCells('A1:H2');
  const title = ws.getCell('A1');
  title.value = 'ZEROS 견적서 (예상 원가 검토서)';
  title.font = { name: 'Pretendard', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };

  // 메타 정보
  const meta: Array<[string, string, string, string]> = [
    ['문서번호', est.estimate_no, '발행일', new Date().toLocaleDateString('ko-KR')],
    ['고객명', `${est.customer_name} (${est.company_name || '개인'})`, '연락처', est.phone],
    ['현장 주소', est.site_address, '공종', `${est.work_type} / ${est.site_type}`],
  ];
  meta.forEach((row, i) => {
    const r = ws.getRow(4 + i);
    r.getCell(1).value = row[0];
    ws.mergeCells(4 + i, 2, 4 + i, 4);
    r.getCell(2).value = row[1];
    r.getCell(5).value = row[2];
    ws.mergeCells(4 + i, 6, 4 + i, 8);
    r.getCell(6).value = row[3];
    [1, 5].forEach((c) => {
      r.getCell(c).font = { name: 'Pretendard', size: 10, bold: true, color: { argb: STEEL } };
    });
    [2, 6].forEach((c) => {
      r.getCell(c).font = { name: 'Pretendard', size: 10, color: { argb: NAVY } };
    });
  });

  // 품목 테이블 헤더
  const headRowIdx = 8;
  const head = ws.getRow(headRowIdx);
  ['No', '품명', '규격', '수량', '단위', '단가(원)', '금액(원)', '비고'].forEach((h, i) => {
    const c = head.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Pretendard', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STEEL } };
    c.border = BOX;
  });

  // 품목 행 — 금액 = 수량*단가 수식
  items.forEach((it, i) => {
    const rowIdx = headRowIdx + 1 + i;
    const r = ws.getRow(rowIdx);
    r.getCell(1).value = i + 1;
    r.getCell(2).value = it.name;
    r.getCell(3).value = it.spec;
    r.getCell(4).value = it.qty;
    r.getCell(5).value = it.unit;
    r.getCell(6).value = it.unit_price;
    r.getCell(7).value = { formula: `D${rowIdx}*F${rowIdx}` };
    r.getCell(8).value = it.note || '';
    for (let c = 1; c <= 8; c++) {
      const cell = r.getCell(c);
      cell.font = { name: 'Pretendard', size: 10, color: { argb: NAVY } };
      cell.border = BOX;
      if (c === 1 || c === 4 || c === 5) cell.alignment = { horizontal: 'center' };
      if (c === 6 || c === 7) { cell.numFmt = '#,##0'; cell.alignment = { horizontal: 'right' }; }
    }
  });

  // 합계부 — SUM/VAT/합계 수식 + ±5% 대역
  const first = headRowIdx + 1;
  const last = headRowIdx + items.length;
  const sumRows: Array<[string, string | { formula: string }, boolean]> = [
    ['소계', { formula: `SUM(G${first}:G${last})` }, false],
    ['부가세 (10%)', { formula: `ROUND(G${last + 1}*0.1,0)` }, false],
    ['합계 (VAT 포함)', { formula: `G${last + 1}+G${last + 2}` }, true],
    ['안심 예산 대역 (-5%)', { formula: `ROUND(G${last + 3}*0.95,0)` }, false],
    ['안심 예산 대역 (+5%)', { formula: `ROUND(G${last + 3}*1.05,0)` }, false],
  ];
  sumRows.forEach(([label, val, strong], i) => {
    const rowIdx = last + 1 + i;
    ws.mergeCells(rowIdx, 1, rowIdx, 6);
    const lc = ws.getCell(rowIdx, 1);
    lc.value = label;
    lc.alignment = { horizontal: 'right' };
    lc.font = { name: 'Pretendard', size: strong ? 11 : 10, bold: !!strong, color: { argb: strong ? NAVY : STEEL } };
    lc.border = BOX;
    const vc = ws.getCell(rowIdx, 7);
    vc.value = val as { formula: string };
    vc.numFmt = '#,##0';
    vc.alignment = { horizontal: 'right' };
    vc.font = { name: 'Pretendard', size: strong ? 11 : 10, bold: !!strong, color: { argb: NAVY } };
    vc.border = BOX;
    ws.getCell(rowIdx, 8).border = BOX;
  });

  // 하단 고지 — 단정 표현 금지(§10)
  const noteIdx = last + 7;
  ws.mergeCells(noteIdx, 1, noteIdx + 1, 8);
  const note = ws.getCell(noteIdx, 1);
  note.value =
    '본 견적은 제출해 주신 자료를 근거로 산출한 예상 원가 검토서이며, 현장 실측 후 최종 확정됩니다.\n유효기간: 발행일로부터 30일 · ZEROS 견적 검토 서비스';
  note.font = { name: 'Pretendard', size: 9, color: { argb: 'FF5B6573' } };
  note.alignment = { wrapText: true, vertical: 'top' };

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function quoteFileName(est: Estimate): string {
  return `ZEROS_견적서_${est.estimate_no}.xlsx`;
}

/** 브라우저에서 즉시 다운로드 (미리보기 용) */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export { sumSubtotal };
