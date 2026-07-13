export function parseSummaryRows(
  summary: string,
): { label: string; value: string }[] {
  return summary
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const tab = line.indexOf("\t");
      const sep = tab >= 0 ? tab : line.indexOf(":");
      if (sep === -1) return { label: line, value: "" };
      return {
        label: line.slice(0, sep).trim(),
        value: line.slice(sep + 1).trim(),
      };
    })
    .filter(
      (row) =>
        !(
          row.label.toLowerCase() === "item" &&
          row.value.toLowerCase() === "detalhes"
        ),
    );
}
