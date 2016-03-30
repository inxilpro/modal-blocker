'use strict';

const data = new Map();

export function getCollection(tabId) {
	if (!data.has(tabId)) {
		data.set(tabId, new Map());
	}
	return data.get(tabId);
}

export function addData(tabId, key, value) {
	const collection = getCollection(tabId);
	return collection.set(key, value);
}

export function getData(tabId, key) {
	const collection = getCollection(tabId);
	return collection.get(key);
}

export function hasData(tabId, key) {
	const collection = getCollection(tabId);
	return collection.has(key);
}

export function removeData(tabId, key) {
	const collection = getCollection(tabId);
	return collection.delete(key);
}

// Data index management
chrome.tabs.onReplaced.addListener((addedId, removedId) => data.delete(removedId));
chrome.tabs.onRemoved.addListener(id => data.delete(id));