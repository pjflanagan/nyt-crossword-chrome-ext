module.exports = {
  siteMetadata: {
    siteUrl: `https://drunkweatherchannel.flanny.app`,
    title: `NYT Crossword Leaderboard Plus`,
  },
  plugins: [
    `gatsby-plugin-sass`,
    `gatsby-plugin-root-import`,
    `gatsby-plugin-react-helmet`,
    {
      resolve: `gatsby-plugin-google-fonts`,
      options: {
        fonts: [
          `Noto Sans JP`,
          `Noto Sans JP\:300,500,900` // you can also specify font weights and styles
        ],
        display: 'swap'
      }
    },
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `NYT Crossword Leaderboard Plus`,
        short_name: `NYT XW`,
        start_url: `/`,
        background_color: `#024e98`,
        theme_color: `#024e98`,
        display: `standalone`,
        icon: `src/images/icon.png`,
      },
    },
    {
      resolve: `gatsby-plugin-offline`,
      options: {
        precachePages: [`/`],
      },
    },
    {
      resolve: `gatsby-plugin-google-gtag`,
      options: {
        trackingIds: [
          "G-CNFGV4ZHRG",
        ],
        pluginConfig: {
          head: false,
        },
      },
    },
  ],
};
