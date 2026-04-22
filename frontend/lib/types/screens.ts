import type {
  CommentView,
  PostFeedItemView,
  PostView,
  PostRowView,
} from '@/lib/types/views';

export interface LoadState<T> {
  data: T;
  error: string | null;
}

export interface SubjectView {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
  sort_order: number;
}

export interface HomeScreenData {
  feed: PostFeedItemView[];
  subjects: SubjectView[];
}

export interface PostDetailScreenData {
  post: PostRowView | null;
  posts: PostView[];
  comments: CommentView[];
}
