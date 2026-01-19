'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface PerformanceData {
  testName: string;
  avgScore: number;
  attempts: number;
}

interface PerformanceChartProps {
  data: PerformanceData[];
}

// Helper function to determine bar color based on score
// Using explicit color values to ensure visibility in both light and dark modes
const getColorByScore = (score: number, isDark: boolean): string => {
  if (score >= 80) {
    // Green - Excellent
    return isDark ? '#4ade80' : '#22c55e'; // green-400 / green-500
  }
  if (score >= 60) {
    // Orange - Good
    return isDark ? '#fb923c' : '#f97316'; // orange-400 / orange-500
  }
  // Red - Needs Work
  return isDark ? '#f87171' : '#ef4444'; // red-400 / red-500
};

export function PerformanceChart({ data }: PerformanceChartProps) {
  // Detect dark mode
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial theme
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark') ||
                window.matchMedia('(prefers-color-scheme: dark)').matches);
    };

    checkTheme();

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Watch for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => checkTheme();
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Improved empty state
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
          <CardDescription>Average scores by test</CardDescription>
        </CardHeader>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <TrendingUp className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="font-medium">No test results yet</p>
            <p className="text-sm mt-1">
              Performance data will appear when students complete tests
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Overview</CardTitle>
        <CardDescription>Average scores by test</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            {/* Updated grid with reduced opacity and no vertical lines */}
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              strokeOpacity={0.2}
              vertical={false}
            />

            <XAxis
              dataKey="testName"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
            />

            {/* Enhanced tooltip with score color and attempts */}
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;

                const data = payload[0].payload as PerformanceData;
                const scoreColor =
                  data.avgScore >= 80 ? 'text-green-600 dark:text-green-400' :
                  data.avgScore >= 60 ? 'text-orange-600 dark:text-orange-400' :
                  'text-red-600 dark:text-red-400';

                return (
                  <div className="rounded-lg border bg-background p-3 shadow-lg">
                    <p className="font-semibold text-sm mb-2">{data.testName}</p>
                    <div className="space-y-1 text-xs">
                      <p className={scoreColor}>
                        <span className="font-medium">Score:</span> {data.avgScore}%
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">Attempts:</span> {data.attempts}
                      </p>
                    </div>
                  </div>
                );
              }}
            />

            {/* Legend with performance key */}
            <Legend
              content={() => (
                <div className="flex justify-center gap-6 text-xs mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span className="text-muted-foreground">Excellent (80-100%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-orange-500" />
                    <span className="text-muted-foreground">Good (60-79%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500" />
                    <span className="text-muted-foreground">Needs Work (&lt;60%)</span>
                  </div>
                </div>
              )}
            />

            {/* Bar with Cell-based conditional coloring */}
            <Bar
              dataKey="avgScore"
              radius={[6, 6, 0, 0]}
              maxBarSize={60}
              isAnimationActive={true}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getColorByScore(entry.avgScore, isDark)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
