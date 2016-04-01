'use strict';

import log from '../shared/logger';
import { getDomainSettings, dispatch, getState, loadFromStorage } from '../shared/store';

// Load state from storage ASAP
loadFromStorage();

// Handle tab change
chrome.tabs.onUpdated.addListener((tabId, changes, tab) => {
	if (!tab.url) {
		return;
	}

	const url = new URL(tab.url);
	getDomainSettings(url.hostname).then(settings => {
		const enabled = (false !== settings.block);
		const message = {
			type: 'SET_ENABLED',
			payload: enabled
		};
		chrome.tabs.sendMessage(tabId, message);
	});
});

// Pass messages to store messages
chrome.runtime.onMessage.addListener((request, sender, cb) => {
	dispatch(request);
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