export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bdc: {
          brown:  '#92610F',
          dark:   '#633806',
          light:  '#FDF3E3',
          border: '#E8D5B0'
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace']
      }
    }
  },
  plugins: []
}
