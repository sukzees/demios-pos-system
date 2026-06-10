'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Trash2, History, ChefHat, Package } from 'lucide-react';
import { usePosStore } from '@/lib/store';
import { Item, Category, Recipe, supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MOCK_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Burgers', created_at: '' },
  { id: 'c2', name: 'Drinks', created_at: '' },
  { id: 'c3', name: 'Sides', created_at: '' },
];

const MOCK_ITEMS: Item[] = [
  { id: 'i1', name: 'Classic Burger', price: 8.99, category_id: 'c1', stock: 50, created_at: '' },
  { id: 'i2', name: 'Cheese Burger', price: 9.99, category_id: 'c1', stock: 45, created_at: '' },
  { id: 'i3', name: 'Double Burger', price: 12.99, category_id: 'c1', stock: 30, created_at: '' },
  { id: 'i4', name: 'Cola', price: 2.50, category_id: 'c2', stock: 100, created_at: '' },
  { id: 'i5', name: 'Lemonade', price: 3.00, category_id: 'c2', stock: 80, created_at: '' },
  { id: 'i6', name: 'Fries', price: 3.99, category_id: 'c3', stock: 60, created_at: '' },
  { id: 'i7', name: 'Onion Rings', price: 4.99, category_id: 'c3', stock: 25, created_at: '' },
];

export default function ItemsPage() {
  const { isSupabaseConfigured, items, categories, fetchItemsAndCategories, addItem, addCategory, editCategory, deleteCategory, editItem, deleteItem } = usePosStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  
  // Add Item Form State
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemStock, setNewItemStock] = useState('0');
  const [newItemType, setNewItemType] = useState<'ingredient' | 'standalone' | 'recipe'>('ingredient');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('pcs');
  const [newItemMinStock, setNewItemMinStock] = useState('0');
  const [recipeIngredients, setRecipeIngredients] = useState<{ingredient_id: string; quantity_needed: number; unit: string}[]>([]);

  // Edit Item Form State
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('');
  const [editItemCategory, setEditItemCategory] = useState('');
  const [editItemStock, setEditItemStock] = useState('0');

  // Add Category Form State
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Edit Category State
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  useEffect(() => {
    if (isSupabaseConfigured) {
      fetchItemsAndCategories();
      fetchRecipes();
    }
  }, [isSupabaseConfigured, fetchItemsAndCategories]);

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

  const handleAddItem = async () => {
    if (!newItemName || !newItemPrice || !newItemCategory) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (newItemType === 'recipe') {
        // Create recipe
        const { data, error } = await supabase
          .from('recipes')
          .insert({
            name: newItemName,
            description: newItemDescription,
            category_id: newItemCategory,
            price: parseFloat(newItemPrice),
            is_recipe: true
          })
          .select()
          .single();

        if (error) throw error;
        if (data && recipeIngredients.length > 0) {
          const ingredientsToInsert = recipeIngredients.map(ing => ({
            recipe_id: data.id,
            ingredient_id: ing.ingredient_id,
            quantity_needed: ing.quantity_needed,
            unit: ing.unit
          }));

          await supabase
            .from('recipe_ingredients')
            .insert(ingredientsToInsert);
        }
      } else {
        // Create regular item
        await addItem({
          name: newItemName,
          price: parseFloat(newItemPrice),
          category_id: newItemCategory,
          stock: parseInt(newItemStock) || 0,
          image_url: undefined,
          is_recipe: newItemType === 'standalone'
        });
      }

      // Reset form
      setNewItemName('');
      setNewItemPrice('');
      setNewItemCategory('');
      setNewItemStock('0');
      setNewItemType('ingredient');
      setNewItemDescription('');
      setNewItemUnit('pcs');
      setNewItemMinStock('0');
      setRecipeIngredients([]);
      setIsAddItemOpen(false);
      
      // Refresh data
      fetchItemsAndCategories();
      fetchRecipes();
    } catch (error) {
      alert('Failed to save item. Please try again.');
      console.error('Error saving item:', error);
    }
  };

  const addRecipeIngredient = () => {
    setRecipeIngredients([...recipeIngredients, { ingredient_id: '', quantity_needed: 1, unit: 'pcs' }]);
  };

  const updateRecipeIngredient = (index: number, field: string, value: any) => {
    const updatedIngredients = [...recipeIngredients];
    updatedIngredients[index] = { ...updatedIngredients[index], [field]: value };
    setRecipeIngredients(updatedIngredients);
  };

  const removeRecipeIngredient = (index: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
  };

  const getAvailableIngredients = () => {
    return items.filter(item => !item.is_recipe);
  };

  const displayCategories = categories.length > 0 ? categories : (isSupabaseConfigured ? [] : MOCK_CATEGORIES);
  const displayItems = items.length > 0 ? items : (isSupabaseConfigured ? [] : MOCK_ITEMS);

  const handleEditItem = async () => {
    if (!editingItem || !editItemName || !editItemPrice || !editItemCategory) {
      alert('Please fill in all required fields');
      return;
    }

    await editItem(editingItem.id, {
      name: editItemName,
      price: parseFloat(editItemPrice),
      category_id: editItemCategory,
      stock: parseInt(editItemStock) || 0,
    });

    setIsEditItemOpen(false);
    setEditingItem(null);
    setEditItemName('');
    setEditItemPrice('');
    setEditItemCategory('');
    setEditItemStock('0');
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteItem(id);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName) {
      alert('Please enter a category name');
      return;
    }

    await addCategory({ name: newCategoryName });
    setIsAddCategoryOpen(false);
    setNewCategoryName('');
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !editCategoryName) return;
    await editCategory(editingCategory.id, { name: editCategoryName });
    setIsEditCategoryOpen(false);
    setEditingCategory(null);
    setEditCategoryName('');
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      await deleteCategory(id);
    }
  };

  const filteredItems = displayItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Items & Categories</h2>
      </div>

      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="recipes">Recipes</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        
        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input 
                    placeholder="Search items..." 
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Add New Item</DialogTitle>
                      <DialogDescription>
                        Create a new item, ingredient, or recipe in your menu.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Tabs defaultValue="ingredients" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="type">Type</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="ingredients" className="space-y-4">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">Recipe Ingredients</h3>
                            <Button onClick={addRecipeIngredient} size="sm" disabled={newItemType !== 'recipe'}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Ingredient
                            </Button>
                          </div>
                          
                          {newItemType !== 'recipe' ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="text-sm text-blue-800">
                                <strong>Recipe Ingredients:</strong> Select "Recipe" type in the Type tab to add ingredients from your inventory.
                              </div>
                              <div className="mt-2">
                                <Button 
                                  onClick={() => setNewItemType('recipe')} 
                                  variant="outline" 
                                  size="sm"
                                  className="text-blue-700 border-blue-300"
                                >
                                  Switch to Recipe Type
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="text-sm text-blue-800">
                                  <strong>ðŸ“‹ Available Ingredients:</strong> Select from your inventory items marked as ingredients.
                                </div>
                                <div className="text-xs text-blue-600 mt-1">
                                  {getAvailableIngredients().length === 0 
                                    ? "No ingredient items found. Create ingredients in Inventory first."
                                    : `${getAvailableIngredients().length} ingredient(s) available`
                                  }
                                </div>
                              </div>
                              
                              <div className="max-h-60 overflow-y-auto space-y-2">
                                {recipeIngredients.map((ingredient, index) => (
                                  <div key={index} className="flex gap-2 items-center p-2 border rounded-lg bg-zinc-50">
                                    <Select
                                      value={ingredient.ingredient_id}
                                      onValueChange={(value) => updateRecipeIngredient(index, 'ingredient_id', value)}
                                    >
                                      <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Select ingredient" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {getAvailableIngredients().map((item) => (
                                          <SelectItem key={item.id} value={item.id}>
                                            ðŸ¥• {item.name} (Stock: {item.stock || 0})
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    
                                    <Input
                                      type="number"
                                      step="0.1"
                                      value={ingredient.quantity_needed}
                                      onChange={(e) => updateRecipeIngredient(index, 'quantity_needed', parseFloat(e.target.value) || 0)}
                                      placeholder="Qty"
                                      className="w-20"
                                    />
                                    
                                    <Select
                                      value={ingredient.unit}
                                      onValueChange={(value) => updateRecipeIngredient(index, 'unit', value)}
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
                                      onClick={() => removeRecipeIngredient(index)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                
                                {recipeIngredients.length === 0 && (
                                  <p className="text-center text-zinc-500 py-8 border-2 border-dashed border-zinc-300 rounded-lg">
                                    No ingredients added yet. Click "Add Ingredient" to start building your recipe.
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="details" className="space-y-4">
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input 
                              id="name" 
                              placeholder="e.g. Cheese Burger, Tomatoes, Burger Combo" 
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                            />
                          </div>
                          
                          <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Input 
                              id="description" 
                              placeholder="Optional description for recipes" 
                              value={newItemDescription}
                              onChange={(e) => setNewItemDescription(e.target.value)}
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="price">Price</Label>
                              <Input 
                                id="price" 
                                type="number" 
                                step="0.01" 
                                placeholder="0.00" 
                                value={newItemPrice}
                                onChange={(e) => setNewItemPrice(e.target.value)}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="stock">Initial Stock</Label>
                              <Input 
                                id="stock" 
                                type="number" 
                                placeholder="0" 
                                value={newItemStock}
                                onChange={(e) => setNewItemStock(e.target.value)}
                                disabled={newItemType === 'recipe'}
                              />
                            </div>
                          </div>
                          
                          <div className="grid gap-2">
                            <Label htmlFor="category">Category</Label>
                            <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                              <SelectContent>
                                {displayCategories.map((category) => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </TabsContent>
                        <div className="space-y-4">
                          <Label className="text-base font-medium">Item Type</Label>
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-zinc-50"
                                 onClick={() => setNewItemType('ingredient')}>
                              <input
                                type="radio"
                                checked={newItemType === 'ingredient'}
                                onChange={() => setNewItemType('ingredient')}
                                className="text-blue-600"
                              />
                              <div className="flex-1">
                                <div className="font-medium">ðŸ¥• Ingredient</div>
                                <div className="text-sm text-zinc-500">Raw material that can be used in recipes</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-zinc-50"
                                 onClick={() => setNewItemType('standalone')}>
                              <input
                                type="radio"
                                checked={newItemType === 'standalone'}
                                onChange={() => setNewItemType('standalone')}
                                className="text-blue-600"
                              />
                              <div className="flex-1">
                                <div className="font-medium">ðŸ” Standalone Item</div>
                                <div className="text-sm text-zinc-500">Sold directly, not used in recipes</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-zinc-50"
                                 onClick={() => setNewItemType('recipe')}>
                              <input
                                type="radio"
                                checked={newItemType === 'recipe'}
                                onChange={() => setNewItemType('recipe')}
                                className="text-blue-600"
                              />
                              <div className="flex-1">
                                <div className="font-medium">ðŸ‘¨â€ðŸ³ Recipe</div>
                                <div className="text-sm text-zinc-500">Composite item made from ingredients</div>
                              </div>
                            </div>
                          </div>
                          
                          {newItemType === 'ingredient' && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="text-sm text-green-800">
                                <strong>Ingredient:</strong> This item will appear as an option when creating recipes and its stock will be tracked for recipe calculations.
                              </div>
                            </div>
                          )}
                          
                          {newItemType === 'standalone' && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                              <div className="text-sm text-orange-800">
                                <strong>Standalone:</strong> This item is sold directly to customers and won't appear in recipe ingredient lists.
                              </div>
                            </div>
                          )}
                          
                          {newItemType === 'recipe' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="text-sm text-blue-800">
                                <strong>Recipe:</strong> This is a composite item made from multiple ingredients. Add ingredients in the Ingredients tab.
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddItem}>Save Item</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isEditItemOpen} onOpenChange={setIsEditItemOpen}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Edit Item</DialogTitle>
                      <DialogDescription>
                        Update item details.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit-name">Name</Label>
                        <Input 
                          id="edit-name" 
                          placeholder="e.g. Cheese Burger" 
                          value={editItemName}
                          onChange={(e) => setEditItemName(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="edit-price">Price</Label>
                          <Input 
                            id="edit-price" 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            value={editItemPrice}
                            onChange={(e) => setEditItemPrice(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-stock">Stock</Label>
                          <Input 
                            id="edit-stock" 
                            type="number" 
                            placeholder="0" 
                            value={editItemStock}
                            onChange={(e) => setEditItemStock(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-category">Category</Label>
                        <Select value={editItemCategory} onValueChange={setEditItemCategory}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {displayCategories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsEditItemOpen(false)}>Cancel</Button>
                      <Button onClick={handleEditItem}>Save Changes</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-zinc-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/50 text-left text-zinc-500">
                      <th className="p-4 font-medium">Name</th>
                      <th className="p-4 font-medium">Category</th>
                      <th className="p-4 font-medium">Price</th>
                      <th className="p-4 font-medium">Stock</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-zinc-500">
                          No items found.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const category = displayCategories.find(c => c.id === item.category_id);
                        const stock = item.stock ?? 0;
                        return (
                          <tr key={item.id} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50">
                            <td className="p-4 font-medium">{item.name}</td>
                            <td className="p-4 text-zinc-500">{category?.name || 'Unknown'}</td>
                            <td className="p-4 font-medium">${item.price.toFixed(2)}</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                stock === 0 ? 'bg-red-100 text-red-800' : 
                                stock < 10 ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-green-100 text-green-800'
                              }`}>
                                {stock} in stock
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" asChild title="Manage Inventory">
                                  <Link href={`/inventory?search=${encodeURIComponent(item.name)}`}>
                                    <History className="h-4 w-4 text-blue-500" />
                                  </Link>
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => {
                                  setEditingItem(item);
                                  setEditItemName(item.name);
                                  setEditItemPrice(item.price.toString());
                                  setEditItemCategory(item.category_id);
                                  setEditItemStock((item.stock ?? 0).toString());
                                  setIsEditItemOpen(true);
                                }}>
                                  <Edit className="h-4 w-4 text-zinc-500" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteItem(item.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recipes" className="space-y-4">
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
                <Link href="/recipes">
                  <Button className="gap-2">
                    <ChefHat className="h-4 w-4" />
                    Manage Recipes
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-zinc-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/50 text-left text-zinc-500">
                      <th className="p-4 font-medium">Recipe Name</th>
                      <th className="p-4 font-medium">Category</th>
                      <th className="p-4 font-medium">Price</th>
                      <th className="p-4 font-medium">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipes.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-zinc-500">
                          No recipes found. <Link href="/recipes" className="text-blue-600 hover:underline">Create your first recipe</Link>.
                        </td>
                      </tr>
                    ) : (
                      recipes.filter(recipe => 
                        recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
                      ).map((recipe) => {
                        const category = displayCategories.find(c => c.id === recipe.category_id);
                        return (
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
                            <td className="p-4 text-zinc-500">{category?.name || 'Unknown'}</td>
                            <td className="p-4 font-medium">${recipe.price.toFixed(2)}</td>
                            <td className="p-4">
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-800">
                                Recipe
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Manage Categories</CardTitle>
                <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Add New Category</DialogTitle>
                      <DialogDescription>
                        Create a new category for your items.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="cat-name">Category Name</Label>
                        <Input 
                          id="cat-name" 
                          placeholder="e.g. Desserts" 
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddCategory}>Save Category</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Edit Category</DialogTitle>
                      <DialogDescription>
                        Update the category name.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit-cat-name">Category Name</Label>
                        <Input 
                          id="edit-cat-name" 
                          placeholder="e.g. Desserts" 
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsEditCategoryOpen(false)}>Cancel</Button>
                      <Button onClick={handleEditCategory}>Save Changes</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-zinc-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/50 text-left text-zinc-500">
                      <th className="p-4 font-medium">Name</th>
                      <th className="p-4 font-medium">Items Count</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayCategories.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-zinc-500">
                          No categories found.
                        </td>
                      </tr>
                    ) : (
                      displayCategories.map((category) => {
                        const itemCount = displayItems.filter(i => i.category_id === category.id).length;
                        return (
                          <tr key={category.id} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50">
                            <td className="p-4 font-medium">{category.name}</td>
                            <td className="p-4 text-zinc-500">{itemCount} items</td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => {
                                  setEditingCategory(category);
                                  setEditCategoryName(category.name);
                                  setIsEditCategoryOpen(true);
                                }}>
                                  <Edit className="h-4 w-4 text-zinc-500" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteCategory(category.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
