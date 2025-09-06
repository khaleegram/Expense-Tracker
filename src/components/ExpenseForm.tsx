
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { UniqueItem, ExpenseData, Wife, Expense } from '@/types';
import { EXPENSE_CATEGORIES } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { getWifeOnDutyForDate } from '@/lib/duty';
import { suggestItemDetails, SuggestItemDetailsInput } from '@/ai/flows/suggest-item-details';

const expenseSchema = z.object({
  item: z.string().min(1, 'Item name is required.'),
  price: z.preprocess(
      (a) => parseFloat(z.string().parse(a)),
      z.number().positive('Price must be positive.')
  ),
  wife: z.enum(['Mama', 'Maman Abba', 'Maman Ummi', 'N/A'], { required_error: "Please select a wife." }),
  category: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Other'], { required_error: "Please select a category." }),
});

const formSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  expenses: z.array(expenseSchema).min(1, 'Please add at least one expense.'),
}).superRefine((data, ctx) => {
    data.expenses.forEach((expense, index) => {
        if (expense.category !== 'Other' && expense.wife === 'N/A') {
             ctx.addIssue({
                path: [`expenses`, index, 'wife'],
                message: 'Please select a wife for this category.',
                code: z.ZodIssueCode.custom,
            });
        }
    });
});


interface ExpenseFormProps {
  onSave: (expenses: Omit<ExpenseData, 'date'>[], date: Date) => Promise<void>;
  allExpenses: Expense[];
  uniqueItems: UniqueItem[];
  availableWives: Wife[];
}

export default function ExpenseForm({ onSave, allExpenses, uniqueItems, availableWives }: ExpenseFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      expenses: [{ item: '', price: 0, wife: 'N/A', category: 'Other' }],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "expenses",
  });
  const { toast } = useToast();
  const itemInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState<number | null>(null);

  const selectedDate = form.watch('date');

   const getWifeOnDuty = useCallback(async (date: Date): Promise<Wife | null> => {
    try {
        const { primaryWife } = await getWifeOnDutyForDate(date, availableWives);
        return primaryWife;
    } catch (error) {
        console.error("Failed to calculate wife on duty for date", date, error);
        return null;
    }
  }, [availableWives]);

  useEffect(() => {
    const setPrimaryWife = async () => {
        const wifeOnDuty = await getWifeOnDuty(selectedDate);
        if(wifeOnDuty) {
            form.getValues('expenses').forEach((field, index) => {
                const currentCategory = field.category;
                const currentWife = field.wife;
                let newWife: Wife = currentWife;

                if (currentCategory !== 'Other') {
                    if (currentWife !== wifeOnDuty) newWife = wifeOnDuty;
                } else {
                    if (currentWife !== 'N/A') newWife = 'N/A';
                }
                
                if (newWife !== currentWife) {
                    form.setValue(`expenses.${index}.wife`, newWife, { shouldValidate: true });
                }
            });
        }
    };
    setPrimaryWife();
  }, [selectedDate, getWifeOnDuty, form]);
  
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (type === 'change' && name?.startsWith('expenses') && name.endsWith('category')) {
        const index = parseInt(name.split('.')[1]);
        const newCategory = value.expenses?.[index]?.category;
        const currentWife = value.expenses?.[index]?.wife;
        
        if (newCategory === 'Other' && currentWife !== 'N/A') {
          form.setValue(`expenses.${index}.wife`, 'N/A', { shouldValidate: true });
        } else if (newCategory !== 'Other' && currentWife === 'N/A') {
          getWifeOnDuty(form.getValues('date')).then(wifeOnDuty => {
            const firstAvailableWife = availableWives.length > 0 ? availableWives[0] : 'N/A';
            form.setValue(`expenses.${index}.wife`, wifeOnDuty || firstAvailableWife, { shouldValidate: true });
          });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, getWifeOnDuty, availableWives]);

  const handleItemBlur = async (index: number) => {
    const itemName = form.getValues(`expenses.${index}.item`);
    const isNewItem = !uniqueItems.some(item => item.name.toLowerCase() === itemName.toLowerCase());
    
    if (itemName && isNewItem) {
      setSuggestionLoading(index);
      try {
        const result = await suggestItemDetails({ itemName, allExpenses });
        if (result) {
          form.setValue(`expenses.${index}.category`, result.suggestedCategory, { shouldValidate: true });
          form.setValue(`expenses.${index}.price`, result.suggestedPrice, { shouldValidate: true });
          toast({
            title: `Suggestion for ${itemName}`,
            description: `We've filled in the category and price based on past entries.`,
          });
        }
      } catch (error) {
        console.error("Error getting suggestion:", error);
        toast({
          variant: "destructive",
          title: "Suggestion Failed",
          description: "Could not get AI suggestions for this item.",
        });
      } finally {
        setSuggestionLoading(null);
      }
    }
  };


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await onSave(values.expenses, values.date);
      form.reset({
        date: new Date(),
        expenses: [{ item: '', price: 0, wife: 'N/A', category: 'Other' }],
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save expenses. Check balance and try again.",
      });
    }
  };

  const addExpenseRow = () => {
    append({ 
      item: '', 
      price: 0, 
      wife: 'N/A', 
      category: 'Other' 
    });
     setTimeout(() => {
        itemInputRefs.current[fields.length]?.focus();
    }, 0);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById(`expenses.${index}.price`)?.focus();
    }
  };
  
  const handlePriceKeyDown = (e: React.KeyboardEvent, index: number) => {
     if (e.key === 'Enter') {
        e.preventDefault();
        if (index === fields.length - 1) {
            addExpenseRow();
        } else {
            itemInputRefs.current[index + 1]?.focus();
        }
    }
  }
  
  const availableWifeOptions = [...availableWives, 'N/A'];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 pointer-events-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-4">
            {fields.map((field, index) => {
                const category = form.watch(`expenses.${index}.category`);
                const isOtherCategory = category === 'Other';
                return (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_120px_140px_140px_auto] gap-2 items-start">
                    <FormField
                      control={form.control}
                      name={`expenses.${index}.item`}
                      render={({ field }) => (
                        <FormItem>
                           <DatalistInput
                                {...field}
                                options={uniqueItems}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                onBlur={() => handleItemBlur(index)}
                                ref={el => itemInputRefs.current[index] = el}
                                id={`expenses.${index}.item`}
                                isLoading={suggestionLoading === index}
                           />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`expenses.${index}.price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} type="number" placeholder="Price" id={`expenses.${index}.price`} onKeyDown={(e) => handlePriceKeyDown(e, index)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name={`expenses.${index}.category`}
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="z-50 pointer-events-auto">
                              {EXPENSE_CATEGORIES.map(category => (
                                <SelectItem key={category} value={category}>{category}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`expenses.${index}.wife`}
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isOtherCategory}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select wife" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="z-50 pointer-events-auto">
                              {availableWifeOptions.map(wife => (
                                <SelectItem key={wife} value={wife} disabled={wife === 'N/A' && !isOtherCategory}>{wife}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <Button type="button" variant="ghost" size="icon" onClick={() => fields.length > 1 && remove(index)} className={cn(fields.length <= 1 && "opacity-50 cursor-not-allowed")}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                     </Button>
                </div>
            )})}
        </div>

        <div className="flex justify-between items-center">
          <Button type="button" variant="outline" onClick={addExpenseRow}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Row
          </Button>
          <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">Save Expenses</Button>
        </div>
      </form>
    </Form>
  );
}

const DatalistInput = React.forwardRef<
  HTMLInputElement,
  {
    options: UniqueItem[];
    id: string;
    isLoading?: boolean;
  } & React.ComponentPropsWithoutRef<"input">
>(({ options, id, isLoading, ...props }, ref) => {
    const datalistId = `${id}-datalist`;
    return (
        <div className="relative">
            <Input
                ref={ref}
                {...props}
                list={datalistId}
                placeholder="Search or create item..."
                className={cn(isLoading && "pr-8")}
            />
             {isLoading && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            <datalist id={datalistId}>
                {options.map((item) => (
                    <option key={item.id} value={item.name} />
                ))}
            </datalist>
        </div>
    );
});
DatalistInput.displayName = "DatalistInput";

    