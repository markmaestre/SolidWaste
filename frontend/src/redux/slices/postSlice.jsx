/**
 * redux/slices/postSlice.js
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../utils/axiosInstance';

// ─────────────────────────────────────────────────────────────────────────────
// Async Thunks
// ─────────────────────────────────────────────────────────────────────────────

export const createPost = createAsyncThunk(
  'posts/create',
  async (postData, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      Object.keys(postData).forEach(key => {
        if (key === 'image' && postData[key] instanceof File) {
          formData.append('image', postData[key]);
        } else if (postData[key] !== null && postData[key] !== undefined) {
          formData.append(key, postData[key]);
        }
      });
      const response = await axiosInstance.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { success: false, error: 'Failed to create post', details: error.message }
      );
    }
  }
);

export const getAllPosts = createAsyncThunk(
  'posts/getAll',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const { status, category, page = 1, limit = 20 } = filters;
      const response = await axiosInstance.get('/posts', {
        params: { status, category, page, limit },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { success: false, error: 'Failed to fetch posts', details: error.message }
      );
    }
  }
);

export const getPostById = createAsyncThunk(
  'posts/getById',
  async (postId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/posts/${postId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { success: false, error: 'Failed to fetch post', details: error.message }
      );
    }
  }
);

export const updatePost = createAsyncThunk(
  'posts/update',
  async ({ postId, postData }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      Object.keys(postData).forEach(key => {
        if (key === 'image' && postData[key] instanceof File) {
          formData.append('image', postData[key]);
        } else if (postData[key] !== null && postData[key] !== undefined) {
          formData.append(key, postData[key]);
        }
      });
      const response = await axiosInstance.put(`/posts/${postId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { success: false, error: 'Failed to update post', details: error.message }
      );
    }
  }
);

export const deletePost = createAsyncThunk(
  'posts/delete',
  async (postId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`/posts/${postId}`);
      return { postId, ...response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { success: false, error: 'Failed to delete post', details: error.message }
      );
    }
  }
);

/**
 * Like/Unlike a post
 * Backend returns: { success, message, liked (bool), likes (number) }
 */
export const toggleLike = createAsyncThunk(
  'posts/toggleLike',
  async (postId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/posts/${postId}/like`);
      // response.data = { success, message, liked: bool, likes: number }
      return { postId, ...response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { success: false, error: 'Failed to toggle like', details: error.message }
      );
    }
  }
);

/**
 * Add comment to a post
 * Backend returns: { success, message, comment: { user: { username, ... }, content, createdAt } }
 */
export const addComment = createAsyncThunk(
  'posts/addComment',
  async ({ postId, content }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/posts/${postId}/comment`, { content });
      // response.data = { success, message, comment: { user, content, createdAt, _id } }
      return { postId, comment: response.data.comment, ...response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { success: false, error: 'Failed to add comment', details: error.message }
      );
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Slice
// ─────────────────────────────────────────────────────────────────────────────

const postSlice = createSlice({
  name: 'posts',
  initialState: {
    posts: [],
    currentPost: null,
    loading: false,
    error: null,
    success: false,
    operation: '',
    filters: {
      status: '',
      category: '',
    },
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalPosts: 0,
      hasNext: false,
      hasPrev: false,
    },
    selectedCategory: 'all',
    viewMode: 'grid',
  },

  reducers: {
    clearPostError: (state) => { state.error = null; },
    clearPostSuccess: (state) => { state.success = false; state.operation = ''; },
    clearCurrentPost: (state) => { state.currentPost = null; },
    setCurrentPost: (state, action) => { state.currentPost = action.payload; },
    setSelectedCategory: (state, action) => {
      state.selectedCategory = action.payload;
      state.filters.category = action.payload === 'all' ? '' : action.payload;
    },
    setViewMode: (state, action) => { state.viewMode = action.payload; },
    setFilters: (state, action) => { state.filters = { ...state.filters, ...action.payload }; },
    resetPostState: (state) => {
      state.posts = [];
      state.currentPost = null;
      state.loading = false;
      state.error = null;
      state.success = false;
      state.operation = '';
      state.selectedCategory = 'all';
      state.filters = { status: '', category: '' };
      state.pagination = { currentPage: 1, totalPages: 1, totalPosts: 0, hasNext: false, hasPrev: false };
    },
    updatePostInList: (state, action) => {
      const updatedPost = action.payload;
      const index = state.posts.findIndex(p => p._id === updatedPost._id);
      if (index !== -1) state.posts[index] = updatedPost;
      if (state.currentPost?._id === updatedPost._id) state.currentPost = updatedPost;
    },
    removePostFromList: (state, action) => {
      const postId = action.payload;
      state.posts = state.posts.filter(p => p._id !== postId);
      if (state.currentPost?._id === postId) state.currentPost = null;
    },
  },

  extraReducers: (builder) => {
    // ── createPost ────────────────────────────────────────────────────────
    builder
      .addCase(createPost.pending, (state) => {
        state.loading = true; state.error = null; state.success = false; state.operation = 'create';
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.loading = false; state.success = true; state.operation = 'create'; state.error = null;
        if (action.payload.success && action.payload.post) {
          state.posts.unshift(action.payload.post);
          state.currentPost = action.payload.post;
        }
      })
      .addCase(createPost.rejected, (state, action) => {
        state.loading = false; state.success = false; state.operation = 'create'; state.error = action.payload;
      })

    // ── getAllPosts ────────────────────────────────────────────────────────
      .addCase(getAllPosts.pending, (state) => {
        state.loading = true; state.error = null; state.operation = 'fetch_all';
      })
      .addCase(getAllPosts.fulfilled, (state, action) => {
        state.loading = false; state.operation = 'fetch_all'; state.error = null;
        if (action.payload.success) {
          state.posts = action.payload.posts || [];
          const cp = action.payload.currentPage || 1;
          const tp = action.payload.totalPages || 1;
          state.pagination = {
            currentPage: cp,
            totalPages: tp,
            totalPosts: action.payload.totalPosts || 0,
            hasNext: cp < tp,
            hasPrev: cp > 1,
          };
        }
      })
      .addCase(getAllPosts.rejected, (state, action) => {
        state.loading = false; state.operation = 'fetch_all'; state.error = action.payload;
      })

    // ── getPostById ───────────────────────────────────────────────────────
      .addCase(getPostById.pending, (state) => {
        state.loading = true; state.error = null; state.operation = 'fetch_single';
      })
      .addCase(getPostById.fulfilled, (state, action) => {
        state.loading = false; state.operation = 'fetch_single'; state.error = null;
        if (action.payload.success) state.currentPost = action.payload.post;
      })
      .addCase(getPostById.rejected, (state, action) => {
        state.loading = false; state.operation = 'fetch_single'; state.error = action.payload;
      })

    // ── updatePost ────────────────────────────────────────────────────────
      .addCase(updatePost.pending, (state) => {
        state.loading = true; state.error = null; state.operation = 'update';
      })
      .addCase(updatePost.fulfilled, (state, action) => {
        state.loading = false; state.success = true; state.operation = 'update'; state.error = null;
        if (action.payload.success && action.payload.post) {
          const updatedPost = action.payload.post;
          const index = state.posts.findIndex(p => p._id === updatedPost._id);
          if (index !== -1) state.posts[index] = updatedPost;
          if (state.currentPost?._id === updatedPost._id) state.currentPost = updatedPost;
        }
      })
      .addCase(updatePost.rejected, (state, action) => {
        state.loading = false; state.operation = 'update'; state.error = action.payload;
      })

    // ── deletePost ────────────────────────────────────────────────────────
      .addCase(deletePost.pending, (state) => {
        state.loading = true; state.error = null; state.operation = 'delete';
      })
      .addCase(deletePost.fulfilled, (state, action) => {
        state.loading = false; state.success = true; state.operation = 'delete'; state.error = null;
        state.posts = state.posts.filter(p => p._id !== action.payload.postId);
        if (state.currentPost?._id === action.payload.postId) state.currentPost = null;
      })
      .addCase(deletePost.rejected, (state, action) => {
        state.loading = false; state.operation = 'delete'; state.error = action.payload;
      })

    // ── toggleLike ────────────────────────────────────────────────────────
    // Backend response: { success, message, liked: bool, likes: number }
    // FIX: was incorrectly mapping `likes` (number) as the likes array
      .addCase(toggleLike.pending, (state) => {
        state.operation = 'like';
      })
      .addCase(toggleLike.fulfilled, (state, action) => {
        state.operation = '';
        state.error = null;

        const { postId, liked, likes } = action.payload;
        // `liked` = boolean (did current user like it)
        // `likes` = number (total like count from backend)

        const postInList = state.posts.find(p => p._id === postId);
        if (postInList) {
          postInList.liked = liked;           // boolean — for heart icon
          postInList.likeCount = likes;       // number — for like count display
        }

        if (state.currentPost?._id === postId) {
          state.currentPost.liked = liked;
          state.currentPost.likeCount = likes;
        }
      })
      .addCase(toggleLike.rejected, (state, action) => {
        state.operation = '';
        state.error = action.payload;
      })

    // ── addComment ────────────────────────────────────────────────────────
    // Backend response: { success, message, comment: { _id, user: { username, profile }, content, createdAt } }
    // FIX: now appends the full populated comment to posts list, not just incrementing count
      .addCase(addComment.pending, (state) => {
        state.operation = 'comment';
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.operation = '';
        state.error = null;

        const { postId, comment } = action.payload;

        // Update in posts list — append real comment with populated user
        const postInList = state.posts.find(p => p._id === postId);
        if (postInList) {
          postInList.comments = postInList.comments || [];
          // Replace temp optimistic comment if it exists, else push
          const tempIndex = postInList.comments.findIndex(c => c._id?.startsWith('temp-'));
          if (tempIndex !== -1) {
            postInList.comments[tempIndex] = comment; // replace temp with real
          } else {
            postInList.comments.push(comment);
          }
          postInList.commentCount = postInList.comments.length;
        }

        // Update currentPost too
        if (state.currentPost?._id === postId) {
          state.currentPost.comments = state.currentPost.comments || [];
          const tempIndex = state.currentPost.comments.findIndex(c => c._id?.startsWith('temp-'));
          if (tempIndex !== -1) {
            state.currentPost.comments[tempIndex] = comment;
          } else {
            state.currentPost.comments.push(comment);
          }
          state.currentPost.commentCount = state.currentPost.comments.length;
        }
      })
      .addCase(addComment.rejected, (state, action) => {
        state.operation = '';
        state.error = action.payload;
      });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────────────────────

export const selectAllPosts        = (state) => state.posts.posts;
export const selectCurrentPost     = (state) => state.posts.currentPost;
export const selectPostsLoading    = (state) => state.posts.loading;
export const selectPostsError      = (state) => state.posts.error;
export const selectPostsSuccess    = (state) => state.posts.success;
export const selectPagination      = (state) => state.posts.pagination;
export const selectFilters         = (state) => state.posts.filters;
export const selectSelectedCategory = (state) => state.posts.selectedCategory;
export const selectViewMode        = (state) => state.posts.viewMode;

export const selectFilteredPosts = (state) => {
  const posts = selectAllPosts(state);
  const category = selectSelectedCategory(state);
  if (category === 'all') return posts;
  return posts.filter(post => post.category === category);
};

export const selectPinnedPosts  = (state) => selectAllPosts(state).filter(post => post.isPinned);
export const selectRegularPosts = (state) => selectAllPosts(state).filter(post => !post.isPinned);

export const selectPostsGroupedByDate = (state) => {
  const posts = selectFilteredPosts(state);
  const grouped = {};
  posts.forEach(post => {
    const date = new Date(post.createdAt).toLocaleDateString();
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(post);
  });
  return grouped;
};

// ─────────────────────────────────────────────────────────────────────────────
// Export Actions
// ─────────────────────────────────────────────────────────────────────────────

export const {
  clearPostError,
  clearPostSuccess,
  clearCurrentPost,
  setCurrentPost,
  setSelectedCategory,
  setViewMode,
  setFilters,
  resetPostState,
  updatePostInList,
  removePostFromList,
} = postSlice.actions;

export default postSlice.reducer;