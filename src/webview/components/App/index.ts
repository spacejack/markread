import m from 'mithril'
import state from '../../state'

export default function App(): m.Component {
	return {
		view() {
			return m('.app',
				state.htmlContent != null
					? m.trust(state.htmlContent)
					: 'Drag & drop Markdown file here'
			)
		}
	}
}
