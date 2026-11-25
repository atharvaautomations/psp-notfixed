export interface Ingredient {
  id: number;
  name: string;
  ingredientCode?: string;
  materialName?: string;
  type?: string;
  createdAt?: string;
  updatedAt?: string;
  bins?: {
    id: number;
    binNumber: string;
    minQuantity: number;
    maxQuantity: number;
    currentQuantity: number;
    createdAt: string;
    updatedAt: string;
  }[];
}
