require('dotenv').config?.();

const axios = require('axios');
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  REST,
  Routes,
  SlashCommandBuilder,
  AttachmentBuilder
} = require('discord.js');

const config = require('./config');
const {
  initDatabase,
  nextTicketNumber,
  createTicket,
  closeTicket,
  getOpenTicketByChannel,
  getOpenTicketForUser,
  saveBotMessage,
  getBotMessage
} = require('./db');

const requiredEnv = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID', 'MYSQLHOST', 'MYSQLUSER', 'MYSQLPASSWORD', 'MYSQLDATABASE'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`[CONFIG] Missing environment variable: ${key}`);
    process.exit(1);
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

const commands = [
  new SlashCommandBuilder()
    .setName('notify')
    .setDescription('Pošalji KT Team obavijest u trenutni kanal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('pravila')
    .setDescription('Kreiraj ili uredi embed s pravilima servera')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Postavi/ažuriraj sve stalne KT Team bot poruke')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(c => c.toJSON());

function baseEmbed() {
  return new EmbedBuilder()
    .setColor(config.brand.color)
    .setFooter({ text: config.brand.name })
    .setTimestamp();
}

function welcomeEmbed(member) {
  const e = baseEmbed()
    .setTitle('👋 DOBRODOŠAO/LA!')
    .setDescription(
      `Dobrodošao/la na **KT Team**, ${member}.\n` +
      `Obavezno pročitaj pravila i uživaj na serveru!`
    )
    .setThumbnail(member.guild.iconURL({ size: 256 }) || null);
  return e;
}

function ticketPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x20D620)
    .setTitle('🎫 KT Team • Ticket Centar')
    .setDescription(
      'Dobrodošli u KT Team sustav podrške.\n' +
      'Odaberite kategoriju koja najbolje odgovara vašem zahtjevu.\n\n' +
      '**📋 Kategorije**\n' +
      '🎫 **Opća podrška** — Pomoć i opći problemi na serveru\n' +
      '🐛 **Prijava buga** — Prijava bugova i tehničkih problema\n' +
      '👮 **Prijava igrača** — Prijava igrača zbog kršenja pravila\n' +
      '🛡️ **Prijava staffa** — Prijava člana administracije\n' +
      '💼 **Poslovi / Frakcije** — Problemi vezani za poslove i frakcije\n' +
      '🚗 **Vozila** — Vozila, garaže, impound i ključevi\n' +
      '🏠 **Nekretnine** — Kuće, stanovi i nekretnine\n' +
      '💳 **Donacije / Shop** — Pitanja vezana za kupovine i pakete\n' +
      '🔨 **Ban Appeal** — Žalba na ban ili drugu kaznu\n' +
      '🤝 **Partnerstvo** — Upiti vezani za partnerstva\n' +
      '❓ **Ostalo** — Ostali upiti\n\n' +
      '**Odaberite kategoriju iz izbornika ispod kako biste otvorili ticket.**'
    );

  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_category')
    .setPlaceholder('🎫 Odaberi kategoriju za otvaranje ticketa...')
    .addOptions(Object.entries(config.ticketCategories).map(([value, item]) => ({
      label: item.label,
      value,
      description: item.description.slice(0, 100),
      emoji: item.emoji
    })));

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] };
}

function invitePanel() {
  const embed = baseEmbed()
    .setTitle('🔗 KT Team Discord Invite')
    .setDescription('Pozovi prijatelje i pridruži ih KT Team zajednici.\n\nKlikni na gumb ispod za Discord invite.');

  const button = new ButtonBuilder()
    .setLabel('Pozovi na KT Team')
    .setStyle(ButtonStyle.Link)
    .setURL(config.inviteUrl)
    .setEmoji('🔗');

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] };
}

function whitelistPanel() {
  const embed = baseEmbed()
    .setTitle('✅ FiveM Whitelist')
    .setDescription(
      'Klikni na **Dobij whitelist** kako bi automatski dobio whitelist rolu za KT Team FiveM server.\n\n' +
      'Klikom potvrđuješ da ćeš poštovati pravila servera.'
    );

  const button = new ButtonBuilder()
    .setCustomId('get_whitelist')
    .setLabel('Dobij whitelist')
    .setStyle(ButtonStyle.Success)
    .setEmoji('✅');

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] };
}

function roleplayPanel() {
  return {
    embeds: [
      baseEmbed()
        .setTitle('🎭 Što je Roleplay?')
        .setDescription(
          '**Roleplay (RP)** znači igranje uloge lika u virtualnom svijetu na što realističniji i dosljedniji način.\n\n' +
          'Tvoj lik ima svoj identitet, priču, posao, odnose i posljedice svojih odluka. Ono što znaš ti kao igrač nije nužno ono što zna tvoj lik.\n\n' +
          '**Osnovni principi:**\n' +
          '• Ostani u karakteru tijekom RP situacija.\n' +
          '• Cijeni život svog lika i ponašaj se realistično.\n' +
          '• Ne koristi informacije dobivene izvan igre u RP-u.\n' +
          '• Ne forsiraj nerealne radnje drugim igračima.\n' +
          '• Daj drugim igračima priliku za kvalitetnu RP interakciju.\n' +
          '• Poštuj pravila i odluke administracije.\n\n' +
          'Cilj nije samo pobijediti situaciju, nego zajedno stvoriti dobru i uvjerljivu priču.'
        )
    ]
  };
}

function defaultRulesPanel() {
  return {
    embeds: [
      baseEmbed()
        .setTitle('📜 KT Team Pravila')
        .setDescription(
          '**Dobrodošli na KT Team.**\n\n' +
          'Ovdje će biti službena pravila servera.\n\n' +
          'Administrator može koristiti `/pravila` kako bi uredio naslov i kompletan sadržaj ovog embeda.'
        )
    ]
  };
}

async function upsertPanel(key, channelId, payload) {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) throw new Error(`Channel ${channelId} is unavailable.`);

  const saved = await getBotMessage(key);
  if (saved && saved.channel_id === channelId) {
    const old = await channel.messages.fetch(saved.message_id).catch(() => null);
    if (old) {
      await old.edit(payload);
      return old;
    }
  }

  const message = await channel.send(payload);
  await saveBotMessage(key, channelId, message.id);
  return message;
}

async function setupPermanentPanels() {
  await upsertPanel('ticket_panel', config.channels.ticketCenter, ticketPanel());
  await upsertPanel('invite_panel', config.channels.invite, invitePanel());
  await upsertPanel('whitelist_panel', config.channels.whitelist, whitelistPanel());
  await upsertPanel('roleplay_panel', config.channels.roleplay, roleplayPanel());

  const existingRules = await getBotMessage('rules_panel');
  if (!existingRules) {
    await upsertPanel('rules_panel', config.channels.rules, defaultRulesPanel());
  }
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );
  console.log('[DISCORD] Slash commands registered.');
}

async function createTicketChannel(interaction, categoryKey) {
  const guild = interaction.guild;
  const category = config.ticketCategories[categoryKey];
  if (!category) return interaction.reply({ content: 'Nepoznata ticket kategorija.', ephemeral: true });

  const existing = await getOpenTicketForUser(guild.id, interaction.user.id);
  if (existing) {
    return interaction.reply({
      content: `Već imaš otvoren ticket: <#${existing.channel_id}>`,
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const number = await nextTicketNumber(guild.id);
  const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20) || 'user';
  const channel = await guild.channels.create({
    name: `ticket-${String(number).padStart(4, '0')}-${safeName}`,
    type: ChannelType.GuildText,
    parent: config.channels.openTicketCategory,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks
        ]
      }
    ]
  });

  await createTicket({
    ticketNumber: number,
    guildId: guild.id,
    channelId: channel.id,
    userId: interaction.user.id,
    username: interaction.user.tag,
    categoryKey,
    categoryName: category.label
  });

  const embed = baseEmbed()
    .setTitle(`${category.emoji} Ticket #${String(number).padStart(4, '0')} • ${category.label}`)
    .setDescription(
      `${interaction.user}, tvoj ticket je otvoren.\n\n` +
      `Opiši problem što detaljnije. Član support tima će odgovoriti čim bude dostupan.`
    )
    .addFields(
      { name: 'Kategorija', value: category.label, inline: true },
      { name: 'Korisnik', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true }
    );

  const close = new ButtonBuilder()
    .setCustomId('close_ticket')
    .setLabel('Zatvori ticket')
    .setEmoji('🔒')
    .setStyle(ButtonStyle.Danger);

  await channel.send({
    content: `<@${interaction.user.id}>`,
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(close)]
  });

  await interaction.editReply(`Ticket je otvoren: ${channel}`);
}

async function buildTranscript(channel) {
  const all = [];
  let before;

  while (true) {
    const batch = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
    if (!batch || batch.size === 0) break;
    all.push(...batch.values());
    before = batch.last().id;
    if (batch.size < 100) break;
  }

  all.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  return all.map(m => {
    const when = new Date(m.createdTimestamp).toISOString();
    const attachments = [...m.attachments.values()].map(a => a.url);
    const body = m.content || (m.embeds.length ? '[EMBED]' : '');
    const suffix = attachments.length ? ` | Attachments: ${attachments.join(', ')}` : '';
    return `[${when}] ${m.author?.tag || 'Unknown'} (${m.author?.id || 'unknown'}): ${body}${suffix}`;
  }).join('\n');
}

async function closeTicketChannel(interaction) {
  const record = await getOpenTicketByChannel(interaction.channel.id);
  if (!record) {
    return interaction.reply({ content: 'Ovaj kanal nije aktivan ticket.', ephemeral: true });
  }

  const isOwner = interaction.user.id === record.user_id;
  const canManage = interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels);
  if (!isOwner && !canManage) {
    return interaction.reply({ content: 'Nemaš dozvolu zatvoriti ovaj ticket.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const transcript = await buildTranscript(interaction.channel);
  await closeTicket(interaction.channel.id, interaction.user.id, transcript);

  const logChannel = await client.channels.fetch(config.channels.closedTicketLog).catch(() => null);
  if (logChannel?.isTextBased()) {
    const filename = `ticket-${String(record.ticket_number).padStart(4, '0')}.txt`;
    const attachment = new AttachmentBuilder(Buffer.from(transcript || 'No messages.', 'utf8'), { name: filename });

    const logEmbed = baseEmbed()
      .setTitle(`🔒 Zatvoren ticket #${String(record.ticket_number).padStart(4, '0')}`)
      .addFields(
        { name: 'Korisnik', value: `<@${record.user_id}> (\`${record.user_id}\`)`, inline: false },
        { name: 'Kategorija', value: record.category_name, inline: true },
        { name: 'Zatvorio', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Ticket kanal', value: `${interaction.channel}`, inline: false }
      );

    await logChannel.send({ embeds: [logEmbed], files: [attachment] });
  }

  // Kanal ostaje sačuvan. Vlasnik ticketa ga vidi, ali ne može pisati dok ga ne otvori ponovno.
  await interaction.channel.permissionOverwrites.edit(record.user_id, {
    ViewChannel: true,
    SendMessages: false,
    ReadMessageHistory: true,
    AttachFiles: false
  });

  const reopen = new ButtonBuilder()
    .setCustomId(`reopen_ticket:${record.ticket_number}`)
    .setLabel('Ponovno otvori ticket')
    .setEmoji('🔓')
    .setStyle(ButtonStyle.Success);

  await interaction.channel.send({
    embeds: [
      baseEmbed()
        .setTitle('🔒 Ticket je zatvoren')
        .setDescription(
          `<@${record.user_id}>, ovaj ticket je zatvoren i transcript je spremljen.\n\n` +
          'Ako je problem ponovno aktualan, klikni **Ponovno otvori ticket**. ' +
          'Otvorit će se **isti kanal/ticket**, a prethodne poruke će ostati sačuvane.'
        )
    ],
    components: [new ActionRowBuilder().addComponents(reopen)]
  });

  await interaction.editReply('Ticket je zatvoren i spremljen. Može se ponovno otvoriti u istom kanalu. ✅');
}

async function reopenTicketChannel(interaction) {
  const [prefix, numberRaw] = interaction.customId.split(':');
  const ticketNumber = Number(numberRaw);
  if (!ticketNumber) {
    return interaction.reply({ content: 'Neispravan ticket.', ephemeral: true });
  }

  // Dohvati zatvoreni ticket za baš ovaj kanal.
  const { db } = require('./db');
  const [rows] = await db().query(
    `SELECT * FROM discord_tickets
     WHERE channel_id=? AND ticket_number=? AND status='closed'
     LIMIT 1`,
    [interaction.channel.id, ticketNumber]
  );
  const record = rows[0];

  if (!record) {
    return interaction.reply({ content: 'Ovaj ticket nije moguće ponovno otvoriti.', ephemeral: true });
  }

  const isOwner = interaction.user.id === record.user_id;
  const canManage = interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels);
  if (!isOwner && !canManage) {
    return interaction.reply({ content: 'Samo vlasnik ticketa ili staff može ponovno otvoriti ovaj ticket.', ephemeral: true });
  }

  // Ako korisnik ima neki drugi otvoreni ticket, spriječi duplikat.
  const existing = await getOpenTicketForUser(interaction.guild.id, record.user_id);
  if (existing && existing.channel_id !== interaction.channel.id) {
    return interaction.reply({
      content: `Već postoji drugi otvoreni ticket: <#${existing.channel_id}>`,
      ephemeral: true
    });
  }

  await db().query(
    `UPDATE discord_tickets
     SET status='open', closed_at=NULL, closed_by=NULL
     WHERE id=?`,
    [record.id]
  );

  await interaction.channel.permissionOverwrites.edit(record.user_id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
    EmbedLinks: true
  });

  const close = new ButtonBuilder()
    .setCustomId('close_ticket')
    .setLabel('Zatvori ticket')
    .setEmoji('🔒')
    .setStyle(ButtonStyle.Danger);

  await interaction.update({
    embeds: [
      baseEmbed()
        .setTitle('🔓 Ticket je ponovno otvoren')
        .setDescription(
          `<@${record.user_id}>, ticket **#${String(record.ticket_number).padStart(4, '0')}** je ponovno otvoren.\n` +
          'Sve prethodne poruke ostale su sačuvane.'
        )
    ],
    components: [new ActionRowBuilder().addComponents(close)]
  });
}

async function getFiveMStatus() {
  const base = `http://${config.fivem.host}:${config.fivem.port}`;
  const options = {
    timeout: 7000,
    validateStatus: status => status >= 200 && status < 500
  };

  // Endpointi se provjeravaju neovisno. Jedan neuspješan endpoint
  // više neće cijeli server označiti kao OFFLINE.
  const [dynamicResult, playersResult, infoResult] = await Promise.allSettled([
    axios.get(`${base}/dynamic.json`, options),
    axios.get(`${base}/players.json`, options),
    axios.get(`${base}/info.json`, options)
  ]);

  const dynamic =
    dynamicResult.status === 'fulfilled' && dynamicResult.value.status === 200
      ? dynamicResult.value.data
      : null;

  const playersData =
    playersResult.status === 'fulfilled' && playersResult.value.status === 200
      ? playersResult.value.data
      : null;

  const info =
    infoResult.status === 'fulfilled' && infoResult.value.status === 200
      ? infoResult.value.data
      : null;

  const online = Boolean(dynamic || info || Array.isArray(playersData));

  if (!online) {
    return {
      online: false,
      name: config.brand.name,
      players: 0,
      maxPlayers: 48
    };
  }

  const playerList = Array.isArray(playersData) ? playersData : [];

  const maxPlayers =
    Number(dynamic?.sv_maxclients) ||
    Number(dynamic?.clients) ||
    Number(info?.vars?.sv_maxClients) ||
    Number(info?.vars?.sv_maxclients) ||
    48;

  const playerCount =
    Array.isArray(playersData)
      ? playerList.length
      : Number(dynamic?.clients) || 0;

  const serverName =
    dynamic?.hostname ||
    info?.vars?.sv_projectName ||
    info?.vars?.sv_hostname ||
    config.brand.name;

  return {
    online: true,
    name: String(serverName).replace(/\^[0-9]/g, ''),
    players: playerCount,
    maxPlayers
  };
}

async function updateFiveMStatus() {
  const status = await getFiveMStatus();
  const embed = new EmbedBuilder()
    .setColor(status.online ? 0x20D620 : 0xD62020)
    .setTitle('🎮 KT Team • FiveM Live Status')
    .setDescription(status.online ? '🟢 **ONLINE**' : '🔴 **OFFLINE**')
    .addFields(
      { name: 'Server', value: status.name.slice(0, 1024), inline: false },
      { name: 'Igrači', value: status.online ? `**${status.players}/${status.maxPlayers}**` : '**0/-**', inline: true },
      { name: 'Connect', value: `\`connect ${config.fivem.host}:${config.fivem.port}\``, inline: true },
      { name: 'Osvježavanje', value: 'Svakih 30 sekundi', inline: true }
    )
    .setFooter({ text: `KT Team • Zadnje osvježavanje` })
    .setTimestamp();

  await upsertPanel('fivem_status', config.channels.liveStatus, { embeds: [embed], components: [] });
}

function notifyModal() {
  const modal = new ModalBuilder()
    .setCustomId('notify_modal')
    .setTitle('KT Team obavijest');

  const title = new TextInputBuilder()
    .setCustomId('notify_title')
    .setLabel('Ime obavijesti')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const description = new TextInputBuilder()
    .setCustomId('notify_description')
    .setLabel('Opis')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(4000);

  modal.addComponents(
    new ActionRowBuilder().addComponents(title),
    new ActionRowBuilder().addComponents(description)
  );
  return modal;
}

function rulesModal() {
  const modal = new ModalBuilder()
    .setCustomId('rules_modal')
    .setTitle('Uredi KT Team pravila');

  const title = new TextInputBuilder()
    .setCustomId('rules_title')
    .setLabel('Naslov pravila')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setValue('📜 KT Team Pravila')
    .setMaxLength(100);

  const description = new TextInputBuilder()
    .setCustomId('rules_description')
    .setLabel('Pravila / sadržaj')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setPlaceholder('1. Poštuj druge igrače...\n2. Zabranjen je RDM...')
    .setMaxLength(4000);

  modal.addComponents(
    new ActionRowBuilder().addComponents(title),
    new ActionRowBuilder().addComponents(description)
  );
  return modal;
}

client.once('ready', async () => {
  console.log(`[DISCORD] Logged in as ${client.user.tag}`);

  try {
    await registerCommands();
    await setupPermanentPanels();
    await updateFiveMStatus();
  } catch (err) {
    console.error('[STARTUP]', err);
  }

  setInterval(() => {
    updateFiveMStatus().catch(err => console.error('[FIVEM STATUS]', err.message));
  }, config.fivem.refreshMs);
});

client.on('guildMemberAdd', async member => {
  if (member.guild.id !== process.env.GUILD_ID) return;

  const channel = await client.channels.fetch(config.channels.welcome).catch(() => null);
  if (!channel?.isTextBased()) return;

  await channel.send({
    content: `${member}`,
    embeds: [welcomeEmbed(member)]
  }).catch(console.error);
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category') {
      return createTicketChannel(interaction, interaction.values[0]);
    }

    if (interaction.isButton() && interaction.customId === 'close_ticket') {
      return closeTicketChannel(interaction);
    }

    if (interaction.isButton() && interaction.customId.startsWith('reopen_ticket:')) {
      return reopenTicketChannel(interaction);
    }

    if (interaction.isButton() && interaction.customId === 'get_whitelist') {
      const role = interaction.guild.roles.cache.get(config.roles.whitelist)
        || await interaction.guild.roles.fetch(config.roles.whitelist).catch(() => null);

      if (!role) {
        return interaction.reply({ content: 'Whitelist rola nije pronađena. Kontaktiraj administraciju.', ephemeral: true });
      }

      if (interaction.member.roles.cache.has(role.id)) {
        return interaction.reply({ content: 'Već imaš whitelist rolu. ✅', ephemeral: true });
      }

      await interaction.member.roles.add(role, 'KT Team automatic whitelist');
      return interaction.reply({ content: 'Whitelist je uspješno dodijeljen. Dobrodošao/la! ✅', ephemeral: true });
    }

    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'notify') {
        return interaction.showModal(notifyModal());
      }

      if (interaction.commandName === 'pravila') {
        return interaction.showModal(rulesModal());
      }

      if (interaction.commandName === 'setup') {
        await interaction.deferReply({ ephemeral: true });
        await setupPermanentPanels();
        await updateFiveMStatus();
        return interaction.editReply('Sve KT Team stalne poruke su postavljene/ažurirane. ✅');
      }
    }

    if (interaction.isModalSubmit() && interaction.customId === 'notify_modal') {
      const title = interaction.fields.getTextInputValue('notify_title');
      const description = interaction.fields.getTextInputValue('notify_description');

      const embed = baseEmbed()
        .setTitle(`📢 ${title}`)
        .setDescription(description)
        .setAuthor({
          name: interaction.user.tag,
          iconURL: interaction.user.displayAvatarURL()
        });

      await interaction.channel.send({ embeds: [embed] });
      return interaction.reply({ content: 'Obavijest je poslana. ✅', ephemeral: true });
    }

    if (interaction.isModalSubmit() && interaction.customId === 'rules_modal') {
      const title = interaction.fields.getTextInputValue('rules_title');
      const description = interaction.fields.getTextInputValue('rules_description');

      const payload = {
        embeds: [
          baseEmbed()
            .setTitle(title)
            .setDescription(description)
        ],
        components: []
      };

      await upsertPanel('rules_panel', config.channels.rules, payload);
      return interaction.reply({ content: `Pravila su ažurirana u <#${config.channels.rules}>. ✅`, ephemeral: true });
    }
  } catch (err) {
    console.error('[INTERACTION]', err);
    const msg = 'Došlo je do greške. Provjeri bot konzolu/logove.';
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
    }
  }
});

process.on('unhandledRejection', err => console.error('[UNHANDLED REJECTION]', err));
process.on('uncaughtException', err => console.error('[UNCAUGHT EXCEPTION]', err));

(async () => {
  try {
    await initDatabase();
    await client.login(process.env.DISCORD_TOKEN);
  } catch (err) {
    console.error('[BOOT]', err);
    process.exit(1);
  }
})();
