-- ============================================================
-- GrowthVerse — Enable Row Level Security
-- Migration: 002_enable_rls.sql
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE exploration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exploration_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_data_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- users — 用户只能访问自己的数据
-- ============================================================
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- ============================================================
-- books — 图书数据公开可读（缓存数据）
-- ============================================================
CREATE POLICY "Books are viewable by everyone"
    ON books FOR SELECT
    USING (TRUE);

-- ============================================================
-- user_books — 用户只能访问自己的书架
-- ============================================================
CREATE POLICY "Users can view own books"
    ON user_books FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own books"
    ON user_books FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own books"
    ON user_books FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own books"
    ON user_books FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- exploration_sessions — 用户只能访问自己的探索会话
-- ============================================================
CREATE POLICY "Users can view own sessions"
    ON exploration_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
    ON exploration_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
    ON exploration_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
    ON exploration_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- exploration_steps — 通过 session 关联到用户
-- ============================================================
CREATE POLICY "Users can view own steps"
    ON exploration_steps FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM exploration_sessions
            WHERE exploration_sessions.id = exploration_steps.session_id
              AND exploration_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create own steps"
    ON exploration_steps FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM exploration_sessions
            WHERE exploration_sessions.id = exploration_steps.session_id
              AND exploration_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own steps"
    ON exploration_steps FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM exploration_sessions
            WHERE exploration_sessions.id = exploration_steps.session_id
              AND exploration_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own steps"
    ON exploration_steps FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM exploration_sessions
            WHERE exploration_sessions.id = exploration_steps.session_id
              AND exploration_sessions.user_id = auth.uid()
        )
    );

-- ============================================================
-- reflections — 用户只能访问自己的反思
-- ============================================================
CREATE POLICY "Users can view own reflections"
    ON reflections FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reflections"
    ON reflections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reflections"
    ON reflections FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reflections"
    ON reflections FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- growth_dimensions — 用户只能访问自己的成长维度
-- ============================================================
CREATE POLICY "Users can view own dimensions"
    ON growth_dimensions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dimensions"
    ON growth_dimensions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dimensions"
    ON growth_dimensions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dimensions"
    ON growth_dimensions FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- mood_logs — 用户只能访问自己的情绪记录
-- ============================================================
CREATE POLICY "Users can view own mood logs"
    ON mood_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own mood logs"
    ON mood_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mood logs"
    ON mood_logs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mood logs"
    ON mood_logs FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- social_data_cache — 公开可读（缓存数据）
-- ============================================================
CREATE POLICY "Social data cache is viewable by everyone"
    ON social_data_cache FOR SELECT
    USING (TRUE);

CREATE POLICY "Users can insert social data cache"
    ON social_data_cache FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "Users can update social data cache"
    ON social_data_cache FOR UPDATE
    USING (TRUE);

-- ============================================================
-- agent_memories — 用户只能访问自己的 Agent 记忆
-- ============================================================
CREATE POLICY "Users can view own memories"
    ON agent_memories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own memories"
    ON agent_memories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories"
    ON agent_memories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories"
    ON agent_memories FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- daily_boxes — 用户只能访问自己的盲盒
-- ============================================================
CREATE POLICY "Users can view own daily boxes"
    ON daily_boxes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own daily boxes"
    ON daily_boxes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily boxes"
    ON daily_boxes FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================
-- quiz_results — 用户只能访问自己的测验结果
-- ============================================================
CREATE POLICY "Users can view own quiz results"
    ON quiz_results FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own quiz results"
    ON quiz_results FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quiz results"
    ON quiz_results FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quiz results"
    ON quiz_results FOR DELETE
    USING (auth.uid() = user_id);
