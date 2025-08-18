"use client";

import React, { useMemo } from 'react';
import type { Expense, Wife } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartTooltipContent } from '@/components/ui/chart';
import { WifeIcon } from './WifeIcon';

interface DashboardProps {
  expenses: Expense[];
  loading: boolean;
}

const StatCard = ({ title, value, loading, icon }: { title: string, value: string | React.ReactNode, loading: boolean, icon?: React.ReactNode }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-8 w-3/4" />
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
    </CardContent>
  </Card>
);

export default function Dashboard({ expenses, loading }: DashboardProps) {
  const stats = useMemo(() => {
    if (!expenses || expenses.length === 0) {
      return {
        totalSpend: 0,
        spendPerWife: [],
        mostExpensiveItem: { item: '-', price: 0 },
        mostFrequentItem: { item: '-', count: 0 },
        everydayItems: [],
      };
    }

    const totalSpend = expenses.reduce((acc, exp) => acc + Number(exp.price), 0);

    const spendPerWife = (['Wife A', 'Wife B', 'Wife C'] as Wife[]).map(wife => {
      const total = expenses
        .filter(exp => exp.wife === wife)
        .reduce((acc, exp) => acc + Number(exp.price), 0);
      return { name: wife, total };
    });

    const mostExpensiveItem = expenses.reduce(
      (max, exp) => (Number(exp.price) > max.price ? { item: exp.item, price: Number(exp.price) } : max),
      { item: '', price: 0 }
    );

    const itemCounts = expenses.reduce((acc, exp) => {
      acc[exp.item] = (acc[exp.item] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const mostFrequentItem = Object.entries(itemCounts).reduce(
      (max, [item, count]) => (count > max.count ? { item, count } : max),
      { item: '', count: 0 }
    );
    
    const dailyItems = expenses.reduce((acc, exp) => {
        if (!acc[exp.item]) acc[exp.item] = new Set();
        acc[exp.item].add(exp.date);
        return acc;
    }, {} as Record<string, Set<string>>);

    const everydayItems = Object.entries(dailyItems)
        .filter(([, dates]) => dates.size >= 20)
        .map(([item]) => item);

    return { totalSpend, spendPerWife, mostExpensiveItem, mostFrequentItem, everydayItems };
  }, [expenses]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard 
        title="Total Monthly Spend" 
        value={`₦${stats.totalSpend.toLocaleString()}`} 
        loading={loading}
      />
      <StatCard
        title="Most Expensive Item"
        value={
          <span className="truncate">{stats.mostExpensiveItem.item} (₦{stats.mostExpensiveItem.price.toLocaleString()})</span>
        }
        loading={loading}
      />
      <StatCard
        title="Most Frequent Item"
        value={`${stats.mostFrequentItem.item} (${stats.mostFrequentItem.count} times)`}
        loading={loading}
      />
       <StatCard
        title="Everyday Items"
        value={stats.everydayItems.length > 0 ? stats.everydayItems.join(', ') : '-'}
        loading={loading}
      />
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle>Spend per Wife</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
            {loading ? (
                <div className="w-full h-[350px] flex items-center justify-center">
                    <Skeleton className="w-full h-full" />
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={stats.spendPerWife}>
                    <XAxis
                        dataKey="name"
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `₦${Number(value) / 1000}k`}
                    />
                    <Tooltip 
                        cursor={{ fill: 'hsl(var(--accent) / 0.1)' }}
                        content={<ChartTooltipContent formatter={(value) => `₦${Number(value).toLocaleString()}`} />}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
