
const { sql } = require('drizzle-orm');
const { db } = require('../server/db');

async function cleanupOldTables() {
  try {
    console.log('🧹 Iniciando limpeza das tabelas antigas...');
    
    // Verificar se a tabela service_extras existe
    const serviceExtrasExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'service_extras'
      )
    `);
    
    if (serviceExtrasExists.rows[0]?.exists) {
      console.log('📋 Tabela service_extras encontrada. Removendo...');
      
      // Remover a tabela service_extras
      await db.execute(sql`DROP TABLE IF EXISTS service_extras CASCADE`);
      console.log('✅ Tabela service_extras removida com sucesso');
    } else {
      console.log('ℹ️  Tabela service_extras já foi removida anteriormente');
    }
    
    // Verificar outras tabelas legadas
    const tablesToCheck = [
      'service_addons',
      'extra_services', 
      'service_components'
    ];
    
    for (const tableName of tablesToCheck) {
      const tableExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = ${tableName}
        )
      `);
      
      if (tableExists.rows[0]?.exists) {
        console.log(`📋 Tabela legada ${tableName} encontrada. Removendo...`);
        await db.execute(sql`DROP TABLE IF EXISTS ${sql.identifier(tableName)} CASCADE`);
        console.log(`✅ Tabela ${tableName} removida com sucesso`);
      }
    }
    
    // Verificar integridade da estrutura atual
    console.log('🔍 Verificando integridade da estrutura atual...');
    
    const serviceItemsExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'service_items'
      )
    `);
    
    if (!serviceItemsExists.rows[0]?.exists) {
      throw new Error('❌ ERRO: Tabela service_items não encontrada! A migração pode não ter sido concluída.');
    }
    
    // Verificar se há dados em service_items
    const serviceItemsCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM service_items
    `);
    
    console.log(`📊 Total de service_items na base: ${serviceItemsCount.rows[0]?.count || 0}`);
    
    // Verificar se há serviços órfãos (sem service_items)
    const orphanServices = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM services s 
      LEFT JOIN service_items si ON s.id = si.service_id 
      WHERE si.service_id IS NULL
    `);
    
    const orphanCount = orphanServices.rows[0]?.count || 0;
    if (orphanCount > 0) {
      console.log(`⚠️  Atenção: ${orphanCount} serviços sem service_items encontrados`);
      console.log('   Isso pode indicar dados que precisam de migração manual');
    } else {
      console.log('✅ Todos os serviços têm service_items associados');
    }
    
    console.log('🎉 Limpeza concluída com sucesso!');
    console.log('');
    console.log('📋 Resumo da arquitetura atual:');
    console.log('   - service_types: Tipos de serviços disponíveis');
    console.log('   - services: Ordens de serviço principais'); 
    console.log('   - service_items: Itens/tipos por ordem de serviço');
    console.log('   - Tabelas legadas removidas: service_extras');
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  cleanupOldTables()
    .then(() => {
      console.log('✅ Script de limpeza executado com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Falha na execução do script:', error);
      process.exit(1);
    });
}

module.exports = { cleanupOldTables };
