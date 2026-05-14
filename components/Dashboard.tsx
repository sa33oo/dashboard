'use client';
import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHECK_VALUES, normalizePayment, parseDate, SaleRow, toYen, type PaymentKey, type PetRow } from '@/lib/dashboard';



export default function Dashboard() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [pets, setPets] = useState<PetRow[]>([]);

    <section className="grid md:grid-cols-4 gap-3">{[['売上合計', toYen(agg.total)], ['会計件数', `${agg.invoiceCount}件`], ['平均会計単価', toYen(agg.avg)], ['ユニークペット数', `${agg.petCount}頭`]].map(([k, v]) => <div key={k} className="bg-white rounded-xl p-4 shadow"><p className="text-sm text-slate-500">{k}</p><p className="text-xl font-semibold">{v}</p></div>)}</section>
    <section className="bg-white p-4 rounded-xl shadow"><h2 className="font-semibold mb-2">決済別売上</h2><div className="h-64"><ResponsiveContainer><BarChart data={agg.byPayment}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="amount" fill="#0ea5e9" /></BarChart></ResponsiveContainer></div></section>
    <section className="bg-white p-4 rounded-xl shadow"><h2 className="font-semibold mb-2">日別売上</h2><div className="h-64"><ResponsiveContainer><BarChart data={agg.byDate}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Bar dataKey="amount" fill="#22c55e" /></BarChart></ResponsiveContainer></div></section>
    <section className="grid md:grid-cols-2 gap-4"><div className="bg-white p-4 rounded-xl shadow"><h2 className="font-semibold mb-2">診療項目 上位10</h2>{agg.byItem.map((r) => <div key={r.name} className="flex justify-between text-sm py-1"><span>{r.name}</span><span>{toYen(r.amount)}</span></div>)}</div><div className="bg-white p-4 rounded-xl shadow"><h2 className="font-semibold mb-2">診療カテゴリ</h2>{agg.byCategory.map((r) => <div key={r.name} className="flex justify-between text-sm py-1"><span>{r.name}</span><span>{toYen(r.amount)}</span></div>)}</div></section>
    <section className="grid md:grid-cols-3 gap-4">{[['動物種別売上', agg.bySpecies], ['品種別売上', agg.byBreed], ['年齢別売上', agg.byAge]].map(([title, map]) => <div key={String(title)} className="bg-white p-4 rounded-xl shadow"><h2 className="font-semibold mb-2">{String(title)}</h2><div className="h-56"><ResponsiveContainer><PieChart><Pie data={Object.entries(map as Record<string, number>).map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" outerRadius={80} fill="#8884d8" label /><Tooltip /></PieChart></ResponsiveContainer></div></div>)}</section>
    <section className="bg-white p-4 rounded-xl shadow"><h2 className="font-semibold mb-2">検算画面</h2><p className={agg.total === CHECK_VALUES.total ? 'text-green-600' : 'text-red-600'}>売上合計: 実績 {toYen(agg.total)} / 正解 {toYen(CHECK_VALUES.total)} {agg.total === CHECK_VALUES.total ? '一致' : '不一致'}</p>{checks.map((c) => <p key={c.k} className={c.ok ? 'text-green-600' : 'text-red-600'}>{c.k}: 実績 {toYen(c.actual)} / 正解 {toYen(c.expected)} {c.ok ? '一致' : '不一致'}</p>)}</section>
  </main>;
}
