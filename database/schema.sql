-- 创建words表
CREATE TABLE words (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    word VARCHAR(255) NOT NULL,
    meaning TEXT NOT NULL,
    review1 VARCHAR(50) DEFAULT '',
    review2 VARCHAR(50) DEFAULT '',
    review3 VARCHAR(50) DEFAULT '',
    review4 VARCHAR(50) DEFAULT '',
    review5 VARCHAR(50) DEFAULT '',
    review6 VARCHAR(50) DEFAULT '',
    create_time TIMESTAMP DEFAULT NOW()
);

-- 创建tags表
CREATE TABLE tags (
    tag_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tag_name VARCHAR(100) NOT NULL,
    UNIQUE(user_id, tag_name)
);

-- 创建word_tags关联表
CREATE TABLE word_tags (
    id SERIAL PRIMARY KEY,
    word_id INTEGER REFERENCES words(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(tag_id) ON DELETE CASCADE,
    UNIQUE(word_id, tag_id)
);

-- 创建索引
CREATE INDEX idx_words_user_id ON words(user_id);
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_word_tags_word_id ON word_tags(word_id);
CREATE INDEX idx_word_tags_tag_id ON word_tags(tag_id);

-- RLS策略
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_tags ENABLE ROW LEVEL SECURITY;

-- words表RLS策略
CREATE POLICY "Users can view own words" ON words
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own words" ON words
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own words" ON words
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own words" ON words
    FOR DELETE USING (auth.uid() = user_id);

-- tags表RLS策略
CREATE POLICY "Users can view own tags" ON tags
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags" ON tags
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags" ON tags
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags" ON tags
    FOR DELETE USING (auth.uid() = user_id);

-- word_tags表RLS策略
CREATE POLICY "Users can view own word_tags" ON word_tags
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM words WHERE words.id = word_tags.word_id AND words.user_id = auth.uid())
    );

CREATE POLICY "Users can insert own word_tags" ON word_tags
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM words WHERE words.id = word_tags.word_id AND words.user_id = auth.uid())
    );

CREATE POLICY "Users can delete own word_tags" ON word_tags
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM words WHERE words.id = word_tags.word_id AND words.user_id = auth.uid())
    );

