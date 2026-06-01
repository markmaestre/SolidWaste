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

export const toggleLike = createAsyncThunk(
  'posts/toggleLike',
  async (postId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/posts/${postId}/like`);
      return { postId, ...response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { success: false, error: 'Failed to toggle like', details: error.message }
      );
    }
  }
);

export const addComment = createAsyncThunk(
  'posts/addComment',
  async ({ postId, content }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/posts/${postId}/comment`, { content });
      return { postId, comment: response.data.comment, commentCount: response.data.commentCount, ...response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { success: false, error: 'Failed to add comment', details: error.message }
      );
    }
  }
);

// NEW: Delete comment thunk
export const deleteComment = createAsyncThunk(
  'posts/deleteComment',
  async ({ postId, commentId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`/posts/${postId}/comment/${commentId}`);
      return { postId, commentId, commentCount: response.data.commentCount, ...response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { success: false, error: 'Failed to delete comment', details: error.message }
      );
    }
  }
);

// NEW: Get posts by barangay (admin only)
export const getPostsByBarangay = createAsyncThunk(
  'posts/getByBarangay',
  async ({ barangay, filters = {} }, { rejectWithValue }) => {
    try {
      const { status, category, page = 1, limit = 20 } = filters;
      const response = await axiosInstance.get(`/posts/barangay/${barangay}`, {
        params: { status, category, page, limit }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { success: false, error: 'Failed to fetch posts by barangay', details: error.message }
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
    // NEW: Temporary optimistic UI state
    optimisticComments: {}, // { postId: [{ _id: 'temp-123', content, createdAt, isOptimistic: true }] }
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
      state.optimisticComments = {};
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
    // NEW: Optimistic comment addition
    addOptimisticComment: (state, action) => {
      const { postId, content, userId, username } = action.payload;
      const tempComment = {
        _id: `temp-${Date.now()}`,
        content,
        user: { _id: userId, username, profile: null },
        createdAt: new Date().toISOString(),
        isOptimistic: true,
      };
      
      // Add to optimistic comments store
      if (!state.optimisticComments[postId]) {
        state.optimisticComments[postId] = [];
      }
      state.optimisticComments[postId].push(tempComment);
      
      // Also add to actual post objects for immediate UI feedback
      const postInList = state.posts.find(p => p._id === postId);
      if (postInList) {
        postInList.comments = postInList.comments || [];
        postInList.comments.push(tempComment);
        postInList.commentCount = (postInList.commentCount || 0) + 1;
      }
      
      if (state.currentPost?._id === postId) {
        state.currentPost.comments = state.currentPost.comments || [];
        state.currentPost.comments.push(tempComment);
        state.currentPost.commentCount = (state.currentPost.commentCount || 0) + 1;
      }
    },
    // NEW: Remove optimistic comment on failure
    removeOptimisticComment: (state, action) => {
      const { postId, tempId } = action.payload;
      
      // Remove from optimistic comments store
      if (state.optimisticComments[postId]) {
        state.optimisticComments[postId] = state.optimisticComments[postId].filter(c => c._id !== tempId);
      }
      
      // Remove from actual post objects
      const postInList = state.posts.find(p => p._id === postId);
      if (postInList) {
        postInList.comments = postInList.comments.filter(c => c._id !== tempId);
        postInList.commentCount = Math.max(0, (postInList.commentCount || 0) - 1);
      }
      
      if (state.currentPost?._id === postId) {
        state.currentPost.comments = state.currentPost.comments.filter(c => c._id !== tempId);
        state.currentPost.commentCount = Math.max(0, (state.currentPost.commentCount || 0) - 1);
      }
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
        if (action.payload.success) {
          state.currentPost = action.payload.post;
          // Ensure likeCount and commentCount are set from virtuals
          if (state.currentPost) {
            state.currentPost.likeCount = state.currentPost.likes?.length || 0;
            state.currentPost.commentCount = state.currentPost.comments?.length || 0;
          }
        }
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
      .addCase(toggleLike.pending, (state, action) => {
        state.operation = 'like';
        // Optimistic update
        const postId = action.meta.arg;
        const postInList = state.posts.find(p => p._id === postId);
        if (postInList) {
          postInList._optimisticLike = !postInList.liked;
          if (postInList.liked) {
            postInList.likeCount = Math.max(0, (postInList.likeCount || 0) - 1);
          } else {
            postInList.likeCount = (postInList.likeCount || 0) + 1;
          }
          postInList.liked = !postInList.liked;
        }
        if (state.currentPost?._id === postId) {
          state.currentPost._optimisticLike = !state.currentPost.liked;
          if (state.currentPost.liked) {
            state.currentPost.likeCount = Math.max(0, (state.currentPost.likeCount || 0) - 1);
          } else {
            state.currentPost.likeCount = (state.currentPost.likeCount || 0) + 1;
          }
          state.currentPost.liked = !state.currentPost.liked;
        }
      })
      .addCase(toggleLike.fulfilled, (state, action) => {
        state.operation = '';
        state.error = null;
        const { postId, liked, likes } = action.payload;
        const postInList = state.posts.find(p => p._id === postId);
        if (postInList) {
          delete postInList._optimisticLike;
          postInList.liked = liked;
          postInList.likeCount = likes;
        }
        if (state.currentPost?._id === postId) {
          delete state.currentPost._optimisticLike;
          state.currentPost.liked = liked;
          state.currentPost.likeCount = likes;
        }
      })
      .addCase(toggleLike.rejected, (state, action) => {
        state.operation = '';
        state.error = action.payload;
        // Rollback optimistic update
        const postId = action.meta.arg;
        const postInList = state.posts.find(p => p._id === postId);
        if (postInList && postInList._optimisticLike !== undefined) {
          postInList.liked = !postInList.liked;
          if (postInList.liked) {
            postInList.likeCount = (postInList.likeCount || 0) + 1;
          } else {
            postInList.likeCount = Math.max(0, (postInList.likeCount || 0) - 1);
          }
          delete postInList._optimisticLike;
        }
        if (state.currentPost?._id === postId && state.currentPost._optimisticLike !== undefined) {
          state.currentPost.liked = !state.currentPost.liked;
          if (state.currentPost.liked) {
            state.currentPost.likeCount = (state.currentPost.likeCount || 0) + 1;
          } else {
            state.currentPost.likeCount = Math.max(0, (state.currentPost.likeCount || 0) - 1);
          }
          delete state.currentPost._optimisticLike;
        }
      })

    // ── addComment ────────────────────────────────────────────────────────
      .addCase(addComment.pending, (state, action) => {
        state.operation = 'comment';
        // Keep optimistic comments, they will be replaced on success
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.operation = '';
        state.error = null;
        const { postId, comment, commentCount } = action.payload;
        
        // Remove optimistic comment and replace with real one
        if (state.optimisticComments[postId]) {
          const optimisticComment = state.optimisticComments[postId].find(c => c.isOptimistic);
          if (optimisticComment) {
            state.optimisticComments[postId] = state.optimisticComments[postId].filter(c => c._id !== optimisticComment._id);
          }
        }
        
        // Update in posts list
        const postInList = state.posts.find(p => p._id === postId);
        if (postInList) {
          const tempIndex = postInList.comments?.findIndex(c => c._id?.startsWith('temp-'));
          if (tempIndex !== undefined && tempIndex !== -1) {
            postInList.comments[tempIndex] = comment;
          } else {
            postInList.comments = postInList.comments || [];
            postInList.comments.push(comment);
          }
          postInList.commentCount = commentCount;
        }
        
        // Update currentPost
        if (state.currentPost?._id === postId) {
          const tempIndex = state.currentPost.comments?.findIndex(c => c._id?.startsWith('temp-'));
          if (tempIndex !== undefined && tempIndex !== -1) {
            state.currentPost.comments[tempIndex] = comment;
          } else {
            state.currentPost.comments = state.currentPost.comments || [];
            state.currentPost.comments.push(comment);
          }
          state.currentPost.commentCount = commentCount;
        }
      })
      .addCase(addComment.rejected, (state, action) => {
        state.operation = '';
        state.error = action.payload;
        // Remove optimistic comment on failure
        const { postId, content } = action.meta.arg;
        if (state.optimisticComments[postId]) {
          const tempComment = state.optimisticComments[postId].find(c => c.content === content && c.isOptimistic);
          if (tempComment) {
            state.optimisticComments[postId] = state.optimisticComments[postId].filter(c => c._id !== tempComment._id);
            
            // Remove from actual posts
            const postInList = state.posts.find(p => p._id === postId);
            if (postInList) {
              postInList.comments = postInList.comments.filter(c => c._id !== tempComment._id);
              postInList.commentCount = Math.max(0, (postInList.commentCount || 0) - 1);
            }
            if (state.currentPost?._id === postId) {
              state.currentPost.comments = state.currentPost.comments.filter(c => c._id !== tempComment._id);
              state.currentPost.commentCount = Math.max(0, (state.currentPost.commentCount || 0) - 1);
            }
          }
        }
      })

    // ── deleteComment ──────────────────────────────────────────────────────
      .addCase(deleteComment.pending, (state, action) => {
        state.operation = 'delete_comment';
        // Optimistic delete
        const { postId, commentId } = action.meta.arg;
        const postInList = state.posts.find(p => p._id === postId);
        if (postInList) {
          postInList.comments = postInList.comments.filter(c => c._id !== commentId);
          postInList.commentCount = Math.max(0, (postInList.commentCount || 0) - 1);
        }
        if (state.currentPost?._id === postId) {
          state.currentPost.comments = state.currentPost.comments.filter(c => c._id !== commentId);
          state.currentPost.commentCount = Math.max(0, (state.currentPost.commentCount || 0) - 1);
        }
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        state.operation = '';
        state.error = null;
        // Already updated optimistically, just ensure count matches
        const { postId, commentCount } = action.payload;
        const postInList = state.posts.find(p => p._id === postId);
        if (postInList && postInList.commentCount !== commentCount) {
          postInList.commentCount = commentCount;
        }
        if (state.currentPost?._id === postId && state.currentPost.commentCount !== commentCount) {
          state.currentPost.commentCount = commentCount;
        }
      })
      .addCase(deleteComment.rejected, (state, action) => {
        state.operation = '';
        state.error = action.payload;
        // Could add rollback logic here if needed
      })

    // ── getPostsByBarangay ─────────────────────────────────────────────────
      .addCase(getPostsByBarangay.pending, (state) => {
        state.loading = true; state.error = null; state.operation = 'fetch_by_barangay';
      })
      .addCase(getPostsByBarangay.fulfilled, (state, action) => {
        state.loading = false; state.operation = 'fetch_by_barangay'; state.error = null;
        if (action.payload.success) {
          state.posts = action.payload.posts || [];
          state.pagination = {
            currentPage: action.payload.currentPage || 1,
            totalPages: action.payload.totalPages || 1,
            totalPosts: action.payload.totalPosts || 0,
            hasNext: (action.payload.currentPage || 1) < (action.payload.totalPages || 1),
            hasPrev: (action.payload.currentPage || 1) > 1,
          };
        }
      })
      .addCase(getPostsByBarangay.rejected, (state, action) => {
        state.loading = false; state.operation = 'fetch_by_barangay'; state.error = action.payload;
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

// NEW: Selector to check if a post is liked by current user
export const selectIsPostLiked = (state, postId) => {
  const post = state.posts.posts.find(p => p._id === postId);
  return post?.liked || false;
};

// NEW: Selector to get like count for a post
export const selectPostLikeCount = (state, postId) => {
  const post = state.posts.posts.find(p => p._id === postId);
  return post?.likeCount || 0;
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
  addOptimisticComment,
  removeOptimisticComment,
} = postSlice.actions;

export default postSlice.reducer;