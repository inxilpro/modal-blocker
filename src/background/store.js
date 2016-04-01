'use strict';

import log from './../shared/logger';
import actions from './../shared/actions';
import * as Immutable from 'immutable';
import { createStore } from 'redux';
import { handleAction } from 'redux-actions';
import reduceReducers from 'reduce-reducers';
import { normalizeTab, normalizeDomain, getDomain } from '../shared/store-utils';

const initialState = Immutable.fromJS({
	settings: {
		mode: 'whitelist'
	}
});

const store = createStore(reduceReducers(
	// Replace state
	handleAction(actions.UPDATE_STATE, (state, action) => {
		return state.mergeDeep(action.payload);
	}),

	// Set a tab
	handleAction(actions.SET_TAB, (state, action) => {
		let tab = action.payload;
		return state.setIn(['tabs', tab.id], tab);
	}),

	// Activate a tab
	handleAction(actions.ACTIVATE_TAB, (state, action) => {
		const tabId = action.payload;
		let tab = state.getIn(['tabs', tabId]);

		return state.withMutations(nextState => {
			// Set active tab
			nextState.set('active_tab', tabId);

			// Set active domain, if exists
			if (tab && tab.domain) {
				log('Active domain: ' + tab.domain);
				nextState.set('active_domain', tab.domain);
			} else {
				nextState.delete('active_domain');
			}
		});
	}),

	// Delete a tab
	handleAction(actions.DELETE_TAB, (state, action) => {
		return state.deleteIn(['tabs', action.payload]);
	}),

	// Set domain settings
	handleAction(actions.DOMAIN_SETTINGS, (state, action) => {
		return state.setIn(['domains', action.payload.name], action.payload);
	}),

	// Set global settings
	handleAction(actions.GLOBAL_SETTINGS, (state, action) => {
		return state.mergeDeep({'settings': action.payload});
	}),

	// Load active tab
	handleAction(actions.LOAD_ACTIVE_TAB, (state, action) => {
		chrome.tabs.query({ active: true }, tabs => { // FIXME: currentWindow
			tabs.forEach(tab => {
				dispatchTab(tab);
				dispatch({
					type: actions.ACTIVATE_TAB,
					payload: tab.id
				});
			});
		});
		return state;
	})
), initialState);

window.store = store; // FIXME

export function subscribe(cb) {
	return store.subscribe(cb);
}

export function dispatch(message) {
	store.dispatch(message);
}

export function getState() {
	let state = store.getState();
	if (!state) {
		state = initialState;
	}
	return state;
}

// Persist state on change
let savingTimeout;
store.subscribe(() => {
	let state = store.getState();

	state = state.delete('tabs'); // Don't persist tab data
	state = JSON.stringify(state.toJS());

	// FIXME: This shouldn't fire if only 'tabs' has changed
	clearTimeout(savingTimeout);
	savingTimeout = setTimeout(() => {
		chrome.storage.sync.set({state}, function() {
			// log('State saved to Chrome storage');
		});
	}, 1000);
});

// Load from Chrome
export function loadFromStorage() {
	chrome.storage.sync.get('state', data => {
		if (data.state) {
			// Dispatch state from storage
			store.dispatch({
				type: actions.UPDATE_STATE,
				payload: Immutable.fromJS(JSON.parse(data.state))
			});
		}
	});
}

// Listen to sync changes (from other devices)
chrome.storage.onChanged.addListener(function(changes, namespace) {
	if ('sync' !== namespace) {
		return;
	}

	loadFromStorage();
});

/**
 * Build a domain
 * @param {Map} domainName
 */
function dispatchDomain(domainName) {
	const state = store.getState();

	dispatch({
		type: actions.DOMAIN_SETTINGS,
		payload: getDomain(state, domainName)
	});
}

function dispatchTab(tab) {
	tab = normalizeTab(tab);

	if (tab.domain) {
		dispatchDomain(tab.domain);
	}

	store.dispatch({
		type: actions.SET_TAB,
		payload: tab
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
	const activateTab = tab => {
		if (tab.domain) {
			dispatchDomain(tab.domain);
		}

		dispatch({
			type: actions.ACTIVATE_TAB,
			payload: tab.id
		});
	};
	chrome.tabs.onActivated.addListener(({tabId, windowId}) => {
		// Check to see if we need to get the tab first
		const state = store.getState();
		if (!state.hasIn(['tabs', tabId])) { // TODO: Might want to use getTab() here
			chrome.tabs.get(tabId, tab => {
				dispatchTab(tab);
				activateTab(tab);
			});
		} else {
			const tab = state.getIn(['tabs', tabId]);
			activateTab(tab);
		}
	});
}