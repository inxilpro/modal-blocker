'use strict';

import log from '../shared/logger';
import { watchDomainSettings, unwatchDomainSettings, getDomainSettings } from '../shared/settings';

const data = new Map();

/**
 * Get current active tab
 * @returns {Promise}
 */
export function getActiveTab() {
	return new Promise((resolve, reject) => {
		const query = {
			currentWindow: true,
			active: true
		};
		chrome.tabs.query(query, tabs => {
			if (tabs && tabs[0]) {
				return resolve(tabs[0]);
			}
			return reject('no active tab');
		});
	});
}

/**
 * Get data collection for tab
 *
 * @param {Number} tabId
 * @returns {*}
 */
export function getCollection(tabId) {
	if (!data.has(tabId)) {
		data.set(tabId, new Map());
	}
	return data.get(tabId);
}

/**
 * Add stored data for tab
 *
 * @param {Number} tabId
 * @param {String} key
 * @param {*} value
 */
export function setEphemeralData(tabId, key, value) {
	const collection = getCollection(tabId);
	collection.set(key, value);
}

/**
 * Get stored data
 *
 * @param {Number} tabId
 * @param {String} key
 * @returns {*}
 */
export function getEphemeralData(tabId, key) {
	const collection = getCollection(tabId);
	return collection.get(key);
}

/**
 * Check if tab has data by key
 *
 * @param {Number} tabId
 * @param {String} key
 * @returns {Boolean}
 */
export function hasEphemeralData(tabId, key) {
	const collection = getCollection(tabId);
	return collection.has(key);
}

/**
 * Remove data for tab
 *
 * @param {Number} tabId
 * @param {String} key
 * @returns {boolean|*}
 */
export function removeEphemeralData(tabId, key) {
	const collection = getCollection(tabId);
	return collection.delete(key);
}

function loadSettingsForTab(tab) {
	if (!tab.url) {
		return;
	}

	const update = data => {
		Object.keys(data).forEach(key => {
			setEphemeralData(tab.id, key, data[key]);
		});
	};

	const url = new URL(tab.url);
	getDomainSettings(url.hostname).then(update);
	watchDomainSettings(url.hostname, update);
}

// Data index management
if (chrome && chrome.tabs) {
	chrome.tabs.onReplaced.addListener((addedId, removedId) => data.delete(removedId));
	chrome.tabs.onRemoved.addListener(id => data.delete(id));

	// Pull settings into ephemeral on update
	chrome.tabs.onUpdated.addListener((id, changes, tab) => {
		loadSettingsForTab(tab);
	});
	chrome.tabs.onCreated.addListener(loadSettingsForTab);
}