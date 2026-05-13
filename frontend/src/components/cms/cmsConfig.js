const sharedNavLinks = [
  { label: 'Home', href: 'home.html', isActive: true },
  { label: 'About', href: 'about.html' },
  { label: 'Contact', href: 'contact.html' },
  { label: '⚡ Predictor', href: 'Index.html' },
]

const homeSectionStyle = {
  section: {},
  content: {},
  media: {},
  title: {},
  subtitle: {},
  kicker: {},
}

const aboutSectionStyle = {
  section: {},
  content: {},
  media: {},
  title: {},
  subtitle: {},
  text: {},
  tag: {},
}

const varietyCardStyle = {
  card: {},
  media: {},
  title: {},
  tagline: {},
  description: {},
  features: {},
}

const articleCardStyle = {
  card: {},
  kicker: {},
  title: {},
  summary: {},
  source: {},
}

export const HOME_CMS_DEFAULTS = {
  navigation: {
    links: sharedNavLinks,
    style: {
      container: {},
      link: {},
      activeLink: {},
    },
  },
  hero: {
    kicker: 'GIS-Powered Coffee Forecasting',
    title: 'Predicting the Future of Amadeo\'s Coffee',
    subtitle:
      'Harnessing GIS and predictive modeling to provide Amadeo\'s upland coffee farmers with accurate, data-driven yield forecasts.',
    media: {
      type: 'image',
      src: '',
      alt: 'Hero section',
    },
    style: homeSectionStyle,
  },
  about: {
    title: 'Why Predictive Coffee Analytics?',
    text:
      'Amadeo, Cavite is the heartland of the province\'s coffee industry. Our tool uses environmental factors like elevation, rainfall, and soil type to create Amadeo-focused predictions, moving beyond traditional methods to help ensure optimal planting and harvesting strategies for local coffee farms.\n\nThis empowers Amadeo farmers to adapt to changing climate conditions, maximize their yield potential, and secure a sustainable future for the revered Kapeng Barako.',
    media: {
      type: 'image',
      src: '',
      alt: 'About section',
    },
    style: homeSectionStyle,
  },
  varieties: {
    title: 'Focus Varieties',
    style: {
      section: {},
      grid: {},
      card: {},
      media: {},
      title: {},
    },
  },
  varietyRobusta: {
    title: 'Robusta',
    media: {
      type: 'image',
      src: '',
      alt: 'Robusta variety',
    },
    style: varietyCardStyle,
  },
  varietyLiberica: {
    title: 'Liberica (Barako)',
    media: {
      type: 'image',
      src: '',
      alt: 'Liberica variety',
    },
    style: varietyCardStyle,
  },
  varietyExcelsa: {
    title: 'Excelsa',
    media: {
      type: 'image',
      src: '',
      alt: 'Excelsa variety',
    },
    style: varietyCardStyle,
  },
  meeting: {
    title: 'Request a Meeting in FITS Center, Amadeo',
    subtitle: 'Fill out this form to request a consultation schedule with the FITS Center team.',
    buttonLabel: 'Submit Meeting Request',
    style: {
      section: {},
      content: {},
      title: {},
      subtitle: {},
      button: {},
    },
  },
  footer: {
    text: '\u00a9 2026 Cavite Upland Coffee Analytics. All rights reserved.',
    style: {
      footer: {},
      text: {},
    },
  },
}

export const HOME_CMS_SCHEMAS = {
  navigation: {
    title: 'Navigation',
    description: 'Update the main site links and the navigation bar styling.',
    fields: [
      {
        path: 'links',
        label: 'Navigation Links',
        type: 'link-list',
      },
    ],
    styleGroups: [
      {
        path: 'style.container',
        label: 'Navigation Bar Styles',
        keys: ['backgroundColor', 'color', 'padding', 'margin', 'gap', 'borderRadius', 'boxShadow'],
      },
      {
        path: 'style.link',
        label: 'Link Styles',
        keys: ['color', 'fontSize', 'fontWeight', 'textTransform', 'letterSpacing', 'padding'],
      },
    ],
  },
  hero: {
    title: 'Hero Section',
    description: 'Edit the main headline, supporting text, image or video, and layout.',
    fields: [
      { path: 'kicker', label: 'Kicker Text', type: 'text' },
      { path: 'title', label: 'Heading', type: 'text' },
      { path: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { path: 'media.type', label: 'Media Type', type: 'select', options: ['image', 'video'] },
      { path: 'media.src', label: 'Media Public URL', type: 'text' },
      { path: 'media.alt', label: 'Media Alt Text', type: 'text' },
    ],
    styleGroups: [
      {
        path: 'style.section',
        label: 'Section Styles',
        keys: ['display', 'flexDirection', 'alignItems', 'gap', 'padding', 'minHeight', 'backgroundColor', 'borderRadius'],
      },
      {
        path: 'style.content',
        label: 'Text Block Styles',
        keys: ['backgroundColor', 'padding', 'maxWidth', 'color', 'borderRadius', 'boxShadow'],
      },
      {
        path: 'style.media',
        label: 'Media Styles',
        keys: ['width', 'height', 'maxWidth', 'borderRadius', 'objectFit'],
      },
      {
        path: 'style.title',
        label: 'Heading Styles',
        keys: ['color', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'],
      },
      {
        path: 'style.subtitle',
        label: 'Subtitle Styles',
        keys: ['color', 'fontSize', 'lineHeight', 'maxWidth'],
      },
    ],
  },
  about: {
    title: 'About Section',
    description: 'Edit the explanation block, image, and surrounding layout.',
    fields: [
      { path: 'title', label: 'Section Heading', type: 'text' },
      { path: 'text', label: 'Section Copy', type: 'textarea' },
      { path: 'media.type', label: 'Media Type', type: 'select', options: ['image', 'video'] },
      { path: 'media.src', label: 'Media Public URL', type: 'text' },
      { path: 'media.alt', label: 'Media Alt Text', type: 'text' },
    ],
    styleGroups: [
      {
        path: 'style.section',
        label: 'Section Styles',
        keys: ['display', 'gridTemplateColumns', 'gap', 'padding', 'backgroundColor', 'borderRadius', 'alignItems'],
      },
      {
        path: 'style.content',
        label: 'Text Block Styles',
        keys: ['backgroundColor', 'padding', 'color', 'borderRadius', 'boxShadow', 'maxWidth'],
      },
      {
        path: 'style.media',
        label: 'Media Styles',
        keys: ['width', 'height', 'maxWidth', 'borderRadius', 'objectFit'],
      },
      {
        path: 'style.title',
        label: 'Heading Styles',
        keys: ['color', 'fontSize', 'fontWeight', 'lineHeight'],
      },
      {
        path: 'style.text',
        label: 'Body Styles',
        keys: ['color', 'fontSize', 'lineHeight', 'maxWidth'],
      },
    ],
  },
  varieties: {
    title: 'Variety Section',
    description: 'Update the section title and grid layout.',
    fields: [
      { path: 'title', label: 'Section Heading', type: 'text' },
    ],
    styleGroups: [
      {
        path: 'style.section',
        label: 'Section Styles',
        keys: ['padding', 'marginTop', 'backgroundColor', 'borderRadius'],
      },
      {
        path: 'style.grid',
        label: 'Grid Styles',
        keys: ['display', 'gridTemplateColumns', 'gap', 'alignItems'],
      },
    ],
  },
  varietyRobusta: {
    title: 'Robusta Card',
    description: 'Edit the card title, image or video, and card styling.',
    fields: [
      { path: 'title', label: 'Card Title', type: 'text' },
      { path: 'media.type', label: 'Media Type', type: 'select', options: ['image', 'video'] },
      { path: 'media.src', label: 'Media Public URL', type: 'text' },
      { path: 'media.alt', label: 'Media Alt Text', type: 'text' },
    ],
    styleGroups: [
      {
        path: 'style.card',
        label: 'Card Styles',
        keys: ['backgroundColor', 'padding', 'borderRadius', 'boxShadow', 'border', 'minHeight'],
      },
      {
        path: 'style.media',
        label: 'Media Styles',
        keys: ['height', 'width', 'objectFit', 'borderRadius'],
      },
      {
        path: 'style.title',
        label: 'Title Styles',
        keys: ['color', 'fontSize', 'fontWeight', 'textAlign'],
      },
    ],
  },
  varietyLiberica: {
    title: 'Liberica Card',
    description: 'Edit the card title, image or video, and card styling.',
    fields: [
      { path: 'title', label: 'Card Title', type: 'text' },
      { path: 'media.type', label: 'Media Type', type: 'select', options: ['image', 'video'] },
      { path: 'media.src', label: 'Media Public URL', type: 'text' },
      { path: 'media.alt', label: 'Media Alt Text', type: 'text' },
    ],
    styleGroups: [
      {
        path: 'style.card',
        label: 'Card Styles',
        keys: ['backgroundColor', 'padding', 'borderRadius', 'boxShadow', 'border', 'minHeight'],
      },
      {
        path: 'style.media',
        label: 'Media Styles',
        keys: ['height', 'width', 'objectFit', 'borderRadius'],
      },
      {
        path: 'style.title',
        label: 'Title Styles',
        keys: ['color', 'fontSize', 'fontWeight', 'textAlign'],
      },
    ],
  },
  varietyExcelsa: {
    title: 'Excelsa Card',
    description: 'Edit the card title, image or video, and card styling.',
    fields: [
      { path: 'title', label: 'Card Title', type: 'text' },
      { path: 'media.type', label: 'Media Type', type: 'select', options: ['image', 'video'] },
      { path: 'media.src', label: 'Media Public URL', type: 'text' },
      { path: 'media.alt', label: 'Media Alt Text', type: 'text' },
    ],
    styleGroups: [
      {
        path: 'style.card',
        label: 'Card Styles',
        keys: ['backgroundColor', 'padding', 'borderRadius', 'boxShadow', 'border', 'minHeight'],
      },
      {
        path: 'style.media',
        label: 'Media Styles',
        keys: ['height', 'width', 'objectFit', 'borderRadius'],
      },
      {
        path: 'style.title',
        label: 'Title Styles',
        keys: ['color', 'fontSize', 'fontWeight', 'textAlign'],
      },
    ],
  },
  meeting: {
    title: 'Meeting Request Section',
    description: 'Update the request heading, helper text, button label, and layout.',
    fields: [
      { path: 'title', label: 'Heading', type: 'text' },
      { path: 'subtitle', label: 'Supporting Text', type: 'textarea' },
      { path: 'buttonLabel', label: 'Submit Button Label', type: 'text' },
    ],
    styleGroups: [
      {
        path: 'style.section',
        label: 'Section Styles',
        keys: ['backgroundColor', 'padding', 'borderRadius', 'marginTop'],
      },
      {
        path: 'style.content',
        label: 'Text Styles',
        keys: ['color', 'textAlign', 'maxWidth'],
      },
      {
        path: 'style.title',
        label: 'Heading Styles',
        keys: ['color', 'fontSize', 'fontWeight'],
      },
      {
        path: 'style.subtitle',
        label: 'Subtitle Styles',
        keys: ['color', 'fontSize', 'lineHeight'],
      },
      {
        path: 'style.button',
        label: 'Button Styles',
        keys: ['backgroundColor', 'color', 'padding', 'borderRadius', 'fontSize'],
      },
    ],
  },
  footer: {
    title: 'Footer',
    description: 'Edit the footer text and footer styling.',
    fields: [
      { path: 'text', label: 'Footer Text', type: 'text' },
    ],
    styleGroups: [
      {
        path: 'style.footer',
        label: 'Footer Styles',
        keys: ['backgroundColor', 'color', 'padding', 'textAlign', 'marginTop'],
      },
      {
        path: 'style.text',
        label: 'Text Styles',
        keys: ['color', 'fontSize', 'letterSpacing'],
      },
    ],
  },
}

export const ABOUT_CMS_DEFAULTS = {
  navigation: {
    links: sharedNavLinks.map((link) => ({ ...link, isActive: link.label === 'About' })),
    style: {
      container: {},
      link: {},
      activeLink: {},
    },
  },
  intro: {
    title: 'The Heart of Amadeo Cavite\'s Coffee: Our Upland Varieties',
    subtitle:
      'Exploring the unique characteristics of Robusta, Liberica, and Excelsa, the foundation of the region\'s rich coffee heritage.',
    style: {
      section: {},
      content: {},
      title: {},
      subtitle: {},
    },
  },
  varietyRobusta: {
    title: 'Robusta (Coffea canephora)',
    tagline: 'The resilient backbone of commercial coffee.',
    description:
      'Robusta is the second most popular coffee globally, primarily grown for its superior hardiness and high caffeine content. It thrives in warmer climates and is a vital commercial variety for Cavite farmers. Its flavor profile is typically strong, earthy, and bittersweet, often used in blends or instant coffee to add body and kick.',
    features: [
      'Elevation(Meters Above the Sea Level): 600-1200',
      'Temperature: 13-26°C',
      'Sunshine Requirements: 50%',
      'Wind Requirements: Slight',
      'Relative Humidity(%): 75-85',
      'Rainfall(mm): 200',
      'Soil(pH): 5.6-6.5',
      'Soil Depth(m): 1.5',
      'Organic Matter(OM): Rich in OM',
    ],
    media: {
      type: 'image',
      src: '',
      alt: 'Robusta coffee variety',
    },
    style: varietyCardStyle,
  },
  varietyLiberica: {
    title: 'Liberica (Kapeng Barako)',
    tagline: 'The national pride with a smoky, intense character.',
    description:
      'In the Philippines, Liberica is known as Kapeng Barako due to its strong, bold flavor. It is distinct for its very large, asymmetrical beans and unique smoky, sometimes fruity or floral aroma. Though it accounts for a small percentage of global coffee, it holds immense cultural significance in Cavite and the CALABARZON region.',
    features: [
      'Elevation(Meters Above the Sea Level): 600-1000',
      'Temperature:10-30°C',
      'Sunshine Requirements: 50%',
      'Wind Requirements: Slight',
      'Relative Humidity(%): 70-90',
      'Rainfall(mm): 150',
      'Soil(pH): 5.6-6.5',
      'Soil Depth(m): 1.5',
      'Organic Matter(OM): Rich in OM',
    ],
    media: {
      type: 'image',
      src: '',
      alt: 'Liberica coffee variety',
    },
    style: varietyCardStyle,
  },
  varietyExcelsa: {
    title: 'Excelsa (Coffea liberica)',
    tagline: 'The complex, tart note that adds depth to blends.',
    description:
      'Excelsa is often classified as a variety of Liberica but has a unique and complex flavor profile. It provides tart, dark, and lingering notes with hints of fruitiness. It is often used in blends to add body and depth, and it grows well at medium altitudes.',
    features: [
      'Elevation(Meters Above the Sea Level): 600-1000',
      'Temperature:10-30°C',
      'Sunshine Requirements: 50%',
      'Wind Requirements: Slight',
      'Relative Humidity(%): 70-90',
      'Rainfall(mm): 150',
      'Soil(pH): 5.6-6.5',
      'Soil Depth(m): 1.5',
      'Organic Matter(OM): Rich in OM',
    ],
    media: {
      type: 'image',
      src: '',
      alt: 'Excelsa coffee variety',
    },
    style: varietyCardStyle,
  },
  mission: {
    title: 'Our Mission',
    text:
      'To cultivate and promote sustainable coffee farming practices in Amadeo Cavite, preserving traditional cultivation methods while embracing modern agricultural innovations.',
    style: {
      section: {},
      card: {},
      title: {},
      text: {},
    },
  },
  vision: {
    title: 'Our Vision',
    text:
      'To position Amadeo Cavite as a premier coffee region known for exceptional quality, sustainability, and heritage-driven agricultural excellence.',
    style: {
      section: {},
      card: {},
      title: {},
      text: {},
    },
  },
  articlesHeading: {
    title: 'More Articles About Amadeo Coffee',
    style: {
      section: {},
      title: {},
    },
  },
  articleBrewingHope: {
    kicker: 'Rappler | MovePH',
    title: 'Brewing hope: How Amadeo farmers cope amid the struggling coffee industry',
    summary:
      'A feature on how Amadeo coffee farmers are adapting to climate-related disruptions, aging coffee trees, and unstable farm incomes while rebuilding through cooperative support and local initiatives.',
    sourceUrl: 'https://www.rappler.com/moveph/brewing-hope-how-amadeo-farmers-cope-amid-the-struggling-coffee-industry/',
    style: articleCardStyle,
  },
  articleRiseFromAshes: {
    kicker: 'Rappler | Business',
    title: 'WATCH: Cavite coffee farmers struggle to rise from the ashes',
    summary:
      'A video report on Amadeo farmers after the Taal ashfall, including the long recovery timeline for damaged coffee trees and support needed from government and local partners.',
    sourceUrl: 'https://www.rappler.com/business/250602-video-cavite-coffee-farmers-struggle-rise-from-ashes/',
    style: articleCardStyle,
  },
  articleLostAndDamaged: {
    kicker: 'Rappler | Philippine News',
    title: 'Lost and damaged: Taal Volcano steals livelihoods',
    summary:
      'This report includes accounts from Amadeo, where coffee growers faced severe livelihood losses after the eruption and expected a multi-year period before full farm recovery.',
    sourceUrl: 'https://www.rappler.com/philippines/249624-lost-damaged-taal-volcano-eruption-january-2020-steals-livelihoods/',
    style: articleCardStyle,
  },
  articleAshfallCalabarzon: {
    kicker: 'Rappler | Philippine News',
    title: 'LOOK: Ashfall from Taal Volcano spreads to Calabarzon, Metro Manila',
    summary:
      'A photo report documenting ashfall across Calabarzon, including Cavite, which contextualizes the environmental event that affected coffee communities in the area.',
    sourceUrl: 'https://www.rappler.com/philippines/249112-photos-ashfall-taal-volcano-january-2020/',
    style: articleCardStyle,
  },
  footer: {
    text: '\u00a9 2026 Cavite Upland Coffee Analytics. All rights reserved.',
    style: {
      footer: {},
      text: {},
    },
  },
}

export const ABOUT_CMS_SCHEMAS = {
  navigation: HOME_CMS_SCHEMAS.navigation,
  intro: {
    title: 'Page Intro',
    description: 'Edit the page heading, subtitle, and intro layout.',
    fields: [
      { path: 'title', label: 'Heading', type: 'text' },
      { path: 'subtitle', label: 'Subtitle', type: 'textarea' },
    ],
    styleGroups: [
      {
        path: 'style.section',
        label: 'Section Styles',
        keys: ['padding', 'marginBottom', 'backgroundColor', 'borderRadius'],
      },
      {
        path: 'style.content',
        label: 'Text Styles',
        keys: ['backgroundColor', 'padding', 'maxWidth', 'color', 'textAlign'],
      },
      {
        path: 'style.title',
        label: 'Heading Styles',
        keys: ['color', 'fontSize', 'fontWeight', 'lineHeight'],
      },
      {
        path: 'style.subtitle',
        label: 'Subtitle Styles',
        keys: ['color', 'fontSize', 'lineHeight', 'maxWidth'],
      },
    ],
  },
  varietyRobusta: HOME_CMS_SCHEMAS.varietyRobusta,
  varietyLiberica: HOME_CMS_SCHEMAS.varietyLiberica,
  varietyExcelsa: HOME_CMS_SCHEMAS.varietyExcelsa,
  mission: {
    title: 'Mission Block',
    description: 'Edit the mission heading and supporting text.',
    fields: [
      { path: 'title', label: 'Heading', type: 'text' },
      { path: 'text', label: 'Mission Text', type: 'textarea' },
    ],
    styleGroups: [
      {
        path: 'style.card',
        label: 'Card Styles',
        keys: ['backgroundColor', 'padding', 'borderRadius', 'boxShadow'],
      },
      {
        path: 'style.title',
        label: 'Heading Styles',
        keys: ['color', 'fontSize', 'fontWeight'],
      },
      {
        path: 'style.text',
        label: 'Body Styles',
        keys: ['color', 'fontSize', 'lineHeight'],
      },
    ],
  },
  vision: {
    title: 'Vision Block',
    description: 'Edit the vision heading and supporting text.',
    fields: [
      { path: 'title', label: 'Heading', type: 'text' },
      { path: 'text', label: 'Vision Text', type: 'textarea' },
    ],
    styleGroups: [
      {
        path: 'style.card',
        label: 'Card Styles',
        keys: ['backgroundColor', 'padding', 'borderRadius', 'boxShadow'],
      },
      {
        path: 'style.title',
        label: 'Heading Styles',
        keys: ['color', 'fontSize', 'fontWeight'],
      },
      {
        path: 'style.text',
        label: 'Body Styles',
        keys: ['color', 'fontSize', 'lineHeight'],
      },
    ],
  },
  articlesHeading: {
    title: 'Articles Heading',
    description: 'Edit the articles section title and style.',
    fields: [
      { path: 'title', label: 'Heading', type: 'text' },
    ],
    styleGroups: [
      {
        path: 'style.section',
        label: 'Section Styles',
        keys: ['padding', 'marginTop', 'backgroundColor', 'borderRadius'],
      },
      {
        path: 'style.title',
        label: 'Heading Styles',
        keys: ['color', 'fontSize', 'fontWeight'],
      },
    ],
  },
  articleBrewingHope: {
    title: 'Article: Brewing Hope',
    description: 'Edit article metadata, copy, source, and card styles.',
    fields: [
      { path: 'kicker', label: 'Kicker', type: 'text' },
      { path: 'title', label: 'Title', type: 'text' },
      { path: 'summary', label: 'Summary', type: 'textarea' },
      { path: 'sourceUrl', label: 'Source URL', type: 'text' },
    ],
    styleGroups: [
      {
        path: 'style.card',
        label: 'Card Styles',
        keys: ['backgroundColor', 'padding', 'borderRadius', 'boxShadow'],
      },
      {
        path: 'style.kicker',
        label: 'Kicker Styles',
        keys: ['color', 'fontSize', 'fontWeight'],
      },
      {
        path: 'style.title',
        label: 'Title Styles',
        keys: ['color', 'fontSize', 'fontWeight'],
      },
      {
        path: 'style.summary',
        label: 'Summary Styles',
        keys: ['color', 'fontSize', 'lineHeight'],
      },
      {
        path: 'style.source',
        label: 'Source Styles',
        keys: ['color', 'fontSize', 'textDecoration'],
      },
    ],
  },
  articleRiseFromAshes: {
    title: 'Article: Rise From the Ashes',
    description: 'Edit article metadata, copy, source, and card styles.',
    fields: [
      { path: 'kicker', label: 'Kicker', type: 'text' },
      { path: 'title', label: 'Title', type: 'text' },
      { path: 'summary', label: 'Summary', type: 'textarea' },
      { path: 'sourceUrl', label: 'Source URL', type: 'text' },
    ],
    styleGroups: [
      {
        path: 'style.card',
        label: 'Card Styles',
        keys: ['backgroundColor', 'padding', 'borderRadius', 'boxShadow'],
      },
      {
        path: 'style.kicker',
        label: 'Kicker Styles',
        keys: ['color', 'fontSize', 'fontWeight'],
      },
      {
        path: 'style.title',
        label: 'Title Styles',
        keys: ['color', 'fontSize', 'fontWeight'],
      },
      {
        path: 'style.summary',
        label: 'Summary Styles',
        keys: ['color', 'fontSize', 'lineHeight'],
      },
      {
        path: 'style.source',
        label: 'Source Styles',
        keys: ['color', 'fontSize', 'textDecoration'],
      },
    ],
  },
  articleLostAndDamaged: {
    title: 'Article: Lost and Damaged',
    description: 'Edit article metadata, copy, source, and card styles.',
    fields: [
      { path: 'kicker', label: 'Kicker', type: 'text' },
      { path: 'title', label: 'Title', type: 'text' },
      { path: 'summary', label: 'Summary', type: 'textarea' },
      { path: 'sourceUrl', label: 'Source URL', type: 'text' },
    ],
    styleGroups: [
      {
        path: 'style.card',
        label: 'Card Styles',
        keys: ['backgroundColor', 'padding', 'borderRadius', 'boxShadow'],
      },
      {
        path: 'style.kicker',
        label: 'Kicker Styles',
        keys: ['color', 'fontSize', 'fontWeight'],
      },
      {
        path: 'style.title',
        label: 'Title Styles',
        keys: ['color', 'fontSize', 'fontWeight'],
      },
      {
        path: 'style.summary',
        label: 'Summary Styles',
        keys: ['color', 'fontSize', 'lineHeight'],
      },
      {
        path: 'style.source',
        label: 'Source Styles',
        keys: ['color', 'fontSize', 'textDecoration'],
      },
    ],
  },
  articleAshfallCalabarzon: {
    title: 'Article: Ashfall Calabarzon',
    description: 'Edit article metadata, copy, source, and card styles.',
    fields: [
      { path: 'kicker', label: 'Kicker', type: 'text' },
      { path: 'title', label: 'Title', type: 'text' },
      { path: 'summary', label: 'Summary', type: 'textarea' },
      { path: 'sourceUrl', label: 'Source URL', type: 'text' },
    ],
    styleGroups: [
      {
        path: 'style.card',
        label: 'Card Styles',
        keys: ['backgroundColor', 'padding', 'borderRadius', 'boxShadow'],
      },
      {
        path: 'style.kicker',
        label: 'Kicker Styles',
        keys: ['color', 'fontSize', 'fontWeight'],
      },
      {
        path: 'style.title',
        label: 'Title Styles',
        keys: ['color', 'fontSize', 'fontWeight'],
      },
      {
        path: 'style.summary',
        label: 'Summary Styles',
        keys: ['color', 'fontSize', 'lineHeight'],
      },
      {
        path: 'style.source',
        label: 'Source Styles',
        keys: ['color', 'fontSize', 'textDecoration'],
      },
    ],
  },
  footer: HOME_CMS_SCHEMAS.footer,
}

export const CONTACT_CMS_DEFAULTS = {
  navigation: {
    links: sharedNavLinks.map((link) => ({ ...link, isActive: link.label === 'Contact' })),
    style: {
      container: {},
      link: {},
      activeLink: {},
    },
  },
  header: {
    title: 'AMADEO FITS CENTER - FARMERS INFORMATION AND TECHNOLOGY SERVICES AND MUNICIPAL AGRICULTURE OFFICE OF AMADEO',
    style: {
      section: {},
      title: {},
    },
  },
  contact: {
    facebook: 'https://www.facebook.com/FITSAmadeo1',
    email: 'amadeo.fitscenter2018@gmail.com',
    phone: '(046) 890 6438',
    style: {
      section: {},
      item: {},
      label: {},
      value: {},
    },
  },
  footer: {
    text: '\u00a9 2026 Cavite Upland Coffee Analytics. All rights reserved.',
    style: {
      footer: {},
      text: {},
    },
  },
}

export const CONTACT_CMS_SCHEMAS = {
  navigation: HOME_CMS_SCHEMAS.navigation,
  header: {
    title: 'Header Section',
    description: 'Edit the page header title.',
    fields: [
      { path: 'title', label: 'Header Title', type: 'text' },
    ],
    styleGroups: [
      {
        path: 'style.section',
        label: 'Section Styles',
        keys: ['padding', 'marginBottom', 'backgroundColor', 'textAlign'],
      },
      {
        path: 'style.title',
        label: 'Title Styles',
        keys: ['color', 'fontSize', 'fontWeight', 'lineHeight', 'textAlign'],
      },
    ],
  },
  contact: {
    title: 'Contact Information',
    description: 'Edit the contact details for Amadeo FITS Center.',
    fields: [
      { path: 'facebook', label: 'Facebook URL', type: 'text' },
      { path: 'email', label: 'Email Address', type: 'text' },
      { path: 'phone', label: 'Phone Number', type: 'text' },
    ],
    styleGroups: [
      {
        path: 'style.section',
        label: 'Section Styles',
        keys: ['padding', 'backgroundColor', 'borderRadius', 'maxWidth', 'margin'],
      },
      {
        path: 'style.item',
        label: 'Contact Item Styles',
        keys: ['marginBottom', 'padding', 'borderBottom'],
      },
      {
        path: 'style.label',
        label: 'Label Styles',
        keys: ['color', 'fontSize', 'fontWeight', 'display'],
      },
      {
        path: 'style.value',
        label: 'Value Styles',
        keys: ['color', 'fontSize', 'textDecoration'],
      },
    ],
  },
  footer: HOME_CMS_SCHEMAS.footer,
}
