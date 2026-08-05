-- ============================================================
-- GrowthVerse — Initial Database Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- 1. users — 用户信息
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT UNIQUE NOT NULL,
    name        TEXT,
    avatar_url  TEXT,
    preferences JSONB DEFAULT '{}',
    onboarded   BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. books — 图书缓存
-- ============================================================
CREATE TABLE IF NOT EXISTS books (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title         TEXT NOT NULL,
    authors       TEXT[] DEFAULT '{}',
    isbn          TEXT,
    cover_url     TEXT,
    description   TEXT,
    publisher     TEXT,
    publish_date  TEXT,
    categories    TEXT[] DEFAULT '{}',
    rating        REAL,
    page_count    INTEGER,
    language      TEXT DEFAULT 'en',
    douban_id     TEXT,
    douban_rating REAL,
    source_data   JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_books_isbn       ON books (isbn) WHERE isbn IS NOT NULL;
CREATE INDEX idx_books_douban_id  ON books (douban_id) WHERE douban_id IS NOT NULL;
CREATE INDEX idx_books_title      ON books USING gin (title gin_trgm_ops);
CREATE INDEX idx_books_authors    ON books USING gin (authors);
CREATE INDEX idx_books_categories ON books USING gin (categories);
CREATE INDEX idx_books_language   ON books (language);

-- ============================================================
-- 3. user_books — 用户与图书的关系（书架）
-- ============================================================
CREATE TABLE IF NOT EXISTS user_books (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id      UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    status       TEXT NOT NULL DEFAULT 'want_to_read'
                     CHECK (status IN ('reading', 'completed', 'want_to_read')),
    started_at   TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes        TEXT,
    ai_generated BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, book_id)
);

CREATE INDEX idx_user_books_user_id ON user_books (user_id);
CREATE INDEX idx_user_books_book_id ON user_books (book_id);
CREATE INDEX idx_user_books_status  ON user_books (status);

-- ============================================================
-- 4. exploration_sessions — 探索会话
-- ============================================================
CREATE TABLE IF NOT EXISTS exploration_sessions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at   TIMESTAMPTZ,
    summary    TEXT,
    ai_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exploration_sessions_user_id ON exploration_sessions (user_id);

-- ============================================================
-- 5. exploration_steps — 探索路径中的每一步
-- ============================================================
CREATE TABLE IF NOT EXISTS exploration_steps (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id     UUID NOT NULL REFERENCES exploration_sessions(id) ON DELETE CASCADE,
    book_id        UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    step_order     INTEGER NOT NULL DEFAULT 0,
    relation_type  TEXT NOT NULL DEFAULT 'initial'
                       CHECK (relation_type IN ('same_author', 'same_era', 'same_theme', 'initial')),
    source_book_id UUID REFERENCES books(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exploration_steps_session_id ON exploration_steps (session_id);
CREATE INDEX idx_exploration_steps_book_id    ON exploration_steps (book_id);

-- ============================================================
-- 6. reflections — 读后反思
-- ============================================================
CREATE TABLE IF NOT EXISTS reflections (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id           UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    content           TEXT,
    key_insights      JSONB DEFAULT '[]',
    growth_dimensions TEXT[] DEFAULT '{}',
    ai_analysis       JSONB DEFAULT '{}',
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reflections_user_id ON reflections (user_id);
CREATE INDEX idx_reflections_book_id ON reflections (book_id);

-- ============================================================
-- 7. growth_dimensions — 成长维度追踪
-- ============================================================
CREATE TABLE IF NOT EXISTS growth_dimensions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dimension  TEXT NOT NULL
                   CHECK (dimension IN (
                       'self_awareness',
                       'emotional_intelligence',
                       'career',
                       'relationships',
                       'health',
                       'philosophy'
                   )),
    score      INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, dimension)
);

CREATE INDEX idx_growth_dimensions_user_id ON growth_dimensions (user_id);

-- ============================================================
-- 8. mood_logs — 情绪记录
-- ============================================================
CREATE TABLE IF NOT EXISTS mood_logs (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score     INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
    label     TEXT,
    note      TEXT,
    book_id   UUID REFERENCES books(id) ON DELETE SET NULL,
    logged_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mood_logs_user_id   ON mood_logs (user_id);
CREATE INDEX idx_mood_logs_logged_at ON mood_logs (logged_at DESC);
CREATE INDEX idx_mood_logs_book_id   ON mood_logs (book_id) WHERE book_id IS NOT NULL;

-- ============================================================
-- 9. social_data_cache — 社交平台数据缓存
-- ============================================================
CREATE TABLE IF NOT EXISTS social_data_cache (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id      UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    platform     TEXT NOT NULL CHECK (platform IN ('xiaohongshu', 'bilibili')),
    data         JSONB DEFAULT '{}',
    search_query TEXT,
    fetched_at   TIMESTAMPTZ DEFAULT NOW(),
    expires_at   TIMESTAMPTZ
);

CREATE INDEX idx_social_data_cache_book_id  ON social_data_cache (book_id);
CREATE INDEX idx_social_data_cache_expires  ON social_data_cache (expires_at);
CREATE INDEX idx_social_data_cache_platform ON social_data_cache (platform);

-- ============================================================
-- 10. agent_memories — Agent 记忆
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_memories (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category     TEXT NOT NULL,
    content      TEXT NOT NULL,
    importance   REAL DEFAULT 0.5 CHECK (importance >= 0.0 AND importance <= 1.0),
    source_agent TEXT,
    expires_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_memories_user_id    ON agent_memories (user_id);
CREATE INDEX idx_agent_memories_category   ON agent_memories (category);
CREATE INDEX idx_agent_memories_expires_at ON agent_memories (expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================
-- 11. daily_boxes — 每日盲盒记录
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_boxes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date         DATE NOT NULL DEFAULT CURRENT_DATE,
    content_type TEXT NOT NULL
                     CHECK (content_type IN ('quote', 'challenge', 'book', 'question')),
    content      JSONB DEFAULT '{}',
    opened_at    TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, date, content_type)
);

CREATE INDEX idx_daily_boxes_user_id ON daily_boxes (user_id);
CREATE INDEX idx_daily_boxes_date    ON daily_boxes (date);

-- ============================================================
-- 12. quiz_results — 性格测验结果
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_results (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_type   TEXT NOT NULL,
    result_type TEXT,
    answers     JSONB DEFAULT '{}',
    result_data JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quiz_results_user_id   ON quiz_results (user_id);
CREATE INDEX idx_quiz_results_quiz_type ON quiz_results (quiz_type);

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_user_books_updated_at
    BEFORE UPDATE ON user_books FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_reflections_updated_at
    BEFORE UPDATE ON reflections FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_growth_dimensions_updated_at
    BEFORE UPDATE ON growth_dimensions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
