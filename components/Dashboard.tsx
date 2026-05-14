'use client';
import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHECK_VALUES, normalizePayment, parseDate, SaleRow, toYen, type PaymentKey, type PetRow } from '@/lib/dashboard';

const pick = (obj: Record<string, unknown>, keys: string[]) => keys.find((k) => k in obj);
const toNum = (v: unknown) => (typeof v === 'number' ? Math.round(v) : Number(String(v ?? '').replace(/,/g, '')) || 0);

export default function Dashboard() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [pets, setPets] = useState<PetRow[]>([]);
  const parseSheet = async (file: File) => {
    const wb = XLSX.read(await file.arrayBuffer());
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  };
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'sales' | 'pets') => {
    const file = e.target.files?.[0]; if (!file) return; const rows = await parseSheet(file);
    if (type === 'sales') {
      setSales(rows.map((r) => ({
        date: parseDate(r[pick(r, ['請求日', '日付']) || '']), invoiceId: String(r[pick(r, ['請求ID', '会計ID', '伝票番号']) || '']),
        petId: String(r[pick(r, ['ペットID']) || '']), itemName: String(r[pick(r, ['診療項目名', '項目名']) || '']),
        itemCategory: String(r[pick(r, ['診療カテゴリ', 'カテゴリ']) || '']), amount: toNum(r[pick(r, ['金額', '売上金額', '請求金額']) || '']),
        paymentMethod: String(r[pick(r, ['支払方法', '決済方法', '返金方法']) || ''])
      })).filter((x) => x.amount !== 0));
    } else {
      setPets(rows.map((r) => ({ petId: String(r[pick(r, ['ペットID']) || '']), species: String(r[pick(r, ['動物種別', '種別']) || '不明']), breed: String(r[pick(r, ['品種']) || '不明']), age: pick(r, ['年齢']) ? toNum(r[pick(r, ['年齢'])!]) : null })));
    }
  };
  const agg = useMemo(() => {
    const total = sales.reduce((s, r) => s + r.amount, 0); const invoiceCount = new Set(sales.map((x) => x.invoiceId)).size; const petCount = new Set(sales.map((x) => x.petId)).size;
    const byPayment = Object.entries(sales.reduce<Record<PaymentKey, { amount: number; count: number }>>((a, r) => { const k = normalizePayment(r.paymentMethod); a[k].amount += r.amount; a[k].count++; return a; }, { 現金: { amount: 0, count: 0 }, カード: { amount: 0, count: 0 }, アプリ決済: { amount: 0, count: 0 }, 電子マネー: { amount: 0, count: 0 }, その他: { amount: 0, count: 0 } })).map(([name, v]) => ({ name, ...v }));
    const byDate = Object.entries(sales.reduce<Record<string, number>>((a, r) => ((a[r.date] = (a[r.date] || 0) + r.amount), a), {})).map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date));
    const byItem = Object.entries(sales.reduce<Record<string, number>>((a, r) => ((a[r.itemName || '不明'] = (a[r.itemName || '不明'] || 0) + r.amount), a), {})).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 10);
    const byCategory = Object.entries(sales.reduce<Record<string, number>>((a, r) => ((a[r.itemCategory || '不明'] = (a[r.itemCategory || '不明'] || 0) + r.amount), a), {})).map(([name, amount]) => ({ name, amount }));
    const petMap = new Map(pets.map((p) => [p.petId, p])); const bySpecies: Record<string, number> = {}; const byBreed: Record<string, number> = {}; const byAge: Record<string, number> = { '0-2歳': 0, '3-7歳': 0, '8-12歳': 0, '13歳以上': 0, '不明': 0 };
    sales.forEach((s) => { const p = petMap.get(s.petId); const sp = p?.species || '不明'; const br = p?.breed || '不明'; bySpecies[sp] = (bySpecies[sp] || 0) + s.amount; byBreed[br] = (byBreed[br] || 0) + s.amount; const age = p?.age; const bucket = age == null ? '不明' : age <= 2 ? '0-2歳' : age <= 7 ? '3-7歳' : age <= 12 ? '8-12歳' : '13歳以上'; byAge[bucket] += s.amount; });
    return { total, invoiceCount, petCount, avg: invoiceCount ? Math.round(total / invoiceCount) : 0, byPayment, byDate, byItem, byCategory, bySpecies, byBreed, byAge };
  }, [sales, pets]);

  const checks = Object.entries(CHECK_VALUES.payments).map(([k, expected]) => { const actual = agg.byPayment.find((x) => x.name === k)?.amount || 0; return { k, expected, actual, ok: expected === actual }; });

  return <main className="p-6 space-y-6 max-w-7xl mx-auto">
    <h1 className="text-2xl font-bold">動物病院 月次売上ダッシュボード v0.1</h1>
    <div className="grid md:grid-cols-2 gap-4 bg-white p-4 rounded-xl shadow">
      <label>売上Excel<input className="block mt-2" type="file" accept=".xlsx" onChange={(e) => handleUpload(e, 'sales')} /></label>
      <label>飼い主・ペットExcel<input className="block mt-2" type="file" accept=".xlsx" onChange={(e) => handleUpload(e, 'pets')} /></label>
    </div>
    <section className="grid md:grid-cols-4 gap-3">{[['売上合計', toYen(agg.total)], ['会計件数', `${agg.invoiceCount}件`], ['平均会計単価', toYen(agg.avg)], ['ユニークペット数', `${agg.petCount}頭`]].map(([k, v]) => <div key={k} className="bg-white rounded-xl p-4 shadow"><p className="text-sm text-slate-500">{k}</p><p className="text-xl font-semibold">{v}</p></div>)}</section>
    <section className="bg-white p-4 rounded-xl shadow"><h2 className="font-semibold mb-2">決済別売上</h2><div className="h-64"><ResponsiveContainer><BarChart data={agg.byPayment}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="amount" fill="#0ea5e9" /></BarChart></ResponsiveContainer></div></section>
    <section className="bg-white p-4 rounded-xl shadow"><h2 className="font-semibold mb-2">日別売上</h2><div className="h-64"><ResponsiveContainer><BarChart data={agg.byDate}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Bar dataKey="amount" fill="#22c55e" /></BarChart></ResponsiveContainer></div></section>
    <section className="grid md:grid-cols-2 gap-4"><div className="bg-white p-4 rounded-xl shadow"><h2 className="font-semibold mb-2">診療項目 上位10</h2>{agg.byItem.map((r) => <div key={r.name} className="flex justify-between text-sm py-1"><span>{r.name}</span><span>{toYen(r.amount)}</span></div>)}</div><div className="bg-white p-4 rounded-xl shadow"><h2 className="font-semibold mb-2">診療カテゴリ</h2>{agg.byCategory.map((r) => <div key={r.name} className="flex justify-between text-sm py-1"><span>{r.name}</span><span>{toYen(r.amount)}</span></div>)}</div></section>
    <section className="grid md:grid-cols-3 gap-4">{[['動物種別売上', agg.bySpecies], ['品種別売上', agg.byBreed], ['年齢別売上', agg.byAge]].map(([title, map]) => <div key={String(title)} className="bg-white p-4 rounded-xl shadow"><h2 className="font-semibold mb-2">{String(title)}</h2><div className="h-56"><ResponsiveContainer><PieChart><Pie data={Object.entries(map as Record<string, number>).map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" outerRadius={80} fill="#8884d8" label /><Tooltip /></PieChart></ResponsiveContainer></div></div>)}</section>
    <section className="bg-white p-4 rounded-xl shadow"><h2 className="font-semibold mb-2">検算画面</h2><p className={agg.total === CHECK_VALUES.total ? 'text-green-600' : 'text-red-600'}>売上合計: 実績 {toYen(agg.total)} / 正解 {toYen(CHECK_VALUES.total)} {agg.total === CHECK_VALUES.total ? '一致' : '不一致'}</p>{checks.map((c) => <p key={c.k} className={c.ok ? 'text-green-600' : 'text-red-600'}>{c.k}: 実績 {toYen(c.actual)} / 正解 {toYen(c.expected)} {c.ok ? '一致' : '不一致'}</p>)}</section>
  </main>;
}
