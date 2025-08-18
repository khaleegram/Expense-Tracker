"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Expense, ExpenseData, UniqueItem, Wife, Duty } from '@/types';
import Dashboard from '@/components/Dashboard';
import ExpenseForm from '@/components/ExpenseForm';
import ExpenseList from '@/components/ExpenseList';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, CookingPot, Utensils, Soup } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { getWifeOnDutyForDate } from '@/lib/duty';
import { Skeleton } from '@/components/ui/skeleton';
import { WifeIcon } from '@/components/WifeIcon';

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [uniqueItems, setUniqueItems] = useState<UniqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [todaysDuty, setTodaysDuty] = useState<Duty[] | null>(null);
  const [dutyLoading, setDutyLoading] = useState(true);

  const fetchExpensesAndItems = useCallback(async () => {
    setLoading(true);
    try {
      const expensesSnapshot = await getDocs(collection(db, 'expenses'));
      const expensesData = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      setExpenses(expensesData);

      const itemsSnapshot = await getDocs(collection(db, 'items'));
      const itemsData = itemsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as UniqueItem));
      const seen = new Set();
      const filteredItems = itemsData.filter(item => {
        const lowerCaseName = item.name.toLowerCase();
        const duplicate = seen.has(lowerCaseName);
        if (!duplicate) {
          seen.add(lowerCaseName);
        }
        return !duplicate;
      });
      setUniqueItems(filteredItems);

    } catch (error) {
      console.error("Error fetching data: ", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpensesAndItems();
  }, [fetchExpensesAndItems]);

  useEffect(() => {
    setDutyLoading(true);
    const { duty } = getWifeOnDutyForDate(new Date());
    setTodaysDuty(duty);
    setDutyLoading(false);
  }, []);
  
  const handleSaveExpenses = async (newExpenses: Omit<ExpenseData, 'date'>[], date: Date) => {
    const batch = writeBatch(db);
    const dateStr = format(date, 'yyyy-MM-dd');

    newExpenses.forEach(expense => {
      const expenseRef = doc(collection(db, 'expenses'));
      batch.set(expenseRef, { ...expense, date: dateStr });
    });

    // Add new unique items
    const currentItems = new Set(uniqueItems.map(item => item.name.toLowerCase()));
    for (const expense of newExpenses) {
        if (!currentItems.has(expense.item.toLowerCase())) {
            const itemRef = doc(collection(db, "items"));
            batch.set(itemRef, { name: expense.item });
            currentItems.add(expense.item.toLowerCase());
        }
    }

    await batch.commit();
    await fetchExpensesAndItems();
  };

  const handleUpdateExpense = async (id: string, updatedExpense: Partial<Expense>) => {
    const batch = writeBatch(db);
    const expenseRef = doc(db, 'expenses', id);
    batch.update(expenseRef, updatedExpense);
    await batch.commit();
    await fetchExpensesAndItems();
  };

  const handleDeleteExpense = async (id: string) => {
    const expenseRef = doc(db, 'expenses', id);
    const batch = writeBatch(db);
    batch.delete(expenseRef);
    await batch.commit();
    await fetchExpensesAndItems();
  };

  const filteredExpenses = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return expenses.filter(exp => {
      // Handle potential invalid date strings from Firestore
      if (!exp.date || typeof exp.date !== 'string') return false;
      const expDate = new Date(exp.date);
      if (isNaN(expDate.getTime())) return false;

      // Adjust for timezone differences by comparing date parts
      const expYear = expDate.getUTCFullYear();
      const expMonth = expDate.getUTCMonth();
      const startYear = start.getFullYear();
      const startMonth = start.getMonth();
      const endYear = end.getFullYear();
      const endMonth = end.getMonth();
      
      const isAfterStart = expYear > startYear || (expYear === startYear && expMonth >= startMonth);
      const isBeforeEnd = expYear < endYear || (expYear === endYear && expMonth <= endMonth);

      return isAfterStart && isBeforeEnd;
    });
  }, [expenses, currentMonth]);

  const changeMonth = (amount: number) => {
    setCurrentMonth(prev => amount > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
  };
  
  const mealIcons = {
    'Breakfast': <CookingPot className="h-5 w-5 text-amber-600" />,
    'Lunch': <Utensils className="h-5 w-5 text-cyan-600" />,
    'Dinner': <Soup className="h-5 w-5 text-indigo-600" />,
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="py-6 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Expense Eye</h1>
        </div>
      </header>
      
      <main className="p-4 md:px-8">
        <Card className="mb-6">
            <CardHeader>
                <CardTitle>Today's Duty ({format(new Date(), "do MMMM")})</CardTitle>
            </CardHeader>
            <CardContent>
                {dutyLoading ? (
                     <div className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-[150px]" />
                            <Skeleton className="h-4 w-[100px]" />
                        </div>
                    </div>
                ) : todaysDuty && todaysDuty.length > 0 ? (
                    <div className="flex flex-col sm:flex-row gap-4">
                        {todaysDuty.map(duty => (
                            <div key={duty.wife} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                                <WifeIcon wife={duty.wife} />
                                <div>
                                    <p className="font-semibold">{duty.wife}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        {duty.meals.map(meal => (
                                            <div key={meal} className="flex items-center gap-1.5" title={meal}>
                                                {mealIcons[meal as keyof typeof mealIcons]}
                                                <span className="text-sm text-muted-foreground">{meal}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>No duty information available for today.</p>
                )}
            </CardContent>
        </Card>


        <div className="flex justify-center items-center mb-6 gap-4">
          <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold text-center w-48">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button variant="outline" size="icon" onClick={() => changeMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <Dashboard expenses={filteredExpenses} loading={loading} />

        <div className="mt-8">
          <Tabs defaultValue="add-expense" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add-expense">Add Expense</TabsTrigger>
              <TabsTrigger value="all-expenses">All Expenses</TabsTrigger>
            </TabsList>
            <TabsContent value="add-expense">
              <Card>
                <CardContent className="pt-6">
                  <ExpenseForm 
                    onSave={handleSaveExpenses} 
                    uniqueItems={uniqueItems} 
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="all-expenses">
              <Card>
                <CardContent className="pt-6">
                  <ExpenseList
                    expenses={filteredExpenses}
                    onUpdate={handleUpdateExpense}
                    onDelete={handleDeleteExpense}
                    loading={loading}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
