import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  Flame, 
  Drumstick, 
  Wheat, 
  Droplet,
  TrendingUp,
  Camera,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { cn } from '@/lib/utils';

interface DailySummary {
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  meal_count: number;
}

interface RecentMeal {
  id: string;
  meal_type: string;
  total_calories: number;
  created_at: string;
}

const MACRO_COLORS = {
  protein: 'hsl(199, 89%, 48%)',
  carbs: 'hsl(38, 92%, 50%)',
  fat: 'hsl(280, 65%, 60%)',
};

// Mock weekly data for the chart
const WEEKLY_DATA = [
  { day: 'Mon', calories: 1850 },
  { day: 'Tue', calories: 2100 },
  { day: 'Wed', calories: 1920 },
  { day: 'Thu', calories: 2250 },
  { day: 'Fri', calories: 1780 },
  { day: 'Sat', calories: 2400 },
  { day: 'Sun', calories: 0 }, // Today
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [todaySummary, setTodaySummary] = useState<DailySummary | null>(null);
  const [recentMeals, setRecentMeals] = useState<RecentMeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTodayData();
    }
  }, [user]);

  const fetchTodayData = async () => {
    if (!user) return;

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Fetch today's summary
      const { data: summaryData } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (summaryData) {
        setTodaySummary(summaryData as DailySummary);
      }

      // Fetch recent meals
      const { data: mealsData } = await supabase
        .from('meals')
        .select('id, meal_type, total_calories, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (mealsData) {
        setRecentMeals(mealsData as RecentMeal[]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calorieTarget = profile?.daily_calorie_target || 2000;
  const caloriesConsumed = todaySummary?.total_calories || 0;
  const caloriesRemaining = Math.max(0, calorieTarget - caloriesConsumed);
  const calorieProgress = Math.min(100, (caloriesConsumed / calorieTarget) * 100);

  const macroData = [
    { name: 'Protein', value: todaySummary?.total_protein || 0, color: MACRO_COLORS.protein },
    { name: 'Carbs', value: todaySummary?.total_carbs || 0, color: MACRO_COLORS.carbs },
    { name: 'Fat', value: todaySummary?.total_fat || 0, color: MACRO_COLORS.fat },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl lg:text-3xl font-bold">
            Welcome back, {profile?.name || 'there'}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-6"
        >
          {/* Main Calorie Card */}
          <motion.div variants={itemVariants}>
            <Card className="glass border-border/50 overflow-hidden">
              <CardContent className="p-6">
                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Calorie Circle */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative w-48 h-48">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          fill="none"
                          stroke="hsl(var(--muted))"
                          strokeWidth="12"
                        />
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={553}
                          strokeDashoffset={553 - (553 * calorieProgress) / 100}
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Flame className="w-6 h-6 text-primary mb-1" />
                        <span className="text-3xl font-bold">{caloriesConsumed}</span>
                        <span className="text-sm text-muted-foreground">of {calorieTarget} kcal</span>
                      </div>
                    </div>
                    <p className="mt-4 text-center">
                      <span className="text-2xl font-semibold text-primary">{caloriesRemaining}</span>
                      <span className="text-muted-foreground ml-2">calories remaining</span>
                    </p>
                  </div>

                  {/* Macros */}
                  <div className="flex flex-col justify-center space-y-6">
                    <h3 className="text-lg font-semibold">Today's Macros</h3>
                    
                    <div className="space-y-4">
                      {[
                        { label: 'Protein', value: todaySummary?.total_protein || 0, target: 150, icon: Drumstick, color: 'text-info' },
                        { label: 'Carbs', value: todaySummary?.total_carbs || 0, target: 250, icon: Wheat, color: 'text-warning' },
                        { label: 'Fat', value: todaySummary?.total_fat || 0, target: 65, icon: Droplet, color: 'text-chart-4' },
                      ].map((macro) => (
                        <div key={macro.label} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <macro.icon className={cn('w-4 h-4', macro.color)} />
                              <span className="text-sm font-medium">{macro.label}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {macro.value}g / {macro.target}g
                            </span>
                          </div>
                          <Progress 
                            value={Math.min(100, (macro.value / macro.target) * 100)} 
                            className="h-2"
                          />
                        </div>
                      ))}
                    </div>

                    <Button 
                      onClick={() => navigate('/log-meal')}
                      className="gradient-primary text-primary-foreground"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Log a Meal
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Weekly Trend */}
            <motion.div variants={itemVariants}>
              <Card className="glass border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Weekly Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={WEEKLY_DATA}>
                        <defs>
                          <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="day" 
                          axisLine={false} 
                          tickLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="calories"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="url(#colorCalories)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Macro Distribution */}
            <motion.div variants={itemVariants}>
              <Card className="glass border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Macro Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 flex items-center justify-center">
                    {macroData.some(m => m.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={macroData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {macroData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => [`${value}g`, '']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <p>No meals logged yet today</p>
                        <Button 
                          variant="link" 
                          className="text-primary"
                          onClick={() => navigate('/log-meal')}
                        >
                          Log your first meal
                        </Button>
                      </div>
                    )}
                  </div>
                  {macroData.some(m => m.value > 0) && (
                    <div className="flex justify-center gap-6 mt-4">
                      {macroData.map((macro) => (
                        <div key={macro.name} className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: macro.color }}
                          />
                          <span className="text-sm text-muted-foreground">
                            {macro.name}: {macro.value}g
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Recent Meals */}
          <motion.div variants={itemVariants}>
            <Card className="glass border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Recent Meals</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                {recentMeals.length > 0 ? (
                  <div className="space-y-3">
                    {recentMeals.map((meal) => (
                      <div 
                        key={meal.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Flame className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium capitalize">{meal.meal_type || 'Meal'}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(meal.created_at), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold">{meal.total_calories} kcal</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No meals logged yet</p>
                    <Button 
                      variant="link" 
                      className="text-primary"
                      onClick={() => navigate('/log-meal')}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Log your first meal
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
