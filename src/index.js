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
    .setDescription('Objavi/ažuriraj kompletna KT Team pravila')
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

function defaultRulesMessages() {
  return [
`# 📜 KT TEAM • SLUŽBENA PRAVILA

Dobrodošli na **KT Team Roleplay**. Ulaskom na server prihvaćate ova pravila. Nepoznavanje pravila ne oslobađa odgovornosti.

## 1. OPĆA PRAVILA
• Poštuj sve igrače i članove staff tima.
• Zabranjeni su vrijeđanje, diskriminacija, govor mržnje, prijetnje izvan RP-a i namjerno stvaranje drame.
• Zabranjeni su cheat, mod menu, injector, nedopušteni programi, macroi i svaka druga nepravedna prednost.
• Zabranjeno je iskorištavanje bugova ili exploita. Bug prijavi kroz ticket.
• Zabranjena je prodaja/kupovina računa, novca, itema ili vozila za pravi novac izvan službenih sustava servera.
• Zabranjeno je lažno predstavljanje kao staff.
• Odluku staffa tijekom situacije treba poštovati. Žalba se podnosi naknadno kroz ticket.
• Namjerno ometanje drugih igrača ili trollanje nije dopušteno.`,

`## 2. ROLEPLAY (RP)
• U aktivnoj RP situaciji ostani u karakteru.
• Radnje moraju imati smislen RP razlog i trebaju biti razumno realistične.
• OOC probleme ne rješavaj usred RP situacije; završi situaciju pa otvori ticket.
• Ne forsiraj ishod drugom igraču bez mogućnosti reakcije.
• Cilj RP-a nije “pobijediti” svaku situaciju, nego stvoriti kvalitetnu priču za sve sudionike.

## 3. RDM — RANDOM DEATHMATCH
• Zabranjeno je napasti ili ubiti igrača bez opravdanog RP razloga.
• Prije ozbiljnog napada mora postojati jasna RP interakcija ili valjan kontekst.
• Stari sukob nije trajna dozvola za ubijanje osobe svaki put kada je vidiš.

## 4. VDM — VEHICLE DEATHMATCH
• Zabranjeno je koristiti vozilo kao oružje bez opravdanog RP razloga.
• Namjerno gaženje igrača radi trollanja ili pobjede u situaciji smatra se VDM-om.
• Slučajan sudar ili udarac tijekom realne potjere ne smatra se automatski VDM-om.

## 5. METAGAMING
• Zabranjeno je koristiti informacije koje tvoj karakter nije saznao unutar igre.
• Discord, stream, privatni poziv, chat ili informacije drugog karaktera ne smiju davati IC prednost.
• Stream sniping je strogo zabranjen.`,

`## 6. POWERGAMING
• Zabranjene su nerealne radnje kojima drugom igraču oduzimaš razumnu mogućnost reakcije.
• Ne koristi mehanike igre na način koji bi u RP situaciji bio očito nemoguć ili nelogičan.
• /me i /do ne smiju se koristiti za prisilno određivanje ishoda druge osobe.

## 7. FEARRP / VALUE OF LIFE
• Moraš cijeniti život svog karaktera.
• Ako si jasno nadjačan ili ti je oružje neposredno upereno, reagiraj realistično.
• Namjerno provociranje naoružanih osoba bez straha za život može biti kršenje FearRP-a.

## 8. NLR — NEW LIFE RULE
• Nakon smrti/završetka situacije ne vraćaj se odmah radi osvete ili nastavka iste borbe.
• Ne koristi informacije kojih se tvoj karakter prema RP ishodu više ne bi trebao sjećati.
• Ne vraćaj se samo kako bi pokupio izgubljeno oružje, vozilo ili nastavio sukob.

## 9. COMBAT LOGGING
• Zabranjeno je izaći sa servera kako bi izbjegao policiju, pljačku, uhićenje, smrt ili drugu aktivnu RP situaciju.
• Ako ti se igra sruši ili izgubiš internet, vrati se čim možeš.
• Ako povratak nije moguć, obavijesti staff kroz Discord.`,

`## 10. POLICIJA
• Policijski posao mora se obavljati ozbiljno i u skladu s RP-om.
• Zabranjena je zlouporaba službenih ovlasti, opreme, vozila i informacija.
• Policijska oprema ne smije služiti kao izvor opreme za prijatelje ili kriminalne grupe.
• Korupcija policije dopuštena je samo uz prethodno odobrenje administracije ako server takav RP dopušta.
• Policajci trebaju dati razumnu priliku za RP i pregovore kada situacija to dopušta.

## 11. EMS / MEDICINSKI RP
• EMS mora ozbiljno odigravati medicinske situacije.
• Zabranjeno je bez razloga ometati, napadati ili trollati EMS tijekom obavljanja dužnosti.
• Igrač mora surađivati u medicinskom RP-u i realno odigrati ozbiljne ozljede.
• EMS oprema i vozila ne smiju se zloupotrebljavati.

## 12. KRIMINAL I PLJAČKE
• Svaka kriminalna radnja mora imati RP smisao.
• Zabranjeno je konstantno pljačkati istog igrača bez opravdanog razloga.
• Ne smiješ prisiljavati igrača da isprazni cijeli bankovni račun ili preda kompletnu imovinu.
• Lažni/dogovoreni talac radi iskorištavanja skripte ili pregovora nije dopušten.
• Talac mora imati realnu priliku sudjelovati u RP-u.
• Nakon završetka situacije ne nastavljaj sukob bez novog RP razloga.`,

`## 13. BANDE I ORGANIZACIJE
• Sukobi bandi moraju imati RP pozadinu i razlog.
• Zabranjeno je započinjati rat samo radi pucanja ili farmanja killova.
• Članovi ne smiju koristiti OOC informacije za pronalazak protivnika.
• Savezništva i sukobi trebaju se razvijati kroz RP.
• Pravila servera vrijede jednako za članove organizacija i ostale igrače.

## 14. VOZILA I VOŽNJA
• Vožnja treba biti razumno realistična u odnosu na vozilo i RP situaciju.
• Zabranjeno je koristiti očite game mehanike vozila radi nepravedne prednosti.
• Teške prometne nesreće treba odigrati kroz RP.
• Zabranjeno je spremiti, obrisati ili namjerno despawnati vozilo radi izbjegavanja aktivne policijske/RP situacije.
• Krađa vozila mora imati RP smisao; ne kradi vozila samo radi trollanja.

## 15. SAFE ZONE
• U označenim Safe Zone područjima nije dopušteno započinjati kriminal, pucnjavu, otmicu ili pljačku.
• Safe Zone se ne smije koristiti za bijeg iz već započete RP situacije.
• Namjerno čekanje protivnika na rubu Safe Zone radi napada nije dopušteno.`,

`## 16. EKONOMIJA, ITEMI I IMOVINA
• Zabranjeno je dupliciranje novca, itema ili vozila.
• Svaki exploit ekonomije mora se odmah prijaviti.
• Zabranjen je prijenos imovine između vlastitih karaktera radi zaobilaženja ekonomije.
• IC prijevare dopuštene su samo u granicama pravila i ne smiju koristiti OOC obmanu.
• Staff može ukloniti imovinu dobivenu bugom, exploitom ili drugim kršenjem pravila.

## 17. CHARACTER PRAVILA
• Ime i prezime karaktera moraju biti prikladni za ozbiljan RP.
• Troll imena i namjerno kopiranje poznatih osoba mogu biti odbijeni.
• Svaki karakter ima vlastito znanje, odnose i priču.
• Tvoji karakteri ne smiju međusobno dijeliti informacije ili imovinu radi prednosti.

## 18. VOICE / KOMUNIKACIJA
• Za RP je potreban ispravan mikrofon.
• Zabranjeni su mic spam, soundboard spam i namjerno puštanje glasnih zvukova radi ometanja.
• OOC razgovor tijekom aktivnog RP-a svedi na minimum.
• Vrijeđanje IC može biti dio RP-a, ali ne smije prijeći u ciljano OOC uznemiravanje.`,

`## 19. STREAMING I CONTENT
• Stream sniping i korištenje informacija sa streama strogo su zabranjeni.
• Streamer nema posebnu prednost nad drugim igračima niti drugi igrači smiju namjerno uništavati njegov sadržaj.
• OOC informacije iz videa, streama ili Discorda ne smiju se koristiti IC.

## 20. TICKETI, REPORTI I DOKAZI
• Ticket otvori u odgovarajućoj kategoriji i jasno opiši problem.
• Za prijavu igrača priloži video, screenshot ili drugi relevantan dokaz kada je moguće.
• Zabranjeno je uređivati ili lažirati dokaz s ciljem obmane staffa.
• Nemoj spamati tickete za isti slučaj.
• Staff koji je osobno uključen u spor trebao bi, kada je moguće, prepustiti slučaj drugom članu staffa.

## 21. ADMINISTRACIJA
• Staff mora biti nepristran i profesionalan.
• Zlouporaba administratorskih ovlasti nije dopuštena.
• Administratorske informacije ne smiju se koristiti za IC prednost.
• Staff zadržava pravo intervenirati u situacijama koje ozbiljno narušavaju server ili iskustvo igrača.`,

`## 22. KAZNE
Kazna ovisi o težini prekršaja, namjeri, prethodnim prekršajima i dokazima.

Moguće mjere:
**Upozorenje → Kick → Privremeni ban → Duži ban → Permanent ban**

Teška kršenja poput cheatanja, namjernog exploitanja, pokušaja rušenja servera, ozbiljnog stream snipinga ili ponavljanog namjernog kršenja pravila mogu rezultirati strožom kaznom bez prethodnog upozorenja.

## 23. ZAVRŠNE ODREDBE
• Administracija može ažurirati pravila kada je potrebno za kvalitetu i sigurnost servera.
• Pokušaj zaobilaženja pravila tretira se kao kršenje pravila čak i ako određena radnja nije doslovno navedena.
• Koristi zdrav razum i poštuj RP drugih igrača.

**Ulaskom i igranjem na KT Team serveru potvrđuješ da si pročitao/la i prihvatio/la pravila.**

*KT Team Administration*`
  ];
}

async function publishRules() {
  const channel = await client.channels.fetch(config.channels.rules).catch(() => null);
  if (!channel || !channel.isTextBased()) throw new Error(`Rules channel ${config.channels.rules} is unavailable.`);

  const parts = defaultRulesMessages();
  for (let i = 0; i < parts.length; i++) {
    await upsertPanel(`rules_message_${i + 1}`, config.channels.rules, { content: parts[i], embeds: [], components: [] });
  }

  // Očisti eventualne stare dijelove ako se broj poruka smanjio.
  for (let i = parts.length + 1; i <= 20; i++) {
    const saved = await getBotMessage(`rules_message_${i}`);
    if (!saved) continue;
    const old = await channel.messages.fetch(saved.message_id).catch(() => null);
    if (old) await old.delete().catch(() => {});
  }
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

  await publishRules();
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

  // Dozvoljeno je otvoriti više ticketa, čak i istu kategoriju više puta.

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

  const claim = new ButtonBuilder()
    .setCustomId('claim_ticket')
    .setLabel('Preuzmi ticket')
    .setEmoji('🙋')
    .setStyle(ButtonStyle.Primary);

  const close = new ButtonBuilder()
    .setCustomId('close_ticket')
    .setLabel('Zatvori ticket')
    .setEmoji('🔒')
    .setStyle(ButtonStyle.Danger);

  await channel.send({
    content: `<@${interaction.user.id}>`,
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(claim, close)]
  });

  await interaction.editReply(`Ticket je otvoren: ${channel}`);

  // Reset dropdowna: ponovno uređujemo ISTU Ticket Center poruku.
  // Tako se odabrana kategorija odmah vraća na placeholder i može se opet kliknuti.
  try {
    await upsertPanel('ticket_panel', config.channels.ticketCenter, ticketPanel());
  } catch (err) {
    console.error('[TICKET MENU RESET]', err?.stack || err);
  }
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

async function claimTicketChannel(interaction) {
  const record = await getOpenTicketByChannel(interaction.channel.id);
  if (!record) {
    return interaction.reply({ content: 'Ovaj kanal nije aktivan ticket.', ephemeral: true });
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.reply({ content: 'Samo staff može preuzeti ticket.', ephemeral: true });
  }

  const claimed = new ButtonBuilder()
    .setCustomId('ticket_claimed')
    .setLabel(`Preuzeo: ${interaction.user.username}`.slice(0, 80))
    .setEmoji('✅')
    .setStyle(ButtonStyle.Success)
    .setDisabled(true);

  const close = new ButtonBuilder()
    .setCustomId('close_ticket')
    .setLabel('Zatvori ticket')
    .setEmoji('🔒')
    .setStyle(ButtonStyle.Danger);

  await interaction.update({
    components: [new ActionRowBuilder().addComponents(claimed, close)]
  });

  await interaction.channel.send(`🙋 Ticket je preuzeo ${interaction.user}.`);
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

  // Prvo napravi transcript dok kanal i sve poruke još postoje.
  const transcript = await buildTranscript(interaction.channel);

  // Spremi zatvaranje + transcript u MySQL.
  await closeTicket(interaction.channel.id, interaction.user.id, transcript);

  // Pošalji log i .txt transcript u podešeni closed-ticket log kanal.
  const logChannel = await client.channels.fetch(config.channels.closedTicketLog).catch(() => null);

  if (!logChannel?.isTextBased()) {
    return interaction.editReply(
      `Ticket je spremljen u MySQL, ali log kanal <#${config.channels.closedTicketLog}> nije dostupan. Kanal NIJE obrisan radi sigurnosti.`
    );
  }

  try {
    const filename = `ticket-${String(record.ticket_number).padStart(4, '0')}.txt`;
    const attachment = new AttachmentBuilder(
      Buffer.from(transcript || 'Nema poruka u transcriptu.', 'utf8'),
      { name: filename }
    );

    const logEmbed = baseEmbed()
      .setTitle(`🔒 Zatvoren ticket #${String(record.ticket_number).padStart(4, '0')}`)
      .addFields(
        { name: 'Korisnik', value: `<@${record.user_id}> (\`${record.user_id}\`)`, inline: false },
        { name: 'Kategorija', value: record.category_name, inline: true },
        { name: 'Zatvorio', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Kanal', value: `#${interaction.channel.name}`, inline: false }
      );

    await logChannel.send({
      embeds: [logEmbed],
      files: [attachment]
    });
  } catch (err) {
    console.error('[TICKET LOG]', err?.stack || err);
    return interaction.editReply(
      'Ticket je spremljen u MySQL, ali slanje loga/transcripta nije uspjelo. Kanal NIJE obrisan radi sigurnosti.'
    );
  }

  await interaction.editReply('Ticket je spremljen. Log i transcript su poslani. Kanal se briše...');

  // Tek nakon uspješnog spremanja u DB i slanja loga briši ticket kanal.
  setTimeout(async () => {
    try {
      await interaction.channel.delete(`Ticket #${record.ticket_number} closed by ${interaction.user.tag}`);
    } catch (err) {
      console.error('[TICKET DELETE]', err?.stack || err);
    }
  }, 1500);
}

async function getFiveMStatus() {
  const host = config.fivem.host;
  const port = config.fivem.port;
  const joinCode = process.env.CFX_JOIN_CODE || 'qqqyey6';

  // Primarno: Cfx join-code endpoint. Ne ovisi o tome dopušta li game hosting
  // Railwayu direktan pristup na /players.json.
  try {
    const response = await axios.get(
      `https://servers-frontend.fivem.net/api/servers/single/${encodeURIComponent(joinCode)}`,
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'KT-Team-Discord-Bot/1.8',
          'Accept': 'application/json'
        }
      }
    );

    const data = response.data?.Data || response.data?.data || response.data;
    if (data) {
      const vars = data.vars || {};
      const clients = Number(data.clients ?? 0);
      const maxClients = Number(
        data.svMaxclients ??
        data.sv_maxclients ??
        vars.sv_maxClients ??
        vars.sv_maxclients ??
        48
      );

      const hostname =
        data.hostname ||
        vars.sv_projectName ||
        vars.sv_hostname ||
        config.brand.name;

      console.log(`[FIVEM] Cfx join ${joinCode}: ONLINE ${clients}/${maxClients}`);

      return {
        online: true,
        name: String(hostname).replace(/\^[0-9]/g, ''),
        players: clients,
        maxPlayers: maxClients
      };
    }
  } catch (err) {
    const status = err?.response?.status;
    console.log(`[FIVEM] Cfx join ${joinCode} failed: ${status ? `HTTP ${status}` : (err?.code || err?.message || err)}`);
  }

  // Fallback: direktni standardni FiveM endpointi.
  const base = `http://${host}:${port}`;
  const options = {
    timeout: 7000,
    validateStatus: status => status >= 200 && status < 500,
    headers: { 'User-Agent': 'KT-Team-Discord-Bot/1.8' }
  };

  const [dynamicResult, playersResult, infoResult] = await Promise.allSettled([
    axios.get(`${base}/dynamic.json`, options),
    axios.get(`${base}/players.json`, options),
    axios.get(`${base}/info.json`, options)
  ]);

  const unpack = (result, label) => {
    if (result.status === 'fulfilled' && result.value.status === 200) {
      console.log(`[FIVEM] Direct ${label}: HTTP 200`);
      return result.value.data;
    }
    const reason = result.status === 'rejected'
      ? (result.reason?.code || result.reason?.message || 'request failed')
      : `HTTP ${result.value?.status}`;
    console.log(`[FIVEM] Direct ${label}: ${reason}`);
    return null;
  };

  const dynamic = unpack(dynamicResult, 'dynamic.json');
  const playersData = unpack(playersResult, 'players.json');
  const info = unpack(infoResult, 'info.json');

  if (!(dynamic || info || Array.isArray(playersData))) {
    return { online: false, name: config.brand.name, players: 0, maxPlayers: 48 };
  }

  const players = Array.isArray(playersData)
    ? playersData.length
    : Number(dynamic?.clients ?? 0);

  const maxPlayers =
    Number(dynamic?.sv_maxclients) ||
    Number(info?.vars?.sv_maxClients) ||
    Number(info?.vars?.sv_maxclients) ||
    48;

  const hostname =
    dynamic?.hostname ||
    info?.vars?.sv_projectName ||
    info?.vars?.sv_hostname ||
    config.brand.name;

  console.log(`[FIVEM] Direct fallback: ONLINE ${players}/${maxPlayers}`);

  return {
    online: true,
    name: String(hostname).replace(/\^[0-9]/g, ''),
    players,
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


client.once('clientReady', async () => {
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

    if (interaction.isButton() && interaction.customId === 'claim_ticket') {
      return claimTicketChannel(interaction);
    }

    if (interaction.isButton() && interaction.customId === 'close_ticket') {
      return closeTicketChannel(interaction);
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
        await interaction.deferReply({ ephemeral: true });
        await publishRules();
        return interaction.editReply(`Kompletna KT Team pravila su objavljena/ažurirana u <#${config.channels.rules}>. ✅`);
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


  } catch (err) {
    console.error('[INTERACTION]', err?.stack || err);
    const msg = `Došlo je do greške pri obradi zahtjeva. Kod: ${err?.code || err?.name || 'UNKNOWN'}. Provjeri Railway log.`;
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
