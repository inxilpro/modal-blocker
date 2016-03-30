'use strict';

const getStyle = window.document.defaultView.getComputedStyle;

// Modules vars
var zIndexBlockLevel = Infinity;
var cb;

// Set up stores
const walked = new WeakSet();
const whitelist = new WeakSet();
const nodeData = new Map();

export function setCallback(callback) {
	cb = callback;
}

export function walk(node) {
	// Skip non-element nodes
	if (1 !== node.nodeType || walked.has(node)) {
		return;
	}

	// Check node
	walked.add(node);
	watch(node);

	// Walk children
	node = node.firstChild;
	while (node) {
		walk(node);
		node = node.nextSibling;
	}
}

function handleChange(node) {
	// Convert event to node
	if (node.target) {
		node = node.target;
	}

	// Calculate everything we need
	const winWidth = window.innerWidth;
	const winHeight = window.innerHeight;
	const nodeWidth = node.scrollWidth;
	const nodeHeight = node.scrollHeight;
	const zIndex = parseInt(getStyle(node).getPropertyValue('z-index'));

	// Skip nodes w/o a z-index
	if (!zIndex) {
		return;
	}

	// Store node ref
	nodeData.set(node, zIndex);

	// Check to see if we need to change the block level
	if (nodeWidth >= winWidth && nodeHeight >= winHeight) {
		zIndexBlockLevel = zIndex;
	}

	// Check nodes
	nodeData.forEach((node, zIndex) => {
		if (zIndex >= zIndexBlockLevel) {
			cb(node);
		}
	});
}

export function watch(node) {
	// Watch for change events
	node.addEventListener('DOMAttrModified', handleChange);
	node.addEventListener('DOMSubtreeModified', handleChange);

	// Watch for mutations
	var observer = new MutationObserver(handleChange);
	observer.observe(node, {
		attributes: true,
		attributeFilter: [
			'style',
			'className'
		]
	});

	// And check right away
	handleChange(node);
}

export function addToWhitelist(node) {
	return whitelist.add(node);
}
