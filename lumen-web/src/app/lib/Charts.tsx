"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

type Point = { day: string; value: number };

export function ScoreLineChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={data}>
        <CartesianGrid strokeOpacity={0.12} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} />
        <Tooltip />
        <Line type="monotone" dataKey="value" strokeWidth={3} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function WeeklyBarChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data}>
        <CartesianGrid strokeOpacity={0.12} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} />
        <Tooltip />
        <Bar dataKey="value" />
      </BarChart>
    </ResponsiveContainer>
  );
}