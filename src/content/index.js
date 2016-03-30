'use strict';

import { walk, watch } from './dom';

// Action watcher
var acting = false;
var actingTimeout;
function act() {
	acting = true;
	clearTimeout(actingTimeout);
	actingTimeout = setTimeout(function() {
		acting = false;
	}, 750);
}
document.addEventListener('click', act, true);
document.addEventListener('keyup', act, true);



var zIndexMap = new Map();
function storeZIndexRef(node, zIndex) {
	let collection = zIndexMap.get(zIndex);
	if (!collection) {
		collection = new Set(); // Hrm
		zIndexMap.set(zIndex, collection);
	}
	collection.add(node);
}

var zIndexBlockLevel = Infinity;
function setBlockLevel(zIndex) {
	zIndexBlockLevel = zIndex;
	checkBlocks();
}

function checkBlocks()
{
	// console.log(zIndexMap);
	for (let [zIndex, nodes] of zIndexMap) {
		if (zIndex >= zIndexBlockLevel) {
			for (let node of nodes) {
				// console.log(node);
				block(node);
			}
		}
	}
}

var refIndex = 0;
const blockRefs = [];
const refMap = new WeakMap();

function block(node) {
	// Temporarily disable on user action
	if (true === acting) {
		// console.log('Will allow due to user action');
		return;
	} else {
		//console.log('Block!', node);
	}

	// Only block if display isn't set to none
	var display = getStyle(node).getPropertyValue('display');
	if ('none' === display) {
		return;
	}

	// Store ref
	let refSymbol;
	if (refMap.has(node)) {
		refSymbol = refMap.get(node);
	} else {
		refSymbol = ++refIndex;
		refMap[node] = refSymbol;
	}
	blockRefs[refSymbol] = node;
	// console.log(blockRefs);

	// Send to Chrome
	chrome.runtime.sendMessage({
		action: 'blocked',
		ref: refSymbol
	});

	// Aaaand, block
	node.style.display = 'none';
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	// console.log(blockRefs, blockRefs.length);
	act();
	blockRefs.forEach(function(node, idx) {
		console.log(node);
		if (node && node.style) {
			node.style.display = 'block'; // FIXME
		}
	});
});

function handleChange(node) {
	if (node === window) {
		return;
	}

	const winWidth = window.innerWidth;
	const winHeight = window.innerHeight;
	const nodeWidth = node.scrollWidth;
	const nodeHeight = node.scrollHeight;
	const zIndex = parseInt(getStyle(node).getPropertyValue('z-index'), 10);

	// console.log(zIndex, node);

	// Store initial ref (this isn't particularly efficient here)
	storeZIndexRef(node, zIndex);

	if (nodeWidth >= winWidth && nodeHeight >= winHeight) {
		// console.log('New block level: ', zIndex);
		setBlockLevel(zIndex);
	}

	checkBlocks();
}

function checkNode(node) {
	// Check to see if node has z-index
	const zIndex = parseInt(getStyle(node).getPropertyValue('z-index'), 10);

	// console.log(zIndex, node.id, node.className);

	// Don't worry about elements without a z-index
	if (!zIndex) {
		return;
	}

	watch(node, handleChange);
}

// This is probably not necessary:
// Walk DOM tree on page load (let scripts run, so not using DOM ready)
// document.addEventListener('load', function() {
// 	walk(document.body, checkNode);
// });

document.addEventListener('DOMNodeInserted', function(event) {
	walk(event.target, checkNode);
});

// console.log('Modal blocker running...');
walk(document.body, checkNode);