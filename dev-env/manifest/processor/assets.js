import fs from 'fs-extra'
import path from 'path'
import _ from 'lodash'

import * as paths from '../../paths'
import * as log from '../log'
import * as Remove from '../../util/remove';

const buildAssetsDir = "$assets"

const processAsset = function (object, key, buildPath) {
	const assetPath = object[key]

	log.pending(`Processing asset '${assetPath}'`)

	// Create directory if not exists
	const buildAssetsDirPath = path.join(buildPath, buildAssetsDir)
	try {
		const buildAssetsDirStats = fs.lstatSync(buildAssetsDirPath);

		if (!buildAssetsDirStats.isDirectory()) {
			fs.mkdirsSync(buildAssetsDirPath)
		}
	} catch (ex) {
		fs.mkdirsSync(buildAssetsDirPath)
	}

	const assetSrcPath = path.join(paths.src, assetPath)
	const buildAssetPath = path.join(buildAssetsDir, Remove.path(assetPath))
	const assetDestPath = path.join(buildPath, buildAssetPath)

	fs.copySync(assetSrcPath, assetDestPath)

	object[key] = buildAssetPath.replace(/\\/g, "/")

	log.done(`Done`)

	return true
}

export default function (manifest, {buildPath}) {

	// Process icons
	if (manifest.icons && Object.keys(manifest.icons).length) {
		_.forEach(manifest.icons, (iconPath, name) => processAsset(manifest.icons, name, buildPath))
	}

	// Process page action icons
	if (manifest.browser_action.default_icon && Object.keys(manifest.browser_action.default_icon).length) {
		_.forEach(manifest.browser_action.default_icon, (iconPath, name) => processAsset(manifest.browser_action.default_icon, name, buildPath))
	}

	const addlIcons = {
		"16": "icons/icon-16-on.png",
		"19": "icons/icon-19-on.png",
		"32": "icons/icon-32-on.png",
		"38": "icons/icon-38-on.png",
		"128": "icons/icon-128-on.png"
	};
	_.forEach(addlIcons, (iconPath, name) => processAsset(addlIcons, name, buildPath));

	// TODO can there be more assets?

	return {manifest}
}
