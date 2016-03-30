'use strict';

export default function log() {
	// Don't log in production
	if ('production' === process.env.NODE_ENV) {
		return;
	}

	// Otherwise, pass to console.log
	const args = Array.prototype.slice.call(arguments);
	return console.log.apply(console, args);
}