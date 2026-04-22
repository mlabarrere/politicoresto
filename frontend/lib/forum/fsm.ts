export type CommentNodeMode =
  | 'read'
  | 'replying'
  | 'editing'
  | 'submittingReply'
  | 'submittingEdit';

export type CommentNodeEvent =
  | { type: 'START_REPLY' }
  | { type: 'START_EDIT' }
  | { type: 'CANCEL' }
  | { type: 'SUBMIT_REPLY' }
  | { type: 'SUBMIT_EDIT' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR' };

export function canTransition(
  mode: CommentNodeMode,
  event: CommentNodeEvent['type'],
) {
  if (mode === 'submittingReply' || mode === 'submittingEdit') {
    return event === 'SUBMIT_SUCCESS' || event === 'SUBMIT_ERROR';
  }

  if (mode === 'read') {
    return event === 'START_REPLY' || event === 'START_EDIT';
  }

  if (mode === 'replying') {
    return event === 'CANCEL' || event === 'SUBMIT_REPLY';
  }

  return event === 'CANCEL' || event === 'SUBMIT_EDIT';
}

export function transitionCommentNodeMode(
  mode: CommentNodeMode,
  event: CommentNodeEvent,
): CommentNodeMode {
  if (!canTransition(mode, event.type)) {
    return mode;
  }

  switch (event.type) {
    case 'START_REPLY':
      return 'replying';
    case 'START_EDIT':
      return 'editing';
    case 'CANCEL':
      return 'read';
    case 'SUBMIT_REPLY':
      return 'submittingReply';
    case 'SUBMIT_EDIT':
      return 'submittingEdit';
    case 'SUBMIT_SUCCESS':
      return 'read';
    case 'SUBMIT_ERROR':
      return mode === 'submittingReply' ? 'replying' : 'editing';
    default:
      return mode;
  }
}
