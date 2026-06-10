'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search, Edit, Trash2, ChefHat, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Recipe, RecipeIngredient, Item, Category } from '@/lib/supabase';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePosStore } from '@/lib/store';
import { formatCurrency } from '@/lib/currency';

export default function RecipesPage() {
  const { currencySettings } = usePosStore();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newRecipe, setNewRecipe] = useState({
    name: '',
    description: '',
    category_id: '',
    price: '',
    ingredients: [] as { ingredient_id: string; quantity_needed: number; unit: string }[]
  });

  const fetchRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) setRecipes(data);
      if (error) console.error('Error fetching recipes:', error);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    }
  };

  const fetchIngredients = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('is_recipe', false)
        .order('name');

      if (data) setIngredients(data);
      if (error) console.error('Error fetching ingredients:', error);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (data) setCategories(data);
      if (error) console.error('Error fetching categories:', error);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchRecipes();
    fetchIngredients();
    fetchCategories();
  }, []);

  const handleSaveRecipe = async () => {
    if (!newRecipe.name || !newRecipe.price || !newRecipe.category_id) {
      alert('Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      if (editingId) {
        // Update existing recipe
        const { error } = await supabase
          .from('recipes')
          .update({
            name: newRecipe.name,
            description: newRecipe.description,
            category_id: newRecipe.category_id,
            price: parseFloat(newRecipe.price)
          })
          .eq('id', editingId);

        if (error) throw error;

        // Update ingredients
        await supabase
          .from('recipe_ingredients')
          .delete()
          .eq('recipe_id', editingId);

        if (newRecipe.ingredients.length > 0) {
          const ingredientsToInsert = newRecipe.ingredients.map(ing => ({
            recipe_id: editingId,
            ingredient_id: ing.ingredient_id,
            quantity_needed: ing.quantity_needed,
            unit: ing.unit
          }));

          await supabase
            .from('recipe_ingredients')
            .insert(ingredientsToInsert);
        }
      } else {
        // Create new recipe
        const { data, error } = await supabase
          .from('recipes')
          .insert({
            name: newRecipe.name,
            description: newRecipe.description,
            category_id: newRecipe.category_id,
            price: parseFloat(newRecipe.price),
            is_recipe: true
          })
          .select()
          .single();

        if (error) throw error;
        if (data && newRecipe.ingredients.length > 0) {
          const ingredientsToInsert = newRecipe.ingredients.map(ing => ({
            recipe_id: data.id,
            ingredient_id: ing.ingredient_id,
            quantity_needed: ing.quantity_needed,
            unit: ing.unit
          }));

          await supabase
            .from('recipe_ingredients')
            .insert(ingredientsToInsert);
        }
      }

      setIsDialogOpen(false);
      resetForm();
      fetchRecipes();
    } catch (error) {
      alert('Failed to save recipe. Please try again.');
      console.error('Error saving recipe:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (recipe: Recipe) => {
    // Fetch recipe ingredients for editing
    const fetchRecipeIngredients = async () => {
      const { data } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', recipe.id);

      setNewRecipe({
        name: recipe.name,
        description: recipe.description || '',
        category_id: recipe.category_id,
        price: recipe.price.toString(),
        ingredients: data || []
      });
    };

    fetchRecipeIngredients();
    setEditingId(recipe.id);
    setIsDialogOpen(true);
  };

  const addIngredient = () => {
    setNewRecipe({
      ...newRecipe,
      ingredients: [...newRecipe.ingredients, { ingredient_id: '', quantity_needed: 1, unit: 'pcs' }]
    });
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const updatedIngredients = [...newRecipe.ingredients];
    updatedIngredients[index] = { ...updatedIngredients[index], [field]: value };
    setNewRecipe({ ...newRecipe, ingredients: updatedIngredients });
  };

  const removeIngredient = (index: number) => {
    setNewRecipe({
      ...newRecipe,
      ingredients: newRecipe.ingredients.filter((_, i) => i !== index)
    });
  };

  const resetForm = () => {
    setNewRecipe({ name: '', description: '', category_id: '', price: '', ingredients: [] });
    setEditingId(null);
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Recipe Management</h2>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Search recipes..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Recipe
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Edit Recipe' : 'Create New Recipe'}</DialogTitle>
                  <DialogDescription>
                    {editingId ? 'Update recipe details and ingredients.' : 'Create a new recipe with ingredients from your inventory.'}
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="details">Recipe Details</TabsTrigger>
                    <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-4">
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input
                          id="name"
                          value={newRecipe.name}
                          onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
                          className="col-span-3"
                          placeholder="Burger Combo"
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">Description</Label>
                        <Input
                          id="description"
                          value={newRecipe.description}
                          onChange={(e) => setNewRecipe({ ...newRecipe, description: e.target.value })}
                          className="col-span-3"
                          placeholder="Classic Burger with Fries and Drink"
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">Category</Label>
                        <Select
                          value={newRecipe.category_id}
                          onValueChange={(value) => setNewRecipe({ ...newRecipe, category_id: value })}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="price" className="text-right">Price</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          value={newRecipe.price}
                          onChange={(e) => setNewRecipe({ ...newRecipe, price: e.target.value })}
                          className="col-span-3"
                          placeholder="12.99"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="ingredients" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Recipe Ingredients</h3>
                      <Button onClick={addIngredient} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Ingredient
                      </Button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {newRecipe.ingredients.map((ingredient, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <Select
                            value={ingredient.ingredient_id}
                            onValueChange={(value) => updateIngredient(index, 'ingredient_id', value)}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select ingredient" />
                            </SelectTrigger>
                            <SelectContent>
                              {ingredients.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Input
                            type="number"
                            step="0.1"
                            value={ingredient.quantity_needed}
                            onChange={(e) => updateIngredient(index, 'quantity_needed', parseFloat(e.target.value) || 0)}
                            placeholder="Qty"
                            className="w-20"
                          />

                          <Select
                            value={ingredient.unit}
                            onValueChange={(value) => updateIngredient(index, 'unit', value)}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pcs">pcs</SelectItem>
                              <SelectItem value="kg">kg</SelectItem>
                              <SelectItem value="g">g</SelectItem>
                              <SelectItem value="l">l</SelectItem>
                              <SelectItem value="ml">ml</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => removeIngredient(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}

                      {newRecipe.ingredients.length === 0 && (
                        <p className="text-center text-zinc-500 py-4">
                          No ingredients added yet. Click "Add Ingredient" to start.
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter>
                  <Button type="submit" onClick={handleSaveRecipe} disabled={isLoading}>
                    {isLoading ? 'Saving...' : (editingId ? 'Update Recipe' : 'Create Recipe')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-zinc-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-50 bg-blue-50/20 text-left text-blue-600">
                  <th className="p-4 font-medium">Recipe Name</th>
                  <th className="p-4 font-medium">Category</th>
                  <th className="p-4 font-medium">Price</th>
                  <th className="p-4 font-medium">Ingredients</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecipes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                      No recipes found.
                    </td>
                  </tr>
                ) : (
                  filteredRecipes.map((recipe) => (
                    <tr key={recipe.id} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50">
                      <td className="p-4 font-medium flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                          <ChefHat className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <div>{recipe.name}</div>
                          {recipe.description && (
                            <div className="text-sm text-zinc-500">{recipe.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-zinc-500">
                        {categories.find(c => c.id === recipe.category_id)?.name || 'Unknown'}
                      </td>
                      <td className="p-4 font-medium">{formatCurrency(recipe.price, currencySettings)}</td>
                      <td className="p-4 text-zinc-500">
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          <span className="text-xs">Recipe</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(recipe)}
                          >
                            <Edit className="h-4 w-4 text-zinc-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
