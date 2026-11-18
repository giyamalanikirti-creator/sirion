'use client';

import {
  Bar, BarChart, ComposedChart, Line, CartesianGrid, Cell, LabelList, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  type PieLabelRenderProps,
} from 'recharts';

export const SERIES = ['#828BFC', '#005D68', '#B1D0CA', '#4364B2', '#E0E767'];
/** Chart palette shared across screens (design tokens). */
export const CHART = { primary: '#005D68', current: '#1F5FA8', proposed: '#D08A2E', positive: '#1D7A4B', missed: '#E8B86A', grid: '#E3E9EE', ink: '#172B3A', muted: '#465B68' };
const AXIS = { fontSize: 12, fill: '#465B68' };
const GRID = '#E3E9EE';

const tooltipStyle = {
  contentStyle: { borderRadius: 10, border: '1px solid #E6EBEB', fontSize: 12, boxShadow: '0 4px 14px rgba(0,0,0,0.06)' },
  cursor: { fill: 'rgba(12,94,105,0.05)' },
};

/** Single-series bars in teal-900. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export function SimpleBars<T extends Row>({
  data, x, y, height = 240, format, yLabel, onBarClick, highlight,
}: {
  data: T[];
  x: string;
  y: string;
  height?: number;
  format?: (v: number) => string;
  yLabel?: string;
  onBarClick?: (d: T) => void;
  highlight?: (d: T) => boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart accessibilityLayer data={data} margin={{ top: 10, right: 8, left: yLabel ? 8 : -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey={x} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', style: { ...AXIS, textAnchor: 'middle' } } : undefined}
        />
        <Tooltip {...tooltipStyle} formatter={(v) => (format ? format(Number(v)) : String(v))} />
        <Bar
          dataKey={y}
          fill="#0C5E69"
          radius={[4, 4, 0, 0]}
          maxBarSize={44}
          onClick={onBarClick ? (d) => onBarClick((d as unknown as { payload: T }).payload) : undefined}
          className={onBarClick ? 'cursor-pointer' : undefined}
        >
          {highlight && data.map((d, i) => <Cell key={i} fill={highlight(d) ? '#0C5E69' : '#5E9AA2'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Stacked bars, rounded top only, legend below with square swatches. */
export function StackedBars<T extends Row>({
  data, x, series, height = 240, format,
}: {
  data: T[];
  x: string;
  series: { key: string; label: string; color: string }[];
  height?: number;
  format?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey={x} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip {...tooltipStyle} formatter={(v, name) => [format ? format(Number(v)) : String(v), name]} />
        <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 11, color: '#1F2A2E', paddingTop: 8 }} />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId="a"
            fill={s.color}
            maxBarSize={64}
            radius={i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Grouped bars (predicted vs actual). */
export function GroupedBars<T extends Row>({
  data, x, series, height = 280, format,
}: {
  data: T[];
  x: string;
  series: { key: string; label: string; color: string }[];
  height?: number;
  format?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey={x} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip {...tooltipStyle} formatter={(v, name) => [format ? format(Number(v)) : String(v), name]} />
        <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={26} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Thick donut (inner ≈ 70% of outer), labels outside with thin leader lines. */
export function Donut({
  data, height = 240, colors = ['#0C5E69', '#B1D0CA', '#4364B2', '#E0E767', '#828BFC'],
}: {
  data: { name: string; value: number }[];
  height?: number;
  colors?: string[];
}) {
  const renderLabel = (p: PieLabelRenderProps) => {
    const RAD = Math.PI / 180;
    const cx = Number(p.cx), cy = Number(p.cy), mid = Number(p.midAngle), r = Number(p.outerRadius);
    const sx = cx + (r + 4) * Math.cos(-mid * RAD);
    const sy = cy + (r + 4) * Math.sin(-mid * RAD);
    const mx = cx + (r + 18) * Math.cos(-mid * RAD);
    const my = cy + (r + 18) * Math.sin(-mid * RAD);
    const right = mx > cx;
    const ex = mx + (right ? 14 : -14);
    return (
      <g>
        <path d={`M${sx},${sy} L${mx},${my} L${ex},${my}`} stroke="#1F2A2E" strokeWidth={0.8} fill="none" />
        <text x={ex + (right ? 4 : -4)} y={my} textAnchor={right ? 'start' : 'end'} dominantBaseline="central" fontSize={13} fill="#1F2A2E">
          {p.name} ({String(p.value)})
        </text>
      </g>
    );
  };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="49%"
          outerRadius="70%"
          startAngle={90}
          endAngle={-270}
          stroke="none"
          label={renderLabel}
          labelLine={false}
          isAnimationActive={false}
        >
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle.contentStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Trend: mint bars with a periwinkle line and dots. */
export function TrendChart<T extends Row>({
  data, x, bar, line, height = 240,
}: {
  data: T[];
  x: string;
  bar: { key: string; label: string };
  line: { key: string; label: string };
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey={x} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis yAxisId="l" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis yAxisId="r" orientation="right" tick={AXIS} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
        <Tooltip {...tooltipStyle} />
        <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <Bar yAxisId="l" dataKey={bar.key} name={bar.label} fill="#B1D0CA" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Line yAxisId="r" dataKey={line.key} name={line.label} stroke="#828BFC" strokeWidth={2} dot={{ r: 4, fill: '#828BFC' }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/**
 * Horizontal bars for comparing suppliers: category labels on the left, the
 * exact value printed at the end of each bar, light vertical gridlines.
 * Values show on hover and on keyboard focus (accessibilityLayer).
 */
export function HBars<T extends Row>({
  data, y, x, format, onBarClick, color = CHART.primary, highlight, rowHeight = 38, labelWidth = 150,
}: {
  data: T[];
  y: string;
  x: string;
  format: (v: number) => string;
  onBarClick?: (d: T) => void;
  color?: string;
  highlight?: (d: T) => boolean;
  rowHeight?: number;
  labelWidth?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * rowHeight + 28)}>
      <BarChart accessibilityLayer layout="vertical" data={data} margin={{ top: 4, right: 72, left: 0, bottom: 4 }} barCategoryGap={10}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => String(v)} />
        <YAxis type="category" dataKey={y} width={labelWidth} tick={{ ...AXIS, fill: CHART.ink, fontSize: 13 }} tickLine={false} axisLine={false} />
        <Tooltip {...tooltipStyle} formatter={(v) => format(Number(v))} />
        <Bar
          dataKey={x}
          fill={color}
          radius={[0, 4, 4, 0]}
          maxBarSize={22}
          onClick={onBarClick ? (d) => onBarClick((d as unknown as { payload: T }).payload) : undefined}
          className={onBarClick ? 'cursor-pointer' : undefined}
        >
          {highlight && data.map((d, i) => <Cell key={i} fill={highlight(d) ? color : '#7FAEB4'} />)}
          <LabelList dataKey={x} position="right" formatter={(v: unknown) => format(Number(v))} style={{ fontSize: 12, fill: CHART.ink, fontVariantNumeric: 'tabular-nums' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Horizontal stacked bars (e.g. credits recovered vs missed), legend above, totals by hover/focus. */
export function StackedHBars<T extends Row>({
  data, y, series, format, rowHeight = 44, labelWidth = 130,
}: {
  data: T[];
  y: string;
  series: { key: string; label: string; color: string }[];
  format: (v: number) => string;
  rowHeight?: number;
  labelWidth?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={data.length * rowHeight + 64}>
      <BarChart accessibilityLayer layout="vertical" data={data} margin={{ top: 0, right: 16, left: 0, bottom: 4 }} barCategoryGap={12}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey={y} width={labelWidth} tick={{ ...AXIS, fill: CHART.ink, fontSize: 13 }} tickLine={false} axisLine={false} />
        <Tooltip {...tooltipStyle} formatter={(v, name) => [format(Number(v)), name]} />
        <Legend verticalAlign="top" align="left" iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, paddingBottom: 8, color: CHART.ink }} />
        {series.map((sr, i) => (
          <Bar key={sr.key} dataKey={sr.key} name={sr.label} stackId="a" fill={sr.color} maxBarSize={24} radius={i === series.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
