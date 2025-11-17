/**
 * Interface contract for task business logic operations
 * This serves as a documentation and contract for task service implementations
 *
 * Expected methods:
 * - createTask(userId: string, taskData: CreateTaskData): Promise<Task>
 * - updateTask(userId: string, taskId: string, updates: UpdateTaskData): Promise<Task>
 * - deleteTask(userId: string, taskId: string): Promise<void>
 * - completeTask(userId: string, taskId: string): Promise<Task>
 * - startTask(userId: string, taskId: string): Promise<Task>
 * - assignTask(currentUserId: string, taskId: string, assignToUserId: string): Promise<Task>
 * - getUserTasks(userId: string, filter?: TaskFilter, sort?: TaskSort): Promise<Task[]>
 * - getTaskStats(userId: string): Promise<Object>
 */

// Interface marker - implementations should follow this contract
const ITaskService = {
    // This is a documentation interface, not a runtime construct
    _interface: 'ITaskService',
    _methods: ['createTask', 'updateTask', 'deleteTask', 'completeTask', 'startTask', 'assignTask', 'getUserTasks', 'getTaskStats']
};
