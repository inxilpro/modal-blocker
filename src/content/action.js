'use strict';

var actingTimeout;
var acting = false;

export function isActing() {
	return acting;
}

// Action watcher
function act() {
	acting = true;
	clearTimeout(actingTimeout);
	actingTimeout = setTimeout(function() {
		acting = false;
	}, 750);
}

// Add listeners
document.addEventListener('click', act, true);
document.addEventListener('keyup', act, true);