import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Flame, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Meal {
  id: string;
  meal_type: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  created_at: string;
  food_items: FoodItem[];
}

interface FoodItem {
  id: string;
  name: string;
  portion_size: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function History() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMeals();
    }
  }, [user, selectedDate]);

  const fetchMeals = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const start = startOfDay(selectedDate).toISOString();
      const end = endOfDay(selectedDate).toISOString();

      const { data, error } = await supabase
        .from('meals')
        .select(`
          *,
          food_items (*)
        `)
        .eq('user_id', user.id)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeals((data as Meal[]) || []);
    } catch (error) {
      console.error('Error fetching meals:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    setSelectedDate((current) =>
      direction === 'prev' ? subDays(current, 1) : subDays(current, -1)
    );
  };

  const totalCalories = meals.reduce((sum, meal) => sum + meal.total_calories, 0);
  const totalProtein = meals.reduce((sum, meal) => sum + Number(meal.total_protein), 0);
  const totalCarbs = meals.reduce((sum, meal) => sum + Number(meal.total_carbs), 0);
  const totalFat = meals.reduce((sum, meal) => sum + Number(meal.total_fat), 0);

  const getMealIcon = (type: string) => {
    switch (type) {
      case 'breakfast':
        return '🌅';
      case 'lunch':
        return '☀️';
      case 'dinner':
        return '🌙';
      case 'snack':
        return '🍎';
      default:
        return '🍽️';
    }
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl lg:text-3xl font-bold">Meal History</h1>
          <p className="text-muted-foreground mt-1">
            View your past meals and nutrition data
          </p>
        </motion.div>

        {/* Date Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="glass border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => navigateDay('prev')}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="gap-2">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">
                        {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateDay('next')}
                  disabled={format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Daily Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card className="glass border-border/50">
            <CardContent className="p-6">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{totalCalories}</p>
                  <p className="text-sm text-muted-foreground">Calories</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-info">{totalProtein.toFixed(0)}g</p>
                  <p className="text-sm text-muted-foreground">Protein</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning">{totalCarbs.toFixed(0)}g</p>
                  <p className="text-sm text-muted-foreground">Carbs</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-chart-4">{totalFat.toFixed(0)}g</p>
                  <p className="text-sm text-muted-foreground">Fat</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Meals List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {loading ? (
            <Card className="glass border-border/50">
              <CardContent className="p-8 text-center">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mx-auto mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/4 mx-auto"></div>
                </div>
              </CardContent>
            </Card>
          ) : meals.length > 0 ? (
            meals.map((meal, index) => (
              <motion.div
                key={meal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Card className="glass border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="text-xl">{getMealIcon(meal.meal_type)}</span>
                        <span className="capitalize">{meal.meal_type || 'Meal'}</span>
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(meal.created_at), 'h:mm a')}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          <Flame className="w-4 h-4" />
                          {meal.total_calories} kcal
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {meal.food_items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                        >
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.portion_size}</p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-medium">{item.calories} kcal</p>
                            <p className="text-muted-foreground">
                              P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <Card className="glass border-border/50">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No meals logged for this day</p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
