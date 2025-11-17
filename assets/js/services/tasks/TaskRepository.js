/**
 * Supabase implementation of ITaskRepository interface
 * Handles task data access operations
 */
class TaskRepository {
    /**
     * @param {Object} config - Supabase configuration
     */
    constructor(config) {
        this.supabaseUrl = config.url;
        this.supabaseAnonKey = config.anonKey;
        this.supabase = null;
        this._initializeSupabase();
    }

    /**
     * Initialize Supabase client
     * @private
     */
    _initializeSupabase() {
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);
        } else {
            console.warn('Supabase library not loaded for TaskRepository');
        }
    }

    /**
     * Get task by ID
     * @param {string} id
     * @returns {Promise<Task|null>}
     */
    async getById(id) {
        if (!this.supabase) {
            throw new Error('Supabase not initialized');
        }

        const { data, error } = await this.supabase
            .from('tasks')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // Not found
            }
            throw error;
        }

        return data;
    }

    /**
     * Get all tasks for a user with optional filtering and sorting
     * @param {string} userId
     * @param {TaskFilter} [filter]
     * @param {TaskSort} [sort]
     * @returns {Promise<Task[]>}
     */
    async getByUserId(userId, filter = {}, sort = {}) {
        if (!this.supabase) {
            throw new Error('Supabase not initialized');
        }

        let query = this.supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId);

        // Apply filters
        if (filter.status) {
            query = query.eq('status', filter.status);
        }
        if (filter.priority) {
            query = query.eq('priority', filter.priority);
        }
        if (filter.assignedTo) {
            query = query.eq('assigned_to', filter.assignedTo);
        }
        if (filter.overdue) {
            const now = new Date().toISOString();
            query = query.lt('due_date', now).neq('status', 'completed');
        }

        // Apply sorting
        if (sort.field) {
            query = query.order(sort.field, { ascending: sort.ascending });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        return data || [];
    }

    /**
     * Create new task
     * @param {Omit<Task, 'id'|'createdAt'|'updatedAt'>} taskData
     * @returns {Promise<Task>}
     */
    async create(taskData) {
        if (!this.supabase) {
            throw new Error('Supabase not initialized');
        }

        const { data, error } = await this.supabase
            .from('tasks')
            .insert(taskData)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    /**
     * Update existing task
     * @param {string} id
     * @param {UpdateTaskData} updates
     * @returns {Promise<Task>}
     */
    async update(id, updates) {
        if (!this.supabase) {
            throw new Error('Supabase not initialized');
        }

        const { data, error } = await this.supabase
            .from('tasks')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    /**
     * Delete task
     * @param {string} id
     * @returns {Promise<void>}
     */
    async delete(id) {
        if (!this.supabase) {
            throw new Error('Supabase not initialized');
        }

        const { error } = await this.supabase
            .from('tasks')
            .delete()
            .eq('id', id);

        if (error) {
            throw error;
        }
    }

    /**
     * Get tasks assigned to a user
     * @param {string} userId
     * @param {TaskFilter} [filter]
     * @param {TaskSort} [sort]
     * @returns {Promise<Task[]>}
     */
    async getAssignedToUser(userId, filter = {}, sort = {}) {
        if (!this.supabase) {
            throw new Error('Supabase not initialized');
        }

        let query = this.supabase
            .from('tasks')
            .select('*')
            .eq('assigned_to', userId);

        // Apply filters
        if (filter.status) {
            query = query.eq('status', filter.status);
        }
        if (filter.priority) {
            query = query.eq('priority', filter.priority);
        }
        if (filter.overdue) {
            const now = new Date().toISOString();
            query = query.lt('due_date', now).neq('status', 'completed');
        }

        // Apply sorting
        if (sort.field) {
            query = query.order(sort.field, { ascending: sort.ascending });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        return data || [];
    }

    /**
     * Get overdue tasks for a user
     * @param {string} userId
     * @returns {Promise<Task[]>}
     */
    async getOverdueTasks(userId) {
        if (!this.supabase) {
            throw new Error('Supabase not initialized');
        }

        const now = new Date().toISOString();

        const { data, error } = await this.supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId)
            .lt('due_date', now)
            .neq('status', 'completed')
            .order('due_date', { ascending: true });

        if (error) {
            throw error;
        }

        return data || [];
    }
}
