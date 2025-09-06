
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, doc, runTransaction, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Expense, ExpenseData, UniqueItem, Duty, Wife, SuggestionInput } from '@/types';
import Dashboard from '@/components/Dashboard';
import ExpenseForm from '@/components/ExpenseForm';
import ExpenseList from '@/components/ExpenseList';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, CookingPot, Utensils, Soup, PlusCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { getWifeOnDutyForDate } from '@/lib/duty';
import { Skeleton } from '@/components/ui/skeleton';
import { WifeIcon } from '@/components/WifeIcon';
import { useToast } from "@/hooks/use-toast";
import { Input } from '@/components/ui/input';
import { WIVES } from '@/types';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ThemeToggle';
import { suggestItemDetails } from '@/ai/flows/suggest-item-details';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [uniqueItems, setUniqueItems] = useState<UniqueItem[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [todaysDuty, setTodaysDuty] = useState<Duty[] | null>(null);
  const [dutyLoading, setDutyLoading] = useState(true);
  const [addFundsAmount, setAddFundsAmount] = useState<number | string>("");
  const [roster, setRoster] = useState<Wife[]>([]);
  const { toast } = useToast();

  const fetchAppData = useCallback(async () => {
    setLoading(true);
    try {
      const balanceRef = doc(db, 'balance', 'current');
      const rosterRef = doc(db, 'roster', 'current');

      // Ensure default documents exist if they don't
      const balanceSnap = await getDoc(balanceRef);
      if (!balanceSnap.exists()) {
        await setDoc(balanceRef, { amount: 0 });
      }

      const rosterSnap = await getDoc(rosterRef);
      if (!rosterSnap.exists()) {
        // Default roster includes all wives initially
        await setDoc(rosterRef, { availableWives: WIVES });
      }
      
      const [balanceData, expensesSnapshot, itemsSnapshot, rosterData] = await Promise.all([
        getDoc(balanceRef),
        getDocs(collection(db, 'expenses')),
        getDocs(collection(db, 'items')),
        getDoc(rosterRef)
      ]);
      
      setBalance(balanceData.data()?.amount ?? 0);
      setRoster(rosterData.data()?.availableWives ?? WIVES);
      
      const expensesData = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      setExpenses(expensesData);

      const itemsData = itemsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as UniqueItem));
      const seen = new Set();
      // Filter out duplicate item names, case-insensitively
      const filteredItems = itemsData.filter(item => {
        const lowerCaseName = (item.name || '').toLowerCase();
        const duplicate = seen.has(lowerCaseName);
        if (!duplicate) {
          seen.add(lowerCaseName);
        }
        return !duplicate;
      });
      setUniqueItems(filteredItems);

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
    async function calculateDuty() {
        if (roster.length > 0) {
            setDutyLoading(true);
            try {
                const { duty } = await getWifeOnDutyForDate(new Date(), roster);
                setTodaysDuty(duty);
            } catch (error) {
                console.error("Error calculating duty:", error);
                setTodaysDuty(null);
            } finally {
                setDutyLoading(false);
            }
        } else {
            setTodaysDuty(null);
            setDutyLoading(false);
        }
    }
    calculateDuty();
  }, [roster]);
  
  const handleToggleWifeAvailability = async (wife: Wife) => {
    let newRoster: Wife[];
    const isCurrentlyInRoster = roster.includes(wife);
  
    if (isCurrentlyInRoster) {
      // Remove wife from roster
      newRoster = roster.filter(w => w !== wife);
    } else {
      // Add wife to the end of the roster
      newRoster = [...roster, wife];
    }
  
    const rosterRef = doc(db, 'roster', 'current');
    try {
      await setDoc(rosterRef, { availableWives: newRoster }, { merge: true });
      setRoster(newRoster);
      toast({
        title: "Roster Updated",
        description: `${wife} is now ${isCurrentlyInRoster ? 'unavailable' : 'available'}.`,
      });
    } catch (error) {
      console.error("Error updating roster: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update the duty roster.",
      });
    }
  };

  const handleReorderWife = async (wife: Wife, direction: 'up' | 'down') => {
    const currentIndex = roster.indexOf(wife);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= roster.length) return;
    
    const newRoster = [...roster];
    // Simple swap
    const temp = newRoster[currentIndex];
    newRoster[currentIndex] = newRoster[newIndex];
    newRoster[newIndex] = temp;

    const rosterRef = doc(db, 'roster', 'current');
    try {
      await setDoc(rosterRef, { availableWives: newRoster }, { merge: true });
      setRoster(newRoster);
      toast({
        title: "Roster Reordered",
        description: "The duty roster has been updated.",
      });
    } catch (error) {
      console.error("Error reordering roster: ", error);
       toast({
        variant: "destructive",
        title: "Error",
        description: "Could not reorder the duty roster.",
      });
    }
  };


  const handleSaveExpenses = async (newExpenses: Omit<ExpenseData, 'date'>[], date: Date) => {
    const totalNewExpense = newExpenses.reduce((sum, exp) => sum + exp.price, 0);
    const balanceRef = doc(db, 'balance', 'current');

    try {
        await runTransaction(db, async (transaction) => {
            const balanceDoc = await transaction.get(balanceRef);
            const currentBalance = balanceDoc.data()?.amount ?? 0;

            const newBalance = currentBalance - totalNewExpense;

            if (newBalance < 0) {
              throw new Error("Insufficient balance.");
            }

            transaction.update(balanceRef, { amount: newBalance });
           
            const dateStr = format(date, 'yyyy-MM-dd');
            newExpenses.forEach(expense => {
                const expenseRef = doc(collection(db, 'expenses'));
                transaction.set(expenseRef, { ...expense, date: dateStr });
            });

            // Add new unique items to the 'items' collection
            const currentItems = new Set(uniqueItems.map(item => (item.name || '').toLowerCase()));
            for (const expense of newExpenses) {
                if (expense.item && !currentItems.has(expense.item.toLowerCase())) {
                    const itemRef = doc(collection(db, "items"));
                    transaction.set(itemRef, { name: expense.item });
                }
            }
        });

        toast({
            title: "Expenses Saved",
            description: `₦${totalNewExpense.toLocaleString()} deducted from balance.`,
        });
        await fetchAppData();
    } catch (error: any) {
        console.error("Transaction failed: ", error);
        toast({
            variant: "destructive",
            title: "Error Saving Expenses",
            description: error.message || "Could not save expenses. Please try again.",
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
            const currentBalance = balanceDoc.data()?.amount ?? 0;
            const newBalance = currentBalance - priceDifference;
            
            if (newBalance < 0) {
              throw new Error("Insufficient balance for this update.");
            }

            transaction.update(balanceRef, { amount: newBalance });
            transaction.update(expenseRef, updatedExpense);
        });
        toast({
            title: "Expense Updated",
            description: `Balance adjusted by ₦${priceDifference.toLocaleString()}.`,
        });
        await fetchAppData();
    } catch (e: any) {
        console.error("Update transaction failed: ", e);
        toast({
            variant: "destructive",
            title: "Error Updating Expense",
            description: e.message || "Could not update expense. Please try again.",
        });
    }
  };

  const handleDeleteExpense = async (id: string, price: number) => {
    const balanceRef = doc(db, 'balance', 'current');
    const expenseRef = doc(db, 'expenses', id);

    try {
        await runTransaction(db, async (transaction) => {
            const balanceDoc = await transaction.get(balanceRef);
            const currentBalance = balanceDoc.data()?.amount ?? 0;
            const newBalance = currentBalance + price;

            transaction.update(balanceRef, { amount: newBalance });
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
        const currentBalance = balanceDoc.data()?.amount ?? 0;
        const newBalance = currentBalance + amount;
        transaction.update(balanceRef, { amount: newBalance });
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

  const handleGetSuggestion = async (itemName: string) => {
    if (!itemName) return null;
    try {
      const allExpenseData = expenses.map(e => ({...e, wife: e.wife as string, category: e.category as string}));
      const suggestion = await suggestItemDetails({
        itemName,
        allExpenses: allExpenseData,
      });

      if (suggestion.price || suggestion.category) {
        toast({
         title: "Suggestion Applied",
         description: `Set category to ${suggestion.category} and price to ₦${suggestion.price}.`,
       });
     }
      return suggestion;
    } catch (error) {
      console.error("Error getting suggestion:", error);
      toast({
        variant: "destructive",
        title: "Suggestion Error",
        description: "Could not fetch AI suggestion.",
      });
      return null;
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
        <ThemeToggle />
      </header>
      
      <main className="p-4 md:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
            <Card>
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
                        <p>No one is available for duty.</p>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Duty Roster</CardTitle>
                    <CardDescription>Manage duty order and availability.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Current Duty Order</p>
                    {roster.length > 0 ? roster.map((wife, index) => (
                        <div key={wife} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold w-4">{index + 1}.</span>
                                <WifeIcon wife={wife} />
                                <span>{wife}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleReorderWife(wife, 'up')}
                                    disabled={index === 0}
                                    aria-label={`Move ${wife} up`}
                                >
                                    <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleReorderWife(wife, 'down')}
                                    disabled={index === roster.length - 1}
                                    aria-label={`Move ${wife} down`}
                                >
                                    <ArrowDown className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )) : (
                        <p className="text-sm text-muted-foreground py-2">No wives available for duty.</p>
                    )}
                    <Separator className="my-4"/>
                     <p className="text-sm font-medium text-muted-foreground">Toggle Availability</p>
                    {WIVES.map(wife => {
                        const isInRoster = roster.includes(wife);
                        return (
                            <div key={wife} className="flex items-center justify-between p-2 rounded-md">
                                <Label htmlFor={`roster-toggle-${wife}`} className="flex items-center gap-3 cursor-pointer">
                                    <WifeIcon wife={wife} />
                                    {wife}
                                </Label>
                                <Switch
                                    id={`roster-toggle-${wife}`}
                                    checked={isInRoster}
                                    onCheckedChange={() => handleToggleWifeAvailability(wife)}
                                />
                            </div>
                        );
                    })}
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
                    availableWives={roster}
                    onGetSuggestion={handleGetSuggestion}
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
                    availableWives={roster}
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

    