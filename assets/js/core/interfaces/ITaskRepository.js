/**
 * Interface contract for task data access operations
 * This serves as a documentation and contract for task repository implementations
 *
 * Expected methods:
 * - getById(id: string): Promise<Task|null>
 * - getByUserId(userId: string, filter?: TaskFilter, sort?: TaskSort): Promise<Task[]>
 * - create(taskData: Omit<Task, 'id'|'createdAt'|'updatedAt'>): Promise<Task>
 * - update(id: string, updates: UpdateTaskData): Promise<Task>
 * - delete(id: string): Promise<void>
 * - getAssignedToUser(userId: string, filter?: TaskFilter, sort?: TaskSort): Promise<Task[]>
 * - getOverdueTasks(userId: string): Promise<Task[]>
 */

// Interface marker - implementations should follow this contract
const ITaskRepository = {
    // This is a documentation interface, not a runtime construct
    _interface: 'ITaskRepository',
    _methods: ['getById', 'getByUserId', 'create', 'update', 'delete', 'getAssignedToUser', 'getOverdueTasks']
};
