-- ============================================
-- Schema Updates for Advanced Features
-- Run this script in Supabase SQL Editor
-- ============================================

-- 1. UPDATE TASKS TABLE
-- ============================================
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS estimated_hours FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id);

-- 2. UPDATE USERS TABLE
-- ============================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS daily_capacity_hours FLOAT DEFAULT 8.0;

-- 3. CREATE TASK DEPENDENCIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    type VARCHAR(50) DEFAULT 'finish_to_start', -- finish_to_start, start_to_start, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, depends_on_task_id)
);

-- Enable RLS
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

-- Policies for task_dependencies
CREATE POLICY "Users can view dependencies of accessible tasks" ON task_dependencies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tasks WHERE id = task_dependencies.task_id AND (
                user_id = auth.uid() OR assigned_to = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage dependencies of own tasks" ON task_dependencies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tasks WHERE id = task_dependencies.task_id AND user_id = auth.uid()
        )
    );

-- 4. CREATE TIMESHEETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS timesheets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    hours_worked FLOAT NOT NULL,
    work_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

-- Policies for timesheets
CREATE POLICY "Users can view own timesheets" ON timesheets
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can log time for assigned tasks" ON timesheets
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM tasks WHERE id = task_id AND (
                user_id = auth.uid() OR assigned_to = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update own timesheets" ON timesheets
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own timesheets" ON timesheets
    FOR DELETE USING (user_id = auth.uid());

-- 5. CREATE TASK COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Policies for task_comments
CREATE POLICY "Users can view comments on accessible tasks" ON task_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tasks WHERE id = task_comments.task_id AND (
                user_id = auth.uid() OR assigned_to = auth.uid() OR
                EXISTS (SELECT 1 FROM task_subscriptions WHERE task_id = tasks.id AND user_id = auth.uid())
            )
        )
    );

CREATE POLICY "Users can comment on accessible tasks" ON task_comments
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM tasks WHERE id = task_id AND (
                user_id = auth.uid() OR assigned_to = auth.uid() OR
                EXISTS (SELECT 1 FROM task_subscriptions WHERE task_id = tasks.id AND user_id = auth.uid())
            )
        )
    );

-- 6. CREATE VIEWS FOR ANALYTICS
-- ============================================
CREATE OR REPLACE VIEW task_performance_view AS
SELECT 
    t.id as task_id,
    t.title,
    t.user_id as owner_id,
    t.assigned_to,
    t.estimated_hours,
    COALESCE(SUM(ts.hours_worked), 0) as actual_hours,
    t.status
FROM tasks t
LEFT JOIN timesheets ts ON t.id = ts.task_id
GROUP BY t.id;
