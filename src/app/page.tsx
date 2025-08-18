"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Expense, ExpenseData, UniqueItem, Wife } from '@/types';
import Dashboard from '@/components/Dashboard';
import ExpenseForm from '@/components/ExpenseForm';
import ExpenseList from '@/components/ExpenseList';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [uniqueItems, setUniqueItems] = useState<UniqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchExpensesAndItems = async () => {
    setLoading(true);
    try {
      const expensesSnapshot = await getDocs(collection(db, 'expenses'));
      const expensesData = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      setExpenses(expensesData);

      const itemsSnapshot = await getDocs(collection(db, 'items'));
      const itemsData = itemsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as UniqueItem));
      setUniqueItems(itemsData);
    } catch (error) {
      console.error("Error fetching data: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpensesAndItems();
  }, []);

  const handleSaveExpenses = async (newExpenses: Omit<ExpenseData, 'date'>[], date: Date) => {
    const batch = writeBatch(db);
    const dateStr = format(date, 'yyyy-MM-dd');

    newExpenses.forEach(expense => {
      const expenseRef = doc(collection(db, 'expenses'));
      batch.set(expenseRef, { ...expense, date: dateStr });
    });

    // Add new unique items
    for (const expense of newExpenses) {
        const isNew = !uniqueItems.some(item => item.name.toLowerCase() === expense.item.toLowerCase());
        if (isNew) {
            const itemRef = doc(collection(db, "items"));
            batch.set(itemRef, { name: expense.item });
        }
    }

    await batch.commit();
    await fetchExpensesAndItems();
  };

  const handleUpdateExpense = async (id: string, updatedExpense: Partial<Expense>) => {
    const expenseRef = doc(db, 'expenses', id);
    await updateDoc(expenseRef, updatedExpense);
    await fetchExpensesAndItems();
  };

  const handleDeleteExpense = async (id: string) => {
    const expenseRef = doc(db, 'expenses', id);
    await deleteDoc(expenseRef);
    await fetchExpensesAndItems();
  };

  const filteredExpenses = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate >= start && expDate <= end;
    });
  }, [expenses, currentMonth]);

  const changeMonth = (amount: number) => {
    setCurrentMonth(prev => amount > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="py-6 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Expense Eye</h1>
        </div>
      </header>

      <main className="p-4 md:px-8">
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
                  <ExpenseForm onSave={handleSaveExpenses} uniqueItems={uniqueItems} />
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
