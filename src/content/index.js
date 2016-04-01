'use strict';

import { walk, zwalk, setCallback } from './dom';
import { isActing } from './action';
import log from '../shared/logger';
import { getState, subscribe, getDomainSettings } from '../shared/store';

let enabled = true;

const domain = (new URL(window.location.href)).hostname;
const whitelist = new WeakSet();
const blocklist = new Set();
const previousProperties = new WeakMap();

function refresh() {
	const state = getState();
	const mode = state.getIn(['settings', 'mode']);
	if ('blacklist' === mode) {
		enabled = false;
	}
	getDomainSettings(domain).then(settings => {
		enabled = settings.block;
	});
}

refresh();
subscribe(refresh);

setCallback(function(node) {
	// Check if this should be ignored
	if (!enabled || isActing() || whitelist.has(node)) {
		return;
	}

	// Check if previously blocked
	if (!blocklist.has(node)) {
		blocklist.add(node);

		// Send to Chrome
		chrome.runtime.sendMessage({
			action: 'block_count',
			count: blocklist.size
		});
	}

	// Check if display already === "none"
	const styles = window.document.defaultView.getComputedStyle(node);
	const display = styles.getPropertyValue('display');
	if ('none' === display) {
		return;
	}

	// Save properties for later
	previousProperties.set(node, { display });

	// Aaaand, block
	node.style.display = 'none';
});

// Handle click events from button
/*
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	switch (request.type) {
		case 'SET_ENABLED':
			enabled = request.payload;
			break;

		case 'WHITELIST_CURRENT':
			blocklist.forEach(node => {
				// Move from block list to whitelist
				blocklist.delete(node);
				whitelist.add(node);

				// Restore props
				const props = previousProperties.get(node);
				node.style.display = props.display;
			});
			break;
	}
});
*/

// Add listeners
zwalk(document.body);
walk(document.body);

log('Modal blocker running.');