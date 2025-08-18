"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Check, ChevronsUpDown, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Wife, UniqueItem, ExpenseData } from '@/types';
import { WIVES } from '@/types';
import { suggestWifeAssignment } from '@/ai/flows/wife-assignment-suggestion';
import { useToast } from '@/hooks/use-toast';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

const formSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  expenses: z.array(z.object({
    item: z.string().min(1, 'Item name is required.'),
    price: z.preprocess(
        (a) => parseFloat(z.string().parse(a)),
        z.number().positive('Price must be positive.')
    ),
    wife: z.enum(['Wife A', 'Wife B', 'Wife C'], { required_error: "Please select a wife." }),
  })).min(1, 'Please add at least one expense.'),
});

interface ExpenseFormProps {
  onSave: (expenses: Omit<ExpenseData, 'date'>[], date: Date) => Promise<void>;
  uniqueItems: UniqueItem[];
}

export default function ExpenseForm({ onSave, uniqueItems }: ExpenseFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      expenses: [{ item: '', price: 0, wife: 'Wife A' }],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "expenses",
  });
  const { toast } = useToast();
  const itemInputRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const date = form.watch('date');

  useEffect(() => {
    const getSuggestion = async () => {
      if (date) {
        try {
          const dateStr = format(date, 'yyyy-MM-dd');
          const suggestion = await suggestWifeAssignment({ date: dateStr });
          if(fields.length === 1 && fields[0].item === '' && fields[0].price === 0) {
            form.setValue('expenses.0.wife', suggestion.primaryWife as Wife);
          }
        } catch (error) {
          console.error("AI suggestion failed:", error);
        }
      }
    };
    getSuggestion();
  }, [date, fields.length, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await onSave(values.expenses, values.date);
      form.reset({
        date: new Date(),
        expenses: [{ item: '', price: 0, wife: 'Wife A' }],
      });
      toast({
        title: "Success",
        description: "Expenses saved successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save expenses.",
      });
    }
  };

  const addExpenseRow = () => {
    append({ item: '', price: 0, wife: form.getValues('expenses.0.wife') || 'Wife A' });
  };
  
  const handleKeyDown = (e: React.KeyboardEvent, index: number, field: 'item' | 'price') => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (field === 'item') {
            document.getElementById(`expenses.${index}.price`)?.focus();
        } else if (field === 'price') {
            if (index === fields.length - 1) {
                addExpenseRow();
                setTimeout(() => itemInputRefs.current[index + 1]?.focus(), 0);
            } else {
                itemInputRefs.current[index + 1]?.focus();
            }
        }
    }
  };

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
                <PopoverContent className="w-auto p-0" align="start">
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
            {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_150px_150px_auto] gap-2 items-start">
                    <FormField
                      control={form.control}
                      name={`expenses.${index}.item`}
                      render={({ field }) => (
                        <FormItem>
                           <Controller
                                name={`expenses.${index}.item`}
                                control={form.control}
                                render={({ field }) => (
                                    <Combobox
                                        options={uniqueItems.map(i => ({ value: i.name, label: i.name }))}
                                        value={field.value}
                                        onChange={field.onChange}
                                        ref={el => itemInputRefs.current[index] = el}
                                        onKeyDown={(e) => handleKeyDown(e, index, 'item')}
                                    />
                                )}
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
                            <Input {...field} type="number" placeholder="Price" id={`expenses.${index}.price`} onKeyDown={(e) => handleKeyDown(e, index, 'price')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`expenses.${index}.wife`}
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select wife" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {WIVES.map(wife => (
                                <SelectItem key={wife} value={wife}>{wife}</SelectItem>
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
            ))}
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

const Combobox = React.forwardRef<
    HTMLButtonElement,
    {
        options: { value: string; label: string }[];
        value: string;
        onChange: (value: string) => void;
        onKeyDown: React.KeyboardEventHandler<HTMLButtonElement>;
    }
>(({ options, value, onChange, onKeyDown }, ref) => {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value || '');

    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    const handleSelect = (currentValue: string) => {
        onChange(currentValue);
        setInputValue(currentValue);
        setOpen(false);
    };
    
    const handleInputChange = (search: string) => {
        setInputValue(search);
        onChange(search);
    };

    const showCreateOption = inputValue && !options.some(option => option.label.toLowerCase() === inputValue.toLowerCase());

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                    ref={ref}
                    onKeyDown={onKeyDown}
                >
                    {value ? value : "Select item..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput
                        placeholder="Search or create item..."
                        value={inputValue}
                        onValueChange={handleInputChange}
                    />
                    <CommandList>
                        <CommandEmpty>
                           {showCreateOption ? (
                             <CommandItem
                                onSelect={() => handleSelect(inputValue)}
                             >
                                Create "{inputValue}"
                             </CommandItem>
                           ) : (
                            <span>No item found.</span>
                           )}
                        </CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={() => handleSelect(option.value)}
                                >
                                     <Check
                                        className={cn(
                                        "mr-2 h-4 w-4",
                                        value === option.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
});
Combobox.displayName = "Combobox";