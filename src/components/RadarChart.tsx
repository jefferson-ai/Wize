import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText, TSpan } from 'react-native-svg';

interface RadarDataPoint {
  label: string;
  current: number;
  previous: number;
}

interface RadarChartProps {
  data: RadarDataPoint[];
  size?: number;
  currentColor?: string;
  previousColor?: string;
  gridColor?: string;
  labelColor?: string;
  isFocused?: boolean;
}

const formatCompact = (n: number): string => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return Math.round(n).toString();
};

export default function RadarChart({
  data,
  size = 210,
  currentColor = '#5c5c8c',
  previousColor = '#b5894e',
  gridColor = '#e5e7eb',
  labelColor = '#64748b',
  isFocused = true,
}: RadarChartProps) {
  if (!data || data.length < 3) return null;

  const fullWidth = size + 160;
  const fullHeight = size + 80;
  const cx = fullWidth / 2;
  const cy = fullHeight / 2;
  const radius = size * 0.38;
  const labelOffset = size * 0.50; // Pull labels in slightly closer to the vertices
  const N = data.length;
  const levels = 4;

  const allValues = data.flatMap(d => [d.current, d.previous]);
  const maxValue = Math.max(...allValues, 1);

  const angleOf = (i: number) => (Math.PI * 2 * i) / N - Math.PI / 2;

  const [animProgress, setAnimProgress] = useState(isFocused ? 0 : 1);

  useEffect(() => {
    if (!isFocused) {
      setAnimProgress(0);
      return;
    }
    
    let start = Date.now();
    let animationFrameId: number;
    const duration = 600; // ms
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - start) / duration, 1);
      // Cubic ease out
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAnimProgress(easeOut);
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };
    
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isFocused, data]);

  const pointAt = (i: number, value: number) => {
    const angle = angleOf(i);
    const r = (value / maxValue) * radius * Math.max(0.01, animProgress);
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const gridPointAt = (i: number, level: number) => {
    const angle = angleOf(i);
    const r = (radius * level) / levels;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  // Grid polygons
  const grids = Array.from({ length: levels }, (_, lvl) =>
    Array.from({ length: N }, (_, i) => {
      const p = gridPointAt(i, lvl + 1);
      return `${p.x},${p.y}`;
    }).join(' ')
  );

  // Data polygons
  const currentPoly = data
    .map((d, i) => { const p = pointAt(i, d.current); return `${p.x},${p.y}`; })
    .join(' ');
  const previousPoly = data
    .map((d, i) => { const p = pointAt(i, d.previous); return `${p.x},${p.y}`; })
    .join(' ');

  // Text anchor based on angle
  const getAnchor = (angle: number): 'start' | 'middle' | 'end' => {
    const cos = Math.cos(angle);
    if (cos > 0.15) return 'start';
    if (cos < -0.15) return 'end';
    return 'middle';
  };

  // Vertical position adjust
  const getDy = (angle: number): number => {
    const sin = Math.sin(angle);
    if (sin < -0.5) return -2;
    if (sin > 0.5) return 12;
    return 4;
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={fullWidth} height={fullHeight} viewBox={`0 0 ${fullWidth} ${fullHeight}`}>
        {/* Grid polygons */}
        {grids.map((points, i) => (
          <Polygon
            key={`g${i}`}
            points={points}
            fill="none"
            stroke={gridColor}
            strokeWidth={0.8}
            opacity={0.5 + i * 0.15}
          />
        ))}

        {/* Axis lines */}
        {data.map((_, i) => {
          const p = gridPointAt(i, levels);
          return (
            <Line
              key={`a${i}`}
              x1={cx} y1={cy} x2={p.x} y2={p.y}
              stroke={gridColor}
              strokeWidth={0.6}
              opacity={0.5}
            />
          );
        })}

        {/* Previous month polygon */}
        <Polygon
          points={previousPoly}
          fill={previousColor}
          fillOpacity={0.06}
          stroke={previousColor}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Current month polygon */}
        <Polygon
          points={currentPoly}
          fill={currentColor}
          fillOpacity={0.1}
          stroke={currentColor}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />

        {/* Dots — previous */}
        {data.map((d, i) => {
          const p = pointAt(i, d.previous);
          return <Circle key={`dp${i}`} cx={p.x} cy={p.y} r={2.5} fill={previousColor} />;
        })}

        {/* Dots — current */}
        {data.map((d, i) => {
          const p = pointAt(i, d.current);
          return <Circle key={`dc${i}`} cx={p.x} cy={p.y} r={3} fill={currentColor} />;
        })}

        {/* Labels with values */}
        {data.map((d, i) => {
          const angle = angleOf(i);
          const lx = cx + labelOffset * Math.cos(angle);
          const ly = cy + labelOffset * Math.sin(angle);
          const anchor = getAnchor(angle);
          const dy = getDy(angle);

          return (
            <React.Fragment key={`lbl${i}`}>
              {/* Values line */}
              <SvgText
                x={lx}
                y={ly + dy - 7}
                textAnchor={anchor}
                fontSize={8.5}
                fontWeight="700"
                fill={labelColor}
              >
                {`${formatCompact(d.current)} / ${formatCompact(d.previous)}`}
              </SvgText>
              {/* Category name */}
              <SvgText
                x={lx}
                y={ly + dy + 4}
                textAnchor={anchor}
                fontSize={7.5}
                fill={labelColor}
                fontWeight="500"
                opacity={0.9}
              >
                {d.label.length > 14 ? d.label.slice(0, 13) + '…' : d.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}
