'use strict';

import log from '../shared/logger';
import React from 'react';
import { render } from 'react-dom';
import '../shared/ui.css';
import actions from '../shared/actions';
import Immutable from 'immutable';
import { getTab, getDomain, shouldBlockDomain } from '../shared/store-utils';

class App extends React.Component {
	constructor(props) {
		super(props);

		// Set initially
		this.state = {
			loading: true
		};
	}

	componentDidMount() {
		const port = this.port = chrome.runtime.connect({ name: 'popup' });
		port.onMessage.addListener(request => {
			log(request.type, request.payload);
			switch (request.type) {
				case 'SET_STATE':
					this.refreshState(Immutable.fromJS(request.payload)); // FIXME
					break;

				default:
					log('Unknown request', request);
					break;
			}
		});
		port.postMessage({ type: 'REQUEST_STATE' });
	}

	componentWillUnmount() {
		if (this.port && this.port.disconnect) {
			this.port.disconnect();
		}
	}

	refreshState(state) {
		if (state && state.has('active_domain')) {
			const domainName = state.get('active_domain');
			const domain = getDomain(state, domainName);
			const tabId = state.get('active_tab');
			const tab = getTab(state, tabId);
			const block = shouldBlockDomain(state, domainName);
			const mode = state.getIn(['settings', 'mode'], 'whitelist');

			this.setState({
				loading: false,
				favicon: (tab.favIconUrl ? tab.favIconUrl : null),
				mode,
				block,
				state,
				domain
			});
		} else {
			if (!this.loadTimeoutInterval) {
				this.loadTimeoutInterval = 1;
			}

			setTimeout(() => {
				this.port.postMessage({
					type: actions.LOAD_ACTIVE_TAB
				});
			}, this.loadTimeoutInterval);

			this.loadTimeoutInterval += 100;
		}
	}

	toggleMode() {
		const lastMode = this.state.mode;
		const nextMode = ('whitelist' === lastMode ? 'blacklist' : 'whitelist');

		this.port.postMessage({
			type: actions.GLOBAL_SETTINGS,
			payload: {
				mode: nextMode
			}
		});
	}

	toggleDomain() {
		const domain = this.state.domain;
		const currentlyBlocking = this.state.block;
		const mode = this.state.mode;

		let blacklisted = false;
		let whitelisted = false;

		if ('whitelist' === mode && currentlyBlocking) {
			whitelisted = true;
		} else if ('blacklist' === mode && !currentlyBlocking) {
			blacklisted = true;
		} else {
			log('Unexpected combo', mode, currentlyBlocking);
		}

		this.port.postMessage({
			type: actions.DOMAIN_SETTINGS,
			payload: {
				...domain,
				blacklisted,
				whitelisted
			}
		});
	}

	render() {
		const state = this.state;
		const loading = state.loading;

		let mode = 'whitelist';
		let block = true;
		let domain = 'http://';

		if (!loading) {
			mode = state.mode;
			block = state.block;
			domain = state.domain.name;
		}

		const label = (block ? 'Don\'t Block' : 'Block');
		const icon = (state.favicon ? <img width="13" height="13" src={state.favicon} /> : null);

		return (
			<div>
				<div id="mode_toggle_container">
					<label>
						<input type="checkbox" checked={mode === 'whitelist'} disabled={loading} onChange={this.toggleMode.bind(this)} />
						Block modals by default
					</label>
				</div>

				<div id="page_toggle_container">
					<button id="page_toggle_button" disabled={loading} className={block ? 'toggled' : ''} onClick={this.toggleDomain.bind(this)}>
						{label}
						<br />
						<small>{icon} {domain}</small>
					</button>
				</div>
			</div>
		);
	}
}

render(<App />, document.getElementById('root'));