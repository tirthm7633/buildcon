import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatDate } from "@/lib/format";

/** The standard PDF fonts (Helvetica) have no glyph for ₹, so react-pdf
 * renders it as a stray superscript character. "Rs." is plain ASCII and
 * common on printed Indian business documents for exactly this reason. */
function formatPdfINR(value: number) {
  return `Rs. ${new Intl.NumberFormat("en-IN").format(value)}`;
}
import type { CompanySettings, Quotation } from "@/lib/supabase/types";
import type { SelectionItemRow } from "@/components/quotations/selection-items-panel";
import { BRAND_PARTNERS, FALLBACK_TERMS } from "@/lib/quotation-content";

const styles = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 48, paddingHorizontal: 32, fontSize: 9, color: "#2b241d", fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  logo: { width: 120, height: 28, objectFit: "contain" },
  tagline: { fontSize: 8, fontStyle: "italic", color: "#79705f", marginTop: 2 },
  titleBlock: { alignItems: "flex-end" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 9, color: "#79705f" },
  rule: { borderBottomWidth: 1, borderBottomColor: "#8a6a3b", marginBottom: 10 },
  fieldGrid: { borderWidth: 1, borderColor: "#e8e1d4", marginBottom: 10 },
  fieldRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e8e1d4" },
  fieldCell: { flex: 1, padding: 6, borderRightWidth: 1, borderRightColor: "#e8e1d4" },
  fieldLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#79705f", marginBottom: 2 },
  fieldValue: { fontSize: 9 },
  intro: { marginBottom: 10, lineHeight: 1.4 },
  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  brandGrid: { flexDirection: "row", flexWrap: "wrap", borderWidth: 1, borderColor: "#e8e1d4", marginBottom: 12 },
  brandCell: {
    width: "16.666%",
    padding: 6,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e8e1d4",
    alignItems: "center",
  },
  brandName: { fontSize: 8, fontFamily: "Helvetica-Bold", textAlign: "center" },
  brandTagline: { fontSize: 6, fontStyle: "italic", color: "#79705f", textAlign: "center", marginTop: 2 },
  termsList: { marginBottom: 8 },
  termLine: { fontSize: 8, marginBottom: 2, lineHeight: 1.3 },
  enquiries: { fontSize: 8, marginBottom: 10 },
  signatureBox: { borderWidth: 1, borderColor: "#e8e1d4", padding: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  signatureText: { fontSize: 8, maxWidth: 320 },
  signatureLine: { fontSize: 7, fontFamily: "Helvetica-Bold", borderTopWidth: 1, borderTopColor: "#2b241d", paddingTop: 3, width: 200, textAlign: "center" },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e8e1d4", paddingTop: 6, fontSize: 7, color: "#79705f" },
  table: { borderWidth: 1, borderColor: "#e8e1d4" },
  tableHeaderRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#f1ece3", borderBottomWidth: 1, borderBottomColor: "#d8cfc0" },
  tableRow: { flexDirection: "row", alignItems: "center", borderTopWidth: 0.5, borderTopColor: "#e3dccd" },
  th: { paddingVertical: 6, paddingHorizontal: 5, fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#4a4237", letterSpacing: 0.3 },
  td: { paddingVertical: 6, paddingHorizontal: 5, fontSize: 8, lineHeight: 1.3 },
  colSr: { width: "6%", textAlign: "center" },
  colImg: { width: "14%", alignItems: "center", justifyContent: "center", textAlign: "center" },
  colArea: { width: "16%", textAlign: "left" },
  colDetail: { width: "38%", textAlign: "left" },
  colSize: { width: "13%", textAlign: "right" },
  colRate: { width: "13%", textAlign: "right" },
  productImage: { width: 28, height: 28, objectFit: "cover", borderRadius: 2 },
});

function PdfLogo({ logoUrl, companyName }: { logoUrl: string | null; companyName: string }) {
  if (!logoUrl) return <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold" }}>{companyName}</Text>;
  // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image is a PDF primitive, not an HTML img
  return <Image src={logoUrl} style={styles.logo} />;
}

function DocumentFooter({ companyName, address, page }: { companyName: string; address: string; page: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>
        {companyName}
        {"\n"}
        {address}
      </Text>
      <Text>{page}</Text>
      <Text>One Destination. Infinite Possibilities.</Text>
    </View>
  );
}

export function SelectionPdfDocument({
  quotation,
  items,
  company,
  attendedByName,
  preparedByName,
}: {
  quotation: Quotation;
  items: SelectionItemRow[];
  company: CompanySettings | null;
  attendedByName: string | null;
  preparedByName: string | null;
}) {
  const companyName = company?.company_name || "Buildcon House";
  const address = company?.address || "Nr. Gujarat Housing Board, Kataria Motors, 2nd 150ft Ring Road, Rajkot-360005";
  const phone = company?.phone || "+91 99099 06652";
  const email = company?.email || "buildconhouse10@gmail.com";
  const termsLines = company?.quotation_terms ? company.quotation_terms.split("\n").filter(Boolean) : FALLBACK_TERMS;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <PdfLogo logoUrl={company?.logo_url ?? null} companyName={companyName} />
            <Text style={styles.tagline}>Let You Live Better</Text>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>PRODUCT SELECTION</Text>
            <Text style={styles.subtitle}>Tiles & Sanitaryware Solutions</Text>
          </View>
        </View>
        <View style={styles.rule} />

        <View style={styles.fieldGrid}>
          <View style={styles.fieldRow}>
            <View style={styles.fieldCell}>
              <Text style={styles.fieldLabel}>CUSTOMER NAME</Text>
              <Text style={styles.fieldValue}>{quotation.customer_name}</Text>
            </View>
            <View style={styles.fieldCell}>
              <Text style={styles.fieldLabel}>CONTACT NO.</Text>
              <Text style={styles.fieldValue}>{quotation.customer_phone}</Text>
            </View>
            <View style={styles.fieldCell}>
              <Text style={styles.fieldLabel}>SELECTION / QUOTATION DATE</Text>
              <Text style={styles.fieldValue}>{formatDate(quotation.issue_date)}</Text>
            </View>
            <View style={[styles.fieldCell, { borderRightWidth: 0 }]}>
              <Text style={styles.fieldLabel}>QUOTATION NO.</Text>
              <Text style={styles.fieldValue}>{quotation.quotation_number}</Text>
            </View>
          </View>
          <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
            <View style={styles.fieldCell}>
              <Text style={styles.fieldLabel}>REFERENCE</Text>
              <Text style={styles.fieldValue}>{quotation.reference || "—"}</Text>
            </View>
            <View style={styles.fieldCell}>
              <Text style={styles.fieldLabel}>ATTENDED BY</Text>
              <Text style={styles.fieldValue}>{attendedByName || "—"}</Text>
            </View>
            <View style={styles.fieldCell}>
              <Text style={styles.fieldLabel}>PREPARED BY</Text>
              <Text style={styles.fieldValue}>{preparedByName || "—"}</Text>
            </View>
            <View style={[styles.fieldCell, { borderRightWidth: 0 }]}>
              <Text style={styles.fieldLabel}>ADDRESS</Text>
              <Text style={styles.fieldValue}>{quotation.customer_address || "—"}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.intro}>
          Dear Sir/Madam, thank you for your interest in our products. Please find below the products shortlisted as
          per your selection, for your review and confirmation.
        </Text>

        <Text style={styles.sectionTitle}>OUR BRAND PARTNERS</Text>
        <View style={styles.brandGrid}>
          {BRAND_PARTNERS.map((b, i) => (
            <View key={b.name} style={[styles.brandCell, (i + 1) % 6 === 0 ? { borderRightWidth: 0 } : {}]}>
              <Text style={styles.brandName}>{b.name}</Text>
              <Text style={styles.brandTagline}>{b.tagline}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>TERMS & CONDITIONS</Text>
        <View style={styles.termsList}>
          {termsLines.map((line, i) => (
            <Text key={i} style={styles.termLine}>
              {line}
            </Text>
          ))}
        </View>
        <Text style={styles.enquiries}>
          For general enquiries: M: {phone} | Email: {email}
        </Text>

        <View style={styles.signatureBox}>
          <Text style={styles.signatureText}>
            I/We have reviewed and agree to the terms and conditions mentioned in this quotation.
          </Text>
          <Text style={styles.signatureLine}>CUSTOMER SIGNATURE & DATE</Text>
        </View>

        <DocumentFooter companyName={companyName} address={address} page="Page 1" />
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <PdfLogo logoUrl={company?.logo_url ?? null} companyName={companyName} />
            <Text style={styles.tagline}>Let You Live Better</Text>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>PRODUCT DETAILS</Text>
            <Text style={styles.subtitle}>Items 1–{items.length}</Text>
          </View>
        </View>
        <View style={styles.rule} />

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colSr]}>SR. NO.</Text>
            <Text style={[styles.th, styles.colImg]}>PRODUCT IMAGE</Text>
            <Text style={[styles.th, styles.colArea]}>AREA</Text>
            <Text style={[styles.th, styles.colDetail]}>PRODUCT DETAIL</Text>
            <Text style={[styles.th, styles.colSize]}>SIZE</Text>
            <Text style={[styles.th, styles.colRate]}>RATE/SQ.FT</Text>
          </View>
          {items.map((item, i) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.td, styles.colSr]}>{i + 1}</Text>
              <View style={[styles.td, styles.colImg]}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image is a PDF primitive, not an HTML img */}
                {item.imageUrl ? <Image src={item.imageUrl} style={styles.productImage} /> : null}
              </View>
              <Text style={[styles.td, styles.colArea]}>{item.section || "—"}</Text>
              <Text style={[styles.td, styles.colDetail]}>{item.description}</Text>
              <Text style={[styles.td, styles.colSize]}>{item.size || "—"}</Text>
              <Text style={[styles.td, styles.colRate]}>{formatPdfINR(item.rate)}</Text>
            </View>
          ))}
          {items.length === 0 ? <Text style={{ padding: 10, fontSize: 8, color: "#79705f" }}>No products added yet.</Text> : null}
        </View>

        <DocumentFooter companyName={companyName} address={address} page="Page 2" />
      </Page>
    </Document>
  );
}
