// © 2026 김용현
// 그래프 유형
export type GraphType =
  | 'guide'
  | 'climate'
  | 'pyramid'
  | 'ternary'
  | 'stacked'
  | 'absbar'
  | 'scatter'
  | 'hythergraph'
  | 'cube'
  | 'radar'
  | 'choropleth'
  | 'symbolmap'
  | 'isoline'
  | 'flowmap';

export const GRAPH_LABELS: Record<GraphType, string> = {
  guide: '사용법 보기',
  climate: '기후 그래프',
  pyramid: '인구 피라미드',
  ternary: '삼각 그래프',
  stacked: '100% 막대/원 그래프',
  absbar: '절댓값 막대 그래프',
  scatter: '산점도/버블 차트',
  hythergraph: '하이서그래프',
  cube: '정육면체 그래프',
  radar: '방사형 그래프',
  choropleth: '단계구분도',
  symbolmap: '도형표현도',
  isoline: '등치선도',
  flowmap: '유선도',
};

export const MAP_GRAPH_TYPES: ReadonlyArray<GraphType> = ['choropleth', 'symbolmap', 'isoline', 'flowmap'];
export function isMapGraphType(t: GraphType): boolean {
  return (MAP_GRAPH_TYPES as ReadonlyArray<GraphType>).includes(t);
}

export type LegendPosition = 'bottom' | 'right';

/** 플롯 안쪽 범례를 놓을 모서리 */
export type InsideLegendCorner = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

// 공통 그래프 옵션
export interface GraphOptions {
  title: string;
  source: string;
  /**
   * 출처 줄 **왼쪽**에 함께 적는 글 (예: 자료 연도 `(2024)`).
   *
   * 주면 출처 줄이 각주 **아래**로 내려가고 왼쪽·오른쪽에 나눠 적힌다.
   * 미지정이면 기존대로 출처가 각주 위에 오른쪽 정렬로만 놓인다.
   */
  sourceLeft?: string;
  /**
   * 출처를 **마지막 각주와 같은 줄** 오른쪽 끝에 적는다 (각주는 왼쪽 끝).
   *
   * 시험지 관습이다 — 원본은 `* 1991~2020년의 평년값임.` 과 `(기상청)` 이
   * 한 줄에 좌우로 놓인다. 미지정이면 기존대로 출처가 각주 **위** 줄에 놓인다.
   * 각주가 없으면 아무 차이가 없다.
   */
  sourceInline?: boolean;
  footnotes: string[];
  fontFamily: 'serif' | 'sans' | 'custom';
  customFont: string;
  fontSize: {
    title: number;
    axisLabel: number;
    tick: number;
    dataLabel: number;
  };
  showDataLabels: boolean;
  showLegend: boolean;
  legendPosition: LegendPosition;
  legendLabel1: string;
  legendLabel2: string;
}

// PNG 내보내기 설정
export interface ExportSettings {
  mode: 'exam' | 'custom';
  width: number;
  height: number;
  scale: 1 | 2 | 3;
}

export function createDefaultGraphOptions(): GraphOptions {
  return {
    title: '',
    source: '',
    footnotes: [''],
    fontFamily: 'serif',
    customFont: '',
    fontSize: {
      title: 36,
      axisLabel: 28,
      tick: 26,
      dataLabel: 22,
    },
    showDataLabels: false,
    showLegend: true,
    legendPosition: 'bottom',
    legendLabel1: '',
    legendLabel2: '',
  };
}

export function createDefaultExportSettings(): ExportSettings {
  return {
    mode: 'exam',
    width: 800,
    height: 600,
    scale: 2,
  };
}
