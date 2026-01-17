import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Upload, 
  X, 
  Check, 
  Loader2, 
  Edit2,
  Trash2,
  Plus,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { recognizeFood, RecognizedFood, searchFoods } from '@/services/foodRecognition';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export default function LogMeal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mealType, setMealType] = useState<string>('lunch');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recognizedFoods, setRecognizedFoods] = useState<RecognizedFood[]>([]);
  const [processingTime, setProcessingTime] = useState<number>(0);
  
  const [editingFood, setEditingFood] = useState<RecognizedFood | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RecognizedFood[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setRecognizedFoods([]);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const processImage = async () => {
    if (!imageFile) return;

    setIsProcessing(true);
    try {
      const result = await recognizeFood(imageFile);
      setRecognizedFoods(result.foods);
      setProcessingTime(result.processing_time_ms);
      
      toast({
        title: 'Analysis complete!',
        description: `Detected ${result.foods.length} item(s) in ${(result.processing_time_ms / 1000).toFixed(1)}s`,
      });
    } catch (error) {
      toast({
        title: 'Analysis failed',
        description: 'Could not process the image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length > 1) {
      setSearchResults(searchFoods(query));
    } else {
      setSearchResults([]);
    }
  };

  const addFoodItem = (food: RecognizedFood) => {
    setRecognizedFoods(prev => [...prev, { ...food, id: Math.random().toString(36).substring(7) }]);
    setShowAddDialog(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeFood = (id: string) => {
    setRecognizedFoods(prev => prev.filter(f => f.id !== id));
  };

  const updateFood = (updatedFood: RecognizedFood) => {
    setRecognizedFoods(prev => prev.map(f => f.id === updatedFood.id ? updatedFood : f));
    setEditingFood(null);
  };

  const getTotalNutrition = () => {
    return recognizedFoods.reduce(
      (acc, food) => ({
        calories: acc.calories + food.calories,
        protein: acc.protein + food.protein,
        carbs: acc.carbs + food.carbs,
        fat: acc.fat + food.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const saveMeal = async () => {
    if (!user || recognizedFoods.length === 0) return;

    setIsSaving(true);
    try {
      const totals = getTotalNutrition();

      // Create meal
      const { data: meal, error: mealError } = await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          meal_type: mealType,
          total_calories: totals.calories,
          total_protein: totals.protein,
          total_carbs: totals.carbs,
          total_fat: totals.fat,
        })
        .select()
        .single();

      if (mealError) throw mealError;

      // Insert food items
      const foodItems = recognizedFoods.map(food => ({
        meal_id: meal.id,
        name: food.name,
        portion_size: food.portion_size,
        portion_grams: food.portion_grams,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        confidence_score: food.confidence,
      }));

      const { error: itemsError } = await supabase
        .from('food_items')
        .insert(foodItems);

      if (itemsError) throw itemsError;

      toast({
        title: 'Meal logged!',
        description: `${totals.calories} calories added to your daily intake.`,
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving meal:', error);
      toast({
        title: 'Error',
        description: 'Failed to save meal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const totals = getTotalNutrition();

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl lg:text-3xl font-bold">Log a Meal</h1>
          <p className="text-muted-foreground mt-1">
            Upload a photo and let AI identify your food
          </p>
        </motion.div>

        <div className="grid gap-6">
          {/* Image Upload */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="w-4 h-4 text-primary" />
                  Food Image
                </CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />

                {!imagePreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <div className="w-16 h-16 mx-auto rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <p className="font-medium">Upload food image</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Drag & drop or click to browse
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative rounded-xl overflow-hidden">
                      <img
                        src={imagePreview}
                        alt="Food preview"
                        className="w-full h-64 object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                          setRecognizedFoods([]);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex gap-4">
                      <Select value={mealType} onValueChange={setMealType}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEAL_TYPES.map((type) => (
                            <SelectItem key={type} value={type} className="capitalize">
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        onClick={processImage}
                        disabled={isProcessing}
                        className="flex-1 gradient-primary text-primary-foreground"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Analyze with AI
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Detected Foods */}
          <AnimatePresence>
            {(recognizedFoods.length > 0 || isProcessing) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="glass border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">
                      Detected Foods
                      {processingTime > 0 && (
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          (processed in {(processingTime / 1000).toFixed(1)}s)
                        </span>
                      )}
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddDialog(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Item
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {isProcessing ? (
                      <div className="flex flex-col items-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground">Analyzing your food...</p>
                        <p className="text-sm text-muted-foreground">
                          Using CNN-based image recognition
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recognizedFoods.map((food) => (
                          <motion.div
                            key={food.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex items-center justify-between p-4 rounded-xl bg-muted/50"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{food.name}</p>
                                <Badge variant="secondary" className="text-xs">
                                  {Math.round(food.confidence * 100)}% match
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {food.portion_size}
                              </p>
                              <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                                <span>{food.calories} kcal</span>
                                <span>{food.protein}g protein</span>
                                <span>{food.carbs}g carbs</span>
                                <span>{food.fat}g fat</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingFood(food)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => removeFood(food.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}

                        {/* Totals */}
                        <div className="border-t border-border pt-4 mt-4">
                          <div className="flex items-center justify-between mb-4">
                            <span className="font-medium">Total</span>
                            <div className="flex gap-4 text-sm">
                              <span className="font-semibold text-primary">{totals.calories} kcal</span>
                              <span>{totals.protein}g P</span>
                              <span>{totals.carbs}g C</span>
                              <span>{totals.fat}g F</span>
                            </div>
                          </div>

                          <Button
                            onClick={saveMeal}
                            disabled={isSaving}
                            className="w-full gradient-primary text-primary-foreground"
                          >
                            {isSaving ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Check className="w-4 h-4 mr-2" />
                            )}
                            Confirm & Save Meal
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Add Food Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Food Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Search Foods</Label>
                <Input
                  placeholder="Type to search..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {searchResults.map((food) => (
                  <div
                    key={food.id}
                    onClick={() => addFoodItem(food)}
                    className="p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  >
                    <p className="font-medium">{food.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {food.calories} kcal • {food.portion_size}
                    </p>
                  </div>
                ))}
                {searchQuery.length > 1 && searchResults.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No foods found
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Food Dialog */}
        <Dialog open={!!editingFood} onOpenChange={() => setEditingFood(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Food Item</DialogTitle>
            </DialogHeader>
            {editingFood && (
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editingFood.name}
                    onChange={(e) => setEditingFood({ ...editingFood, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Calories</Label>
                    <Input
                      type="number"
                      value={editingFood.calories}
                      onChange={(e) => setEditingFood({ ...editingFood, calories: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Portion (g)</Label>
                    <Input
                      type="number"
                      value={editingFood.portion_grams}
                      onChange={(e) => setEditingFood({ ...editingFood, portion_grams: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Protein (g)</Label>
                    <Input
                      type="number"
                      value={editingFood.protein}
                      onChange={(e) => setEditingFood({ ...editingFood, protein: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Carbs (g)</Label>
                    <Input
                      type="number"
                      value={editingFood.carbs}
                      onChange={(e) => setEditingFood({ ...editingFood, carbs: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Fat (g)</Label>
                    <Input
                      type="number"
                      value={editingFood.fat}
                      onChange={(e) => setEditingFood({ ...editingFood, fat: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingFood(null)}>
                Cancel
              </Button>
              <Button onClick={() => editingFood && updateFood(editingFood)}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
