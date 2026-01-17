import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  ChevronRight, 
  ChevronLeft, 
  User, 
  Target, 
  Utensils,
  Loader2,
  Scale,
  Ruler,
  Calendar
} from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const personalInfoSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  age: z.coerce.number().min(13, 'Must be at least 13').max(120, 'Invalid age'),
  gender: z.enum(['male', 'female', 'other']),
  height: z.coerce.number().min(100, 'Height must be at least 100 cm').max(250, 'Invalid height'),
  weight: z.coerce.number().min(30, 'Weight must be at least 30 kg').max(300, 'Invalid weight'),
});

const goalSchema = z.object({
  goal: z.enum(['lose', 'maintain', 'gain']),
});

const dietSchema = z.object({
  dietary_preference: z.enum(['veg', 'non-veg', 'vegan']),
  allergies: z.array(z.string()),
});

type PersonalInfo = z.infer<typeof personalInfoSchema>;
type Goal = z.infer<typeof goalSchema>;
type Diet = z.infer<typeof dietSchema>;

const COMMON_ALLERGIES = ['Dairy', 'Gluten', 'Nuts', 'Shellfish', 'Eggs', 'Soy'];

const GOAL_OPTIONS = [
  { value: 'lose', label: 'Lose Weight', description: 'Create a calorie deficit', icon: '📉' },
  { value: 'maintain', label: 'Maintain Weight', description: 'Stay at current weight', icon: '⚖️' },
  { value: 'gain', label: 'Gain Muscle', description: 'Build mass with surplus', icon: '💪' },
];

const DIET_OPTIONS = [
  { value: 'non-veg', label: 'Non-Vegetarian', description: 'All food types', icon: '🥩' },
  { value: 'veg', label: 'Vegetarian', description: 'No meat or fish', icon: '🥬' },
  { value: 'vegan', label: 'Vegan', description: 'Plant-based only', icon: '🌱' },
];

function calculateCalorieTarget(
  gender: string,
  age: number,
  height: number,
  weight: number,
  goal: string
): number {
  // Mifflin-St Jeor Equation
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }
  
  // Assume moderate activity level (1.55 multiplier)
  const tdee = bmr * 1.55;
  
  // Adjust based on goal
  switch (goal) {
    case 'lose':
      return Math.round(tdee - 500);
    case 'gain':
      return Math.round(tdee + 300);
    default:
      return Math.round(tdee);
  }
}

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<PersonalInfo & Goal & Diet>>({});
  const navigate = useNavigate();
  const { updateProfile } = useProfile();

  const personalInfoForm = useForm<PersonalInfo>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: { name: '', gender: 'male' },
  });

  const goalForm = useForm<Goal>({
    resolver: zodResolver(goalSchema),
    defaultValues: { goal: 'maintain' },
  });

  const dietForm = useForm<Diet>({
    resolver: zodResolver(dietSchema),
    defaultValues: { dietary_preference: 'non-veg', allergies: [] },
  });

  const handlePersonalInfo = (values: PersonalInfo) => {
    setFormData(prev => ({ ...prev, ...values }));
    setStep(2);
  };

  const handleGoal = (values: Goal) => {
    setFormData(prev => ({ ...prev, ...values }));
    setStep(3);
  };

  const handleDiet = async (values: Diet) => {
    setIsLoading(true);
    
    const finalData = { ...formData, ...values };
    const calorieTarget = calculateCalorieTarget(
      finalData.gender!,
      finalData.age!,
      finalData.height!,
      finalData.weight!,
      finalData.goal!
    );

    const { error } = await updateProfile({
      ...finalData,
      daily_calorie_target: calorieTarget,
      onboarding_completed: true,
    } as any);

    setIsLoading(false);

    if (!error) {
      navigate('/dashboard');
    }
  };

  const toggleAllergy = (allergy: string) => {
    const current = dietForm.getValues('allergies');
    if (current.includes(allergy)) {
      dietForm.setValue('allergies', current.filter(a => a !== allergy));
    } else {
      dietForm.setValue('allergies', [...current, allergy]);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                'w-16 h-1 rounded-full transition-all duration-300',
                s <= step ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="glass border-border/50">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Help us personalize your experience</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...personalInfoForm}>
                    <form onSubmit={personalInfoForm.handleSubmit(handlePersonalInfo)} className="space-y-4">
                      <FormField
                        control={personalInfoForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={personalInfoForm.control}
                          name="age"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Age</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                  <Input type="number" placeholder="25" className="pl-10" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={personalInfoForm.control}
                          name="gender"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gender</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  className="flex gap-2"
                                >
                                  {['male', 'female', 'other'].map((g) => (
                                    <div key={g} className="flex items-center">
                                      <RadioGroupItem value={g} id={g} className="peer sr-only" />
                                      <Label
                                        htmlFor={g}
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
                          control={personalInfoForm.control}
                          name="height"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Height (cm)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                  <Input type="number" placeholder="170" className="pl-10" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={personalInfoForm.control}
                          name="weight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weight (kg)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                  <Input type="number" placeholder="70" className="pl-10" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button type="submit" className="w-full gradient-primary text-primary-foreground">
                        Continue
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="glass border-border/50">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Your Goal</CardTitle>
                  <CardDescription>What do you want to achieve?</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...goalForm}>
                    <form onSubmit={goalForm.handleSubmit(handleGoal)} className="space-y-4">
                      <FormField
                        control={goalForm.control}
                        name="goal"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="space-y-3"
                              >
                                {GOAL_OPTIONS.map((option) => (
                                  <div key={option.value} className="flex items-center">
                                    <RadioGroupItem value={option.value} id={option.value} className="peer sr-only" />
                                    <Label
                                      htmlFor={option.value}
                                      className="flex-1 p-4 rounded-xl border border-input cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 transition-all"
                                    >
                                      <div className="flex items-center gap-4">
                                        <span className="text-2xl">{option.icon}</span>
                                        <div>
                                          <p className="font-medium">{option.label}</p>
                                          <p className="text-sm text-muted-foreground">{option.description}</p>
                                        </div>
                                      </div>
                                    </Label>
                                  </div>
                                ))}
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                          <ChevronLeft className="w-4 h-4 mr-2" />
                          Back
                        </Button>
                        <Button type="submit" className="flex-1 gradient-primary text-primary-foreground">
                          Continue
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="glass border-border/50">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                    <Utensils className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Dietary Preferences</CardTitle>
                  <CardDescription>Help us suggest the right foods</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...dietForm}>
                    <form onSubmit={dietForm.handleSubmit(handleDiet)} className="space-y-6">
                      <FormField
                        control={dietForm.control}
                        name="dietary_preference"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Diet Type</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="space-y-3"
                              >
                                {DIET_OPTIONS.map((option) => (
                                  <div key={option.value} className="flex items-center">
                                    <RadioGroupItem value={option.value} id={option.value} className="peer sr-only" />
                                    <Label
                                      htmlFor={option.value}
                                      className="flex-1 p-4 rounded-xl border border-input cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 transition-all"
                                    >
                                      <div className="flex items-center gap-4">
                                        <span className="text-2xl">{option.icon}</span>
                                        <div>
                                          <p className="font-medium">{option.label}</p>
                                          <p className="text-sm text-muted-foreground">{option.description}</p>
                                        </div>
                                      </div>
                                    </Label>
                                  </div>
                                ))}
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={dietForm.control}
                        name="allergies"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Allergies (optional)</FormLabel>
                            <div className="flex flex-wrap gap-2">
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

                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
                          <ChevronLeft className="w-4 h-4 mr-2" />
                          Back
                        </Button>
                        <Button 
                          type="submit" 
                          className="flex-1 gradient-primary text-primary-foreground"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : null}
                          Complete Setup
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
