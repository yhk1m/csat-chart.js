// © 2026 김용현
// 2.3.0 에 더한 선택지 셋 — 표의 글자 칸, 편차 그래프 칸 이름, 하이서그래프 열린 선과 달 이름.
import { describe, it, expect } from 'vitest';
import {
  renderDataTable,
  renderDeviationAGraph,
  renderHythergraph,
  createDefaultDataTableData,
  createDefaultDeviationAData,
  createDefaultHythergraphData,
  createDefaultGraphOptions,
} from '../../src/core/index';
import { drawLogged } from './draw-log';

const texts = (log: { texts: { s: string }[] }) => log.texts.map((t) => t.s);

describe('DataTable 글자 칸', () => {
  it('글자는 그대로, 숫자는 소수 한 자리로 적는다', () => {
    const data = createDefaultDataTableData();
    data.columns = ['(가)', '(나)'];
    data.rows = [{ label: '1위', values: ['A', '일본'] }, { label: '2위', values: [3, 'B'] }];
    const log = drawLogged((ctx) => renderDataTable(ctx, 600, 300, data, createDefaultGraphOptions('exam')), 600, 300);
    const s = texts(log);
    expect(s).toContain('A');
    expect(s).toContain('일본');
    expect(s).toContain('3.0');
  });
});

describe('DeviationA slotLabels', () => {
  const months = Array.from({ length: 12 }, (_, i) => ({ temp: i - 6, precip: (i - 6) * 10 }));
  const base = () => {
    const data = createDefaultDeviationAData();
    data.months = months;
    data.baseMonths = months.map(() => ({ temp: 0, precip: 0 }));
    data.monthInterval = 2;
    return data;
  };

  it('주면 달 숫자와 (월) 대신 그 이름을 쓴다', () => {
    const data = { ...base(), slotLabels: ['㉠', '㉡'] };
    const s = texts(drawLogged((ctx) => renderDeviationAGraph(ctx, 500, 500, data, createDefaultGraphOptions('exam')), 500, 500));
    expect(s).toContain('㉠');
    expect(s).toContain('㉡');
    expect(s.join('')).not.toContain('월');
  });

  it('없으면 예전처럼 달 숫자', () => {
    const s = texts(drawLogged((ctx) => renderDeviationAGraph(ctx, 500, 500, base(), createDefaultGraphOptions('exam')), 500, 500));
    expect(s).toContain('7');
    // exam 은 괄호를 따로 찍는다 — 이어 붙여 본다
    expect(s.join('')).toContain('월');
  });
});

describe('Hythergraph closeLoop·monthLabels', () => {
  const series = [{ label: '(가)', months: Array.from({ length: 12 }, (_, i) => ({ temp: i * 100, precip: i * 2 })) }];

  it('monthLabels 에서 null 인 달은 적지 않는다', () => {
    const data = { ...createDefaultHythergraphData(), series, monthLabels: ['1월', ...Array(10).fill(null), '12월'] };
    const s = texts(drawLogged((ctx) => renderHythergraph(ctx, 600, 500, data, createDefaultGraphOptions('classic')), 600, 500));
    expect(s).toContain('1월');
    expect(s).toContain('12월');
    expect(s).not.toContain('6');
  });

  it('closeLoop: false 면 12월에서 1월로 돌아오는 선이 없다', () => {
    const run = (closeLoop: boolean) => {
      const data = { ...createDefaultHythergraphData(), series, mode: 'loop' as const, closeLoop,
        xRange: { min: 0, max: 1200, auto: false }, yRange: { min: 0, max: 25, auto: false } };
      let closes = 0;
      drawLogged((ctx) => {
        const orig = ctx.closePath.bind(ctx);
        ctx.closePath = () => { closes++; orig(); };
        renderHythergraph(ctx, 600, 500, data, createDefaultGraphOptions('classic'));
      }, 600, 500);
      return closes;
    };
    expect(run(true)).toBe(run(false) + 1);
  });
});
