'use strict';

import log from '../shared/logger';
import { dispatch, getState, loadFromStorage, subscribe } from './store';
import { getTab, getDomain } from '../shared/store-utils';

// chrome.storage.sync.clear();

// Load state from storage ASAP
loadFromStorage();

// Message bus
chrome.runtime.onConnect.addListener(port => {
	const passChange = state => {
		port.postMessage({
			type: 'SET_STATE',
			payload: state.toJS()
		});
	};
	port.onMessage.addListener(request => {
		log(request);
		switch (request.type) {
			case 'REQUEST_STATE':
				// TODO: Could be more selective about data here
				let unsubscribe = subscribe(() => passChange(getState()));
				port.onDisconnect.addListener(() => unsubscribe());
				passChange(getState());
				break;

			default:
				dispatch(request);
				break;
		}
	});
});


// Handle tab change
chrome.tabs.onUpdated.addListener((tabId, changes, tab) => {
	const state = getState();
	getTab(state, tab.id).then(tab => {
		if (!tab.domain) {
			return;
		}

		const domain = getDomain(state, tab.domain);
		chrome.tabs.sendMessage(tabId, {
			type: 'INIT',
			payload: {
				settings: state.get('settings').toJS(),
				domain,
				tab
			}
		});
	});
});


/*
function updateIconForTab(tabId) {
	const blockCount = tabs.getEphemeralData(tabId, 'block_count');
	log(blockCount + ' blocked for current tab');

	if (!blockCount) {
		chrome.browserAction.disable(tabId);
		chrome.browserAction.setIcon({
			path: {
				"16": "$assets/icon-16.png",
				"19": "$assets/icon-19.png",
				"32": "$assets/icon-32.png",
				"38": "$assets/icon-38.png",
				"128": "$assets/icon-128.png"
			}
		});
		chrome.browserAction.setTitle({
			tabId,
			title: 'No modals blocked'
		});
	} else {
		chrome.browserAction.enable(tabId);
		chrome.browserAction.setIcon({
			path: {
				"16": "$assets/icon-16-on.png",
				"19": "$assets/icon-19-on.png",
				"32": "$assets/icon-32-on.png",
				"38": "$assets/icon-38-on.png",
				"128": "$assets/icon-128-on.png"
			}
		});
		chrome.browserAction.setTitle({
			tabId,
			title: 'Show blocked modals'
		});
	}
}

// Send clicks to content script
chrome.browserAction.onClicked.addListener(() => {
	tabs.getActiveTab().then(tab => {
		const tabId = tab.id;
		log('Requesting whitelist for #' + tabId);
		chrome.tabs.sendMessage(tabId, {action: 'whitelist'}, function(response) {
			log(response + ' node(s) whitelisted');
			tabs.setEphemeralData(tabId, 'block_count', 0);
			updateIconForTab(tabId);
		});
	});
});

// Handle messages from content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	// Only handle 'block_count' actions from content script
	if (!sender.tab || !request.action || 'block_count' !== request.action) {
		return;
	}

	// Save data to tab
	const tabId = sender.tab.id;
	tabs.setEphemeralData(tabId, 'block_count', request.count);
	updateIconForTab(tabId);
});

// Handle tab change
chrome.tabs.onActivated.addListener(({tabId, windowId}) => {
	updateIconForTab(tabId);
});
*/