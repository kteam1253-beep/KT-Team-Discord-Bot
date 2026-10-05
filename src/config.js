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
    tablet: {
      label: 'Tablet Ecosystem',
      emoji: '📱',
      description: 'Tablet system and ecosystem-related issues'
    },
    police: {
      label: 'Police',
      emoji: '👮',
      description: 'Police-related matters and reports'
    },
    mechanic: {
      label: 'Mechanic & Garage',
      emoji: '🔧',
      description: 'Mechanic and garage system-related matters'
    },
    evidence: {
      label: 'Evidence',
      emoji: '🔍',
      description: 'Evidence-related inquiries and submissions'
    },
    jobs: {
      label: 'Job Systems',
      emoji: '⛑️',
      description: 'Job-related matters and reports (Hunting, Fishing)'
    },
    scripts: {
      label: 'Other Scripts',
      emoji: '🧩',
      description: 'Other scripts-related matters and reports'
    },
    offers: {
      label: 'Offers',
      emoji: '🏷️',
      description: 'Special offers and promotional inquiries'
    },
    general: {
      label: 'General',
      emoji: '💬',
      description: 'General inquiries (NOT SUPPORT)'
    }
  }
};
