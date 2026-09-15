import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatDate } from "@/lib/format";

/** The standard PDF fonts (Helvetica) have no glyph for ₹, so react-pdf
 * renders it as a stray superscript character — "boxes" has no such
 * character to worry about, so this document never needs formatPdfINR. */
const styles = StyleSheet.create({
  page: { paddingTop: 32, paddingBottom: 40, paddingHorizontal: 32, fontSize: 9, color: "#2b241d", fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  companyName: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  tagline: { fontSize: 8, fontStyle: "italic", color: "#79705f", marginTop: 2 },
  titleBlock: { alignItems: "flex-end" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 9, color: "#79705f" },
  rule: { borderBottomWidth: 1, borderBottomColor: "#8a6a3b", marginBottom: 10 },
  fieldGrid: { borderWidth: 1, borderColor: "#e8e1d4", marginBottom: 12 },
  fieldRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e8e1d4" },
  fieldCell: { flex: 1, padding: 6, borderRightWidth: 1, borderRightColor: "#e8e1d4" },
  fieldLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#79705f", marginBottom: 2 },
  fieldValue: { fontSize: 9 },
  table: { borderWidth: 1, borderColor: "#e8e1d4" },
  tableHeaderRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#f1ece3", borderBottomWidth: 1, borderBottomColor: "#d8cfc0" },
  tableRow: { flexDirection: "row", alignItems: "center", borderTopWidth: 0.5, borderTopColor: "#e3dccd" },
  th: { paddingVertical: 6, paddingHorizontal: 5, fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#4a4237", letterSpacing: 0.3 },
  td: { paddingVertical: 6, paddingHorizontal: 5, fontSize: 8, lineHeight: 1.3 },
  colSr: { width: "8%", textAlign: "center" },
  colBrand: { width: "20%", textAlign: "left" },
  colDetail: { width: "40%", textAlign: "left" },
  colSize: { width: "16%", textAlign: "left" },
  colBoxes: { width: "16%", textAlign: "right" },
  signatureRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 40 },
  signatureLine: { fontSize: 7, fontFamily: "Helvetica-Bold", borderTopWidth: 1, borderTopColor: "#2b241d", paddingTop: 3, width: 180, textAlign: "center" },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e8e1d4", paddingTop: 6, fontSize: 7, color: "#79705f" },
});

export interface ChalanItem {
  description: string;
  brand: string | null;
  size: string | null;
  boxes: number;
}

export function ChalanPdfDocument({
  companyName,
  companyAddress,
  chalanNumber,
  dispatchNumber,
  orderNumber,
  dispatchedAt,
  customerName,
  customerAddress,
  vehicle,
  driver,
  route,
  items,
}: {
  companyName: string;
  companyAddress: string;
  chalanNumber: string;
  dispatchNumber: string;
  orderNumber: string;
  dispatchedAt: string;
  customerName: string;
  customerAddress: string | null;
  vehicle: string | null;
  driver: string | null;
  route: string;
  items: ChalanItem[];
}) {
  const totalBoxes = items.reduce((sum, i) => sum + i.boxes, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.tagline}>{companyAddress}</Text>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>DELIVERY CHALAN</Text>
            <Text style={styles.subtitle}>{chalanNumber}</Text>
          </View>
        </View>
        <View style={styles.rule} />

        <View style={styles.fieldGrid}>
          <View style={styles.fieldRow}>
            <View style={styles.fieldCell}>
              <Text style={styles.fieldLabel}>CUSTOMER</Text>
              <Text style={styles.fieldValue}>{customerName || "—"}</Text>
            </View>
            <View style={styles.fieldCell}>
              <Text style={styles.fieldLabel}>DELIVERY ADDRESS</Text>
              <Text style={styles.fieldValue}>{customerAddress || "—"}</Text>
            </View>
            <View style={[styles.fieldCell, { borderRightWidth: 0 }]}>
              <Text style={styles.fieldLabel}>DATE</Text>
              <Text style={styles.fieldValue}>{formatDate(dispatchedAt)}</Text>
            </View>
          </View>
          <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
            <View style={styles.fieldCell}>
              <Text style={styles.fieldLabel}>ORDER NO.</Text>
              <Text style={styles.fieldValue}>{orderNumber}</Text>
            </View>
            <View style={styles.fieldCell}>
              <Text style={styles.fieldLabel}>DISPATCH NO.</Text>
              <Text style={styles.fieldValue}>{dispatchNumber}</Text>
            </View>
            <View style={[styles.fieldCell, { borderRightWidth: 0 }]}>
              <Text style={styles.fieldLabel}>ROUTE</Text>
              <Text style={styles.fieldValue}>{route}</Text>
            </View>
          </View>
          <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
            <View style={styles.fieldCell}>
              <Text style={styles.fieldLabel}>VEHICLE</Text>
              <Text style={styles.fieldValue}>{vehicle || "—"}</Text>
            </View>
            <View style={[styles.fieldCell, { borderRightWidth: 0 }]}>
              <Text style={styles.fieldLabel}>DRIVER</Text>
              <Text style={styles.fieldValue}>{driver || "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colSr]}>SR.</Text>
            <Text style={[styles.th, styles.colBrand]}>BRAND</Text>
            <Text style={[styles.th, styles.colDetail]}>PRODUCT</Text>
            <Text style={[styles.th, styles.colSize]}>SIZE</Text>
            <Text style={[styles.th, styles.colBoxes]}>BOXES</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.td, styles.colSr]}>{i + 1}</Text>
              <Text style={[styles.td, styles.colBrand]}>{item.brand || "—"}</Text>
              <Text style={[styles.td, styles.colDetail]}>{item.description}</Text>
              <Text style={[styles.td, styles.colSize]}>{item.size || "—"}</Text>
              <Text style={[styles.td, styles.colBoxes]}>{item.boxes}</Text>
            </View>
          ))}
          <View style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: "#d8cfc0" }]}>
            <Text style={[styles.td, { width: "84%", textAlign: "right", fontFamily: "Helvetica-Bold" }]}>TOTAL</Text>
            <Text style={[styles.td, styles.colBoxes, { fontFamily: "Helvetica-Bold" }]}>{totalBoxes}</Text>
          </View>
        </View>

        <View style={styles.signatureRow}>
          <Text style={styles.signatureLine}>DISPATCHED BY</Text>
          <Text style={styles.signatureLine}>RECEIVED BY (CUSTOMER)</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>{companyName}</Text>
          <Text>{companyAddress}</Text>
        </View>
      </Page>
    </Document>
  );
}
