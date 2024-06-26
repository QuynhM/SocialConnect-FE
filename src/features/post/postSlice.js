import { createSlice } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import apiService from "../../app/apiService";
import { POSTS_PER_PAGE } from "../../app/config";
import { cloudinaryUpload } from "../../utils/cloudinary";
import { getCurrentUserProfile } from "../user/userSlice";

const initialState = {
  isLoading: false,
  error: null,
  postsById: {},
  currentPagePosts: [],
};

const slice = createSlice({
  name: "post",
  initialState,
  reducers: {
    startLoading(state) {
      state.isLoading = true;
    },

    hasError(state, action) {
      state.isLoading = false;
      state.error = action.payload;
    },

    resetPosts(state, action) {
      state.postsById = {};
      state.currentPagePosts = [];
    },

    getPostsSuccess(state, action) {
      state.isLoading = false;
      state.error = null;

      const { posts, count } = action.payload;
      posts.forEach((post) => {
        state.postsById[post._id] = post;
        if (!state.currentPagePosts.includes(post._id))
          state.currentPagePosts.push(post._id);
      });
      state.totalPosts = count;
    },

    createPostSuccess(state, action) {
      state.isLoading = false;
      state.error = null;
      const newPost = action.payload;
      if (state.currentPagePosts.length % POSTS_PER_PAGE === 0)
        state.currentPagePosts.pop();
      state.postsById[newPost._id] = newPost;
      state.currentPagePosts.unshift(newPost._id);
    },

    // sendPostReactionSuccess(state, action) {
    //   state.isLoading = false;
    //   state.error = null;
    //   const { postId, reactions } = action.payload;
    //   state.postsById[postId].reactions = reactions;
    // },

    sendPostReactionSuccess(state, action) {
      state.isLoading = false;
      state.error = null;
      const { postId, reactions } = action.payload;
      if (state.postsById[postId]) {
          state.postsById[postId].reactions = reactions;
      }
  },

    deletePostSuccess(state, action) {
      state.isLoading = false;
      state.error = null;
      const { postId } = action.payload;
      delete state.postsById[postId];
      state.currentPagePosts = state.currentPagePosts.filter(
        (id) => id !== postId
      );
    },

    editPostSuccess(state, action) {
      state.isLoading = false;
      state.error = null;
      const updatedPost = action.payload;

      const existingAuthor = state.postsById[updatedPost._id].author;
      updatedPost.author = existingAuthor;

      state.postsById[updatedPost._id] = updatedPost;
    },
  },
});

export default slice.reducer;

export const getPosts =
  ({ userId, page = 1, limit = POSTS_PER_PAGE }) =>
  async (dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      console.log("UserId",userId)
      const params = { page, limit };
      const response = await apiService.get(`/posts/user/${userId._id}`, {
        params,
      });
      if (page === 1) dispatch(slice.actions.resetPosts());
      dispatch(slice.actions.getPostsSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error.message));
      toast.error(error.message);
    }
  };

export const createPost =
  ({ content, image }) =>
  async (dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      // upload image to cloudinary
      const imageUrl = await cloudinaryUpload(image);
      const response = await apiService.post("/posts", {
        content,
        image: imageUrl,
      });
      dispatch(slice.actions.createPostSuccess(response.data));
      toast.success("Post successfully");
      dispatch(getCurrentUserProfile());
    } catch (error) {
      dispatch(slice.actions.hasError(error.message));
      toast.error(error.message);
    }
  };

export const deletePost = (postId) => async (dispatch) => {
  dispatch(slice.actions.startLoading());
  try {
    await apiService.delete(`/posts/${postId}`);
    dispatch(slice.actions.deletePostSuccess({ postId }));
    toast.success("Post deleted successfully");
    dispatch(getCurrentUserProfile());
  } catch (error) {
    dispatch(slice.actions.hasError(error.message));
    toast.error(error.message);
  }
};

export const editPost =
  ({ postId, content, image }) =>
  async (dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const imageUrl = image ? await cloudinaryUpload(image) : null;

      const response = await apiService.put(`/posts/${postId}`, {
        content,
        image: imageUrl,
      });

      dispatch(slice.actions.editPostSuccess(response.data));
      toast.success("Post edited successfully");
    } catch (error) {
      dispatch(slice.actions.hasError(error.message));
      toast.error(error.message);
    }
  };

  // export const sendPostReaction =
  // ({ postId, emoji, isLiked }) => // include isLiked here
  // async (dispatch) => {
  //   dispatch(slice.actions.startLoading());
  //   try {
  //     const response = await apiService.post(`/reactions`, { // might need to adjust endpoint or parameters
  //       targetType: "Post",
  //       targetId: postId,
  //       emoji,
  //       isLiked // pass this to your API if needed to specify the action (like or unlike)
  //     });
  //     dispatch(
  //       slice.actions.sendPostReactionSuccess({
  //         postId,
  //         reactions: response.data.reactions, // ensure this matches what your API returns
  //         isLiked
  //       })
  //     );
  //   } catch (error) {
  //     dispatch(slice.actions.hasError(error.message));
  //     toast.error(error.message);
  //   }
  // };
  export const sendPostReaction = ({ postId, emoji, isLiked }) => async (dispatch, getState) => {
    dispatch(slice.actions.startLoading());
    try {
        const response = await apiService.post(`/reactions`, {
            targetType: "Post",
            targetId: postId,
            emoji,
            isLiked
        });
        
        if (response.data.success) {
          dispatch(
              slice.actions.sendPostReactionSuccess({
                  postId,
                  reactions: response.data.reactions,
              })
          );
      } else {
          throw new Error(response.data.message || "Failed to update reaction");
      }
      console.log("liked:", response.data.data.isLiked);
    } catch (error) {
        dispatch(slice.actions.hasError(error.message));
        toast.error(error.message);
    }
};


