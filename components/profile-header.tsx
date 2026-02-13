import Image from "next/image"

export function ProfileHeader() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="absolute -inset-1 rounded-full bg-primary/30 blur-md" />
        <Image
          src="/images/avatar.jpg"
          alt="Adriano Monteiro"
          width={120}
          height={120}
          className="relative rounded-full border-2 border-primary/50 object-cover"
          priority
        />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Adriano Monteiro
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Desenvolvedor Web
        </p>
      </div>
    </div>
  )
}
