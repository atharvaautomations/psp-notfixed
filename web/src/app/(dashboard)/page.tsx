'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import {
  Header,
  PageContainer,
  Card,
  CardHeader,
  CardContent,
  Section,
} from '@/components/global';
import { Button } from '@/components/ui/button';

import {
  UnitFilterSelect,
} from '@/app/(dashboard)/inventory/components/UnitFilterSelect';
import {
  DisplayUnit,
  UnitFilter,
  UNIT_LABELS,
  parseUnitFilter,
} from '@/hooks/useInventory';

import {
  useDashboardSummary,
  useDashboardActivity,
  useDashboardTrend,
  useDashboardTopMaterials,
} from '@/hooks/useDashboard';

import { useAlerts } from '@/hooks/useAlerts';

const DISPLAY_UNITS: DisplayUnit[] = ['KG', 'LITRE', 'NOS'];

export default function Index() {
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('All Units');
  const [filterReady, setFilterReady] = useState(false);

  useEffect(() => {
    setUnitFilter(
      parseUnitFilter(
        new URLSearchParams(window.location.search).get('unit')
      )
    );
    setFilterReady(true);
  }, []);

  useEffect(() => {
    if (!filterReady) return;

    const url = new URL(window.location.href);

    if (unitFilter === 'All Units') {
      url.searchParams.delete('unit');
    } else {
      url.searchParams.set('unit', unitFilter);
    }

    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  }, [unitFilter, filterReady]);

  const { data: summary, isLoading: summaryLoading } = useDashboardSummary({});
  const { data: activity = [], isLoading: activityLoading } =
    useDashboardActivity({ unit: unitFilter });
  const { data: trend = [], isLoading: trendLoading } = useDashboardTrend({
    unit: unitFilter,
  });
  const { data: topMaterials = [], isLoading: materialsLoading } =
    useDashboardTopMaterials({ unit: unitFilter });

  const { data: recentAlerts = [], isLoading: alertsLoading } = useAlerts();

  const loading =
    summaryLoading ||
    activityLoading ||
    trendLoading ||
    materialsLoading ||
    alertsLoading;

  const byUnitValues = summary?.byUnit;

  const totalMaterials = summary?.totalMaterials ?? 0;

  const recentActivity = useMemo(() => {
    return activity
      .slice()
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      .slice(0, 5);
  }, [activity]);

  const latestAlerts = useMemo(() => {
    return [...recentAlerts]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 10);
  }, [recentAlerts]);

  function UnitKpiValue({
    values,
    activeUnit,
    loading,
    valueClassName = 'text-gray-900',
  }: {
    values?: Record<DisplayUnit, number>;
    activeUnit: UnitFilter;
    loading: boolean;
    valueClassName?: string;
  }) {
    if (loading) {
      return <p className="mt-2 text-2xl font-bold text-gray-400">...</p>;
    }

    return (
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {DISPLAY_UNITS.map((unit, index) => {
          const dimmed = activeUnit !== 'All Units' && activeUnit !== unit;

          return (
            <span
              key={unit}
              className={`flex items-baseline gap-1 transition-opacity ${
                dimmed ? 'opacity-30' : ''
              }`}
            >
              <span className={`text-xl font-bold ${valueClassName}`}>
                {values?.[unit] ?? 0}
              </span>
              <span className="text-xs font-medium text-gray-500">
                {UNIT_LABELS[unit]}
              </span>
              {index < DISPLAY_UNITS.length - 1 && (
                <span className="ml-1 text-gray-300">/</span>
              )}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Header
          title="Dashboard"
          description="Welcome to the Rubber MES Production System"
          icon="📊"
        />

        <UnitFilterSelect
          value={unitFilter}
          onChange={setUnitFilter}
          className="sm:pt-2"
        />
      </div>

      {loading ? (
        <div className="mt-8 flex items-center justify-center h-96">
          <p className="text-sm text-gray-500">Loading dashboard data...</p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <h4 className="text-sm font-medium text-gray-600">Total Inward</h4>
              <UnitKpiValue
                values={
                  byUnitValues
                    ? {
                        KG: byUnitValues.KG.inward,
                        LITRE: byUnitValues.LITRE.inward,
                        NOS: byUnitValues.NOS.inward,
                      }
                    : undefined
                }
                activeUnit={unitFilter}
                loading={summaryLoading}
                valueClassName="text-blue-600"
              />
            </Card>

            <Card>
              <h4 className="text-sm font-medium text-gray-600">Total Outward</h4>
              <UnitKpiValue
                values={
                  byUnitValues
                    ? {
                        KG: byUnitValues.KG.outward,
                        LITRE: byUnitValues.LITRE.outward,
                        NOS: byUnitValues.NOS.outward,
                      }
                    : undefined
                }
                activeUnit={unitFilter}
                loading={summaryLoading}
                valueClassName="text-orange-600"
              />
            </Card>

            <Card>
              <h4 className="text-sm font-medium text-gray-600">Current Stock</h4>
              <UnitKpiValue
                values={
                  byUnitValues
                    ? {
                        KG: byUnitValues.KG.currentStock,
                        LITRE: byUnitValues.LITRE.currentStock,
                        NOS: byUnitValues.NOS.currentStock,
                      }
                    : undefined
                }
                activeUnit={unitFilter}
                loading={summaryLoading}
                valueClassName="text-green-600"
              />
            </Card>

            <Card>
              <h4 className="text-sm font-medium text-gray-600">Materials</h4>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-gray-900">
                  {totalMaterials}
                </span>
                <span className="text-xs text-gray-500">Total</span>
              </div>

              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-green-600">
                  {summary?.materialsInStock ?? 0}
                </span>
                <span className="text-xs text-gray-500">Available in Stock</span>
              </div>

              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="font-semibold text-red-600">
                  {summary?.materialsExpired ?? 0}
                </span>
                <span className="text-xs text-gray-500">Material Expired</span>
              </div>
            </Card>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-gray-900">
                  Recent Activity
                  {unitFilter !== 'All Units' && (
                    <span className="ml-2 text-xs font-medium text-gray-500">
                      ({UNIT_LABELS[unitFilter]})
                    </span>
                  )}
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-white"
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                          {item.type === 'inward' ? (
                            <span className="text-green-600 bg-green-50">↓</span>
                          ) : (
                            <span className="text-blue-600 bg-blue-50">↑</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 font-medium">
                            {item.materialName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.partyName} • {item.quantity} {item.unit}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(item.date).toLocaleDateString()} •{' '}
                            {item.status}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-sm text-gray-500">
                        No recent activity found.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Materials */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-gray-900">
                  Top Materials by Stock
                  {unitFilter !== 'All Units' && (
                    <span className="ml-2 text-xs font-medium text-gray-500">
                      ({UNIT_LABELS[unitFilter]})
                    </span>
                  )}
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topMaterials.length > 0 ? (
                    topMaterials.map((mat, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-gray-100 text-gray-700">
                            #{index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {mat.materialName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {mat.quantity} {mat.unit}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {mat.quantity.toLocaleString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-sm text-gray-500">
                        No materials in stock.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Section title="Quick Actions" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/inward">
                <Card className="p-4 text-center hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="text-2xl mb-2">📥</div>
                  <h4 className="font-medium text-gray-900">New Inward</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Record material receipt
                  </p>
                </Card>
              </Link>
              <Link href="/outward">
                <Card className="p-4 text-center hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="text-2xl mb-2">📤</div>
                  <h4 className="font-medium text-gray-900">New Outward</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Issue material for production
                  </p>
                </Card>
              </Link>
              <Link href="/ingredients">
                <Card className="p-4 text-center hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="text-2xl mb-2">🧪</div>
                  <h4 className="font-medium text-gray-900">Ingredients</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Manage ingredient definitions
                  </p>
                </Card>
              </Link>
              <Link href="/bins">
                <Card className="p-4 text-center hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="text-2xl mb-2">📦</div>
                  <h4 className="font-medium text-gray-900">Bins</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Assign material bins
                  </p>
                </Card>
              </Link>
            </div>
          </Section>

          {/* Trend Chart */}
          {trend.length > 0 && (
            <Section
              title="Inward vs Outward Trend"
              description={
                unitFilter !== 'All Units'
                  ? `(${UNIT_LABELS[unitFilter]})`
                  : undefined
              }
              className="mt-8"
            >
              <Card>
                <CardContent className="p-6">
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trend}>
                        <XAxis dataKey="month" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip />
                        <Legend />

                        {unitFilter === 'All Units' ? (
                          <>
                            <Bar
                              dataKey="inward"
                              name="Inward"
                              fill="#3b82f6"
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar
                              dataKey="outward"
                              name="Outward"
                              fill="#f97316"
                              radius={[4, 4, 0, 0]}
                            />
                          </>
                        ) : (
                          <>
                            <Bar
                              dataKey="inward"
                              name="Inward"
                              fill="#3b82f6"
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar
                              dataKey="outward"
                              name="Outward"
                              fill="#f97316"
                              radius={[4, 4, 0, 0]}
                            />
                          </>
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </Section>
          )}

          {/* Alerts Widget */}
          <Section
            title="Recent Alerts"
            description="Latest 10 system-generated alerts"
            className="mt-8"
          >
            <Card>
              <CardContent className="p-6">
                {latestAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-gray-500">
                      No alerts generated yet.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = '/alerts'}
                    >
                      Open Alerts Page
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {latestAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-white"
                      >
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                          {alert.type === 'MIN_STOCK' ? (
                            <span className="text-orange-600 bg-orange-50">⚠️</span>
                          ) : (
                            <span className="text-purple-600 bg-purple-50">📅</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {alert.title}
                          </p>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {alert.description}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {alert.materialName} • {alert.unit}
                          </p>
                          <p className="text-xs text-gray-400">
                            {`${new Date(alert.createdAt).toLocaleDateString()} ${new Date(alert.createdAt).toLocaleTimeString()}`}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full border ${
                            alert.status === 'Active'
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : 'bg-green-100 text-green-700 border-green-200'
                          }`}
                        >
                          {alert.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex justify-end">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/alerts">View All Alerts</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Section>
        </>
      )}
    </PageContainer>
  );
}
