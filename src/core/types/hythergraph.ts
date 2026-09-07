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
