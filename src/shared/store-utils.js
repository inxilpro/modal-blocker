'use strict';

import log from './logger';
import Immutable from 'immutable';

export function shouldBlockDomain(state, domainName) {
	const mode = state.getIn(['settings', 'mode'], 'whitelist');
	const domain = getDomain(state, domainName);
	let block = ('blacklist' !== mode);

	if ('whitelist' === mode && true === domain.whitelisted) {
		block = false;
	} else if ('blacklist' === mode && true === domain.blacklisted) {
		block = true;
	}

	log('Whitelisted', domain.whitelisted, 'Blacklisted', domain.blacklisted, 'Mode', mode, 'Block', block);

	return block;
}

export function normalizeTab(tab) {
	let domain;
	if (!tab.domain && tab.url) {
		domain = (new URL(tab.url)).hostname;
	}

	return {
		blocked: 0,
		domain,
		...tab
	};
}

export function getTab(state, tabId) {
	if (state.hasIn(['tabs', tabId])) {
		return Promise.resolve(state.getIn(['tabs', tabId]));
	}

	return new Promise((resolve, reject) => {
		chrome.tabs.get(tabId, tab => {
			if (!tab) {
				return reject();
			}
			return resolve(normalizeTab(tab));
		});
	});
}

export function normalizeDomain(domain) {
	if ('string' === typeof domain || domain instanceof String) {
		domain = { name: domain };
	}

	return {
		blacklisted: false,
		whitelisted: false,
		...domain
	};
}

export function getDomain(state, domain) {
	if ('string' === typeof domain) {
		domain = { name: domain };
	} else if (Immutable.Map.isMap(domain)) {
		domain = domain.toJS(); // FIXME
	}

	const key = ['domains', domain.name];
	if (state.hasIn(key)) {
		domain = state.getIn(key);
		if (Immutable.Map.isMap(domain)) {
			domain = domain.toJS(); // FIXME
		}
	}

	return normalizeDomain(domain);
}