-- Tarefas/checklist de mentoria
CREATE TABLE IF NOT EXISTS booking_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Itens de cada tarefa (comentario, arquivo, audio)
CREATE TABLE IF NOT EXISTS booking_task_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES booking_tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('comment', 'file', 'audio')),
  title TEXT,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size_bytes INTEGER,
  mime_type TEXT,
  duration_seconds INTEGER,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE booking_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_task_items ENABLE ROW LEVEL SECURITY;

-- Admin/mentor: acesso total às tarefas
CREATE POLICY "admin_mentor_booking_tasks_all" ON booking_tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'mentor')
    )
  );

-- Mentee: pode ver suas tarefas
CREATE POLICY "mentee_booking_tasks_select" ON booking_tasks
  FOR SELECT
  USING (mentee_id = auth.uid());

-- Mentee: pode atualizar apenas completed
CREATE POLICY "mentee_booking_tasks_update" ON booking_tasks
  FOR UPDATE
  USING (mentee_id = auth.uid())
  WITH CHECK (mentee_id = auth.uid());

-- Admin/mentor: acesso total aos itens
CREATE POLICY "admin_mentor_booking_task_items_all" ON booking_task_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'mentor')
    )
  );

-- Mentee: pode ver itens das suas tarefas
CREATE POLICY "mentee_booking_task_items_select" ON booking_task_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM booking_tasks
      WHERE booking_tasks.id = booking_task_items.task_id
      AND booking_tasks.mentee_id = auth.uid()
    )
  );
