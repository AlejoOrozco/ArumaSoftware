import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type Product = {
  name: string;
  weight: number;
  measure_unit: string;
  stock_current: number;
  stock_minimum: number;
  price_purchase: number;
  price_sold: number;
  category: string;
  code: string;
  brand: string;
};

type ProductsState = Product[];

const initialState: ProductsState = [];

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    addProduct: (state, action: PayloadAction<Product>) => {
      state.push(action.payload);
    },
    updateStock: (
      state,
      action: PayloadAction<{ code: string; amount: number }>
    ) => {
      const product = state.find((p) => p.code === action.payload.code);
      if (product) {
        product.stock_current += action.payload.amount;
      }
    },
    removeProduct: (state, action: PayloadAction<{ code: string }>) => {
      return state.filter((p) => p.code !== action.payload.code);
    },
  },
});

export const { addProduct, updateStock, removeProduct } = productsSlice.actions;
export default productsSlice.reducer;

