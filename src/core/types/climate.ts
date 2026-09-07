// © 2026 김용현
// 기후 그래프 데이터
import type { InsideLegendCorner } from './common';

export interface ClimateMonthData {
  temp: number;
  precip: number;
}

export type MonthInterval = 12 | 4 | 2;

export interface ClimateGraphData {
  months: ClimateMonthData[];
  monthInterval: MonthInterval;
  tempLabel: string;
  precipLabel: string;
  tempRange: { min: number; max: number; auto: boolean; step?: number };
  precipRange: { min: number; max: number; auto: boolean; step?: number };
}

// 편차 그래프 모드
export type ClimateMode = 'normal' | 'deviationA' | 'deviationB';

// 모드 A — 월별 편차 (시계열)
export interface DeviationAData {
  baseMonths: ClimateMonthData[]; // 월별 기준값
  months: ClimateMonthData[]; // 실제값, 편차는 렌더링 시 계산
  monthInterval: MonthInterval;
  tempLabel: string;
  precipLabel: string;
  /** step 을 주면 눈금 간격을 그 값으로 고정한다. 미지정이면 기존대로 자동 계산 */
  tempRange: { min: number; max: number; auto: boolean; step?: number };
  precipRange: { min: number; max: number; auto: boolean; step?: number };
  /**
   * 막대 채움을 하나로 고정한다. 미지정이면 기존대로 양수는 진회색,
   * 음수는 연회색으로 나뉜다. 시험지는 부호와 무관하게 한 색이다.
   */
  barFill?: string;
  /** 막대 테두리색 — 미지정이면 `#444` */
  barStroke?: string;
  /** 꺾은선의 점 모양 — 미지정이면 원. 시험지는 검은 정사각형을 쓴다. */
  markerShape?: 'circle' | 'square';
  /**
   * 좌·우 축 이름. 주면 눈금 숫자 바깥에 **한 글자씩 세로로** 쌓아 그린다.
   * 미지정이면 단위 표기(tempLabel·precipLabel)만 축 위에 놓는다.
   */
  tempAxisName?: string;
  precipAxisName?: string;
  /** 범례를 플롯 안쪽 모서리 상자에 둔다. 자료를 덮는 모서리는 피한다. */
  insideLegend?: InsideLegendCorner;
  /** 위·오른쪽까지 이어 사각 테두리로 감싼다. 미지정이면 ㄷ자 축선만 그린다. */
  showFrame?: boolean;
}

// 모드 B — 지역별 편차 (비교형)
export interface DeviationBRegion {
  label: string;
  precip: number;
  temp: number;
}

export interface DeviationBData {
  baseTemp: number;
  basePrecip: number;
  regions: DeviationBRegion[];
  precipDiffLabel: string;
  tempDiffLabel: string;
  precipUnit: string;
  tempUnit: string;
  precipRange: { min: number; max: number; auto: boolean };
  tempRange: { min: number; max: number; auto: boolean };
}

export function createDefaultDeviationAData(): DeviationAData {
  return {
    baseMonths: Array.from({ length: 12 }, () => ({ temp: 0, precip: 0 })),
    months: Array.from({ length: 12 }, () => ({ temp: 0, precip: 0 })),
    monthInterval: 12,
    tempLabel: '(°C)',
    precipLabel: '(mm)',
    tempRange: { min: -10, max: 10, auto: true },
    precipRange: { min: -200, max: 200, auto: true },
  };
}

export function createDefaultDeviationBData(): DeviationBData {
  return {
    baseTemp: 0,
    basePrecip: 0,
    regions: [
      { label: 'A', precip: 0, temp: 0 },
      { label: 'B', precip: 0, temp: 0 },
      { label: 'C', precip: 0, temp: 0 },
    ],
    precipDiffLabel: '강수량 차이',
    tempDiffLabel: '기온 차이',
    precipUnit: '(mm)',
    tempUnit: '(°C)',
    precipRange: { min: -200, max: 200, auto: true },
    tempRange: { min: -10, max: 10, auto: true },
  };
}

// 기본 기후 데이터
export function createDefaultClimateData(): ClimateGraphData {
  return {
    months: Array.from({ length: 12 }, () => ({ temp: 0, precip: 0 })),
    monthInterval: 12,
    tempLabel: '(°C)',
    precipLabel: '(mm)',
    tempRange: { min: -10, max: 40, auto: true },
    precipRange: { min: 0, max: 400, auto: true },
  };
}
