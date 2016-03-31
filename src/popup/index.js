'use strict';

import { getActiveTab } from '../shared/tabs';
import '../shared/ui.css';

const $modeToggle = document.getElementById('mode_toggle');
const $pageToggleButton = document.getElementById('page_toggle_button');

// Handle mode toggle
$modeToggle.addEventListener('change', e => {
	console.log($modeToggle.checked);
});

// Handle page toggle
$pageToggleButton.addEventListener('click', e => {
	getActiveTab().then(tab => {
		const url = new URL(tab.url);
		console.log(url.hostname);
	});
});