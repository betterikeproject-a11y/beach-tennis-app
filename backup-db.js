/* eslint-disable @typescript-eslint/no-require-imports */
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
        // Skip comments and empty lines
        if (line.trim().startsWith('#') || !line.trim()) return;
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          // Strip quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.substring(1, value.length - 1);
          }
          process.env[key] = value;
        }
      });
      return; // Loaded successfully
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não definidos no ambiente ou em .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TABLES = [
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

async function backup() {
  console.log('Iniciando backup do banco de dados...');
  const backupData = {};

  for (const table of TABLES) {
    console.log(`Buscando dados da tabela "${table}"...`);
    const { data, error } = await supabase.from(table).select('*');
    
    if (error) {
      console.error(`Erro ao buscar dados da tabela ${table}:`, error.message);
      console.error('Backup abortado para evitar dados incompletos.');
      process.exit(1);
    }
    
    backupData[table] = data || [];
    console.log(`Obtidas ${backupData[table].length} linhas da tabela "${table}".`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, 'backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  const backupPath = path.join(backupDir, `db_backup_${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
  
  console.log('\n=========================================');
  console.log('Backup concluído com sucesso!');
  console.log(`Arquivo salvo em: ${backupPath}`);
  console.log('=========================================');
}

backup();
