'use strict';

import * as tabs from './tabs';

chrome.browserAction.onClicked.addListener(() => {
	console.log('Clicked');
});

const blocked = new Map(); // FIXME: This will introduce memory leaks

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	var process = function() {
		console.log(request, sender);

		// Get block list for tab
		if (!blocked.has(sender.tab.id)) {
			blocked.set(sender.tab.id, new Set());
		}
		const blockList = blocked.get(sender.tab.id);

		// Handle request
		if ('blocked' === request.action) {
			chrome.pageAction.show(sender.tab.id);
			blockList.add(request.ref);
		} else if ('get_block_list' === request.action) {
			sendResponse(blockList);
		} else if ('unblock' === request.action) {
			chrome.tabs.sendMessage(sender.tab.id, request, function(response) {
				console.log(response);
			});
		}
	}

	if (!sender.tab) {
		chrome.tabs.query({
				currentWindow: true,
				active: true
			}, function(tabArray) {
				if (tabArray && tabArray[0]) {
					sender.tab = tabArray[0];
					process();
				}
			}
		);
	} else {
		process();
	}
});
