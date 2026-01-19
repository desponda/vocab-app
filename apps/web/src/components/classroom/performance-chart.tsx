'use client';

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
const getColorByScore = (score: number): string => {
  if (score >= 80) return 'url(#gradientSuccess)';
  if (score >= 60) return 'url(#gradientWarning)';
  return 'url(#gradientDanger)';
};

export function PerformanceChart({ data }: PerformanceChartProps) {
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
            {/* Gradient definitions for bars */}
            <defs>
              <linearGradient id="gradientSuccess" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--color-chart-success))" stopOpacity={0.9} />
                <stop offset="100%" stopColor="hsl(var(--color-chart-success))" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="gradientWarning" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--color-chart-warning))" stopOpacity={0.9} />
                <stop offset="100%" stopColor="hsl(var(--color-chart-warning))" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="gradientDanger" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--color-chart-danger))" stopOpacity={0.9} />
                <stop offset="100%" stopColor="hsl(var(--color-chart-danger))" stopOpacity={0.6} />
              </linearGradient>
            </defs>

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
                    <div className="w-3 h-3 rounded" style={{ background: 'hsl(var(--color-chart-success))' }} />
                    <span className="text-muted-foreground">Excellent (80-100%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ background: 'hsl(var(--color-chart-warning))' }} />
                    <span className="text-muted-foreground">Good (60-79%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ background: 'hsl(var(--color-chart-danger))' }} />
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
                  fill={getColorByScore(entry.avgScore)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
