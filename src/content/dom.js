'use strict';

import log from '../shared/logger';

// Modules vars
var zIndexBlockLevel = Infinity;
var cb;

// Set up stores
const walked = new WeakSet();
const nodeData = new Map();
const zIndexes = new WeakMap();

export function setCallback(callback) {
	cb = callback;
}

export function walk(node) {
	// Convert event to node
	if (node.target) {
		node = node.target;
	}

	// Skip non-element nodes
	if (1 !== node.nodeType || walked.has(node)) {
		return;
	}

	// Check node
	walked.add(node);
	handleChange(node);

	// Walk children
	node = node.firstChild;
	while (node) {
		handleChange(node);
		node = node.nextSibling;
	}
}

function getZIndex(node) {
	if (!(node instanceof Element)) {
		return 0;
	}

	const style = window.document.defaultView.getComputedStyle(node);
	let zIndex = parseInt(style.getPropertyValue('z-index'));
	if (!zIndex) {
		zIndex = 0;
	}
	return zIndex;
}

export function zwalk(node, parentIndex = 0) {
	// Skip non-element nodes
	if (1 !== node.nodeType) {
		return;
	}

	// Check node
	let zIndex = getZIndex(node);
	if (!zIndex) {
		if (parentIndex) {
			zIndex = parentIndex;
		} else {
			// Walk parents
			let parent = node.parentNode;
			while (parent && !zIndex) {
				zIndex = getZIndex(parent);
				parent = parent.parentNode;
			}
		}
	}
	zIndexes.set(node, zIndex);

	// Walk children
	node = node.firstChild;
	while (node) {
		zwalk(node, zIndex);
		node = node.nextSibling;
	}
}

function handleChange(node) {
	// Convert event to node
	if (node.target) {
		node = node.target;
	}

	// Skip changes on non-Elements
	if (!(node instanceof Element)) {
		return;
	}

	// Calculate everything we need
	const winWidth = window.innerWidth;
	const winHeight = window.innerHeight;
	const nodeWidth = node.scrollWidth;
	const nodeHeight = node.scrollHeight;
	const zIndex = zIndexes.get(node);

	if (node.id === 'monetate_lightbox_mask') {
		log('Window W', winWidth, 'H', winHeight, 'Node W', nodeWidth, 'H', nodeHeight, 'Z', zIndex, 'ID', node.id, 'C', node.className);
	}

	// Skip nodes w/o a z-index
	if (!zIndex) {
		return;
	}

	// Store node ref
	nodeData.set(node, zIndex);

	// Check to see if we need to change the block level
	if (nodeWidth >= winWidth && nodeHeight >= winHeight) {
		log('New Z-Index', zIndex);
		zIndexBlockLevel = zIndex;
	}

	// Check nodes
	nodeData.forEach((zIndex, node) => {
		if (zIndex >= zIndexBlockLevel) {
			cb(node);
		}
	});
}

const observer = new MutationObserver(mutations => {
	const nodes = mutations.reduce((nodes, mutation) => {
		nodes.push(mutation.target);
		return nodes;
	}, []);
	nodes.forEach(node => {
		zwalk(node);
		handleChange(node);
	});
});
observer.observe(document.body, {
	subtree: true,
	attributes: true,
	attributeFilter: [
		'style',
		'className'
	]
});