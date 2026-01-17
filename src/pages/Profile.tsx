import { useState } from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  User, 
  Target, 
  Scale, 
  Ruler, 
  Calendar,
  Save,
  Loader2
} from 'lucide-react';
import { useProfile, Profile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  age: z.coerce.number().min(13).max(120),
  gender: z.enum(['male', 'female', 'other']),
  height: z.coerce.number().min(100).max(250),
  weight: z.coerce.number().min(30).max(300),
  goal: z.enum(['lose', 'maintain', 'gain']),
  dietary_preference: z.enum(['veg', 'non-veg', 'vegan']),
  allergies: z.array(z.string()),
});

type ProfileValues = z.infer<typeof profileSchema>;

const COMMON_ALLERGIES = ['Dairy', 'Gluten', 'Nuts', 'Shellfish', 'Eggs', 'Soy'];

const GOAL_OPTIONS = [
  { value: 'lose', label: 'Lose Weight', icon: '📉' },
  { value: 'maintain', label: 'Maintain', icon: '⚖️' },
  { value: 'gain', label: 'Build Muscle', icon: '💪' },
];

const DIET_OPTIONS = [
  { value: 'non-veg', label: 'Non-Veg', icon: '🥩' },
  { value: 'veg', label: 'Vegetarian', icon: '🥬' },
  { value: 'vegan', label: 'Vegan', icon: '🌱' },
];

export default function ProfilePage() {
  const { user } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: profile ? {
      name: profile.name || '',
      age: profile.age || 25,
      gender: profile.gender || 'male',
      height: profile.height || 170,
      weight: profile.weight || 70,
      goal: profile.goal || 'maintain',
      dietary_preference: profile.dietary_preference || 'non-veg',
      allergies: profile.allergies || [],
    } : undefined,
  });

  const handleSubmit = async (values: ProfileValues) => {
    setIsSaving(true);
    
    // Recalculate calorie target
    const calorieTarget = calculateCalorieTarget(
      values.gender,
      values.age,
      values.height,
      values.weight,
      values.goal
    );

    await updateProfile({
      ...values,
      daily_calorie_target: calorieTarget,
    });
    
    setIsSaving(false);
  };

  const toggleAllergy = (allergy: string) => {
    const current = form.getValues('allergies');
    if (current.includes(allergy)) {
      form.setValue('allergies', current.filter(a => a !== allergy));
    } else {
      form.setValue('allergies', [...current, allergy]);
    }
  };

  if (profileLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl lg:text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground mt-1">
            Update your personal information and preferences
          </p>
        </motion.div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Personal Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    Used to calculate your nutritional needs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input type="number" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex gap-2"
                            >
                              {['male', 'female', 'other'].map((g) => (
                                <div key={g} className="flex items-center">
                                  <RadioGroupItem value={g} id={`gender-${g}`} className="peer sr-only" />
                                  <Label
                                    htmlFor={`gender-${g}`}
                                    className="px-3 py-2 rounded-lg border border-input cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 capitalize text-sm"
                                  >
                                    {g}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Height (cm)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input type="number" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (kg)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input type="number" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Goal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Fitness Goal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="goal"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-3 gap-3"
                          >
                            {GOAL_OPTIONS.map((option) => (
                              <div key={option.value}>
                                <RadioGroupItem value={option.value} id={option.value} className="peer sr-only" />
                                <Label
                                  htmlFor={option.value}
                                  className="flex flex-col items-center p-4 rounded-xl border border-input cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 transition-all"
                                >
                                  <span className="text-2xl mb-2">{option.icon}</span>
                                  <span className="font-medium text-sm">{option.label}</span>
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Diet Preferences */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">Dietary Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="dietary_preference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Diet Type</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-3 gap-3"
                          >
                            {DIET_OPTIONS.map((option) => (
                              <div key={option.value}>
                                <RadioGroupItem value={option.value} id={`diet-${option.value}`} className="peer sr-only" />
                                <Label
                                  htmlFor={`diet-${option.value}`}
                                  className="flex flex-col items-center p-4 rounded-xl border border-input cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 transition-all"
                                >
                                  <span className="text-2xl mb-2">{option.icon}</span>
                                  <span className="font-medium text-sm">{option.label}</span>
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <FormField
                    control={form.control}
                    name="allergies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Allergies</FormLabel>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {COMMON_ALLERGIES.map((allergy) => (
                            <Badge
                              key={allergy}
                              variant={field.value.includes(allergy) ? 'default' : 'outline'}
                              className={cn(
                                'cursor-pointer transition-all',
                                field.value.includes(allergy) && 'bg-destructive hover:bg-destructive/80'
                              )}
                              onClick={() => toggleAllergy(allergy)}
                            >
                              {allergy}
                            </Badge>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Calorie Target Display */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="glass border-border/50 border-primary/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Daily Calorie Target</p>
                      <p className="text-3xl font-bold text-primary">
                        {profile?.daily_calorie_target || 2000} kcal
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Based on your profile and goal</p>
                      <p>Updates automatically when you save</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Save Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button
                type="submit"
                disabled={isSaving}
                className="w-full gradient-primary text-primary-foreground"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </motion.div>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
}

function calculateCalorieTarget(
  gender: string,
  age: number,
  height: number,
  weight: number,
  goal: string
): number {
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }
  
  const tdee = bmr * 1.55;
  
  switch (goal) {
    case 'lose':
      return Math.round(tdee - 500);
    case 'gain':
      return Math.round(tdee + 300);
    default:
      return Math.round(tdee);
  }
}
