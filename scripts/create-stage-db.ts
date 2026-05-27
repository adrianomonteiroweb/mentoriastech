import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir, rm } from "node:fs/promises"
import path from "node:path"
import { config } from "dotenv"

config({ path: ".env.local", quiet: true })
config({ quiet: true })

const args = new Set(process.argv.slice(2))
const prodDatabaseUrl = process.env.PROD_DATABASE_URL
const stageDatabaseUrl = process.env.STAGE_DATABASE_URL
const confirmed =
  process.env.STAGE_RESET_CONFIRM === "RESET STAGE" || args.has("--yes")
const keepDump = args.has("--keep-dump")

const rootDir = process.cwd()
const anonymizeFile = path.join(rootDir, "supabase", "stage", "anonymize.sql")
const dumpDir = path.join(rootDir, ".tmp", "stage-dumps")
const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
const dumpFile = path.join(dumpDir, `prod-${timestamp}.dump`)

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}

function run(command: string, commandArgs: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      stdio: "inherit",
      windowsHide: true,
    })

    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} failed with exit code ${code}`))
    })
  })
}

async function main() {
  const sourceUrl = requireEnv("PROD_DATABASE_URL", prodDatabaseUrl)
  const targetUrl = requireEnv("STAGE_DATABASE_URL", stageDatabaseUrl)

  if (sourceUrl === targetUrl) {
    throw new Error("PROD_DATABASE_URL and STAGE_DATABASE_URL must be different")
  }

  if (!confirmed) {
    throw new Error(
      'Stage reset not confirmed. Set STAGE_RESET_CONFIRM="RESET STAGE" or pass --yes.',
    )
  }

  if (!existsSync(anonymizeFile)) {
    throw new Error(`Anonymization SQL not found: ${anonymizeFile}`)
  }

  await mkdir(dumpDir, { recursive: true })

  let dumpCreated = false

  try {
    console.log("Creating production dump...")
    await run("pg_dump", [
      "--format=custom",
      "--no-owner",
      "--no-acl",
      "--file",
      dumpFile,
      sourceUrl,
    ])
    dumpCreated = true

    console.log("Restoring dump into stage database...")
    await run("pg_restore", [
      "--clean",
      "--if-exists",
      "--no-owner",
      "--no-acl",
      "--dbname",
      targetUrl,
      dumpFile,
    ])

    console.log("Anonymizing stage data...")
    await run("psql", [
      targetUrl,
      "--set",
      "ON_ERROR_STOP=1",
      "--file",
      anonymizeFile,
    ])

    console.log("Stage database is ready with fictitious data.")
    console.log("Known test password for anonymized profiles: Stage123!Senha")
  } finally {
    if (dumpCreated && !keepDump) {
      await rm(dumpFile, { force: true })
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
