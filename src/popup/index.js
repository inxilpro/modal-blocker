'use strict';

import log from '../shared/logger';
import React from 'react';
import { render } from 'react-dom';
import { getActiveTab } from '../shared/tabs';
import '../shared/ui.css';
import actions from '../shared/actions';
import Immutable from 'immutable';
import { getState, dispatch, subscribe, getDomainSettings } from '../shared/store';

class App extends React.Component {
	constructor(props) {
		super(props);

		// Set initially
		this.state = {
			loading: true
		};
	}

	componentDidMount() {
		this.refreshState();
		subscribe(this.refreshState.bind(this));
	}

	refreshState() {
		const store = getState();
		if (store && store.has('active_domain')) {
			const domain = store.get('active_domain');
			const tab = store.get('active_tab');
			getDomainSettings(domain).then(domainSettings => {
				this.setState({
					loading: false,
					block: domainSettings.block,
					favicon: (tab.has('favIconUrl') ? tab.get('favIconUrl') : null),
					store,
					domain
				});
			});
		}
	}

	toggleMode() {
		const store = this.state.store;
		const lastMode = store.getIn(['settings', 'mode']);
		const nextMode = ('whitelist' === lastMode ? 'blacklist' : 'whitelist');

		dispatch({
			type: actions.GLOBAL_SETTINGS,
			payload: {
				mode: nextMode
			}
		});
	}

	toggleDomain() {
		const domain = this.state.domain;
		const block = this.state.block;
		const mode = this.state.store.getIn(['settings', 'mode']);
		let settings = {};

		if ('whitelist' === mode && block) {
			settings.blacklisted = true;
			settings.whitelisted = false;
		} else if ('blacklist' === mode && !block) {
			settings.blacklisted = false;
			settings.whitelisted = true;
		} else {
			log('Unexpected combo', mode, block);
		}

		dispatch({
			type: actions.DOMAIN_SETTINGS,
			payload: {
				domain,
				settings
			}
		});
	}

	render() {
		const loading = this.state.loading;
		let mode = 'whitelist';
		let block = true;
		let domain = 'http://';

		if (!loading) {
			const store = this.state.store;
			mode = store.getIn(['settings', 'mode']);
			block = this.state.block;
			domain = this.state.domain;
		}

		const label = (block ? 'Unblock Modals' : 'Block Modals');
		const icon = (this.state.favicon ? <img width="13" height="13" src={this.state.favicon} /> : null);

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

/*
 const $modeToggle = document.getElementById('mode_toggle');
 const $pageToggleButton = document.getElementById('page_toggle_button');

 // Handle mode toggle
 $modeToggle.addEventListener('change', e => {
 const mode = ($modeToggle.checked ? 'whitelist' : 'blacklist');
 console.log($modeToggle.checked, mode);
 chrome.runtime.sendMessage({
 type: 'GLOBAL_SETTINGS',
 payload: {mode}
 });
 });

 // Handle page toggle
 $pageToggleButton.addEventListener('click', e => {
 getActiveTab().then(tab => {
 const url = new URL(tab.url);
 console.log(url.hostname);
 });
 });
 */