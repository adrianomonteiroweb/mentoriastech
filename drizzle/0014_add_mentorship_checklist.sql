ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "mentorship_checklist" jsonb;--> statement-breakpoint
INSERT INTO "site_settings" ("key", "value")
VALUES (
  'mentorship_checklist',
  '[
    { "id": "explicacao-sobre-a-mentoria", "label": "Explicacao sobre a mentoria" },
    { "id": "apresentacao-do-mentorado", "label": "Apresentacao do mentorado" },
    { "id": "duvidas-sobre-a-trajetoria-e-dicas", "label": "Duvidas sobre a trajetoria e dicas" },
    { "id": "posicionamento-linkedin", "label": "Posicionamento: LinkedIn" },
    { "id": "posicionamento-curriculo", "label": "Posicionamento: curriculo" },
    { "id": "posicionamento-projetos-de-portfolio", "label": "Posicionamento: projetos de portfolio" }
  ]'::jsonb
)
ON CONFLICT (key) DO NOTHING;
