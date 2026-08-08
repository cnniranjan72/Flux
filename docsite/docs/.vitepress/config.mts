import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: true })

export default defineConfig(withMermaid({
  title: 'Flux ERP/CRM',
  description: 'Mini ERP + CRM Operations Portal — documentation',
  lang: 'en-US',
  base: '/Flux/',
  lastUpdated: true,

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Overview', link: '/overview' },
      { text: 'API Docs', link: '/api-docs' },
      { text: 'Deployment', link: '/deployment' },
      { text: 'Live App', link: 'http://52.90.161.120' },
    ],
    sidebar: [
      {
        text: 'Documentation',
        items: [
          { text: 'Home', link: '/' },
          { text: 'Project Overview', link: '/overview' },
          { text: 'API Reference', link: '/api-docs' },
          { text: 'Deployment Guide', link: '/deployment' },
        ],
      },
    ],
    footer: {
      message: 'Flux ERP/CRM — Full Stack Developer Case Study',
      copyright: '© 2026',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/cnniranjan72/Flux' },
    ],
    outline: { level: [2, 3], label: 'On this page' },
  },
}))
