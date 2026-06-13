import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

// Aplica a migration 0019 (paid_mentorships + stripe/pix) no banco do .env.local.
// Idempotente: pode rodar mais de uma vez sem efeito colateral.
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL nao configurada.");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  console.log("Aplicando migration 0019 (paid_mentorships_stripe_pix)...");

  // 0. Check if helper functions already exist
  const fnExists = await sql`
    SELECT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'current_user_is_admin'
    ) AS exists
  `;
  const hasAdminFn = fnExists[0]?.exists === true;
  console.log(
    "  helper function current_user_is_admin:",
    hasAdminFn ? "✓ exists" : "✗ missing",
  );

  // 1. Create paid_mentorships table
  await sql`
    CREATE TABLE IF NOT EXISTS public.paid_mentorships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      image_url TEXT,
      image_alt TEXT,
      amount_cents INTEGER NOT NULL CHECK (amount_cents >= 50),
      currency TEXT NOT NULL DEFAULT 'BRL',
      pix_expires_after_seconds INTEGER NOT NULL DEFAULT 86400 CHECK (
        pix_expires_after_seconds BETWEEN 10 AND 1209600
      ),
      pix_amount_includes_iof TEXT NOT NULL DEFAULT 'never' CHECK (
        pix_amount_includes_iof IN ('always', 'never')
      ),
      mentor_email TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log("  ✓ paid_mentorships table");

  // 2. Enable RLS
  await sql`ALTER TABLE public.paid_mentorships ENABLE ROW LEVEL SECURITY`;
  console.log("  ✓ RLS enabled");

  // 3. RLS policies (drop + create for idempotency)
  await sql`DROP POLICY IF EXISTS "Anyone can read active paid mentorships" ON public.paid_mentorships`;
  await sql`
    CREATE POLICY "Anyone can read active paid mentorships"
      ON public.paid_mentorships FOR SELECT
      USING (is_active = true)
  `;
  console.log("  ✓ SELECT policy");

  await sql`DROP POLICY IF EXISTS "Admin can manage paid mentorships" ON public.paid_mentorships`;
  if (hasAdminFn) {
    await sql`
      CREATE POLICY "Admin can manage paid mentorships"
        ON public.paid_mentorships FOR ALL
        USING (public.current_user_is_admin())
        WITH CHECK (public.current_user_is_admin())
    `;
  } else {
    // Fallback: allow service_role only (API routes use service_role key)
    await sql`
      CREATE POLICY "Admin can manage paid mentorships"
        ON public.paid_mentorships FOR ALL
        USING (current_setting('role') = 'service_role')
        WITH CHECK (current_setting('role') = 'service_role')
    `;
    console.log(
      "  ⚠ Using service_role fallback for admin policy (current_user_is_admin not found)",
    );
  }
  console.log("  ✓ ALL policy (admin)");

  // 4. Updated_at trigger
  await sql`DROP TRIGGER IF EXISTS paid_mentorships_updated_at ON public.paid_mentorships`;
  await sql`
    CREATE TRIGGER paid_mentorships_updated_at
      BEFORE UPDATE ON public.paid_mentorships
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()
  `;
  console.log("  ✓ updated_at trigger");

  // 5. Add columns to bookings
  await sql`
    ALTER TABLE public.bookings
      ADD COLUMN IF NOT EXISTS paid_mentorship_id UUID REFERENCES public.paid_mentorships(id) ON DELETE SET NULL
  `;
  console.log("  ✓ bookings.paid_mentorship_id");

  // 6. Add columns to payments
  await sql`
    ALTER TABLE public.payments
      ADD COLUMN IF NOT EXISTS paid_mentorship_id UUID REFERENCES public.paid_mentorships(id) ON DELETE SET NULL
  `;
  await sql`ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT`;
  await sql`ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_status TEXT`;
  await sql`ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS pix_qr_code_data TEXT`;
  await sql`ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS pix_qr_code_image_url_png TEXT`;
  await sql`ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS pix_qr_code_image_url_svg TEXT`;
  await sql`ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS pix_hosted_instructions_url TEXT`;
  await sql`ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS pix_expires_at TIMESTAMPTZ`;
  await sql`ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`;
  console.log("  ✓ payments columns");

  // 7. Unique constraint on stripe_payment_intent_id
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payments_stripe_payment_intent_id_unique'
      ) THEN
        ALTER TABLE public.payments
          ADD CONSTRAINT payments_stripe_payment_intent_id_unique UNIQUE (stripe_payment_intent_id);
      END IF;
    END $$
  `;
  console.log("  ✓ stripe_payment_intent_id unique constraint");

  // 8. Payments updated_at trigger
  await sql`DROP TRIGGER IF EXISTS payments_updated_at ON public.payments`;
  await sql`
    CREATE TRIGGER payments_updated_at
      BEFORE UPDATE ON public.payments
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()
  `;
  console.log("  ✓ payments updated_at trigger");

  // 9. Indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_paid_mentorships_active_order ON public.paid_mentorships(is_active, sort_order, created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bookings_paid_mentorship ON public.bookings(paid_mentorship_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_payments_paid_mentorship ON public.payments(paid_mentorship_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent ON public.payments(stripe_payment_intent_id)`;
  console.log("  ✓ indexes");

  // Verify
  const table = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'paid_mentorships'
  `;
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments'
      AND column_name IN ('paid_mentorship_id', 'stripe_payment_intent_id', 'pix_qr_code_data')
    ORDER BY column_name
  `;

  console.log("\nVerificação:");
  console.log(
    "  Tabela paid_mentorships:",
    table.length > 0 ? "✓ existe" : "✗ não encontrada",
  );
  console.log(
    "  Colunas payments:",
    cols.map((c: { column_name: string }) => c.column_name).join(", "),
  );
  console.log("\nMigration 0019 aplicada com sucesso!");
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
