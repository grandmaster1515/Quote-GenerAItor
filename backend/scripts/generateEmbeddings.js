const RAGService = require('../services/ragService');
const { query } = require('../config/database');

async function generateEmbeddings() {
  console.log('🔄 Starting embedding generation...');
  
  try {
    const ragService = new RAGService();
    await ragService.initialize();
    
    // Get all business context without embeddings
    const result = await query(`
      SELECT id, business_id, question, answer, content_type, keywords
      FROM business_context
      WHERE embedding IS NULL
      ORDER BY business_id, created_at
    `);
    
    console.log(`📊 Found ${result.rows.length} records without embeddings`);
    
    for (const row of result.rows) {
      try {
        console.log(`🔄 Processing: ${row.question || row.answer.substring(0, 50)}...`);
        
        // Generate embedding for the answer
        const embedding = await ragService.generateEmbeddings([row.answer]);
        
        // Update the record with the embedding
        await query(`
          UPDATE business_context
          SET embedding = $1, updated_at = NOW()
          WHERE id = $2
        `, [`[${embedding[0].join(',')}]`, row.id]);
        
        console.log(`✅ Updated embedding for record ${row.id}`);
        
        // Small delay to avoid overwhelming the embedding service
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error processing record ${row.id}:`, error.message);
      }
    }
    
    console.log('✅ Embedding generation completed');
    
  } catch (error) {
    console.error('❌ Embedding generation failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  generateEmbeddings();
}

module.exports = { generateEmbeddings };
