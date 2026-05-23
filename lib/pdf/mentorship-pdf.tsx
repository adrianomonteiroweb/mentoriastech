import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer"
import {
  MENTOR_EMAIL,
  MENTOR_NAME,
  buildEmailCorrectionLink,
  buildWhatsAppCorrectionLink,
} from "@/lib/mentor-contact"
import type { MenteeBookingItem } from "@/lib/db/mentee-bookings"

const COLORS = {
  bg: "#0d1117",
  primary: "#2dd4bf",
  primarySoft: "#ecfdf5",
  primaryText: "#065f46",
  body: "#1f2937",
  muted: "#6b7280",
  border: "#e5e7eb",
  warning: "#fef3c7",
  warningText: "#92400e",
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: COLORS.body,
    lineHeight: 1.5,
  },
  header: {
    backgroundColor: COLORS.bg,
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  headerTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    color: "#8b949e",
    fontSize: 11,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  infoLabel: {
    color: COLORS.muted,
    fontSize: 10,
    width: 90,
  },
  infoValue: {
    color: COLORS.body,
    fontSize: 11,
    flex: 1,
  },
  guideBox: {
    backgroundColor: COLORS.warning,
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
    borderLeftStyle: "solid",
    padding: 14,
    borderRadius: 6,
    marginBottom: 20,
  },
  guideTitle: {
    color: COLORS.warningText,
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
  },
  guideText: {
    color: COLORS.warningText,
    fontSize: 10,
    lineHeight: 1.5,
  },
  sectionTitle: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    borderBottomStyle: "solid",
    paddingBottom: 4,
  },
  sectionBody: {
    fontSize: 11,
    color: COLORS.body,
    lineHeight: 1.6,
  },
  emptySection: {
    fontSize: 10,
    color: COLORS.muted,
    fontStyle: "italic",
  },
  footer: {
    marginTop: 28,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderTopStyle: "solid",
  },
  footerTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: COLORS.bg,
    marginBottom: 6,
  },
  footerText: {
    fontSize: 10,
    color: COLORS.muted,
    marginBottom: 4,
  },
  link: {
    color: "#0d9488",
    textDecoration: "none",
  },
  pageNumber: {
    position: "absolute",
    bottom: 20,
    right: 40,
    fontSize: 9,
    color: COLORS.muted,
  },
})

function formatDateBR(dateStr: string | null) {
  if (!dateStr) return "Data nao informada"
  const [y, m, d] = dateStr.split("-")
  return `${d}/${m}/${y}`
}

function formatTimeBR(timeStr: string | null) {
  if (!timeStr) return ""
  return timeStr.substring(0, 5)
}

interface SectionProps {
  title: string
  content: string | null
}

function Section({ title, content }: SectionProps) {
  return (
    <View wrap={false}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {content && content.trim() ? (
        <Text style={styles.sectionBody}>{content}</Text>
      ) : (
        <Text style={styles.emptySection}>Sem anotações registradas nesta seção.</Text>
      )}
    </View>
  )
}

interface MentorshipPDFProps {
  booking: MenteeBookingItem
  menteeEmail: string
}

export function MentorshipPDF({ booking, menteeEmail }: MentorshipPDFProps) {
  const dateStr = formatDateBR(booking.sessionDate)
  const timeStr = formatTimeBR(booking.startTime)
  const topic = booking.topicName || "Mentoria"
  const name = booking.guestName || menteeEmail

  const whatsappLink = buildWhatsAppCorrectionLink({
    bookingDate: booking.sessionDate,
    topicName: booking.topicName,
  })
  const emailLink = buildEmailCorrectionLink({
    bookingDate: booking.sessionDate,
    topicName: booking.topicName,
  })

  return (
    <Document
      title={`Anotacoes de Mentoria - ${dateStr}`}
      author={MENTOR_NAME}
      subject={`Mentoria sobre ${topic}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Anotações da Mentoria</Text>
          <Text style={styles.headerSubtitle}>
            Registro da sessão conduzida por {MENTOR_NAME}
          </Text>
        </View>

        <View style={{ marginBottom: 14 }}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mentorado(a)</Text>
            <Text style={styles.infoValue}>{name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{menteeEmail}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tema</Text>
            <Text style={styles.infoValue}>{topic}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Data</Text>
            <Text style={styles.infoValue}>
              {dateStr}
              {timeStr ? ` às ${timeStr}` : ""}
            </Text>
          </View>
        </View>

        <View style={styles.guideBox}>
          <Text style={styles.guideTitle}>Como ler este documento</Text>
          <Text style={styles.guideText}>
            Este registro é um guia das ideias discutidas durante a sua mentoria.
            Leia com atenção e verifique se há erros, interpretações equivocadas
            sobre você ou sobre sua carreira, ou pontos que precisam de mais
            contexto. Caso identifique algo que precise de ajuste, solicite a
            correção ao mentor pelos canais de contato no rodapé desta página.
          </Text>
        </View>

        <Section title="Tópicos discutidos" content={booking.topicsDiscussed} />
        <Section title="Pontos fortes identificados" content={booking.menteeStrengths} />
        <Section title="Áreas para desenvolver" content={booking.menteeGrowthAreas} />
        <Section title="Anotações gerais" content={booking.notes} />

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Identificou algo a corrigir?</Text>
          <Text style={styles.footerText}>
            Entre em contato com o mentor pelos canais abaixo para solicitar a
            revisão das anotações:
          </Text>
          <Text style={styles.footerText}>
            WhatsApp:{" "}
            <Link src={whatsappLink} style={styles.link}>
              Abrir conversa no WhatsApp
            </Link>
          </Text>
          <Text style={styles.footerText}>
            Email:{" "}
            <Link src={emailLink} style={styles.link}>
              {MENTOR_EMAIL}
            </Link>
          </Text>
        </View>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  )
}
