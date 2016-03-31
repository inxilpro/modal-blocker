'use strict';

import log from './logger';
import actions from './actions';
import * as Immutable from 'immutable';
import { createStore } from 'redux';

let loaded = false;

const initialState = Immutable.fromJS({
	settings: {
		mode: 'whitelist'
	}
});

const store = createStore((state = initialState, action) => {
	log('Processing action', action);

	switch (action.type) {
		case actions.REPLACE_STATE:
			loaded = true;
			return action.payload;
			break;

		case actions.CREATE_TAB:
		case actions.UPDATE_TAB:
			const tab = action.payload;
			return state.setIn(['tabs', tab.id], tab);
			break;

		case actions.ACTIVATE_TAB:
			return state.withMutations(state => {
				state.set('active_tab', action.payload);
				if (action.payload.domain) {
					state.set('active_domain', action.payload.domain);
				}
			});
			break;

		case actions.DELETE_TAB:
			return state.deleteIn(['tabs', action.payload]);
			break;

		case actions.DOMAIN_SETTINGS:
			return state.setIn(['domains', action.payload.domain], action.payload.settings);
			break;

		case actions.GLOBAL_SETTINGS:
			return state.mergeDeep({'settings': action.payload});
			break;

		default:
			return state;
	}
});

export function subscribe(cb) {
	store.subscribe(cb);
}

export function dispatch(message) {
	store.dispatch(message);
}

export function getState() {
	return store.getState();
}

// Persist state on change
store.subscribe(() => {
	let state = store.getState();

	state = state.delete('tabs'); // Don't persist tab data
	state = JSON.stringify(state.toJS());

	chrome.storage.sync.set({state}, function() {
		log('State saved to Chrome storage');
	});
});

// Load from Chrome
chrome.storage.sync.get('state', data => {
	if (!data.state) {
		// Dispatch empty state
		store.dispatch({
			type: actions.REPLACE_STATE,
			payload: initialState
		});
	} else {
		// Dispatch state from storage
		store.dispatch({
			type: actions.REPLACE_STATE,
			payload: Immutable.fromJS(JSON.parse(data.state))
		});
	}
});

function dispatchTab(tab) {
	let domain;
	if (tab.url) {
		const url = new URL(tab.url);
		domain = url.hostname;
	}
	store.dispatch({
		type: actions.UPDATE_TAB,
		payload: {
			id: tab.id,
			blocked: 0,
			domain
		}
	});
}

// Push tab changes to store
if (chrome && chrome.tabs) {
	// Remove a tab when replaced
	chrome.tabs.onReplaced.addListener((addedId, removedId) => store.dispatch({
		type: actions.DELETE_TAB,
		payload: removedId
	}));

	// Handle removed tab
	chrome.tabs.onRemoved.addListener(id => store.dispatch({
		type: actions.DELETE_TAB,
		payload: id
	}));

	// Dispatch new tabs
	chrome.tabs.onCreated.addListener(dispatchTab);
	chrome.tabs.onUpdated.addListener((id, changes, tab) => dispatchTab(tab));

	// Set currently active tab
	chrome.tabs.onActivated.addListener(({tabId, windowId}) => {
		chrome.tabs.get(tabId, tab => {
			let domain;
			if (tab.url) {
				const url = new URL(tab.url);
				domain = url.hostname;
			}
			const payload = {
				domain,
				...tab
			};

			store.dispatch({
				type: actions.ACTIVATE_TAB,
				payload
			});
		});
	});
}

// Store data accessors
// ---------------------------------------------------------------------------------------------------------------------

function waitForLoad(cb) {
	// Resolve immediately if loaded
	if (loaded) {
		return Promise.resolve(cb(store.getState()));
	}

	// Otherwise wait for "loading" to be true
	return new Promise(resolve => {
		let waiting = setInterval(() => {
			if (loaded) {
				clearInterval(waiting);
				resolve(cb(store.getState()));
			}
		}, 100);
	});
}

export function getTab(tabId) {
	return waitForLoad(state => {
		if (state.hasIn(['tabs', tabId])) {
			return state.getIn(['tabs', tabId]);
		}

		// Load tab if we don't have it
		return new Promise((resolve, reject) => {
			chrome.tabs.get(tabId, tab => {
				dispatchTab(tab);
				resolve(getTab(tabId));
			});
		});
	});
}

export function getDomainSettings(domain) {
	return waitForLoad(state => {
		const mode = state.getIn(['settings', 'mode']);
		let block = ('blacklist' === mode ? false : true);
		let explicitlyBlacklisted = false;
		let explicitlyWhitelisted = false;

		// Load settings if we have 'em
		if (state.hasIn(['domains', domain])) {
			const settings = state.getIn(['domains', domain]);
			if (true === settings.get('blacklisted')) {
				explicitlyBlacklisted = true;
			}
			if (true === settings.get('whitelisted')) {
				explicitlyWhitelisted = true;
			}
		}

		// Block logic
		if ('blacklist' === mode && explicitlyWhitelisted) {
			block = false;
		} else if ('whitelist' === mode && explicitlyBlacklisted) {
			block = true;
		}

		return {block};
	});
}

export function setDomainSettings(domain, settings = {}) {
	return waitForLoad(state => {
		store.dispatch({
			type: actions.DOMAIN_SETTINGS,
			payload: {
				domain,
				settings
			}
		});
	});
}

export function getSettings() {
	return waitForLoad(state => {
		return state.get('settings');
	});
}