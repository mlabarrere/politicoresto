import type {
  CommentView,
  PostFeedItemView,
  PostView,
  PostRowView,
} from '@/lib/types/views';

export type LoadState<T> = {
  data: T;
  error: string | null;
};

export type SubjectView = {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
  sort_order: number;
};

export type HomeScreenData = {
  feed: PostFeedItemView[];
  subjects: SubjectView[];
};

export type PostDetailScreenData = {
  post: PostRowView | null;
  posts: PostView[];
  comments: CommentView[];
};
