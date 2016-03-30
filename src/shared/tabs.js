'use strict';

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
export function setData(tabId, key, value) {
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
export function getData(tabId, key) {
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
export function hasData(tabId, key) {
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
export function removeData(tabId, key) {
	const collection = getCollection(tabId);
	return collection.delete(key);
}

// Data index management
if (chrome && chrome.tabs) {
	chrome.tabs.onReplaced.addListener((addedId, removedId) => data.delete(removedId));
	chrome.tabs.onRemoved.addListener(id => data.delete(id));
}