
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, writeBatch, doc, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Expense, ExpenseData, UniqueItem, Wife, Duty } from '@/types';
import Dashboard from '@/components/Dashboard';
import ExpenseForm from '@/components/ExpenseForm';
import ExpenseList from '@/components/ExpenseList';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, CookingPot, Utensils, Soup, PlusCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { getWifeOnDutyForDate } from '@/lib/duty';
import { Skeleton } from '@/components/ui/skeleton';
import { WifeIcon } from '@/components/WifeIcon';
import { useToast } from "@/hooks/use-toast";
import { Input } from '@/components/ui/input';

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [uniqueItems, setUniqueItems] = useState<UniqueItem[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [todaysDuty, setTodaysDuty] = useState<Duty[] | null>(null);
  const [dutyLoading, setDutyLoading] = useState(true);
  const [addFundsAmount, setAddFundsAmount] = useState<number | string>("");
  const { toast } = useToast();

  const fetchAppData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch Expenses
      const expensesSnapshot = await getDocs(collection(db, 'expenses'));
      const expensesData = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      setExpenses(expensesData);

      // Fetch Items
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

      // Fetch Balance
      const balanceRef = doc(db, 'balance', 'current');
      const balanceSnap = await getDoc(balanceRef);
      if (balanceSnap.exists()) {
        setBalance(balanceSnap.data().amount);
      } else {
        setBalance(0);
      }

    } catch (error) {
      console.error("Error fetching data: ", error);
       toast({
        variant: "destructive",
        title: "Error Fetching Data",
        description: "Could not fetch app data. Please check Firestore permissions and configuration.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAppData();
  }, [fetchAppData]);

  useEffect(() => {
    setDutyLoading(true);
    const { duty } = getWifeOnDutyForDate(new Date());
    setTodaysDuty(duty);
    setDutyLoading(false);
  }, []);
  
  const handleSaveExpenses = async (newExpenses: Omit<ExpenseData, 'date'>[], date: Date) => {
    const totalNewExpense = newExpenses.reduce((sum, exp) => sum + exp.price, 0);
    const balanceRef = doc(db, 'balance', 'current');

    try {
        await runTransaction(db, async (transaction) => {
            const balanceDoc = await transaction.get(balanceRef);
            const currentBalance = balanceDoc.exists() ? balanceDoc.data().amount : 0;
            const newBalance = currentBalance - totalNewExpense;
            
            transaction.set(balanceRef, { amount: newBalance });

            const dateStr = format(date, 'yyyy-MM-dd');
            newExpenses.forEach(expense => {
                const expenseRef = doc(collection(db, 'expenses'));
                transaction.set(expenseRef, { ...expense, date: dateStr });
            });

            const currentItems = new Set(uniqueItems.map(item => item.name.toLowerCase()));
            for (const expense of newExpenses) {
                if (!currentItems.has(expense.item.toLowerCase())) {
                    const itemRef = doc(collection(db, "items"));
                    transaction.set(itemRef, { name: expense.item });
                }
            }
        });

        toast({
            title: "Expenses Saved",
            description: `₦${totalNewExpense.toLocaleString()} deducted from balance.`,
        });
        await fetchAppData(); // Refresh data
    } catch (error) {
        console.error("Transaction failed: ", error);
        toast({
            variant: "destructive",
            title: "Error Saving Expenses",
            description: "Could not save expenses. Please try again.",
        });
    }
  };

  const handleUpdateExpense = async (id: string, originalPrice: number, updatedExpense: Partial<Expense>) => {
    const balanceRef = doc(db, 'balance', 'current');
    const expenseRef = doc(db, 'expenses', id);
    const priceDifference = (updatedExpense.price ?? originalPrice) - originalPrice;

    try {
        await runTransaction(db, async (transaction) => {
            const balanceDoc = await transaction.get(balanceRef);
            const currentBalance = balanceDoc.exists() ? balanceDoc.data().amount : 0;
            const newBalance = currentBalance - priceDifference;

            transaction.set(balanceRef, { amount: newBalance });
            transaction.update(expenseRef, updatedExpense);
        });
        toast({
            title: "Expense Updated",
            description: `Balance adjusted by ₦${priceDifference.toLocaleString()}.`,
        });
        await fetchAppData();
    } catch (e) {
        console.error("Update transaction failed: ", e);
        toast({
            variant: "destructive",
            title: "Error Updating Expense",
            description: "Could not update expense. Please try again.",
        });
    }
  };

  const handleDeleteExpense = async (id: string, price: number) => {
    const balanceRef = doc(db, 'balance', 'current');
    const expenseRef = doc(db, 'expenses', id);

    try {
        await runTransaction(db, async (transaction) => {
            const balanceDoc = await transaction.get(balanceRef);
            const currentBalance = balanceDoc.exists() ? balanceDoc.data().amount : 0;
            const newBalance = currentBalance + price;

            transaction.set(balanceRef, { amount: newBalance });
            transaction.delete(expenseRef);
        });

        toast({
            title: "Expense Deleted",
            description: `₦${price.toLocaleString()} returned to balance.`,
        });
        await fetchAppData();
    } catch (error) {
        console.error("Delete transaction failed: ", error);
        toast({
            variant: "destructive",
            title: "Error Deleting Expense",
            description: "Could not delete expense. Please try again.",
        });
    }
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(addFundsAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a positive number." });
      return;
    }

    const balanceRef = doc(db, 'balance', 'current');
    try {
      await runTransaction(db, async (transaction) => {
        const balanceDoc = await transaction.get(balanceRef);
        const currentBalance = balanceDoc.exists() ? balanceDoc.data().amount : 0;
        const newBalance = currentBalance + amount;
        transaction.set(balanceRef, { amount: newBalance });
      });

      toast({
        title: "Funds Added",
        description: `₦${amount.toLocaleString()} added to balance.`,
      });
      setAddFundsAmount("");
      await fetchAppData();
    } catch (error) {
      console.error("Add funds transaction failed: ", error);
      toast({
        variant: "destructive",
        title: "Error Adding Funds",
        description: "Could not add funds. Please try again.",
      });
    }
  };


  const filteredExpenses = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return expenses.filter(exp => {
      if (!exp.date || typeof exp.date !== 'string') return false;
      const expDate = new Date(exp.date);
      if (isNaN(expDate.getTime())) return false;
      return expDate >= start && expDate <= end;
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
            <Card className="lg:col-span-2">
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
             <Card>
                <CardHeader>
                    <CardTitle>Manage Balance</CardTitle>
                    <CardDescription>Add funds to the shared balance.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <p className="text-sm text-muted-foreground">Current Balance</p>
                        {loading ? <Skeleton className="h-8 w-3/4 mt-1" /> : <p className="text-3xl font-bold">₦{balance.toLocaleString()}</p>}
                    </div>
                    <form onSubmit={handleAddFunds} className="flex items-center gap-2">
                        <Input
                            type="number"
                            placeholder="Amount to add"
                            value={addFundsAmount}
                            onChange={(e) => setAddFundsAmount(e.target.value)}
                            className="h-9"
                        />
                        <Button type="submit" size="sm">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>


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
