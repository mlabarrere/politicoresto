import type {
  CommentView,
  PostFeedItemView,
  PostView,
  PostRowView
} from "@/lib/types/views";

export type LoadState<T> = {
  data: T;
  error: string | null;
};

export type HomeScreenData = {
  feed: PostFeedItemView[];
  selectedBloc: string | null;
};

export type PostDetailScreenData = {
  post: PostRowView | null;
  posts: PostView[];
  comments: CommentView[];
};


