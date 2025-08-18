"use client";

import React, { useMemo } from 'react';
import type { Expense, Wife, ExpenseCategory } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Pie, PieChart, Cell, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { WifeIcon } from './WifeIcon';
import { EXPENSE_CATEGORIES } from '@/types';

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

const chartConfig = {
  total: {
    label: "Total",
  },
  'Wife A': {
    label: 'Wife A',
    color: 'hsl(var(--chart-1))',
  },
  'Wife B': {
    label: 'Wife B',
    color: 'hsl(var(--chart-2))',
  },
  'Wife C': {
    label: 'Wife C',
    color: 'hsl(var(--chart-3))',
  },
    'Breakfast': {
    label: 'Breakfast',
    color: 'hsl(var(--chart-1))',
  },
  'Lunch': {
    label: 'Lunch',
    color: 'hsl(var(--chart-2))',
  },
  'Dinner': {
    label: 'Dinner',
    color: 'hsl(var(--chart-3))',
  },
  'Other': {
    label: 'Other',
    color: 'hsl(var(--chart-4))',
  },
};


export default function Dashboard({ expenses, loading }: DashboardProps) {
  const stats = useMemo(() => {
    if (!expenses || expenses.length === 0) {
      return {
        totalSpend: 0,
        spendPerWife: [],
        spendPerCategory: [],
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
      return { name: wife, total, fill: `var(--color-${wife.replace(' ', '')})` };
    });
    
    const spendPerCategory = EXPENSE_CATEGORIES.map(category => {
        const total = expenses
            .filter(exp => exp.category === category)
            .reduce((acc, exp) => acc + Number(exp.price), 0);
        return { name: category, total, fill: `var(--color-${category})` };
    }).filter(c => c.total > 0);

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

    return { totalSpend, spendPerWife, spendPerCategory, mostExpensiveItem, mostFrequentItem, everydayItems };
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
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Spend per Wife</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
            {loading ? (
                <div className="w-full h-[350px] flex items-center justify-center">
                    <Skeleton className="w-full h-full" />
                </div>
            ) : (
                <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                    <BarChart accessibilityLayer data={stats.spendPerWife}>
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
                    <ChartTooltip 
                        cursor={{ fill: 'hsl(var(--accent) / 0.1)' }}
                        content={<ChartTooltipContent formatter={(value) => `₦${Number(value).toLocaleString()}`} />}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ChartContainer>
            )}
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Spend by Category</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
            {loading ? (
                <div className="w-full h-[350px] flex items-center justify-center">
                    <Skeleton className="w-full h-full" />
                </div>
            ) : (
                <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                    <PieChart accessibilityLayer>
                        <ChartTooltip 
                            cursor={{ fill: 'hsl(var(--accent) / 0.1)' }}
                            content={<ChartTooltipContent formatter={(value, name) => `${name}: ₦${Number(value).toLocaleString()}`} />}
                        />
                        <Pie
                            data={stats.spendPerCategory}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={120}
                            dataKey="total"
                        >
                            {stats.spendPerCategory.map((entry) => (
                                <Cell key={entry.name} fill={entry.fill} />
                            ))}
                        </Pie>
                    </PieChart>
                </ChartContainer>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
