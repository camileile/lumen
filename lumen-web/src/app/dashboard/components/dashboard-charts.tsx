"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import styles from "../dashboard.module.css";

export type ChartPoint = { day: string; value: number | null; observedDays?: number };

export function ScoreLine({ data, showAxis = false }: { data: ChartPoint[]; showAxis?: boolean }) {
  return <div className={styles.chartVisual} aria-hidden="true">
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: showAxis ? 25 : 5 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.10)" vertical={false} />
        <XAxis dataKey="day" hide={!showAxis} axisLine={false} tickLine={false}
          tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} interval={0} dy={10} />
        <Tooltip contentStyle={{ background: "#111720", border: "1px solid rgba(124,246,202,0.18)", borderRadius: 12, fontSize: 12, color: "#fff", boxShadow: "0 16px 40px rgba(0,0,0,.35)" }} itemStyle={{ color: "#7cf6ca" }} />
        <Line type="monotone" dataKey="value" stroke="#7cf6ca" strokeWidth={3} dot={{ r: 3, fill: "#151b25", stroke: "#7cf6ca", strokeWidth: 2 }}
          connectNulls={false} activeDot={{ r: 4, strokeWidth: 0 }} />
      </LineChart>
    </ResponsiveContainer>
  </div>;
}

export function WeeklyBars({ data }: { data: ChartPoint[] }) {
  return <div className={styles.chartVisual} aria-hidden="true">
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart data={data} margin={{ top: 10, right: 5, left: 5, bottom: 25 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.12)" vertical={false} />
        <XAxis dataKey="day" axisLine={false} tickLine={false}
          tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 10 }} interval={0} dy={10} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }}
          contentStyle={{ background: "#1a1c23", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, color: "#fff" }} />
        <Bar dataKey="value" fill="#7cf6ca" radius={[6, 6, 2, 2]} barSize={24} opacity={0.92} />
      </BarChart>
    </ResponsiveContainer>
  </div>;
}

export function ChartDataTable({ caption, data }: { caption: string; data: ChartPoint[] }) {
  return <details className={styles.chartTableDetails}>
    <summary>Ver dados em tabela</summary>
    <div className={styles.tableScroll}>
      <table className={styles.chartTable}>
        <caption>{caption}</caption>
        <thead><tr><th scope="col">Período</th><th scope="col">Estimativa</th><th scope="col">Observações</th></tr></thead>
        <tbody>{data.map((point) => <tr key={point.day}><th scope="row">{point.day}</th><td>{point.value ?? "Indisponível"}</td><td>{point.observedDays ?? "—"}</td></tr>)}</tbody>
      </table>
    </div>
  </details>;
}
