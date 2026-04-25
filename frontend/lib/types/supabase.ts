export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      app_profile: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          display_name: string;
          has_seen_completion_nudge: boolean;
          is_public_profile_enabled: boolean;
          last_seen_at: string | null;
          profile_status: Database['public']['Enums']['profile_status'];
          public_territory_id: string | null;
          resolved_city: string | null;
          updated_at: string;
          user_id: string;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name: string;
          has_seen_completion_nudge?: boolean;
          is_public_profile_enabled?: boolean;
          last_seen_at?: string | null;
          profile_status?: Database['public']['Enums']['profile_status'];
          public_territory_id?: string | null;
          resolved_city?: string | null;
          updated_at?: string;
          user_id: string;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string;
          has_seen_completion_nudge?: boolean;
          is_public_profile_enabled?: boolean;
          last_seen_at?: string | null;
          profile_status?: Database['public']['Enums']['profile_status'];
          public_territory_id?: string | null;
          resolved_city?: string | null;
          updated_at?: string;
          user_id?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      discussion_prompts: {
        Row: {
          id: number;
          prompt: string;
          prompt_type: string;
          tone: string;
          topic_id: number;
        };
        Insert: {
          id?: number;
          prompt: string;
          prompt_type: string;
          tone: string;
          topic_id: number;
        };
        Update: {
          id?: number;
          prompt?: string;
          prompt_type?: string;
          tone?: string;
          topic_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'discussion_prompts_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'topics_editorial';
            referencedColumns: ['id'];
          },
        ];
      };
      election: {
        Row: {
          blancs: number | null;
          created_at: string;
          exprimes: number | null;
          held_on: string;
          id: string;
          inscrits: number | null;
          label: string;
          nuls: number | null;
          round: number | null;
          slug: string;
          source_url: string | null;
          type: Database['public']['Enums']['election_type'];
          votants: number | null;
          year: number;
        };
        Insert: {
          blancs?: number | null;
          created_at?: string;
          exprimes?: number | null;
          held_on: string;
          id?: string;
          inscrits?: number | null;
          label: string;
          nuls?: number | null;
          round?: number | null;
          slug: string;
          source_url?: string | null;
          type: Database['public']['Enums']['election_type'];
          votants?: number | null;
          year: number;
        };
        Update: {
          blancs?: number | null;
          created_at?: string;
          exprimes?: number | null;
          held_on?: string;
          id?: string;
          inscrits?: number | null;
          label?: string;
          nuls?: number | null;
          round?: number | null;
          slug?: string;
          source_url?: string | null;
          type?: Database['public']['Enums']['election_type'];
          votants?: number | null;
          year?: number;
        };
        Relationships: [];
      };
      election_result: {
        Row: {
          candidate_name: string | null;
          created_at: string;
          election_id: string;
          id: string;
          list_label: string | null;
          nuance: string | null;
          party_slug: string | null;
          pct_exprimes: number | null;
          pct_inscrits: number | null;
          rank: number | null;
          votes: number | null;
        };
        Insert: {
          candidate_name?: string | null;
          created_at?: string;
          election_id: string;
          id?: string;
          list_label?: string | null;
          nuance?: string | null;
          party_slug?: string | null;
          pct_exprimes?: number | null;
          pct_inscrits?: number | null;
          rank?: number | null;
          votes?: number | null;
        };
        Update: {
          candidate_name?: string | null;
          created_at?: string;
          election_id?: string;
          id?: string;
          list_label?: string | null;
          nuance?: string | null;
          party_slug?: string | null;
          pct_exprimes?: number | null;
          pct_inscrits?: number | null;
          rank?: number | null;
          votes?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'election_result_election_id_fkey';
            columns: ['election_id'];
            isOneToOne: false;
            referencedRelation: 'election';
            referencedColumns: ['id'];
          },
        ];
      };
      insee_department_to_region: {
        Row: {
          department_code: string;
          region_code: string;
          region_name: string;
        };
        Insert: {
          department_code: string;
          region_code: string;
          region_name: string;
        };
        Update: {
          department_code?: string;
          region_code?: string;
          region_name?: string;
        };
        Relationships: [];
      };
      media_outlet: {
        Row: {
          created_at: string;
          direction: string | null;
          id: string;
          is_active: boolean;
          journalistes_phares: string[];
          name: string;
          segment: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          direction?: string | null;
          id?: string;
          is_active?: boolean;
          journalistes_phares?: string[];
          name: string;
          segment: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          direction?: string | null;
          id?: string;
          is_active?: boolean;
          journalistes_phares?: string[];
          name?: string;
          segment?: string;
          slug?: string;
        };
        Relationships: [];
      };
      political_entity: {
        Row: {
          created_at: string;
          id: string;
          metadata: Json;
          name: string;
          parent_entity_id: string | null;
          slug: string;
          type: Database['public']['Enums']['political_entity_type'];
        };
        Insert: {
          created_at?: string;
          id?: string;
          metadata?: Json;
          name: string;
          parent_entity_id?: string | null;
          slug: string;
          type: Database['public']['Enums']['political_entity_type'];
        };
        Update: {
          created_at?: string;
          id?: string;
          metadata?: Json;
          name?: string;
          parent_entity_id?: string | null;
          slug?: string;
          type?: Database['public']['Enums']['political_entity_type'];
        };
        Relationships: [
          {
            foreignKeyName: 'political_entity_parent_entity_id_fkey';
            columns: ['parent_entity_id'];
            isOneToOne: false;
            referencedRelation: 'political_entity';
            referencedColumns: ['id'];
          },
        ];
      };
      post: {
        Row: {
          author_user_id: string;
          body_markdown: string;
          body_plaintext: string | null;
          created_at: string;
          depth: number;
          edited_at: string | null;
          id: string;
          parent_post_id: string | null;
          post_status: Database['public']['Enums']['post_status'];
          post_type: Database['public']['Enums']['post_type'];
          removed_at: string | null;
          space_id: string | null;
          thread_post_id: string | null;
          title: string | null;
          topic_id: string | null;
          updated_at: string;
        };
        Insert: {
          author_user_id: string;
          body_markdown: string;
          body_plaintext?: string | null;
          created_at?: string;
          depth?: number;
          edited_at?: string | null;
          id?: string;
          parent_post_id?: string | null;
          post_status?: Database['public']['Enums']['post_status'];
          post_type: Database['public']['Enums']['post_type'];
          removed_at?: string | null;
          space_id?: string | null;
          thread_post_id?: string | null;
          title?: string | null;
          topic_id?: string | null;
          updated_at?: string;
        };
        Update: {
          author_user_id?: string;
          body_markdown?: string;
          body_plaintext?: string | null;
          created_at?: string;
          depth?: number;
          edited_at?: string | null;
          id?: string;
          parent_post_id?: string | null;
          post_status?: Database['public']['Enums']['post_status'];
          post_type?: Database['public']['Enums']['post_type'];
          removed_at?: string | null;
          space_id?: string | null;
          thread_post_id?: string | null;
          title?: string | null;
          topic_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_author_user_id_fkey';
            columns: ['author_user_id'];
            isOneToOne: false;
            referencedRelation: 'app_profile';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'post_author_user_id_fkey';
            columns: ['author_user_id'];
            isOneToOne: false;
            referencedRelation: 'user_visibility_settings';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'post_parent_post_id_fkey';
            columns: ['parent_post_id'];
            isOneToOne: false;
            referencedRelation: 'post';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_parent_post_id_fkey';
            columns: ['parent_post_id'];
            isOneToOne: false;
            referencedRelation: 'v_post_comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_thread_post_id_fkey';
            columns: ['thread_post_id'];
            isOneToOne: false;
            referencedRelation: 'thread_post';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_thread_post_id_fkey';
            columns: ['thread_post_id'];
            isOneToOne: false;
            referencedRelation: 'v_thread_posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'topic';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'v_feed_global';
            referencedColumns: ['topic_id'];
          },
          {
            foreignKeyName: 'post_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'v_prono_admin_queue';
            referencedColumns: ['topic_id'];
          },
          {
            foreignKeyName: 'post_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'v_thread_detail';
            referencedColumns: ['id'];
          },
        ];
      };
      post_poll: {
        Row: {
          created_at: string;
          created_by: string;
          deadline_at: string;
          poll_status: string;
          post_item_id: string;
          question: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          deadline_at: string;
          poll_status?: string;
          post_item_id: string;
          question: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          deadline_at?: string;
          poll_status?: string;
          post_item_id?: string;
          question?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_poll_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'app_profile';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'post_poll_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'user_visibility_settings';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'post_poll_post_item_id_fkey';
            columns: ['post_item_id'];
            isOneToOne: true;
            referencedRelation: 'thread_post';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_poll_post_item_id_fkey';
            columns: ['post_item_id'];
            isOneToOne: true;
            referencedRelation: 'v_thread_posts';
            referencedColumns: ['id'];
          },
        ];
      };
      post_poll_option: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          label: string;
          post_item_id: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          label: string;
          post_item_id: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          label?: string;
          post_item_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'post_poll_option_post_item_id_fkey';
            columns: ['post_item_id'];
            isOneToOne: false;
            referencedRelation: 'post_poll';
            referencedColumns: ['post_item_id'];
          },
          {
            foreignKeyName: 'post_poll_option_post_item_id_fkey';
            columns: ['post_item_id'];
            isOneToOne: false;
            referencedRelation: 'v_post_poll_summary';
            referencedColumns: ['post_item_id'];
          },
        ];
      };
      post_poll_response: {
        Row: {
          answered_at: string;
          id: string;
          option_id: string;
          post_item_id: string;
          user_id: string;
          weight: number;
        };
        Insert: {
          answered_at?: string;
          id?: string;
          option_id: string;
          post_item_id: string;
          user_id: string;
          weight?: number;
        };
        Update: {
          answered_at?: string;
          id?: string;
          option_id?: string;
          post_item_id?: string;
          user_id?: string;
          weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'post_poll_response_option_id_fkey';
            columns: ['option_id'];
            isOneToOne: false;
            referencedRelation: 'post_poll_option';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_poll_response_post_item_id_fkey';
            columns: ['post_item_id'];
            isOneToOne: false;
            referencedRelation: 'post_poll';
            referencedColumns: ['post_item_id'];
          },
          {
            foreignKeyName: 'post_poll_response_post_item_id_fkey';
            columns: ['post_item_id'];
            isOneToOne: false;
            referencedRelation: 'v_post_poll_summary';
            referencedColumns: ['post_item_id'];
          },
          {
            foreignKeyName: 'post_poll_response_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'app_profile';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'post_poll_response_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_visibility_settings';
            referencedColumns: ['user_id'];
          },
        ];
      };
      post_revision: {
        Row: {
          body_markdown: string;
          edit_reason: string | null;
          edited_at: string;
          editor_user_id: string;
          id: string;
          post_id: string;
        };
        Insert: {
          body_markdown: string;
          edit_reason?: string | null;
          edited_at?: string;
          editor_user_id: string;
          id?: string;
          post_id: string;
        };
        Update: {
          body_markdown?: string;
          edit_reason?: string | null;
          edited_at?: string;
          editor_user_id?: string;
          id?: string;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_revision_editor_user_id_fkey';
            columns: ['editor_user_id'];
            isOneToOne: false;
            referencedRelation: 'app_profile';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'post_revision_editor_user_id_fkey';
            columns: ['editor_user_id'];
            isOneToOne: false;
            referencedRelation: 'user_visibility_settings';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'post_revision_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'post';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_revision_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'v_post_comments';
            referencedColumns: ['id'];
          },
        ];
      };
      profile_vote_history: {
        Row: {
          choice_kind: Database['public']['Enums']['vote_choice_kind'];
          confidence: number | null;
          created_at: string;
          declared_at: string;
          election_id: string;
          election_result_id: string | null;
          id: string;
          notes: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          choice_kind?: Database['public']['Enums']['vote_choice_kind'];
          confidence?: number | null;
          created_at?: string;
          declared_at?: string;
          election_id: string;
          election_result_id?: string | null;
          id?: string;
          notes?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          choice_kind?: Database['public']['Enums']['vote_choice_kind'];
          confidence?: number | null;
          created_at?: string;
          declared_at?: string;
          election_id?: string;
          election_result_id?: string | null;
          id?: string;
          notes?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_vote_history_election_id_fkey';
            columns: ['election_id'];
            isOneToOne: false;
            referencedRelation: 'election';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_vote_history_election_result_id_fkey';
            columns: ['election_result_id'];
            isOneToOne: false;
            referencedRelation: 'election_result';
            referencedColumns: ['id'];
          },
        ];
      };
      prono_bet: {
        Row: {
          bet_at: string;
          id: string;
          is_pruned: boolean;
          is_winner: boolean | null;
          multiplier: number | null;
          option_id: string;
          question_id: string;
          smoothed_share: number | null;
          user_id: string;
        };
        Insert: {
          bet_at?: string;
          id?: string;
          is_pruned?: boolean;
          is_winner?: boolean | null;
          multiplier?: number | null;
          option_id: string;
          question_id: string;
          smoothed_share?: number | null;
          user_id: string;
        };
        Update: {
          bet_at?: string;
          id?: string;
          is_pruned?: boolean;
          is_winner?: boolean | null;
          multiplier?: number | null;
          option_id?: string;
          question_id?: string;
          smoothed_share?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'prono_bet_option_id_fkey';
            columns: ['option_id'];
            isOneToOne: false;
            referencedRelation: 'prono_option';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prono_bet_option_id_fkey';
            columns: ['option_id'];
            isOneToOne: false;
            referencedRelation: 'v_prono_user_history';
            referencedColumns: ['option_id'];
          },
          {
            foreignKeyName: 'prono_bet_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'prono_question';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prono_bet_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'v_prono_admin_queue';
            referencedColumns: ['question_id'];
          },
          {
            foreignKeyName: 'prono_bet_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'v_prono_summary';
            referencedColumns: ['question_id'];
          },
          {
            foreignKeyName: 'prono_bet_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'app_profile';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'prono_bet_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_visibility_settings';
            referencedColumns: ['user_id'];
          },
        ];
      };
      prono_distribution_snapshot: {
        Row: {
          active_options_count: number;
          captured_at: string;
          id: number;
          option_id: string;
          question_id: string;
          share: number;
          total_bets: number;
        };
        Insert: {
          active_options_count: number;
          captured_at?: string;
          id?: number;
          option_id: string;
          question_id: string;
          share: number;
          total_bets: number;
        };
        Update: {
          active_options_count?: number;
          captured_at?: string;
          id?: number;
          option_id?: string;
          question_id?: string;
          share?: number;
          total_bets?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'prono_distribution_snapshot_option_id_fkey';
            columns: ['option_id'];
            isOneToOne: false;
            referencedRelation: 'prono_option';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prono_distribution_snapshot_option_id_fkey';
            columns: ['option_id'];
            isOneToOne: false;
            referencedRelation: 'v_prono_user_history';
            referencedColumns: ['option_id'];
          },
          {
            foreignKeyName: 'prono_distribution_snapshot_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'prono_question';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prono_distribution_snapshot_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'v_prono_admin_queue';
            referencedColumns: ['question_id'];
          },
          {
            foreignKeyName: 'prono_distribution_snapshot_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'v_prono_summary';
            referencedColumns: ['question_id'];
          },
        ];
      };
      prono_option: {
        Row: {
          added_at: string;
          id: string;
          is_active: boolean;
          is_catchall: boolean;
          label: string;
          question_id: string;
          sort_order: number;
        };
        Insert: {
          added_at?: string;
          id?: string;
          is_active?: boolean;
          is_catchall?: boolean;
          label: string;
          question_id: string;
          sort_order?: number;
        };
        Update: {
          added_at?: string;
          id?: string;
          is_active?: boolean;
          is_catchall?: boolean;
          label?: string;
          question_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'prono_option_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'prono_question';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prono_option_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'v_prono_admin_queue';
            referencedColumns: ['question_id'];
          },
          {
            foreignKeyName: 'prono_option_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'v_prono_summary';
            referencedColumns: ['question_id'];
          },
        ];
      };
      prono_question: {
        Row: {
          allow_multiple: boolean;
          betting_cutoff_at: string | null;
          created_at: string;
          id: string;
          question_text: string;
          requested_by: string;
          thread_post_id: string | null;
          topic_id: string;
          updated_at: string;
        };
        Insert: {
          allow_multiple?: boolean;
          betting_cutoff_at?: string | null;
          created_at?: string;
          id?: string;
          question_text: string;
          requested_by: string;
          thread_post_id?: string | null;
          topic_id: string;
          updated_at?: string;
        };
        Update: {
          allow_multiple?: boolean;
          betting_cutoff_at?: string | null;
          created_at?: string;
          id?: string;
          question_text?: string;
          requested_by?: string;
          thread_post_id?: string | null;
          topic_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'prono_question_requested_by_fkey';
            columns: ['requested_by'];
            isOneToOne: false;
            referencedRelation: 'app_profile';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'prono_question_requested_by_fkey';
            columns: ['requested_by'];
            isOneToOne: false;
            referencedRelation: 'user_visibility_settings';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'prono_question_thread_post_id_fkey';
            columns: ['thread_post_id'];
            isOneToOne: true;
            referencedRelation: 'thread_post';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prono_question_thread_post_id_fkey';
            columns: ['thread_post_id'];
            isOneToOne: true;
            referencedRelation: 'v_thread_posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prono_question_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: true;
            referencedRelation: 'topic';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prono_question_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: true;
            referencedRelation: 'v_feed_global';
            referencedColumns: ['topic_id'];
          },
          {
            foreignKeyName: 'prono_question_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: true;
            referencedRelation: 'v_prono_admin_queue';
            referencedColumns: ['topic_id'];
          },
          {
            foreignKeyName: 'prono_question_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: true;
            referencedRelation: 'v_thread_detail';
            referencedColumns: ['id'];
          },
        ];
      };
      prono_resolution: {
        Row: {
          question_id: string;
          resolution_kind: string;
          resolution_note: string | null;
          resolved_at: string;
          resolved_by: string;
          void_reason: string | null;
          winning_option_ids: string[] | null;
        };
        Insert: {
          question_id: string;
          resolution_kind: string;
          resolution_note?: string | null;
          resolved_at?: string;
          resolved_by: string;
          void_reason?: string | null;
          winning_option_ids?: string[] | null;
        };
        Update: {
          question_id?: string;
          resolution_kind?: string;
          resolution_note?: string | null;
          resolved_at?: string;
          resolved_by?: string;
          void_reason?: string | null;
          winning_option_ids?: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'prono_resolution_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: true;
            referencedRelation: 'prono_question';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prono_resolution_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: true;
            referencedRelation: 'v_prono_admin_queue';
            referencedColumns: ['question_id'];
          },
          {
            foreignKeyName: 'prono_resolution_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: true;
            referencedRelation: 'v_prono_summary';
            referencedColumns: ['question_id'];
          },
          {
            foreignKeyName: 'prono_resolution_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'app_profile';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'prono_resolution_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'user_visibility_settings';
            referencedColumns: ['user_id'];
          },
        ];
      };
      reaction: {
        Row: {
          created_at: string;
          id: string;
          reaction_type: Database['public']['Enums']['reaction_type'];
          target_id: string;
          target_type: Database['public']['Enums']['reaction_target_type'];
          user_id: string;
          weight: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          reaction_type: Database['public']['Enums']['reaction_type'];
          target_id: string;
          target_type: Database['public']['Enums']['reaction_target_type'];
          user_id: string;
          weight?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          reaction_type?: Database['public']['Enums']['reaction_type'];
          target_id?: string;
          target_type?: Database['public']['Enums']['reaction_target_type'];
          user_id?: string;
          weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'reaction_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'app_profile';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'reaction_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_visibility_settings';
            referencedColumns: ['user_id'];
          },
        ];
      };
      region_by_postal: {
        Row: {
          created_at: string;
          postal_code: string;
          region_code: string;
          region_label: string;
        };
        Insert: {
          created_at?: string;
          postal_code: string;
          region_code: string;
          region_label: string;
        };
        Update: {
          created_at?: string;
          postal_code?: string;
          region_code?: string;
          region_label?: string;
        };
        Relationships: [];
      };
      reputation_ledger: {
        Row: {
          created_at: string;
          delta: number;
          event_type: Database['public']['Enums']['reputation_event_type'];
          id: string;
          metadata: Json;
          reference_entity_id: string | null;
          reference_entity_type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          delta: number;
          event_type: Database['public']['Enums']['reputation_event_type'];
          id?: string;
          metadata?: Json;
          reference_entity_id?: string | null;
          reference_entity_type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          delta?: number;
          event_type?: Database['public']['Enums']['reputation_event_type'];
          id?: string;
          metadata?: Json;
          reference_entity_id?: string | null;
          reference_entity_type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reputation_ledger_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'app_profile';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'reputation_ledger_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_visibility_settings';
            referencedColumns: ['user_id'];
          },
        ];
      };
      subject: {
        Row: {
          created_at: string;
          description: string | null;
          emoji: string | null;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          emoji?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          emoji?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      subthemes: {
        Row: {
          created_at: string;
          description: string | null;
          id: number;
          is_active: boolean;
          name: string;
          priority_rank: number;
          slug: string;
          theme_id: number;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: number;
          is_active?: boolean;
          name: string;
          priority_rank?: number;
          slug: string;
          theme_id: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: number;
          is_active?: boolean;
          name?: string;
          priority_rank?: number;
          slug?: string;
          theme_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'subthemes_theme_id_fkey';
            columns: ['theme_id'];
            isOneToOne: false;
            referencedRelation: 'themes';
            referencedColumns: ['id'];
          },
        ];
      };
      survey_poll_estimate: {
        Row: {
          computed_at: string;
          computed_with_ref_as_of: string;
          confidence_band: string;
          confidence_components: Json;
          confidence_score: number;
          corrected_ci95: Json | null;
          corrected_results: Json | null;
          coverage_share: number;
          deff: number;
          is_final: boolean;
          min_political_coverage: number;
          n_effective: number;
          n_respondents: number;
          poll_id: string;
          raw_results: Json;
          weight_top5_share: number;
        };
        Insert: {
          computed_at?: string;
          computed_with_ref_as_of: string;
          confidence_band: string;
          confidence_components: Json;
          confidence_score: number;
          corrected_ci95?: Json | null;
          corrected_results?: Json | null;
          coverage_share: number;
          deff: number;
          is_final?: boolean;
          min_political_coverage: number;
          n_effective: number;
          n_respondents: number;
          poll_id: string;
          raw_results: Json;
          weight_top5_share: number;
        };
        Update: {
          computed_at?: string;
          computed_with_ref_as_of?: string;
          confidence_band?: string;
          confidence_components?: Json;
          confidence_score?: number;
          corrected_ci95?: Json | null;
          corrected_results?: Json | null;
          coverage_share?: number;
          deff?: number;
          is_final?: boolean;
          min_political_coverage?: number;
          n_effective?: number;
          n_respondents?: number;
          poll_id?: string;
          raw_results?: Json;
          weight_top5_share?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'survey_poll_estimate_poll_id_fkey';
            columns: ['poll_id'];
            isOneToOne: true;
            referencedRelation: 'post_poll';
            referencedColumns: ['post_item_id'];
          },
          {
            foreignKeyName: 'survey_poll_estimate_poll_id_fkey';
            columns: ['poll_id'];
            isOneToOne: true;
            referencedRelation: 'v_post_poll_summary';
            referencedColumns: ['post_item_id'];
          },
        ];
      };
      survey_poll_weights: {
        Row: {
          computed_at: string;
          poll_id: string;
          snapshot_id: string;
          weight: number;
        };
        Insert: {
          computed_at?: string;
          poll_id: string;
          snapshot_id: string;
          weight: number;
        };
        Update: {
          computed_at?: string;
          poll_id?: string;
          snapshot_id?: string;
          weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'survey_poll_weights_poll_id_fkey';
            columns: ['poll_id'];
            isOneToOne: false;
            referencedRelation: 'post_poll';
            referencedColumns: ['post_item_id'];
          },
          {
            foreignKeyName: 'survey_poll_weights_poll_id_fkey';
            columns: ['poll_id'];
            isOneToOne: false;
            referencedRelation: 'v_post_poll_summary';
            referencedColumns: ['post_item_id'];
          },
          {
            foreignKeyName: 'survey_poll_weights_snapshot_id_fkey';
            columns: ['snapshot_id'];
            isOneToOne: false;
            referencedRelation: 'survey_respondent_snapshot';
            referencedColumns: ['id'];
          },
        ];
      };
      survey_ref_cell: {
        Row: {
          as_of: string;
          categories: string[];
          created_at: string;
          dimensions: string[];
          share: number;
          source_label: string;
          source_url: string | null;
        };
        Insert: {
          as_of: string;
          categories: string[];
          created_at?: string;
          dimensions: string[];
          share: number;
          source_label: string;
          source_url?: string | null;
        };
        Update: {
          as_of?: string;
          categories?: string[];
          created_at?: string;
          dimensions?: string[];
          share?: number;
          source_label?: string;
          source_url?: string | null;
        };
        Relationships: [];
      };
      survey_ref_marginal: {
        Row: {
          as_of: string;
          category: string;
          created_at: string;
          dimension: string;
          share: number;
          source_label: string;
          source_url: string | null;
        };
        Insert: {
          as_of: string;
          category: string;
          created_at?: string;
          dimension: string;
          share: number;
          source_label: string;
          source_url?: string | null;
        };
        Update: {
          as_of?: string;
          category?: string;
          created_at?: string;
          dimension?: string;
          share?: number;
          source_label?: string;
          source_url?: string | null;
        };
        Relationships: [];
      };
      survey_respondent_snapshot: {
        Row: {
          age_bucket: string | null;
          csp: string | null;
          education: string | null;
          id: string;
          is_partial: boolean;
          option_id: string;
          past_vote_pr1_2022: string | null;
          past_votes: Json;
          poll_id: string;
          profile_payload: Json;
          ref_as_of: string;
          region: string | null;
          sex: string | null;
          snapshotted_at: string;
          user_id: string;
        };
        Insert: {
          age_bucket?: string | null;
          csp?: string | null;
          education?: string | null;
          id?: string;
          is_partial?: boolean;
          option_id: string;
          past_vote_pr1_2022?: string | null;
          past_votes?: Json;
          poll_id: string;
          profile_payload?: Json;
          ref_as_of: string;
          region?: string | null;
          sex?: string | null;
          snapshotted_at?: string;
          user_id: string;
        };
        Update: {
          age_bucket?: string | null;
          csp?: string | null;
          education?: string | null;
          id?: string;
          is_partial?: boolean;
          option_id?: string;
          past_vote_pr1_2022?: string | null;
          past_votes?: Json;
          poll_id?: string;
          profile_payload?: Json;
          ref_as_of?: string;
          region?: string | null;
          sex?: string | null;
          snapshotted_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'survey_respondent_snapshot_option_id_fkey';
            columns: ['option_id'];
            isOneToOne: false;
            referencedRelation: 'post_poll_option';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'survey_respondent_snapshot_poll_id_fkey';
            columns: ['poll_id'];
            isOneToOne: false;
            referencedRelation: 'post_poll';
            referencedColumns: ['post_item_id'];
          },
          {
            foreignKeyName: 'survey_respondent_snapshot_poll_id_fkey';
            columns: ['poll_id'];
            isOneToOne: false;
            referencedRelation: 'v_post_poll_summary';
            referencedColumns: ['post_item_id'];
          },
        ];
      };
      themes: {
        Row: {
          created_at: string;
          description: string | null;
          id: number;
          is_active: boolean;
          name: string;
          priority_rank: number;
          slug: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: number;
          is_active?: boolean;
          name: string;
          priority_rank?: number;
          slug: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: number;
          is_active?: boolean;
          name?: string;
          priority_rank?: number;
          slug?: string;
        };
        Relationships: [];
      };
      thread_post: {
        Row: {
          content: string | null;
          created_at: string;
          created_by: string;
          entity_id: string | null;
          id: string;
          metadata: Json;
          party_tags: string[];
          status: Database['public']['Enums']['thread_post_status'];
          thread_id: string;
          title: string | null;
          type: Database['public']['Enums']['thread_post_type'];
          updated_at: string;
        };
        Insert: {
          content?: string | null;
          created_at?: string;
          created_by: string;
          entity_id?: string | null;
          id?: string;
          metadata?: Json;
          party_tags?: string[];
          status?: Database['public']['Enums']['thread_post_status'];
          thread_id: string;
          title?: string | null;
          type: Database['public']['Enums']['thread_post_type'];
          updated_at?: string;
        };
        Update: {
          content?: string | null;
          created_at?: string;
          created_by?: string;
          entity_id?: string | null;
          id?: string;
          metadata?: Json;
          party_tags?: string[];
          status?: Database['public']['Enums']['thread_post_status'];
          thread_id?: string;
          title?: string | null;
          type?: Database['public']['Enums']['thread_post_type'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'thread_post_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'app_profile';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'thread_post_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'user_visibility_settings';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'thread_post_entity_id_fkey';
            columns: ['entity_id'];
            isOneToOne: false;
            referencedRelation: 'political_entity';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'thread_post_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'topic';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'thread_post_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'v_feed_global';
            referencedColumns: ['topic_id'];
          },
          {
            foreignKeyName: 'thread_post_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'v_prono_admin_queue';
            referencedColumns: ['topic_id'];
          },
          {
            foreignKeyName: 'thread_post_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'v_thread_detail';
            referencedColumns: ['id'];
          },
        ];
      };
      thread_post_subject: {
        Row: {
          subject_id: string;
          thread_post_id: string;
        };
        Insert: {
          subject_id: string;
          thread_post_id: string;
        };
        Update: {
          subject_id?: string;
          thread_post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'thread_post_subject_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subject';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'thread_post_subject_thread_post_id_fkey';
            columns: ['thread_post_id'];
            isOneToOne: false;
            referencedRelation: 'thread_post';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'thread_post_subject_thread_post_id_fkey';
            columns: ['thread_post_id'];
            isOneToOne: false;
            referencedRelation: 'v_thread_posts';
            referencedColumns: ['id'];
          },
        ];
      };
      topic: {
        Row: {
          campaign_cycle: string;
          close_at: string;
          created_at: string;
          created_by: string;
          description: string | null;
          entity_id: string | null;
          id: string;
          is_sensitive: boolean;
          locked_reason: string | null;
          open_at: string;
          primary_territory_id: string | null;
          resolve_deadline_at: string | null;
          slug: string;
          space_id: string | null;
          thread_kind: Database['public']['Enums']['thread_kind'];
          title: string;
          topic_status: Database['public']['Enums']['topic_status'];
          updated_at: string;
          visibility: Database['public']['Enums']['visibility_level'];
        };
        Insert: {
          campaign_cycle?: string;
          close_at: string;
          created_at?: string;
          created_by: string;
          description?: string | null;
          entity_id?: string | null;
          id?: string;
          is_sensitive?: boolean;
          locked_reason?: string | null;
          open_at?: string;
          primary_territory_id?: string | null;
          resolve_deadline_at?: string | null;
          slug: string;
          space_id?: string | null;
          thread_kind?: Database['public']['Enums']['thread_kind'];
          title: string;
          topic_status?: Database['public']['Enums']['topic_status'];
          updated_at?: string;
          visibility?: Database['public']['Enums']['visibility_level'];
        };
        Update: {
          campaign_cycle?: string;
          close_at?: string;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          entity_id?: string | null;
          id?: string;
          is_sensitive?: boolean;
          locked_reason?: string | null;
          open_at?: string;
          primary_territory_id?: string | null;
          resolve_deadline_at?: string | null;
          slug?: string;
          space_id?: string | null;
          thread_kind?: Database['public']['Enums']['thread_kind'];
          title?: string;
          topic_status?: Database['public']['Enums']['topic_status'];
          updated_at?: string;
          visibility?: Database['public']['Enums']['visibility_level'];
        };
        Relationships: [
          {
            foreignKeyName: 'topic_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'app_profile';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'topic_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'user_visibility_settings';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'topic_entity_id_fkey';
            columns: ['entity_id'];
            isOneToOne: false;
            referencedRelation: 'political_entity';
            referencedColumns: ['id'];
          },
        ];
      };
      topic_resolution: {
        Row: {
          resolution_note: string | null;
          resolution_status: Database['public']['Enums']['resolution_status'];
          resolved_at: string | null;
          resolved_boolean: boolean | null;
          resolved_by: string | null;
          resolved_date: string | null;
          resolved_numeric: number | null;
          resolved_option_id: string | null;
          resolved_ordinal: number | null;
          topic_id: string;
          void_reason: string | null;
        };
        Insert: {
          resolution_note?: string | null;
          resolution_status?: Database['public']['Enums']['resolution_status'];
          resolved_at?: string | null;
          resolved_boolean?: boolean | null;
          resolved_by?: string | null;
          resolved_date?: string | null;
          resolved_numeric?: number | null;
          resolved_option_id?: string | null;
          resolved_ordinal?: number | null;
          topic_id: string;
          void_reason?: string | null;
        };
        Update: {
          resolution_note?: string | null;
          resolution_status?: Database['public']['Enums']['resolution_status'];
          resolved_at?: string | null;
          resolved_boolean?: boolean | null;
          resolved_by?: string | null;
          resolved_date?: string | null;
          resolved_numeric?: number | null;
          resolved_option_id?: string | null;
          resolved_ordinal?: number | null;
          topic_id?: string;
          void_reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'topic_resolution_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'app_profile';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'topic_resolution_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'user_visibility_settings';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'topic_resolution_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: true;
            referencedRelation: 'topic';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'topic_resolution_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: true;
            referencedRelation: 'v_feed_global';
            referencedColumns: ['topic_id'];
          },
          {
            foreignKeyName: 'topic_resolution_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: true;
            referencedRelation: 'v_prono_admin_queue';
            referencedColumns: ['topic_id'];
          },
          {
            foreignKeyName: 'topic_resolution_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: true;
            referencedRelation: 'v_thread_detail';
            referencedColumns: ['id'];
          },
        ];
      };
      topic_resolution_source: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          quoted_excerpt: string | null;
          source_label: string;
          source_published_at: string | null;
          source_type: Database['public']['Enums']['resolution_source_type'];
          source_url: string | null;
          topic_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          quoted_excerpt?: string | null;
          source_label: string;
          source_published_at?: string | null;
          source_type: Database['public']['Enums']['resolution_source_type'];
          source_url?: string | null;
          topic_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          quoted_excerpt?: string | null;
          source_label?: string;
          source_published_at?: string | null;
          source_type?: Database['public']['Enums']['resolution_source_type'];
          source_url?: string | null;
          topic_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'topic_resolution_source_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'app_profile';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'topic_resolution_source_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'user_visibility_settings';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'topic_resolution_source_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'topic';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'topic_resolution_source_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'v_feed_global';
            referencedColumns: ['topic_id'];
          },
          {
            foreignKeyName: 'topic_resolution_source_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'v_prono_admin_queue';
            referencedColumns: ['topic_id'];
          },
          {
            foreignKeyName: 'topic_resolution_source_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'v_thread_detail';
            referencedColumns: ['id'];
          },
        ];
      };
      topic_sources: {
        Row: {
          id: number;
          is_primary: boolean;
          publication_date: string | null;
          reliability_score: number;
          source_name: string;
          source_title: string;
          source_type: string;
          source_url: string;
          topic_id: number;
        };
        Insert: {
          id?: number;
          is_primary?: boolean;
          publication_date?: string | null;
          reliability_score: number;
          source_name: string;
          source_title: string;
          source_type: string;
          source_url: string;
          topic_id: number;
        };
        Update: {
          id?: number;
          is_primary?: boolean;
          publication_date?: string | null;
          reliability_score?: number;
          source_name?: string;
          source_title?: string;
          source_type?: string;
          source_url?: string;
          topic_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'topic_sources_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'topics_editorial';
            referencedColumns: ['id'];
          },
        ];
      };
      topic_tags: {
        Row: {
          id: number;
          tag: string;
          topic_id: number;
        };
        Insert: {
          id?: number;
          tag: string;
          topic_id: number;
        };
        Update: {
          id?: number;
          tag?: string;
          topic_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'topic_tags_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'topics_editorial';
            referencedColumns: ['id'];
          },
        ];
      };
      topic_territories: {
        Row: {
          city_name: string | null;
          country_code: string | null;
          department_name: string | null;
          id: number;
          is_primary: boolean;
          region_name: string | null;
          territory_level: string;
          territory_name: string;
          topic_id: number;
        };
        Insert: {
          city_name?: string | null;
          country_code?: string | null;
          department_name?: string | null;
          id?: number;
          is_primary?: boolean;
          region_name?: string | null;
          territory_level: string;
          territory_name: string;
          topic_id: number;
        };
        Update: {
          city_name?: string | null;
          country_code?: string | null;
          department_name?: string | null;
          id?: number;
          is_primary?: boolean;
          region_name?: string | null;
          territory_level?: string;
          territory_name?: string;
          topic_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'topic_territories_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'topics_editorial';
            referencedColumns: ['id'];
          },
        ];
      };
      topics_editorial: {
        Row: {
          city_name: string | null;
          concreteness_score: number;
          controversy_score: number;
          country_code: string | null;
          created_at: string;
          editorial_priority: number;
          ends_at: string | null;
          geographic_scope: string;
          id: number;
          is_time_sensitive: boolean;
          region_name: string | null;
          salience_score: number;
          slug: string;
          source_confidence: number;
          starts_at: string | null;
          status: string;
          subtheme_id: number;
          summary: string;
          territory_name: string | null;
          title: string;
          topic_type: string;
        };
        Insert: {
          city_name?: string | null;
          concreteness_score: number;
          controversy_score: number;
          country_code?: string | null;
          created_at?: string;
          editorial_priority: number;
          ends_at?: string | null;
          geographic_scope: string;
          id?: number;
          is_time_sensitive?: boolean;
          region_name?: string | null;
          salience_score: number;
          slug: string;
          source_confidence: number;
          starts_at?: string | null;
          status: string;
          subtheme_id: number;
          summary: string;
          territory_name?: string | null;
          title: string;
          topic_type: string;
        };
        Update: {
          city_name?: string | null;
          concreteness_score?: number;
          controversy_score?: number;
          country_code?: string | null;
          created_at?: string;
          editorial_priority?: number;
          ends_at?: string | null;
          geographic_scope?: string;
          id?: number;
          is_time_sensitive?: boolean;
          region_name?: string | null;
          salience_score?: number;
          slug?: string;
          source_confidence?: number;
          starts_at?: string | null;
          status?: string;
          subtheme_id?: number;
          summary?: string;
          territory_name?: string | null;
          title?: string;
          topic_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'topics_editorial_subtheme_id_fkey';
            columns: ['subtheme_id'];
            isOneToOne: false;
            referencedRelation: 'subthemes';
            referencedColumns: ['id'];
          },
        ];
      };
      user_notification: {
        Row: {
          created_at: string;
          id: string;
          is_read: boolean;
          kind: string;
          payload: Json;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_read?: boolean;
          kind: string;
          payload?: Json;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_read?: boolean;
          kind?: string;
          payload?: Json;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_notification_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'app_profile';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'user_notification_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_visibility_settings';
            referencedColumns: ['user_id'];
          },
        ];
      };
      user_private_political_profile: {
        Row: {
          created_at: string;
          csp: string | null;
          date_of_birth: string | null;
          declared_ideology_term_id: string | null;
          declared_partisan_term_id: string | null;
          education: string | null;
          notes_private: string | null;
          political_interest_level: number | null;
          postal_code: string | null;
          profile_payload: Json;
          sex: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          csp?: string | null;
          date_of_birth?: string | null;
          declared_ideology_term_id?: string | null;
          declared_partisan_term_id?: string | null;
          education?: string | null;
          notes_private?: string | null;
          political_interest_level?: number | null;
          postal_code?: string | null;
          profile_payload?: Json;
          sex?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          csp?: string | null;
          date_of_birth?: string | null;
          declared_ideology_term_id?: string | null;
          declared_partisan_term_id?: string | null;
          education?: string | null;
          notes_private?: string | null;
          political_interest_level?: number | null;
          postal_code?: string | null;
          profile_payload?: Json;
          sex?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_private_political_profile_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'app_profile';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'user_private_political_profile_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'user_visibility_settings';
            referencedColumns: ['user_id'];
          },
        ];
      };
      weighting_worker_config: {
        Row: {
          id: number;
          secret: string;
          updated_at: string;
          url: string;
        };
        Insert: {
          id: number;
          secret: string;
          updated_at?: string;
          url: string;
        };
        Update: {
          id?: number;
          secret?: string;
          updated_at?: string;
          url?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      user_visibility_settings: {
        Row: {
          bio_visibility: string | null;
          display_name_visibility: string | null;
          user_id: string | null;
          vote_history_visibility: string | null;
        };
        Insert: {
          bio_visibility?: never;
          display_name_visibility?: never;
          user_id?: string | null;
          vote_history_visibility?: never;
        };
        Update: {
          bio_visibility?: never;
          display_name_visibility?: never;
          user_id?: string | null;
          vote_history_visibility?: never;
        };
        Relationships: [];
      };
      v_feed_global: {
        Row: {
          activity_score_raw: number | null;
          aggregate_payload: Json | null;
          card_payload: Json | null;
          close_at: string | null;
          derived_lifecycle_state: string | null;
          discussion_payload: Json | null;
          editorial_feed_rank: number | null;
          editorial_feed_score: number | null;
          editorial_priority_score_raw: number | null;
          entity_id: string | null;
          entity_name: string | null;
          entity_slug: string | null;
          feed_reason_code: string | null;
          feed_reason_label: string | null;
          freshness_score_raw: number | null;
          is_sensitive: boolean | null;
          last_activity_at: string | null;
          latest_thread_post_at: string | null;
          metrics_payload: Json | null;
          open_at: string | null;
          participation_score_raw: number | null;
          primary_taxonomy_label: string | null;
          primary_taxonomy_slug: string | null;
          resolution_payload: Json | null;
          resolution_proximity_score_raw: number | null;
          resolve_deadline_at: string | null;
          resolved_at: string | null;
          shift_score_raw: number | null;
          space_id: string | null;
          space_name: string | null;
          space_role: string | null;
          space_slug: string | null;
          thread_post_count: number | null;
          thread_score: number | null;
          topic_card_payload: Json | null;
          topic_description: string | null;
          topic_id: string | null;
          topic_slug: string | null;
          topic_status: Database['public']['Enums']['topic_status'] | null;
          topic_title: string | null;
          visibility: Database['public']['Enums']['visibility_level'] | null;
          visible_post_count: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'topic_entity_id_fkey';
            columns: ['entity_id'];
            isOneToOne: false;
            referencedRelation: 'political_entity';
            referencedColumns: ['id'];
          },
        ];
      };
      v_post_comments: {
        Row: {
          author_user_id: string | null;
          body_markdown: string | null;
          comment_score: number | null;
          created_at: string | null;
          depth: number | null;
          display_name: string | null;
          downvote_weight: number | null;
          droite_count: number | null;
          gauche_count: number | null;
          id: string | null;
          parent_post_id: string | null;
          post_status: Database['public']['Enums']['post_status'] | null;
          thread_id: string | null;
          thread_post_id: string | null;
          title: string | null;
          total_reactions: number | null;
          updated_at: string | null;
          upvote_weight: number | null;
          username: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'post_author_user_id_fkey';
            columns: ['author_user_id'];
            isOneToOne: false;
            referencedRelation: 'app_profile';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'post_author_user_id_fkey';
            columns: ['author_user_id'];
            isOneToOne: false;
            referencedRelation: 'user_visibility_settings';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'post_parent_post_id_fkey';
            columns: ['parent_post_id'];
            isOneToOne: false;
            referencedRelation: 'post';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_parent_post_id_fkey';
            columns: ['parent_post_id'];
            isOneToOne: false;
            referencedRelation: 'v_post_comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_thread_post_id_fkey';
            columns: ['thread_post_id'];
            isOneToOne: false;
            referencedRelation: 'thread_post';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_thread_post_id_fkey';
            columns: ['thread_post_id'];
            isOneToOne: false;
            referencedRelation: 'v_thread_posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_topic_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'topic';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_topic_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'v_feed_global';
            referencedColumns: ['topic_id'];
          },
          {
            foreignKeyName: 'post_topic_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'v_prono_admin_queue';
            referencedColumns: ['topic_id'];
          },
          {
            foreignKeyName: 'post_topic_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'v_thread_detail';
            referencedColumns: ['id'];
          },
        ];
      };
      v_post_poll_summary: {
        Row: {
          anti_brigading_score: number | null;
          computed_with_ref_as_of: string | null;
          confidence_band: string | null;
          confidence_components: Json | null;
          confidence_score: number | null;
          corrected_ci95: Json | null;
          corrected_results: Json | null;
          coverage_score: number | null;
          deadline_at: string | null;
          distance_score: number | null;
          effective_sample_size: number | null;
          is_final: boolean | null;
          options: Json | null;
          poll_status: string | null;
          post_id: string | null;
          post_item_id: string | null;
          post_slug: string | null;
          post_title: string | null;
          question: string | null;
          raw_results: Json | null;
          representativity_score: number | null;
          sample_size: number | null;
          selected_option_id: string | null;
          stability_score: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'post_poll_post_item_id_fkey';
            columns: ['post_item_id'];
            isOneToOne: true;
            referencedRelation: 'thread_post';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_poll_post_item_id_fkey';
            columns: ['post_item_id'];
            isOneToOne: true;
            referencedRelation: 'v_thread_posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_poll_response_option_id_fkey';
            columns: ['selected_option_id'];
            isOneToOne: false;
            referencedRelation: 'post_poll_option';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'thread_post_thread_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'topic';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'thread_post_thread_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'v_feed_global';
            referencedColumns: ['topic_id'];
          },
          {
            foreignKeyName: 'thread_post_thread_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'v_prono_admin_queue';
            referencedColumns: ['topic_id'];
          },
          {
            foreignKeyName: 'thread_post_thread_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'v_thread_detail';
            referencedColumns: ['id'];
          },
        ];
      };
      v_prono_admin_queue: {
        Row: {
          allow_multiple: boolean | null;
          option_count: number | null;
          question_id: string | null;
          question_text: string | null;
          requested_at: string | null;
          requested_by: string | null;
          requested_by_display_name: string | null;
          requested_by_username: string | null;
          title: string | null;
          topic_id: string | null;
          topic_slug: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'prono_question_requested_by_fkey';
            columns: ['requested_by'];
            isOneToOne: false;
            referencedRelation: 'app_profile';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'prono_question_requested_by_fkey';
            columns: ['requested_by'];
            isOneToOne: false;
            referencedRelation: 'user_visibility_settings';
            referencedColumns: ['user_id'];
          },
        ];
      };
      v_prono_leaderboard: {
        Row: {
          bets_count: number | null;
          display_name: string | null;
          precision_pct: number | null;
          rank: number | null;
          total_max_possible: number | null;
          total_score: number | null;
          user_id: string | null;
          username: string | null;
          wins_count: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'prono_bet_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'app_profile';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'prono_bet_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_visibility_settings';
            referencedColumns: ['user_id'];
          },
        ];
      };
      v_prono_summary: {
        Row: {
          allow_multiple: boolean | null;
          betting_cutoff_at: string | null;
          created_at: string | null;
          current_user_bets: string[] | null;
          options: Json | null;
          question_id: string | null;
          question_text: string | null;
          requested_by_display_name: string | null;
          requested_by_user_id: string | null;
          requested_by_username: string | null;
          resolution_kind: string | null;
          resolution_note: string | null;
          resolved_at: string | null;
          title: string | null;
          topic_id: string | null;
          topic_slug: string | null;
          topic_status: Database['public']['Enums']['topic_status'] | null;
          total_bets: number | null;
          updated_at: string | null;
          void_reason: string | null;
          winning_option_ids: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'prono_question_requested_by_fkey';
            columns: ['requested_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'app_profile';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'prono_question_requested_by_fkey';
            columns: ['requested_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'user_visibility_settings';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'prono_question_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: true;
            referencedRelation: 'topic';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prono_question_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: true;
            referencedRelation: 'v_feed_global';
            referencedColumns: ['topic_id'];
          },
          {
            foreignKeyName: 'prono_question_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: true;
            referencedRelation: 'v_prono_admin_queue';
            referencedColumns: ['topic_id'];
          },
          {
            foreignKeyName: 'prono_question_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: true;
            referencedRelation: 'v_thread_detail';
            referencedColumns: ['id'];
          },
        ];
      };
      v_prono_user_history: {
        Row: {
          bet_at: string | null;
          is_catchall: boolean | null;
          is_pruned: boolean | null;
          multiplier: number | null;
          option_id: string | null;
          option_label: string | null;
          points_earned: number | null;
          question_id: string | null;
          resolution_kind: string | null;
          resolved_at: string | null;
          smoothed_share: number | null;
          title: string | null;
          topic_id: string | null;
          topic_slug: string | null;
          user_id: string | null;
          was_correct: boolean | null;
          winning_option_ids: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'prono_bet_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'prono_question';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prono_bet_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'v_prono_admin_queue';
            referencedColumns: ['question_id'];
          },
          {
            foreignKeyName: 'prono_bet_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'v_prono_summary';
            referencedColumns: ['question_id'];
          },
          {
            foreignKeyName: 'prono_bet_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'app_profile';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'prono_bet_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_visibility_settings';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'prono_question_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: true;
            referencedRelation: 'topic';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prono_question_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: true;
            referencedRelation: 'v_feed_global';
            referencedColumns: ['topic_id'];
          },
          {
            foreignKeyName: 'prono_question_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: true;
            referencedRelation: 'v_prono_admin_queue';
            referencedColumns: ['topic_id'];
          },
          {
            foreignKeyName: 'prono_question_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: true;
            referencedRelation: 'v_thread_detail';
            referencedColumns: ['id'];
          },
        ];
      };
      v_thread_detail: {
        Row: {
          close_at: string | null;
          created_at: string | null;
          derived_lifecycle_state: string | null;
          description: string | null;
          effective_visibility:
            | Database['public']['Enums']['visibility_level']
            | null;
          entity_id: string | null;
          entity_name: string | null;
          entity_slug: string | null;
          feed_reason_code: string | null;
          feed_reason_label: string | null;
          id: string | null;
          is_sensitive: boolean | null;
          latest_thread_post_at: string | null;
          open_at: string | null;
          primary_taxonomy_label: string | null;
          primary_taxonomy_slug: string | null;
          slug: string | null;
          space_id: string | null;
          space_name: string | null;
          space_role: string | null;
          space_slug: string | null;
          thread_post_count: number | null;
          thread_score: number | null;
          title: string | null;
          topic_status: Database['public']['Enums']['topic_status'] | null;
          visible_post_count: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'topic_entity_id_fkey';
            columns: ['entity_id'];
            isOneToOne: false;
            referencedRelation: 'political_entity';
            referencedColumns: ['id'];
          },
        ];
      };
      v_thread_posts: {
        Row: {
          comment_count: number | null;
          content: string | null;
          created_at: string | null;
          created_by: string | null;
          display_name: string | null;
          downvote_weight: number | null;
          droite_count: number | null;
          gauche_count: number | null;
          id: string | null;
          status: Database['public']['Enums']['thread_post_status'] | null;
          thread_id: string | null;
          title: string | null;
          total_reactions: number | null;
          type: Database['public']['Enums']['thread_post_type'] | null;
          updated_at: string | null;
          upvote_weight: number | null;
          username: string | null;
          weighted_votes: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'thread_post_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'app_profile';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'thread_post_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'user_visibility_settings';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'thread_post_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'topic';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'thread_post_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'v_feed_global';
            referencedColumns: ['topic_id'];
          },
          {
            foreignKeyName: 'thread_post_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'v_prono_admin_queue';
            referencedColumns: ['topic_id'];
          },
          {
            foreignKeyName: 'thread_post_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'v_thread_detail';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      award_card: {
        Args: {
          p_card_id: string;
          p_payload?: Json;
          p_reason: Database['public']['Enums']['card_grant_reason_type'];
          p_source_entity_id?: string;
          p_source_entity_type?: Database['public']['Enums']['audit_entity_type'];
          p_user_id: string;
        };
        Returns: undefined;
      };
      can_read_post: {
        Args: { post_row: Database['public']['Tables']['post']['Row'] };
        Returns: boolean;
      };
      can_read_post_poll: {
        Args: { poll_row: Database['public']['Tables']['post_poll']['Row'] };
        Returns: boolean;
      };
      can_read_topic: {
        Args: { topic_row: Database['public']['Tables']['topic']['Row'] };
        Returns: boolean;
      };
      create_comment: {
        Args: {
          p_body_markdown?: string;
          p_parent_post_id?: string;
          p_thread_post_id: string;
        };
        Returns: {
          author_user_id: string;
          body_markdown: string;
          body_plaintext: string | null;
          created_at: string;
          depth: number;
          edited_at: string | null;
          id: string;
          parent_post_id: string | null;
          post_status: Database['public']['Enums']['post_status'];
          post_type: Database['public']['Enums']['post_type'];
          removed_at: string | null;
          space_id: string | null;
          thread_post_id: string | null;
          title: string | null;
          topic_id: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'post';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_post:
        | {
            Args: {
              p_content?: string;
              p_metadata?: Json;
              p_thread_id: string;
              p_title?: string;
              p_type: string;
            };
            Returns: string;
          }
        | {
            Args: {
              p_content?: string;
              p_metadata?: Json;
              p_thread_id: string;
              p_title?: string;
              p_type: Database['public']['Enums']['thread_post_type'];
            };
            Returns: {
              content: string | null;
              created_at: string;
              created_by: string;
              entity_id: string | null;
              id: string;
              metadata: Json;
              party_tags: string[];
              status: Database['public']['Enums']['thread_post_status'];
              thread_id: string;
              title: string | null;
              type: Database['public']['Enums']['thread_post_type'];
              updated_at: string;
            };
            SetofOptions: {
              from: '*';
              to: 'thread_post';
              isOneToOne: true;
              isSetofReturn: false;
            };
          };
      create_post_poll: {
        Args: {
          p_deadline_at: string;
          p_options: Json;
          p_post_item_id: string;
          p_question: string;
        };
        Returns: {
          created_at: string;
          created_by: string;
          deadline_at: string;
          poll_status: string;
          post_item_id: string;
          question: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'post_poll';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_thread: {
        Args: {
          p_close_at?: string;
          p_description?: string;
          p_entity_id?: string;
          p_space_id?: string;
          p_title: string;
        };
        Returns: {
          campaign_cycle: string;
          close_at: string;
          created_at: string;
          created_by: string;
          description: string | null;
          entity_id: string | null;
          id: string;
          is_sensitive: boolean;
          locked_reason: string | null;
          open_at: string;
          primary_territory_id: string | null;
          resolve_deadline_at: string | null;
          slug: string;
          space_id: string | null;
          thread_kind: Database['public']['Enums']['thread_kind'];
          title: string;
          topic_status: Database['public']['Enums']['topic_status'];
          updated_at: string;
          visibility: Database['public']['Enums']['visibility_level'];
        };
        SetofOptions: {
          from: '*';
          to: 'topic';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      current_app_role: { Args: never; Returns: string };
      current_user_id: { Args: never; Returns: string };
      current_valid_reference_date: { Args: never; Returns: string };
      derive_age_bucket: { Args: { p_dob: string }; Returns: string };
      derive_past_vote_pr1_2022: {
        Args: { p_user_id: string };
        Returns: string;
      };
      derive_past_votes: { Args: { p_user_id: string }; Returns: Json };
      derive_region: { Args: { p_postal: string }; Returns: string };
      effective_topic_visibility: {
        Args: { topic_row: Database['public']['Tables']['topic']['Row'] };
        Returns: Database['public']['Enums']['visibility_level'];
      };
      enqueue_newly_closed_polls: { Args: never; Returns: number };
      is_admin: { Args: never; Returns: boolean };
      is_moderator: { Args: never; Returns: boolean };
      log_audit_event: {
        Args: {
          p_action_name: string;
          p_entity_id: string;
          p_entity_type: Database['public']['Enums']['audit_entity_type'];
          p_payload?: Json;
        };
        Returns: undefined;
      };
      prono_capture_distribution: {
        Args: { p_question_id: string };
        Returns: undefined;
      };
      prono_make_slug: { Args: { p_title: string }; Returns: string };
      react_post: {
        Args: {
          p_reaction_type: Database['public']['Enums']['reaction_type'];
          p_target_id: string;
          p_target_type: Database['public']['Enums']['reaction_target_type'];
        };
        Returns: {
          created_at: string;
          id: string;
          reaction_type: Database['public']['Enums']['reaction_type'];
          target_id: string;
          target_type: Database['public']['Enums']['reaction_target_type'];
          user_id: string;
          weight: number;
        };
        SetofOptions: {
          from: '*';
          to: 'reaction';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      resolve_topic: {
        Args: {
          p_resolution_note: string;
          p_resolved_boolean?: boolean;
          p_resolved_date?: string;
          p_resolved_numeric?: number;
          p_resolved_option_id?: string;
          p_resolved_ordinal?: number;
          p_source_excerpt?: string;
          p_source_label?: string;
          p_source_type?: Database['public']['Enums']['resolution_source_type'];
          p_source_url?: string;
          p_topic_id: string;
        };
        Returns: undefined;
      };
      rpc_add_option: {
        Args: { p_label: string; p_question_id: string };
        Returns: string;
      };
      rpc_create_poll: {
        Args: {
          p_close_at?: string;
          p_description?: string;
          p_space_id?: string;
          p_title?: string;
          p_topic_id?: string;
          p_visibility?: Database['public']['Enums']['visibility_level'];
        };
        Returns: string;
      };
      rpc_create_post: {
        Args: {
          p_body_markdown?: string;
          p_post_type?: Database['public']['Enums']['post_type'];
          p_space_id?: string;
          p_title?: string;
          p_topic_id?: string;
        };
        Returns: {
          author_user_id: string;
          body_markdown: string;
          body_plaintext: string | null;
          created_at: string;
          depth: number;
          edited_at: string | null;
          id: string;
          parent_post_id: string | null;
          post_status: Database['public']['Enums']['post_status'];
          post_type: Database['public']['Enums']['post_type'];
          removed_at: string | null;
          space_id: string | null;
          thread_post_id: string | null;
          title: string | null;
          topic_id: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'post';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      rpc_create_post_full: {
        Args: {
          p_body?: string;
          p_link_preview?: Json;
          p_mode?: string;
          p_party_tags?: string[];
          p_poll_deadline_at?: string;
          p_poll_options?: Json;
          p_poll_question?: string;
          p_source_url?: string;
          p_subject_ids?: string[];
          p_title: string;
        };
        Returns: {
          post_item_id: string;
          thread_id: string;
        }[];
      };
      rpc_delete_comment: {
        Args: { p_comment_id: string };
        Returns: {
          author_user_id: string;
          body_markdown: string;
          body_plaintext: string | null;
          created_at: string;
          depth: number;
          edited_at: string | null;
          id: string;
          parent_post_id: string | null;
          post_status: Database['public']['Enums']['post_status'];
          post_type: Database['public']['Enums']['post_type'];
          removed_at: string | null;
          space_id: string | null;
          thread_post_id: string | null;
          title: string | null;
          topic_id: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'post';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      rpc_delete_private_political_profile: { Args: never; Returns: boolean };
      rpc_delete_thread_post: {
        Args: { p_thread_post_id: string };
        Returns: {
          content: string | null;
          created_at: string;
          created_by: string;
          entity_id: string | null;
          id: string;
          metadata: Json;
          party_tags: string[];
          status: Database['public']['Enums']['thread_post_status'];
          thread_id: string;
          title: string | null;
          type: Database['public']['Enums']['thread_post_type'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'thread_post';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      rpc_delete_vote_history: {
        Args: { p_election_slug: string };
        Returns: boolean;
      };
      rpc_get_private_political_profile: {
        Args: never;
        Returns: {
          created_at: string;
          csp: string | null;
          date_of_birth: string | null;
          declared_ideology_term_id: string | null;
          declared_partisan_term_id: string | null;
          education: string | null;
          notes_private: string | null;
          political_interest_level: number | null;
          postal_code: string | null;
          profile_payload: Json;
          sex: string | null;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'user_private_political_profile';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      rpc_get_profile_completion: {
        Args: never;
        Returns: {
          has_date_of_birth: boolean;
          has_postal_code: boolean;
          has_seen_completion_nudge: boolean;
        }[];
      };
      rpc_list_vote_history_detailed: {
        Args: never;
        Returns: {
          candidate_name: string;
          choice_kind: Database['public']['Enums']['vote_choice_kind'];
          confidence: number;
          declared_at: string;
          election_id: string;
          election_label: string;
          election_result_id: string;
          election_slug: string;
          id: string;
          list_label: string;
          notes: string;
          party_slug: string;
        }[];
      };
      rpc_mark_completion_nudge_seen: { Args: never; Returns: undefined };
      rpc_place_bet: {
        Args: { p_option_id: string; p_question_id: string };
        Returns: undefined;
      };
      rpc_publish_prono: { Args: { p_topic_id: string }; Returns: undefined };
      rpc_reject_prono: {
        Args: { p_reason: string; p_topic_id: string };
        Returns: undefined;
      };
      rpc_remove_bet: {
        Args: { p_option_id: string; p_question_id: string };
        Returns: undefined;
      };
      rpc_report_content: {
        Args: {
          p_reason_code: string;
          p_reason_detail?: string;
          p_target_id: string;
          p_target_type: string;
        };
        Returns: Json;
      };
      rpc_request_prono: {
        Args: {
          p_allow_multiple?: boolean;
          p_options: string[];
          p_question_text: string;
          p_title: string;
        };
        Returns: string;
      };
      rpc_resolve_prono: {
        Args: {
          p_betting_cutoff_at?: string;
          p_question_id: string;
          p_resolution_kind: string;
          p_resolution_note?: string;
          p_void_reason?: string;
          p_winning_option_ids?: string[];
        };
        Returns: undefined;
      };
      rpc_update_comment: {
        Args: { p_body_markdown: string; p_comment_id: string };
        Returns: {
          author_user_id: string;
          body_markdown: string;
          body_plaintext: string | null;
          created_at: string;
          depth: number;
          edited_at: string | null;
          id: string;
          parent_post_id: string | null;
          post_status: Database['public']['Enums']['post_status'];
          post_type: Database['public']['Enums']['post_type'];
          removed_at: string | null;
          space_id: string | null;
          thread_post_id: string | null;
          title: string | null;
          topic_id: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'post';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      rpc_update_post_poll: {
        Args: {
          p_option_labels: string[];
          p_post_item_id: string;
          p_question: string;
        };
        Returns: {
          created_at: string;
          created_by: string;
          deadline_at: string;
          poll_status: string;
          post_item_id: string;
          question: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'post_poll';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      rpc_update_profile_demographics: {
        Args: {
          p_csp?: string;
          p_date_of_birth: string;
          p_education?: string;
          p_postal_code: string;
          p_resolved_city: string;
          p_sex?: string;
        };
        Returns: undefined;
      };
      rpc_update_thread_post: {
        Args: {
          p_content?: string;
          p_metadata?: Json;
          p_thread_post_id: string;
          p_title?: string;
        };
        Returns: {
          content: string | null;
          created_at: string;
          created_by: string;
          entity_id: string | null;
          id: string;
          metadata: Json;
          party_tags: string[];
          status: Database['public']['Enums']['thread_post_status'];
          thread_id: string;
          title: string | null;
          type: Database['public']['Enums']['thread_post_type'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'thread_post';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      rpc_upsert_private_political_profile: {
        Args: {
          p_declared_ideology_term_id?: string;
          p_declared_partisan_term_id?: string;
          p_notes_private?: string;
          p_political_interest_level?: number;
          p_profile_payload?: Json;
        };
        Returns: {
          created_at: string;
          csp: string | null;
          date_of_birth: string | null;
          declared_ideology_term_id: string | null;
          declared_partisan_term_id: string | null;
          education: string | null;
          notes_private: string | null;
          political_interest_level: number | null;
          postal_code: string | null;
          profile_payload: Json;
          sex: string | null;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'user_private_political_profile';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      rpc_upsert_vote_history: {
        Args: {
          p_choice_kind: Database['public']['Enums']['vote_choice_kind'];
          p_confidence?: number;
          p_election_result_id: string;
          p_election_slug: string;
          p_notes?: string;
        };
        Returns: string;
      };
      submit_post_poll_vote: {
        Args: { p_option_id: string; p_post_item_id: string };
        Returns: {
          anti_brigading_score: number | null;
          computed_with_ref_as_of: string | null;
          confidence_band: string | null;
          confidence_components: Json | null;
          confidence_score: number | null;
          corrected_ci95: Json | null;
          corrected_results: Json | null;
          coverage_score: number | null;
          deadline_at: string | null;
          distance_score: number | null;
          effective_sample_size: number | null;
          is_final: boolean | null;
          options: Json | null;
          poll_status: string | null;
          post_id: string | null;
          post_item_id: string | null;
          post_slug: string | null;
          post_title: string | null;
          question: string | null;
          raw_results: Json | null;
          representativity_score: number | null;
          sample_size: number | null;
          selected_option_id: string | null;
          stability_score: number | null;
        }[];
        SetofOptions: {
          from: '*';
          to: 'v_post_poll_summary';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      visibility_rank: {
        Args: { v: Database['public']['Enums']['visibility_level'] };
        Returns: number;
      };
      weighting_fetch_poll_options: {
        Args: { p_poll_id: string };
        Returns: {
          label: string;
          option_id: string;
          sort_order: number;
        }[];
      };
      weighting_fetch_reference: {
        Args: { p_as_of: string };
        Returns: {
          category: string;
          dimension: string;
          share: number;
        }[];
      };
      weighting_fetch_reference_cells: {
        Args: { p_as_of: string };
        Returns: {
          categories: string[];
          dimensions: string[];
          share: number;
        }[];
      };
      weighting_fetch_snapshots: {
        Args: { p_poll_id: string };
        Returns: {
          age_bucket: string;
          csp: string;
          education: string;
          id: string;
          is_partial: boolean;
          option_id: string;
          past_vote_pr1_2022: string;
          past_votes: Json;
          ref_as_of: string;
          region: string;
          sex: string;
          snapshotted_at: string;
          user_id: string;
        }[];
      };
      weighting_queue_archive: { Args: { p_msg_id: number }; Returns: boolean };
      weighting_queue_dead_letter: {
        Args: { p_msg_id: number; p_reason: string };
        Returns: boolean;
      };
      weighting_queue_depth: { Args: { p_poll_id: string }; Returns: number };
      weighting_queue_read: {
        Args: { p_qty?: number; p_vt_seconds?: number };
        Returns: {
          enqueued_at: string;
          message: Json;
          msg_id: number;
          read_ct: number;
          vt: string;
        }[];
      };
      weighting_upsert_estimate: {
        Args: {
          p_computed_with_ref_as_of: string;
          p_confidence_band: string;
          p_confidence_components: Json;
          p_confidence_score: number;
          p_corrected_ci95: Json;
          p_corrected_results: Json;
          p_coverage_share: number;
          p_deff: number;
          p_is_final: boolean;
          p_min_political_coverage: number;
          p_n_effective: number;
          p_n_respondents: number;
          p_poll_id: string;
          p_raw_results: Json;
          p_weight_top5_share: number;
        };
        Returns: undefined;
      };
    };
    Enums: {
      anti_abuse_signal_type:
        | 'burst_activity'
        | 'territorial_farming'
        | 'topic_spam'
        | 'new_account_concentration'
        | 'coordinated_pattern'
        | 'reward_abuse';
      audit_entity_type:
        | 'profile'
        | 'space'
        | 'topic'
        | 'post'
        | 'poll'
        | 'prediction_submission'
        | 'topic_resolution'
        | 'card_grant'
        | 'moderation_action';
      card_family_type:
        | 'personality'
        | 'archetype'
        | 'territory'
        | 'performance'
        | 'event'
        | 'exploration'
        | 'seniority'
        | 'role';
      card_grant_reason_type:
        | 'participation'
        | 'exploration'
        | 'prediction_performance'
        | 'seniority'
        | 'special_event'
        | 'moderation_manual';
      card_rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
      consent_status: 'granted' | 'revoked';
      consent_type:
        | 'terms_of_service'
        | 'privacy_policy'
        | 'political_sensitive_data'
        | 'public_profile_visibility'
        | 'analytics_participation';
      election_type: 'presidentielle' | 'legislatives' | 'europeennes';
      moderation_action_type:
        | 'hide_content'
        | 'lock_topic'
        | 'unlock_topic'
        | 'remove_content'
        | 'restore_content'
        | 'suspend_submission'
        | 'void_resolution'
        | 'warning'
        | 'note';
      moderation_report_status: 'open' | 'triaged' | 'resolved' | 'dismissed';
      moderation_target_type:
        | 'post'
        | 'topic'
        | 'poll'
        | 'profile'
        | 'prediction_submission';
      political_entity_type: 'party' | 'candidate' | 'bloc';
      poll_question_type: 'single_choice' | 'multiple_choice' | 'ordinal_scale';
      poll_status: 'draft' | 'open' | 'closed' | 'archived' | 'removed';
      poll_wave_status: 'draft' | 'open' | 'closed' | 'published';
      post_status: 'visible' | 'hidden' | 'locked' | 'removed';
      post_type:
        | 'news'
        | 'analysis'
        | 'discussion'
        | 'local'
        | 'moderation'
        | 'resolution_justification';
      profile_status: 'active' | 'limited' | 'suspended' | 'deleted';
      reaction_target_type: 'thread_post' | 'comment';
      reaction_type: 'upvote' | 'downvote';
      reputation_event_type:
        | 'topic_participation'
        | 'post_participation'
        | 'prediction_accuracy'
        | 'moderation_penalty'
        | 'card_bonus'
        | 'manual_adjustment';
      resolution_source_type:
        | 'official_result'
        | 'official_statement'
        | 'press_article'
        | 'court_document'
        | 'internal_moderation_note'
        | 'other';
      resolution_status: 'pending' | 'resolved' | 'reopened' | 'voided';
      space_role: 'legacy' | 'global' | 'party' | 'bloc';
      space_status: 'active' | 'archived' | 'hidden' | 'removed';
      space_type: 'geographic' | 'institutional' | 'thematic' | 'editorial';
      submission_status: 'active' | 'superseded' | 'withdrawn' | 'invalidated';
      territory_level:
        | 'macro'
        | 'country'
        | 'region'
        | 'department'
        | 'commune';
      thread_kind: 'issue' | 'poll_wave' | 'candidate_watch' | 'party_watch';
      thread_post_status: 'draft' | 'published' | 'archived';
      thread_post_type: 'article' | 'poll' | 'market';
      topic_status:
        | 'draft'
        | 'pending_review'
        | 'open'
        | 'locked'
        | 'resolved'
        | 'archived'
        | 'rejected'
        | 'removed';
      visibility_level:
        | 'public'
        | 'authenticated'
        | 'private'
        | 'moderators_only';
      vote_choice_kind:
        | 'vote'
        | 'blanc'
        | 'nul'
        | 'abstention'
        | 'non_inscrit'
        | 'ne_se_prononce_pas';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      anti_abuse_signal_type: [
        'burst_activity',
        'territorial_farming',
        'topic_spam',
        'new_account_concentration',
        'coordinated_pattern',
        'reward_abuse',
      ],
      audit_entity_type: [
        'profile',
        'space',
        'topic',
        'post',
        'poll',
        'prediction_submission',
        'topic_resolution',
        'card_grant',
        'moderation_action',
      ],
      card_family_type: [
        'personality',
        'archetype',
        'territory',
        'performance',
        'event',
        'exploration',
        'seniority',
        'role',
      ],
      card_grant_reason_type: [
        'participation',
        'exploration',
        'prediction_performance',
        'seniority',
        'special_event',
        'moderation_manual',
      ],
      card_rarity: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
      consent_status: ['granted', 'revoked'],
      consent_type: [
        'terms_of_service',
        'privacy_policy',
        'political_sensitive_data',
        'public_profile_visibility',
        'analytics_participation',
      ],
      election_type: ['presidentielle', 'legislatives', 'europeennes'],
      moderation_action_type: [
        'hide_content',
        'lock_topic',
        'unlock_topic',
        'remove_content',
        'restore_content',
        'suspend_submission',
        'void_resolution',
        'warning',
        'note',
      ],
      moderation_report_status: ['open', 'triaged', 'resolved', 'dismissed'],
      moderation_target_type: [
        'post',
        'topic',
        'poll',
        'profile',
        'prediction_submission',
      ],
      political_entity_type: ['party', 'candidate', 'bloc'],
      poll_question_type: ['single_choice', 'multiple_choice', 'ordinal_scale'],
      poll_status: ['draft', 'open', 'closed', 'archived', 'removed'],
      poll_wave_status: ['draft', 'open', 'closed', 'published'],
      post_status: ['visible', 'hidden', 'locked', 'removed'],
      post_type: [
        'news',
        'analysis',
        'discussion',
        'local',
        'moderation',
        'resolution_justification',
      ],
      profile_status: ['active', 'limited', 'suspended', 'deleted'],
      reaction_target_type: ['thread_post', 'comment'],
      reaction_type: ['upvote', 'downvote'],
      reputation_event_type: [
        'topic_participation',
        'post_participation',
        'prediction_accuracy',
        'moderation_penalty',
        'card_bonus',
        'manual_adjustment',
      ],
      resolution_source_type: [
        'official_result',
        'official_statement',
        'press_article',
        'court_document',
        'internal_moderation_note',
        'other',
      ],
      resolution_status: ['pending', 'resolved', 'reopened', 'voided'],
      space_role: ['legacy', 'global', 'party', 'bloc'],
      space_status: ['active', 'archived', 'hidden', 'removed'],
      space_type: ['geographic', 'institutional', 'thematic', 'editorial'],
      submission_status: ['active', 'superseded', 'withdrawn', 'invalidated'],
      territory_level: ['macro', 'country', 'region', 'department', 'commune'],
      thread_kind: ['issue', 'poll_wave', 'candidate_watch', 'party_watch'],
      thread_post_status: ['draft', 'published', 'archived'],
      thread_post_type: ['article', 'poll', 'market'],
      topic_status: [
        'draft',
        'pending_review',
        'open',
        'locked',
        'resolved',
        'archived',
        'rejected',
        'removed',
      ],
      visibility_level: [
        'public',
        'authenticated',
        'private',
        'moderators_only',
      ],
      vote_choice_kind: [
        'vote',
        'blanc',
        'nul',
        'abstention',
        'non_inscrit',
        'ne_se_prononce_pas',
      ],
    },
  },
} as const;
