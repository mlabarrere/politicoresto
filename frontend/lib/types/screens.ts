import type {
  CommentView,
  ThreadFeedItemView,
  ThreadPostView,
  ThreadRow
} from "@/lib/types/views";

export type LoadState<T> = {
  data: T;
  error: string | null;
};

export type HomeScreenData = {
  feed: ThreadFeedItemView[];
  selectedBloc: string | null;
};

export type ThreadDetailScreenData = {
  thread: ThreadRow | null;
  threadPosts: ThreadPostView[];
  comments: CommentView[];
};
