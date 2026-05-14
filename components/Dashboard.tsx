'use client';

import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHECK_VALUES, normalizePayment, parseDate, toYen, type PaymentKey, type PetRow, type SaleRow } from '@/lib/dashboard';

type ItemRow = { petId: string; itemName: string; category: string; amount: number };

const toKey = (v: unknown) => String(v ?? '').trim().replace(/\s+/g, '').normalize('NFKC');
const findKey = (obj: Record<string, unknown>, candidates: string[]) => Object.keys(obj).find((k) => candidates.includes(toKey(k)));
const getVal = (row: Record<string, unknown>, names: string[]) => {
  const key = findKey(row, names.map((n) => toKey(n)));
  return key ? row[key] : '';
};
const normalizePetId = (v: unknown) => toKey(v);
const toNum = (v: unknown) => {
  if (typeof v === 'number') return Math.round(v);
  const n = Number(String(v ?? '').replace(/[￥¥円,\s]/g, '').replace(/−/g, '-').normalize('NFKC'));
  return Number.isFinite(n) ? Math.round(n) : 0;
};

export default function Dashboard() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [pets, setPets] = useState<PetRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [salesCols, setSalesCols] = useState<string[]>([]);
  const [itemCols, setItemCols] = useState<string[]>([]);
  const [petCols, setPetCols] = useState<string[]>([]);

  const parseSheet = async (file: File) => {
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'sales' | 'pets' | 'items') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const rows = await parseSheet(file);
    const cols = rows[0] ? Object.keys(rows[0]) : [];

    if (type === 'sales') {
      setSalesCols(cols);
      setSales(rows.map((r) => ({
        date: parseDate(getVal(r, ['請求日', '請求日付', '日付'])),
        invoiceId: String(getVal(r, ['請求id', '会計id', '伝票番号', '請求番号'])),
        petId: normalizePetId(getVal(r, ['ペットid', '対象ペットid'])),
        itemName: '',
        itemCategory: '',
        amount: toNum(getVal(r, ['支払/返金額', '支払額', '返金額', '金額', '売上金額', '請求金額'])),
        paymentMethod: String(getVal(r, ['支払/返金方法', '支払方法', '返金方法', '決済方法']))
      })).filter((r) => r.amount !== 0));
      return;
    }

    if (type === 'items') {
      setItemCols(cols);
      setItems(rows.map((r) => ({
        petId: normalizePetId(getVal(r, ['ペットid', '対象ペットid'])),
        itemName: String(getVal(r, ['診療項目名', '項目名'])) || '不明',
        category: String(getVal(r, ['診療カテゴリ', 'カテゴリ'])) || '不明',
        amount: toNum(getVal(r, ['支払/返金額', '支払額', '返金額', '金額', '売上金額', '請求金額']))
      })).filter((r) => r.amount !== 0));
      return;
    }

    setPetCols(cols);
    setPets(rows.map((r) => ({
      petId: normalizePetId(getVal(r, ['ペットid', '対象ペットid'])),
      species: String(getVal(r, ['動物種別', '種別']) || '不明'),
      breed: String(getVal(r, ['品種']) || '不明'),
      age: (() => { const n = toNum(getVal(r, ['年齢'])); return n <= 0 ? null : n; })()
    })));
  };

  const agg = useMemo(() => {
    const total = sales.reduce((s, r) => s + r.amount, 0);
    const invoiceSet = new Set(sales.map((x) => x.invoiceId).filter(Boolean));
    const invoiceCount = invoiceSet.size > 0 ? invoiceSet.size : sales.length;
    const byPayment = Object.entries(sales.reduce<Record<PaymentKey, { amount: number; count: number }>>((a, r) => { const k = normalizePayment(r.paymentMethod); a[k].amount += r.amount; a[k].count++; return a; }, { 現金: { amount: 0, count: 0 }, カード: { amount: 0, count: 0 }, アプリ決済: { amount: 0, count: 0 }, 電子マネー: { amount: 0, count: 0 }, その他: { amount: 0, count: 0 } })).map(([name, v]) => ({ name, ...v }));
    const byDate = Object.entries(sales.reduce<Record<string, number>>((a, r) => ((a[r.date || '不明'] = (a[r.date || '不明'] || 0) + r.amount), a), {})).map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date));
    const byItem = Object.entries(items.reduce<Record<string, number>>((a, r) => ((a[r.itemName || '不明'] = (a[r.itemName || '不明'] || 0) + r.amount), a), {})).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 10);
    const byCategory = Object.entries(items.reduce<Record<string, number>>((a, r) => ((a[r.category || '不明'] = (a[r.category || '不明'] || 0) + r.amount), a), {})).map(([name, amount]) => ({ name, amount })).sort((a,b)=>b.amount-a.amount);

    const petMap = new Map(pets.filter((p) => p.petId).map((p) => [p.petId, p]));
    let linked = 0;
    let unlinked = 0;
    const bySpecies: Record<string, number> = {};
    const byBreed: Record<string, number> = {};
    const byAge: Record<string, number> = { '0-2歳': 0, '3-7歳': 0, '8-12歳': 0, '13歳以上': 0, 不明: 0 };
    sales.forEach((s) => {
      const p = petMap.get(normalizePetId(s.petId));
      if (p) linked++; else unlinked++;
      const species = p?.species || '不明';
      const breed = p?.breed || '不明';
      bySpecies[species] = (bySpecies[species] || 0) + s.amount;
      byBreed[breed] = (byBreed[breed] || 0) + s.amount;
      const age = p?.age;
      const bucket = age == null ? '不明' : age <= 2 ? '0-2歳' : age <= 7 ? '3-7歳' : age <= 12 ? '8-12歳' : '13歳以上';
      byAge[bucket] += s.amount;
    });

    return { total, invoiceCount, avg: invoiceCount ? Math.round(total / invoiceCount) : 0, byPayment, byDate, byItem, byCategory, bySpecies, byBreed, byAge, linked, unlinked };
  }, [sales, items, pets]);

  const checks = Object.entries(CHECK_VALUES.payments).map(([k, expected]) => ({ k, expected, actual: agg.byPayment.find((x) => x.name === k)?.amount || 0 }));

  return <main className='mx-auto max-w-7xl space-y-6 p-6'>
    <h1 className='text-2xl font-bold'>動物病院 月次売上ダッシュボード v0.1</h1>
    <div className='grid gap-4 rounded-xl bg-white p-4 shadow md:grid-cols-3'>
      <label>売上Excel<input className='mt-2 block' type='file' accept='.xlsx' onChange={(e) => handleUpload(e, 'sales')} /></label>
      <label>診療項目履歴Excel<input className='mt-2 block' type='file' accept='.xlsx' onChange={(e) => handleUpload(e, 'items')} /></label>
      <label>飼い主・ペットExcel<input className='mt-2 block' type='file' accept='.xlsx' onChange={(e) => handleUpload(e, 'pets')} /></label>
    </div>
    <section className='grid gap-3 md:grid-cols-4'>{[['売上合計', toYen(agg.total)], ['会計件数', `${agg.invoiceCount}件`], ['平均会計単価', toYen(agg.avg)], ['ユニークペット数', `${new Set(sales.map((s) => s.petId).filter(Boolean)).size}頭`]].map(([k, v]) => <div key={k} className='rounded-xl bg-white p-4 shadow'><p className='text-sm text-slate-500'>{k}</p><p className='text-xl font-semibold'>{v}</p></div>)}</section>
    <section className='rounded-xl bg-white p-4 shadow'><h2 className='mb-2 font-semibold'>決済別売上</h2>{agg.byPayment.map((p)=><div key={p.name} className='flex justify-between text-sm'><span>{p.name}</span><span>{toYen(p.amount)}</span></div>)}</section>
    <section className='rounded-xl bg-white p-4 shadow'><h2 className='mb-2 font-semibold'>診療項目 上位10</h2>{agg.byItem.map((r)=><div key={r.name} className='flex justify-between text-sm'><span>{r.name}</span><span>{toYen(r.amount)}</span></div>)}</section>
    <section className='rounded-xl bg-white p-4 shadow'><h2 className='mb-2 font-semibold'>診療カテゴリ</h2>{agg.byCategory.map((r)=><div key={r.name} className='flex justify-between text-sm'><span>{r.name}</span><span>{toYen(r.amount)}</span></div>)}</section>
    <section className='rounded-xl bg-white p-4 shadow'><h2 className='mb-2 font-semibold'>検算画面</h2><p className={agg.total===CHECK_VALUES.total?'text-green-600':'text-red-600'}>売上合計: {toYen(agg.total)} / 正解 {toYen(CHECK_VALUES.total)}</p>{checks.map((c)=><p key={c.k} className={c.actual===c.expected?'text-green-600':'text-red-600'}>{c.k}: {toYen(c.actual)} / 正解 {toYen(c.expected)}</p>)}</section>
    <section className='grid gap-4 md:grid-cols-3'>{[['動物種別売上',agg.bySpecies],['品種別売上',agg.byBreed],['年齢別売上',agg.byAge]].map(([title,map])=><div key={String(title)} className='rounded-xl bg-white p-4 shadow'><h2 className='mb-2 font-semibold'>{String(title)}</h2><div className='h-56'><ResponsiveContainer><PieChart><Pie data={Object.entries(map as Record<string,number>).map(([name,value])=>({name,value}))} dataKey='value' nameKey='name' outerRadius={80} fill='#8884d8' label /><Tooltip /></PieChart></ResponsiveContainer></div></div>)}</section>
    <section className='rounded-xl bg-white p-4 shadow text-sm'>
      <h2 className='mb-2 font-semibold'>デバッグ情報</h2>
      <p>売上Excel列名: {salesCols.join(' / ') || '(なし)'}</p>
      <p>診療項目履歴Excel列名: {itemCols.join(' / ') || '(なし)'}</p>
      <p>飼い主・ペット情報Excel列名: {petCols.join(' / ') || '(なし)'}</p>
      <p>ペットID紐付け成功件数: {agg.linked}</p>
      <p>ペットID紐付け失敗件数: {agg.unlinked}</p>
    </section>
  </main>;
}
