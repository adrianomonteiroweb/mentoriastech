import { asc, desc, eq } from "drizzle-orm"
import { db, bookingTasks, bookingTaskItems } from "@/lib/db"

export async function getTasksByBookingId(bookingId: string) {
  const tasks = await db
    .select()
    .from(bookingTasks)
    .where(eq(bookingTasks.bookingId, bookingId))
    .orderBy(asc(bookingTasks.sortOrder), asc(bookingTasks.createdAt))

  const taskIds = tasks.map((t) => t.id)
  if (taskIds.length === 0) return []

  const allItems = await db
    .select()
    .from(bookingTaskItems)
    .orderBy(asc(bookingTaskItems.createdAt))

  const itemsByTask = new Map<string, typeof allItems>()
  for (const item of allItems) {
    if (!taskIds.includes(item.taskId)) continue
    const list = itemsByTask.get(item.taskId) || []
    list.push(item)
    itemsByTask.set(item.taskId, list)
  }

  return tasks.map((task) => ({
    ...task,
    items: itemsByTask.get(task.id) || [],
  }))
}

export async function createTask(data: {
  bookingId: string
  menteeId: string
  title: string
  sortOrder?: number
}) {
  const [row] = await db
    .insert(bookingTasks)
    .values(data)
    .returning()
  return row
}

export async function updateTask(
  taskId: string,
  data: { title?: string; completed?: boolean; sortOrder?: number },
) {
  const [row] = await db
    .update(bookingTasks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(bookingTasks.id, taskId))
    .returning()
  return row ?? null
}

export async function deleteTask(taskId: string) {
  const [row] = await db
    .delete(bookingTasks)
    .where(eq(bookingTasks.id, taskId))
    .returning({ id: bookingTasks.id })
  return row ?? null
}

export async function getTaskById(taskId: string) {
  const [row] = await db
    .select()
    .from(bookingTasks)
    .where(eq(bookingTasks.id, taskId))
    .limit(1)
  return row ?? null
}

export async function createTaskItem(data: {
  taskId: string
  type: "comment" | "file" | "audio"
  title?: string | null
  content?: string | null
  fileUrl?: string | null
  fileName?: string | null
  fileSizeBytes?: number | null
  mimeType?: string | null
  durationSeconds?: number | null
  uploadedBy?: string | null
}) {
  const [row] = await db
    .insert(bookingTaskItems)
    .values(data)
    .returning()
  return row
}

export async function deleteTaskItem(itemId: string) {
  const [row] = await db
    .delete(bookingTaskItems)
    .where(eq(bookingTaskItems.id, itemId))
    .returning({ id: bookingTaskItems.id, fileUrl: bookingTaskItems.fileUrl })
  return row ?? null
}
