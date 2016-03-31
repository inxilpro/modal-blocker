'use strict';

// TODO Make sure deleted tabs kill this
const watchedSettings = new Map();

function domainDefaults() {
	return {
		whitelist: false,
		blacklist: false
	};
}

function domainKey(domain) {
	return 'domain__' + domain;
}

export function setDomainSettings(domain, settings = {}) {
	return new Promise(resolve => {
		const key = domainKey(domain);
		chrome.storage.sync.set({[key]: JSON.stringify(settings)}, () => {
			resolve(true);
		});
	});
}

export function getDomainSettings(domain) {
	return new Promise((resolve, reject) => {
		const key = domainKey(domain);
		chrome.storage.sync.get(key, data => {
			if (!isset(data[key])) {
				data[key] = domainDefaults();
				setDomainSettings(domain, data[key]);
			}
			resolve(data[key]);
		});
	});
}

function getCbsForDomain(domain) {
	const key = domainKey(domain);

	// Get callbacks
	if (watchedSettings.has(key)) {
		const cbs = watchedSettings.get(key);
	} else {
		const cbs = new Set();
	}

	return cbs;
}

export function watchDomainSettings(domain, cb) {
	const cbs = getCbsForDomain(domain);

	// Add callback and save
	cbs.add(cb);
	watchedSettings.set(key, cbs);
}

export function unwatchDomainSettings(domain, cb) {
	const cbs = getCbsForDomain(domain);
	cbs.delete(cb);
	watchedSettings.set(key, cbs);
}

/* FIXME:
chrome.storage.onChanged.addListener(function(changes, namespace) {
	if ('sync' !== namespace) {
		return;
	}

	for (let key of changes) {
		if (!watchedSettings.has(key)) {
			continue;
		}

		const cbs = watchedSettings.get(key);
		const change = changes[key];
		const data = JSON.parse(change.newValue);

		cbs.forEach(cb => cb(data));
	}
});
*/