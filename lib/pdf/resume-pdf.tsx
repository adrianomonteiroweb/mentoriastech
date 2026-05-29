import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import { parseResumeMarkdown, type ResumeBlock } from "@/lib/resume/markdown-blocks"

const COLORS = {
  text: "#1f2937",
  heading: "#0f172a",
  accent: "#0d9488",
  muted: "#6b7280",
  border: "#e5e7eb",
}

const styles = StyleSheet.create({
  page: {
    paddingVertical: 40,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: 10.5,
    color: COLORS.text,
    lineHeight: 1.5,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.heading,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: "bold",
    color: COLORS.heading,
    marginTop: 14,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
    borderBottomStyle: "solid",
    paddingBottom: 3,
    textTransform: "uppercase",
  },
  itemTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: COLORS.heading,
    marginTop: 8,
    marginBottom: 2,
  },
  paragraph: {
    fontSize: 10.5,
    color: COLORS.text,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 6,
  },
  bulletDot: {
    width: 10,
    fontSize: 10.5,
    color: COLORS.accent,
  },
  bulletText: {
    flex: 1,
    fontSize: 10.5,
    color: COLORS.text,
  },
  pageNumber: {
    position: "absolute",
    bottom: 20,
    right: 44,
    fontSize: 9,
    color: COLORS.muted,
  },
})

function renderBlock(block: ResumeBlock, index: number) {
  switch (block.type) {
    case "h1":
      return (
        <Text key={index} style={styles.name}>
          {block.text}
        </Text>
      )
    case "h2":
      return (
        <Text key={index} style={styles.sectionTitle}>
          {block.text}
        </Text>
      )
    case "h3":
      return (
        <Text key={index} style={styles.itemTitle}>
          {block.text}
        </Text>
      )
    case "bullet":
      return (
        <View key={index} style={styles.bulletRow} wrap={false}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{block.text}</Text>
        </View>
      )
    default:
      return (
        <Text key={index} style={styles.paragraph}>
          {block.text}
        </Text>
      )
  }
}

export function ResumePDF({ markdown }: { markdown: string }) {
  const blocks = parseResumeMarkdown(markdown)

  return (
    <Document title="Currículo otimizado" author="Plataforma de Mentoria">
      <Page size="A4" style={styles.page}>
        {blocks.length > 0 ? (
          blocks.map((block, index) => renderBlock(block, index))
        ) : (
          <Text style={styles.paragraph}>Currículo vazio.</Text>
        )}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}
