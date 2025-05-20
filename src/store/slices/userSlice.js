/*import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import {
  clearTokenCookies,
  getToken,
  setToken,
  isTokenExpired,
} from "../../services/tokenService";

const API_URL = import.meta.env.VITE_API_URL;

// Thunk
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (credentials) => {
    try {
      const { email, password } = credentials;
      const response = await axios.post(
        `${API_URL}/auth/login`,
        {
          email,
          password,
        },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );

      // Store access token in sessionStorage
      if (response.data.token) {
        setToken(response.data.token);
      }

      return response.data;
    } catch (error) {
      throw new Error(error.response.data.error || "Failed to login");
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  "auth/updateUserProfile",
  async ({ user, authToken }) => {
    const response = await axios.put(`${API_URL}/auth/profile`, user, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      withCredentials: true,
    });

    if (response.status !== 200) {
      throw new Error(response.data.error || "Failed to update profile");
    }

    // Store new access token in sessionStorage if received
    if (response.data.token) {
      setToken(response.data.token);
    }

    const token = getToken();

    if (token) {
      const decoded = jwtDecode(token);
      return {
        ...user,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name,
        lastName: decoded.lastName,
      };
    }
  }
);

export const updateUserPassword = createAsyncThunk(
  "auth/updateUserPassword",
  async ({ passwordData, authToken }) => {
    const response = await axios.put(
      `${API_URL}/auth/profile/password`,
      passwordData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        withCredentials: true,
      }
    );

    if (response.status !== 200) {
      throw new Error(response.data.error || "Failed to update password");
    }

    // Store new access token in sessionStorage if received
    if (response.data.token) {
      setToken(response.data.token);
    }

    return response.data;
  }
);

// Slice
const initialState = {
  user: null,
  status: "idle",
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      clearTokenCookies();
    },
    loadUserFromToken: (state, action) => {
      const token = action.payload;

      if (token && !isTokenExpired(token)) {
        const decoded = jwtDecode(token);
        if (!state.user || state.user.email !== decoded.email) {
          state.user = {
            id: decoded.uid,
            email: decoded.email,
            role: decoded.role,
            name: decoded.name || "",
            lastName: decoded.lastName || "",
          };
        }
      } else {
        clearTokenCookies();
      }
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.loading = false;
      state.error = null;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearUser: (state) => {
      state.user = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload.user;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          action.error?.message || action.payload?.error || "Login failed";
      })
      .addCase(updateUserProfile.pending, (state) => {
        state.status = "loading";
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Profile update failed";
      })
      .addCase(updateUserPassword.pending, (state) => {
        state.status = "loading";
      })
      .addCase(updateUserPassword.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(updateUserPassword.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Password update failed";
      });
  },
});

export const userSelector = (state) => state.user;
export const {
  logout,
  loadUserFromToken,
  setUser,
  setLoading,
  setError,
  clearUser,
} = userSlice.actions;

export default userSlice.reducer;*/
