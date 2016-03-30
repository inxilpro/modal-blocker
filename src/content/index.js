'use strict';

import { walk, zwalk, setCallback } from './dom';
import { isActing } from './action';
import { getActiveTab, getData, setData } from '../shared/tabs';
import log from '../shared/logger';

const whitelist = new WeakSet();
const blocklist = new Set();
const previousProperties = new WeakMap();

setCallback(function(node) {
	// Check if this should be ignored
	if (isActing() || whitelist.has(node)) {
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
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	// Only handle 'whitelist' actions
	if (!request.action || 'whitelist' !== request.action) {
		return;
	}

	const blockCount = blocklist.size;

	blocklist.forEach(node => {
		// Move from block list to whitelist
		blocklist.delete(node);
		whitelist.add(node);

		// Restore props
		const props = previousProperties.get(node);
		node.style.display = props.display;
	});

	// Tell bg process how many nodes were whitelisted
	sendResponse(blockCount);
});

// Add listeners
zwalk(document.body);
walk(document.body);

log('Modal blocker running.');