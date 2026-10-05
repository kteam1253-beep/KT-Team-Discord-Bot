module.exports = {
  brand: {
    name: 'KT Team',
    color: 0x5B5DF0
  },

  channels: {
    welcome: '1549159837261238422',
    ticketCenter: '1549159878642368553',
    openTicketCategory: '1549159877279223808',
    closedTicketLog: '1549159961647521983',
    invite: '1549159840658628688',
    whitelist: '1549159888373153833',
    roleplay: '1549159848502108170',
    liveStatus: '1549159845087940728',
    rules: '1549159849810591848'
  },

  roles: {
    whitelist: '1549159797994037400'
  },

  inviteUrl: 'https://discord.gg/jG9n2d6kU3',

  fivem: {
    host: process.env.FIVEM_HOST || '151.242.16.51',
    port: Number(process.env.FIVEM_PORT || 30120),
    refreshMs: 30000
  },

  ticketCategories: {
    general_support: {
      label: 'Opća podrška',
      emoji: '🎫',
      description: 'Pomoć i opći problemi na serveru'
    },
    bug_report: {
      label: 'Prijava buga',
      emoji: '🐛',
      description: 'Prijava bugova i tehničkih problema'
    },
    player_report: {
      label: 'Prijava igrača',
      emoji: '👮',
      description: 'Prijava igrača zbog kršenja pravila'
    },
    staff_report: {
      label: 'Prijava staffa',
      emoji: '🛡️',
      description: 'Prijava člana administracije'
    },
    jobs: {
      label: 'Poslovi / Frakcije',
      emoji: '💼',
      description: 'Problemi vezani za poslove i frakcije'
    },
    vehicles: {
      label: 'Vozila',
      emoji: '🚗',
      description: 'Vozila, garaže, impound i ključevi'
    },
    property: {
      label: 'Nekretnine',
      emoji: '🏠',
      description: 'Kuće, stanovi i nekretnine'
    },
    shop: {
      label: 'Donacije / Shop',
      emoji: '💳',
      description: 'Pitanja vezana za kupovine i pakete'
    },
    ban_appeal: {
      label: 'Ban Appeal',
      emoji: '🔨',
      description: 'Žalba na ban ili drugu kaznu'
    },
    partnership: {
      label: 'Partnerstvo',
      emoji: '🤝',
      description: 'Upiti vezani za partnerstva'
    },
    other: {
      label: 'Ostalo',
      emoji: '❓',
      description: 'Sve što ne pripada ostalim kategorijama'
    }
  }};
