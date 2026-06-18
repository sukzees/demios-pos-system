type CostItem = {
  id: string;
  name?: string | null;
  cost_price?: number | string | null;
  inventory_item_id?: string | null;
  is_recipe?: boolean | null;
  type?: string | null;
};

type InventoryCostItem = {
  id: string;
  name?: string | null;
  cost_price?: number | string | null;
};

type RecipeCostItem = {
  id: string;
  name?: string | null;
};

type RecipeIngredient = {
  recipe_id?: string | null;
  ingredient_id?: string | null;
  quantity_needed?: number | string | null;
};

type PortionCostItem = {
  item_id?: string | null;
  recipe_id?: string | null;
  inventory_item_id?: string | null;
  portion_name?: string | null;
  portion_cost_price?: number | string | null;
};

type OrderLine = {
  order_id?: string | null;
  item_id?: string | null;
  quantity?: number | string | null;
  notes?: string | null;
};

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const hasCostValue = (value: number | string | null | undefined) =>
  value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

const firstKnownCost = (...values: Array<number | undefined>) => {
  const value = values.find((candidate) => candidate !== undefined);
  return value ?? 0;
};

const normalizeName = (value: string | null | undefined) =>
  String(value || '')
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .trim()
    .toLowerCase();

const getNoteValue = (notes: string | null | undefined, label: string) => {
  const part = String(notes || '')
    .split('|')
    .map((value) => value.trim())
    .find((value) => value.toLowerCase().startsWith(`${label.toLowerCase()}:`));

  return part ? part.slice(part.indexOf(':') + 1).trim() : '';
};

export const calculateOrderItemsCost = ({
  orderItems,
  items,
  inventoryItems = [],
  recipes = [],
  recipeIngredients = [],
  portions = [],
  completedOrderIds,
}: {
  orderItems: OrderLine[];
  items: CostItem[];
  inventoryItems?: InventoryCostItem[];
  recipes?: RecipeCostItem[];
  recipeIngredients?: RecipeIngredient[];
  portions?: PortionCostItem[];
  completedOrderIds: Set<string>;
}) => {
  const inventoryCostById = new Map<string, number>();
  const inventoryHasCostById = new Map<string, boolean>();
  const inventoryNameById = new Map<string, string>();
  for (const item of inventoryItems) {
    const id = String(item.id);
    inventoryCostById.set(id, toNumber(item.cost_price));
    inventoryHasCostById.set(id, hasCostValue(item.cost_price));
    inventoryNameById.set(id, String(item.name || ''));
  }

  const recipeCostById = new Map<string, number>();
  for (const ingredient of recipeIngredients) {
    if (!ingredient.recipe_id || !ingredient.ingredient_id) continue;
    const recipeId = String(ingredient.recipe_id);
    const ingredientCost = inventoryCostById.get(String(ingredient.ingredient_id)) || 0;
    const quantityNeeded = toNumber(ingredient.quantity_needed);
    recipeCostById.set(recipeId, (recipeCostById.get(recipeId) || 0) + ingredientCost * quantityNeeded);
  }

  const itemCostById = new Map<string, number>();
  const itemCostByName = new Map<string, number>();
  const itemNameById = new Map<string, string>();
  for (const item of items) {
    const itemId = String(item.id);
    const itemName = String(item.name || '');
    const ownCost = toNumber(item.cost_price);
    const hasOwnCost = hasCostValue(item.cost_price);
    const linkedInventoryId = item.inventory_item_id ? String(item.inventory_item_id) : '';
    const linkedInventoryCost = item.inventory_item_id
      ? inventoryCostById.get(linkedInventoryId)
      : undefined;
    const recipeCost = (item.is_recipe || item.type === 'recipe') && recipeCostById.has(itemId)
      ? recipeCostById.get(itemId)
      : undefined;

    const itemCost = firstKnownCost(
      recipeCost,
      inventoryHasCostById.get(linkedInventoryId) ? linkedInventoryCost : undefined,
      hasOwnCost ? ownCost : undefined
    );
    itemCostById.set(itemId, itemCost);
    itemNameById.set(itemId, itemName);
    if (itemName) itemCostByName.set(normalizeName(itemName), itemCost);
  }

  for (const item of inventoryItems) {
    const itemName = String(item.name || '');
    if (itemName) itemCostByName.set(normalizeName(itemName), inventoryCostById.get(String(item.id)) || 0);
  }

  for (const recipe of recipes) {
    const recipeName = String(recipe.name || '');
    const recipeCost = recipeCostById.get(String(recipe.id)) || 0;
    if (recipeName) itemCostByName.set(normalizeName(recipeName), recipeCost);
    itemCostById.set(String(recipe.id), recipeCost);
    itemNameById.set(String(recipe.id), recipeName);
  }

  const portionCostByProductAndName = new Map<string, number>();
  for (const portion of portions) {
    const productId = portion.item_id || portion.recipe_id || portion.inventory_item_id;
    if (!productId || !portion.portion_name) continue;

    const productName =
      itemNameById.get(String(productId)) ||
      inventoryNameById.get(String(productId)) ||
      '';
    if (!productName) continue;

    portionCostByProductAndName.set(
      `${normalizeName(productName)}::${normalizeName(portion.portion_name)}`,
      toNumber(portion.portion_cost_price)
    );
  }

  const totalCost = orderItems.reduce((total, orderItem) => {
    if (!orderItem.order_id || !completedOrderIds.has(String(orderItem.order_id))) {
      return total;
    }

    const noteItemName = getNoteValue(orderItem.notes, 'Item');
    const noteRecipeName = getNoteValue(orderItem.notes, 'Recipe');
    const notePortionName = getNoteValue(orderItem.notes, 'Portion');
    const noteProductName = noteItemName || noteRecipeName;
    const portionCostKey = noteProductName && notePortionName
      ? `${normalizeName(noteProductName)}::${normalizeName(notePortionName)}`
      : '';
    const itemCost = firstKnownCost(
      portionCostKey && portionCostByProductAndName.has(portionCostKey)
        ? portionCostByProductAndName.get(portionCostKey)
        : undefined,
      orderItem.item_id && itemCostById.has(String(orderItem.item_id))
        ? itemCostById.get(String(orderItem.item_id))
        : undefined,
      itemCostByName.has(normalizeName(noteProductName))
        ? itemCostByName.get(normalizeName(noteProductName))
        : undefined
    );

    return total + itemCost * toNumber(orderItem.quantity);
  }, 0);

  return Number.isFinite(totalCost) ? totalCost : 0;
};
