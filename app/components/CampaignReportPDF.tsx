import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30, backgroundColor: '#ffffff' },
  title: { fontSize: 24, marginBottom: 20, color: '#1e40af' },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 16, marginBottom: 10, fontWeight: 'bold', color: '#374151' },
  text: { fontSize: 10, marginBottom: 5, color: '#4b5563', lineHeight: 1.5 },
  postCard: { marginBottom: 15, padding: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8 },
  postTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 5, color: '#1f2937' },
  metadata: { fontSize: 8, color: '#6b7280', marginBottom: 5 },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 15 }
});

interface CampaignReportPDFProps {
  campaign: any;
  posts: any[];
  stats: any;
}

export const CampaignReportPDF = ({ campaign, posts, stats }: CampaignReportPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Rapport de campagne</Text>
      <Text style={styles.text}>Généré le {new Date().toLocaleDateString()}</Text>
      
      <View style={styles.divider} />
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Résumé</Text>
        <Text style={styles.text}>Posts générés : {stats.totalPosts}</Text>
        <Text style={styles.text}>Images créées : {stats.totalImages}</Text>
        <Text style={styles.text}>Vidéos générées : {stats.totalVideos}</Text>
        <Text style={styles.text}>Posts programmés : {stats.scheduled}</Text>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Posts générés</Text>
        {posts.map((post, idx) => (
          <View key={idx} style={styles.postCard}>
            <Text style={styles.postTitle}>Jour {post.day}: {post.title}</Text>
            <Text style={styles.metadata}>Type: {post.content_type}</Text>
            <Text style={styles.text}>{post.hook}</Text>
            <Text style={styles.text}>🎯 {post.cta}</Text>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);
