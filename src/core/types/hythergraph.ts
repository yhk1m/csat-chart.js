// © 2026 김용현
// 하이서그래프 데이터
import { type ClimateMonthData } from './climate';

export type HythergraphMode = 'loop' | 'points' | 'both';
export type MonthLabelStyle = 'number' | 'english';

export const MONTH_LABELS_NUM = ['1','2','3','4','5','6','7','8','9','10','11','12'];
export const MONTH_LABELS_EN = ['J','F','M','A','M','J','J','A','S','O','N','D'];

export interface HythergraphSeries {
  label: string;
  months: ClimateMonthData[];
}

export interface HythergraphData {
  series: HythergraphSeries[];
  mode: HythergraphMode;
  monthLabelStyle: MonthLabelStyle;
  xUnit: string;
  yUnit: string;
  xRange: { min: number; max: number; auto: boolean };
  yRange: { min: number; max: number; auto: boolean };
  /**
   * 12월에서 1월로 선을 닫는다 — 미지정이면 닫는다(기존 동작). 누적 강수량처럼
   * 1월에서 12월로 한 방향으로만 가는 그림은 false 로 연다 (2.3.0~).
   */
  closeLoop?: boolean;
  /**
   * 점 옆에 적을 달 이름 12개. `null` 인 달은 적지 않는다. 미지정이면 monthLabelStyle 대로
   * 모든 달을 적는다. 시험지는 처음과 끝만 「1월」·「12월」로 적기도 한다 (2.3.0~).
   */
  monthLabels?: (string | null)[];
}

export function createDefaultHythergraphData(): HythergraphData {
  return {
    series: [
      { label: '(가)', months: Array.from({ length: 12 }, () => ({ temp: 0, precip: 0 })) },
    ],
    mode: 'both',
    monthLabelStyle: 'number',
    xUnit: '(°C)',
    yUnit: '(mm)',
    xRange: { min: -10, max: 40, auto: true },
    yRange: { min: 0, max: 400, auto: true },
  };
}
