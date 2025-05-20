import { createSlice } from "@reduxjs/toolkit";

const initialState = [];

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    addProduct: (state, action) => {
      state.push(action.payload);
    },
    updateStock: (state, action) => {
      const product = state.find(p => p.code === action.payload.code);
      if (product) {
        product.stock_current += action.payload.amount;
      }
    },
    removeProduct: (state, action) => {
      return state.filter(p => p.code !== action.payload.code);
    }
  }
});

export const { addProduct, updateStock, removeProduct } = productsSlice.actions;
export default productsSlice.reducer;


// Product structure:
// {
//   name: string,
//   weight: number,
//   measure_unit: string,
//   stock_current: number,
//   stock_minimum: number,
//   price_purchase: number,
//   price_sold: number,
//   category: string,
//   code: string,
//   brand: string
// }