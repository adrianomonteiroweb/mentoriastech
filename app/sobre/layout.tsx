import { PublicNav } from "@/components/public-nav"
import { SiteFooter } from "@/components/site-footer"

export default function SobreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <PublicNav />
      {children}
      <SiteFooter />
    </>
  )
}
