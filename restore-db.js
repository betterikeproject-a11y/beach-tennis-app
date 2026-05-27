const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env variables manually from .env.local or .env
function loadEnv() {
  const envPaths = ['.env.local', '.env'];
  for (const envFile of envPaths) {
    const fullPath = path.join(__dirname, envFile);
    if (fs.existsSync(fullPath)) {
      console.log(`Carregando variáveis de ambiente de ${envFile}...`);
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        if (line.trim().startsWith('#') || !line.trim()) return;
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.substring(1, value.length - 1);
          }
          process.env[key] = value;
        }
      });
      return;
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não definidos.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const backupFile = process.argv[2];
if (!backupFile) {
  console.error('Erro: Por favor, especifique o caminho para o arquivo de backup.');
  console.error('Uso: node restore-db.js <caminho-do-backup.json>');
  process.exit(1);
}

const backupPath = path.resolve(backupFile);
if (!fs.existsSync(backupPath)) {
  console.error(`Erro: Arquivo de backup não encontrado em: ${backupPath}`);
  process.exit(1);
}

const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

// Delete in reverse order of foreign key dependencies
const DELETE_ORDER = [
  'tournament_player_points',
  'knockout_matches',
  'knockout_pairs',
  'group_matches',
  'group_members',
  'groups',
  'players',
  'tournaments',
  'league_ranking_points_config'
];

// Insert in forward order of foreign key dependencies
const INSERT_ORDER = [
  'league_ranking_points_config',
  'tournaments',
  'players',
  'groups',
  'group_members',
  'group_matches',
  'knockout_pairs',
  'knockout_matches',
  'tournament_player_points'
];

async function restore() {
  console.log(`Iniciando restauração a partir do arquivo: ${backupPath}\n`);

  // 1. Clear existing data
  console.log('--- LIMPANDO BANCO DE DADOS ATUAL ---');
  for (const table of DELETE_ORDER) {
    console.log(`Deletando todos os registros da tabela "${table}"...`);
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
    
    // Note: For config table that might have a primary key check or different structure, we delete all rows
    if (error && table !== 'league_ranking_points_config') {
      console.error(`Erro ao limpar tabela ${table}:`, error.message);
      process.exit(1);
    } else if (table === 'league_ranking_points_config') {
      // Try fallback delete for config since it might not have 'id' column after migration
      await supabase.from(table).delete().neq('ranking_id', '00000000-0000-0000-0000-000000000000');
    }
  }

  console.log('\n--- RESTAURANDO DADOS DO BACKUP ---');
  for (const table of INSERT_ORDER) {
    const rows = backupData[table];
    if (!rows || rows.length === 0) {
      console.log(`Tabela "${table}" está vazia no backup. Pulando.`);
      continue;
    }

    console.log(`Inserindo ${rows.length} registros na tabela "${table}"...`);
    
    // Split into chunks of 100 rows to prevent payload issues
    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from(table).insert(chunk);
      if (error) {
        console.error(`Erro ao inserir dados na tabela ${table}:`, error.message);
        console.error('Restauração falhou. Recomenda-se rodar novamente ou restaurar manualmente.');
        process.exit(1);
      }
    }
  }

  console.log('\n=========================================');
  console.log('Restauração concluída com sucesso!');
  console.log('=========================================');
}

restore();
