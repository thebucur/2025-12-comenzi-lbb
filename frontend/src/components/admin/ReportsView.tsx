import { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import { getTodayString } from '../../utils/date'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer,
} from 'recharts'

const CHART_COLORS = [
  '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#a855f7', '#0ea5e9', '#d946ef',
]

interface KPIs {
  totalOrders: number
  totalAdvance: number
  totalWeight: number
  totalFoiDeZahar: number
}

interface CofetarieStats {
  orders: number
  weight: number
  foiDeZahar: number
  advance: number
}

interface SortimentStats {
  orders: number
  weight: number
}

interface ReportData {
  kpis: KPIs
  byCofetarie: Record<string, CofetarieStats>
  bySortiment: Record<string, SortimentStats>
  byWeight: Record<string, number>
  byDeliveryMethod: Record<string, number>
  byShape: Record<string, number>
  byCoating: Record<string, number>
  dailyEvolution: Record<string, any>[]
  cofetarii: string[]
}

type Preset = '7d' | '30d' | '90d' | 'all'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function formatDateRo(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' })
}

export default function ReportsView() {
  const [preset, setPreset] = useState<Preset>('7d')
  const [startDate, setStartDate] = useState(daysAgo(7))
  const [endDate, setEndDate] = useState(getTodayString())
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (preset === '7d') { setStartDate(daysAgo(7)); setEndDate(getTodayString()) }
    else if (preset === '30d') { setStartDate(daysAgo(30)); setEndDate(getTodayString()) }
    else if (preset === '90d') { setStartDate(daysAgo(90)); setEndDate(getTodayString()) }
    else if (preset === 'all') { setStartDate(''); setEndDate('') }
  }, [preset])

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true)
      try {
        const params: Record<string, string> = {}
        if (startDate) params.startDate = startDate
        if (endDate) params.endDate = endDate
        const res = await api.get('/reports', { params })
        setData(res.data)
      } catch (err) {
        console.error('Failed to fetch reports', err)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [startDate, endDate])

  const cofetarieChartData = useMemo(() => {
    if (!data) return []
    return Object.entries(data.byCofetarie)
      .map(([name, stats]) => ({ name, comenzi: stats.orders, greutate: stats.weight, foiDeZahar: stats.foiDeZahar }))
      .sort((a, b) => b.comenzi - a.comenzi)
  }, [data])

  const sortimentChartData = useMemo(() => {
    if (!data) return []
    return Object.entries(data.bySortiment)
      .map(([name, stats]) => ({ name, comenzi: stats.orders, greutate: Math.round(stats.weight * 100) / 100 }))
      .sort((a, b) => b.comenzi - a.comenzi)
  }, [data])

  const deliveryPieData = useMemo(() => {
    if (!data) return []
    return Object.entries(data.byDeliveryMethod).map(([name, value]) => ({
      name: name === 'ridicare' ? 'Ridicare' : name === 'livrare' ? 'Livrare' : name,
      value,
    }))
  }, [data])

  const shapeChartData = useMemo(() => {
    if (!data) return []
    return Object.entries(data.byShape)
      .map(([name, value]) => ({ name, comenzi: value }))
      .sort((a, b) => b.comenzi - a.comenzi)
  }, [data])

  const coatingChartData = useMemo(() => {
    if (!data) return []
    return Object.entries(data.byCoating)
      .map(([name, value]) => ({ name, comenzi: value }))
      .sort((a, b) => b.comenzi - a.comenzi)
  }, [data])

  const presetBtn = (label: string, value: Preset) => (
    <button
      onClick={() => setPreset(value)}
      className={`px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 ${
        preset === value ? 'btn-active scale-105' : 'bg-primary/50 text-secondary hover:scale-102'
      }`}
    >
      {label}
    </button>
  )

  if (loading && !data) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4 animate-pulse">📊</div>
        <p className="text-xl font-bold text-secondary/50">Se incarca rapoartele...</p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="card-neumorphic">
        <h2 className="text-xl sm:text-2xl font-bold text-secondary mb-4">Perioada</h2>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {presetBtn('7 zile', '7d')}
          {presetBtn('30 zile', '30d')}
          {presetBtn('90 zile', '90d')}
          {presetBtn('Tot', 'all')}
          <div className="flex items-center gap-2 ml-0 sm:ml-4">
            <input
              type="date"
              value={startDate}
              onChange={e => { setPreset('all'); setStartDate(e.target.value) }}
              className="px-3 py-2 rounded-xl bg-white/70 border border-purple-200 text-secondary text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <span className="text-secondary/60 font-bold">—</span>
            <input
              type="date"
              value={endDate}
              onChange={e => { setPreset('all'); setEndDate(e.target.value) }}
              className="px-3 py-2 rounded-xl bg-white/70 border border-purple-200 text-secondary text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Comenzi" value={data.kpis.totalOrders} icon="📦" />
        <KpiCard label="Total Avans" value={`${data.kpis.totalAdvance.toLocaleString('ro-RO')} RON`} icon="💰" />
        <KpiCard label="Greutate Totala" value={`${data.kpis.totalWeight.toLocaleString('ro-RO')} KG`} icon="⚖️" />
        <KpiCard label="Foi de Zahar" value={data.kpis.totalFoiDeZahar} icon="🖼️" />
      </div>

      {/* Comenzi per Cofetarie Bar Chart */}
      {cofetarieChartData.length > 0 && (
        <div className="card-neumorphic">
          <h3 className="text-lg sm:text-xl font-bold text-secondary mb-4">Comenzi per Cofetarie</h3>
          <div className="w-full" style={{ height: Math.max(250, cofetarieChartData.length * 50) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cofetarieChartData} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  formatter={(value, name) => {
                    if (name === 'comenzi') return [value, 'Comenzi']
                    if (name === 'greutate') return [`${value} KG`, 'Greutate']
                    if (name === 'foiDeZahar') return [value, 'Foi de zahar']
                    return [value, String(name)]
                  }}
                />
                <Legend formatter={(value) => {
                  if (value === 'comenzi') return 'Comenzi'
                  if (value === 'greutate') return 'Greutate (KG)'
                  if (value === 'foiDeZahar') return 'Foi de zahar'
                  return value
                }} />
                <Bar dataKey="comenzi" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                <Bar dataKey="greutate" fill="#10b981" radius={[0, 6, 6, 0]} />
                <Bar dataKey="foiDeZahar" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Daily Evolution Line Chart */}
      {data.dailyEvolution.length > 0 && (
        <div className="card-neumorphic">
          <h3 className="text-lg sm:text-xl font-bold text-secondary mb-4">Evolutia Comenzilor</h3>
          <div className="w-full" style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dailyEvolution} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tickFormatter={formatDateRo} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  labelFormatter={(label) => formatDateRo(label as string)}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="total" name="Total" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                {data.cofetarii.map((c, i) => (
                  <Line
                    key={c}
                    type="monotone"
                    dataKey={c}
                    name={c}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Per-Cofetarie Table */}
      {cofetarieChartData.length > 0 && (
        <div className="card-neumorphic overflow-hidden">
          <h3 className="text-lg sm:text-xl font-bold text-secondary mb-4">Detalii per Cofetarie</h3>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b-2 border-purple-200">
                  <th className="px-3 py-3 text-left font-bold text-secondary">Cofetarie</th>
                  <th className="px-3 py-3 text-right font-bold text-secondary">Nr. Comenzi</th>
                  <th className="px-3 py-3 text-right font-bold text-secondary">Greutate (KG)</th>
                  <th className="px-3 py-3 text-right font-bold text-secondary">Foi de Zahar</th>
                  <th className="px-3 py-3 text-right font-bold text-secondary">Avans (RON)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.byCofetarie)
                  .sort(([, a], [, b]) => b.orders - a.orders)
                  .map(([name, stats]) => (
                    <tr key={name} className="border-b border-purple-100 hover:bg-purple-50/50 transition-colors">
                      <td className="px-3 py-3 font-semibold text-secondary">{name}</td>
                      <td className="px-3 py-3 text-right text-secondary">{stats.orders}</td>
                      <td className="px-3 py-3 text-right text-secondary">{(Math.round(stats.weight * 100) / 100).toLocaleString('ro-RO')}</td>
                      <td className="px-3 py-3 text-right text-secondary">{stats.foiDeZahar}</td>
                      <td className="px-3 py-3 text-right text-secondary">{(Math.round(stats.advance * 100) / 100).toLocaleString('ro-RO')}</td>
                    </tr>
                  ))}
                <tr className="border-t-2 border-purple-300 bg-purple-50/70 font-bold">
                  <td className="px-3 py-3 text-secondary">TOTAL</td>
                  <td className="px-3 py-3 text-right text-secondary">{data.kpis.totalOrders}</td>
                  <td className="px-3 py-3 text-right text-secondary">{data.kpis.totalWeight.toLocaleString('ro-RO')}</td>
                  <td className="px-3 py-3 text-right text-secondary">{data.kpis.totalFoiDeZahar}</td>
                  <td className="px-3 py-3 text-right text-secondary">{data.kpis.totalAdvance.toLocaleString('ro-RO')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Produse Section */}
      {sortimentChartData.length > 0 && (
        <div className="card-neumorphic">
          <h3 className="text-lg sm:text-xl font-bold text-secondary mb-4">Produse</h3>
          <div className="w-full" style={{ height: Math.max(250, sortimentChartData.length * 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortimentChartData} layout="vertical" margin={{ left: 30, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  formatter={(value, name) => {
                    if (name === 'comenzi') return [value, 'Comenzi']
                    if (name === 'greutate') return [`${value} KG`, 'Greutate']
                    return [value, String(name)]
                  }}
                />
                <Legend formatter={(value) => value === 'comenzi' ? 'Comenzi' : value === 'greutate' ? 'Greutate (KG)' : value} />
                <Bar dataKey="comenzi" fill="#ec4899" radius={[0, 6, 6, 0]} />
                <Bar dataKey="greutate" fill="#06b6d4" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Produse Table */}
          <div className="mt-4 overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b-2 border-purple-200">
                  <th className="px-3 py-3 text-left font-bold text-secondary">Produs</th>
                  <th className="px-3 py-3 text-right font-bold text-secondary">Nr. Comenzi</th>
                  <th className="px-3 py-3 text-right font-bold text-secondary">Greutate Totala (KG)</th>
                </tr>
              </thead>
              <tbody>
                {sortimentChartData.map(s => (
                  <tr key={s.name} className="border-b border-purple-100 hover:bg-purple-50/50 transition-colors">
                    <td className="px-3 py-3 font-semibold text-secondary">{s.name}</td>
                    <td className="px-3 py-3 text-right text-secondary">{s.comenzi}</td>
                    <td className="px-3 py-3 text-right text-secondary">{s.greutate.toLocaleString('ro-RO')}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-purple-300 bg-purple-50/70 font-bold">
                  <td className="px-3 py-3 text-secondary">TOTAL</td>
                  <td className="px-3 py-3 text-right text-secondary">
                    {sortimentChartData.reduce((s, x) => s + x.comenzi, 0)}
                  </td>
                  <td className="px-3 py-3 text-right text-secondary">
                    {(Math.round(sortimentChartData.reduce((s, x) => s + x.greutate, 0) * 100) / 100).toLocaleString('ro-RO')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bottom Row: Delivery Pie + Shape + Coating */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Delivery Method Pie */}
        {deliveryPieData.length > 0 && (
          <div className="card-neumorphic">
            <h3 className="text-lg font-bold text-secondary mb-4">Ridicare / Livrare</h3>
            <div className="w-full" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deliveryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={(props: any) => `${props.name} ${((props.percent || 0) * 100).toFixed(0)}%`}
                  >
                    {deliveryPieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Shape Distribution */}
        {shapeChartData.length > 0 && (
          <div className="card-neumorphic">
            <h3 className="text-lg font-bold text-secondary mb-4">Forme</h3>
            <div className="w-full" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shapeChartData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="comenzi" name="Comenzi" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Coating Distribution */}
        {coatingChartData.length > 0 && (
          <div className="card-neumorphic">
            <h3 className="text-lg font-bold text-secondary mb-4">Glazuri</h3>
            <div className="w-full" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coatingChartData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="comenzi" name="Comenzi" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="card-neumorphic text-center">
      <div className="text-3xl sm:text-4xl mb-2">{icon}</div>
      <div className="text-2xl sm:text-3xl font-extrabold text-secondary">{value}</div>
      <div className="text-xs sm:text-sm font-semibold text-secondary/60 mt-1">{label}</div>
    </div>
  )
}
