const mysql = require('mysql2/promise');

let pool;

async function initDatabase() {
  pool = mysql.createPool({
    host: process.env.MYSQLHOST,
    port: Number(process.env.MYSQLPORT || 3306),
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS discord_tickets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      ticket_number BIGINT UNSIGNED NOT NULL,
      guild_id VARCHAR(32) NOT NULL,
      channel_id VARCHAR(32) NOT NULL,
      user_id VARCHAR(32) NOT NULL,
      username VARCHAR(100) NOT NULL,
      category_key VARCHAR(64) NOT NULL,
      category_name VARCHAR(100) NOT NULL,
      status ENUM('open','closed') NOT NULL DEFAULT 'open',
      opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME NULL,
      closed_by VARCHAR(32) NULL,
      transcript LONGTEXT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_guild_ticket (guild_id, ticket_number),
      KEY idx_channel_id (channel_id),
      KEY idx_user_status (user_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS discord_bot_messages (
      message_key VARCHAR(64) NOT NULL,
      channel_id VARCHAR(32) NOT NULL,
      message_id VARCHAR(32) NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (message_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('[DB] MySQL connected and tables are ready.');
}

function db() {
  if (!pool) throw new Error('Database is not initialized.');
  return pool;
}

async function nextTicketNumber(guildId) {
  const [rows] = await db().query(
    'SELECT COALESCE(MAX(ticket_number), 0) + 1 AS nextNumber FROM discord_tickets WHERE guild_id = ?',
    [guildId]
  );
  return Number(rows[0].nextNumber);
}

async function createTicket({ ticketNumber, guildId, channelId, userId, username, categoryKey, categoryName }) {
  await db().query(
    `INSERT INTO discord_tickets
      (ticket_number, guild_id, channel_id, user_id, username, category_key, category_name)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [ticketNumber, guildId, channelId, userId, username, categoryKey, categoryName]
  );
}

async function closeTicket(channelId, closedBy, transcript) {
  await db().query(
    `UPDATE discord_tickets
     SET status='closed', closed_at=NOW(), closed_by=?, transcript=?
     WHERE channel_id=? AND status='open'`,
    [closedBy, transcript, channelId]
  );
}

async function getOpenTicketByChannel(channelId) {
  const [rows] = await db().query(
    `SELECT * FROM discord_tickets WHERE channel_id=? AND status='open' LIMIT 1`,
    [channelId]
  );
  return rows[0] || null;
}

async function getOpenTicketForUser(guildId, userId) {
  const [rows] = await db().query(
    `SELECT * FROM discord_tickets WHERE guild_id=? AND user_id=? AND status='open' LIMIT 1`,
    [guildId, userId]
  );
  return rows[0] || null;
}

async function saveBotMessage(key, channelId, messageId) {
  await db().query(
    `INSERT INTO discord_bot_messages (message_key, channel_id, message_id)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE channel_id=VALUES(channel_id), message_id=VALUES(message_id)`,
    [key, channelId, messageId]
  );
}

async function getBotMessage(key) {
  const [rows] = await db().query(
    'SELECT * FROM discord_bot_messages WHERE message_key=? LIMIT 1',
    [key]
  );
  return rows[0] || null;
}

module.exports = {
  initDatabase,
  nextTicketNumber,
  createTicket,
  closeTicket,
  getOpenTicketByChannel,
  getOpenTicketForUser,
  saveBotMessage,
  getBotMessage
};
