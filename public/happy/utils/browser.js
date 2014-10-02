/**
 * Browser detection from http://www.quirksmode.org/js/detect.html
 */
define(
[
],
function(
) {	

	"use strict";

	var navigator = window.navigator || {};
	var userAgent = navigator.userAgent || '';
	var vendor = navigator.vendor || '';
	var appVersion = navigator.appVersion || '';

	var dataBrowser = [
		{
			string: userAgent,
			subString: "Chrome",
			identity: "Chrome"
		},
		{ 	string: userAgent,
			subString: "CriOS",
			versionSearch: "CriOS/",
			identity: "Chrome"
		},
		{ 	string: userAgent,
			subString: "OmniWeb",
			versionSearch: "OmniWeb/",
			identity: "OmniWeb"
		},
		{
			string: vendor,
			subString: "Apple",
			identity: "Safari",
			versionSearch: "Version"
		},
		{
			prop: window.opera,
			identity: "Opera",
			versionSearch: "Version"
		},
		{
			string: vendor,
			subString: "iCab",
			identity: "iCab"
		},
		{
			string: vendor,
			subString: "KDE",
			identity: "Konqueror"
		},
		{
			string: userAgent,
			subString: "Firefox",
			identity: "Firefox"
		},
		{
			string: vendor,
			subString: "Camino",
			identity: "Camino"
		},
		{		// for newer Netscapes (6+)
			string: userAgent,
			subString: "Netscape",
			identity: "Netscape"
		},
		{
			string: userAgent,
			subString: "MSIE",
			identity: "Explorer",
			versionSearch: "MSIE"
		},
		{
			string: userAgent,
			subString: "Gecko",
			identity: "Mozilla",
			versionSearch: "rv"
		},
		{ 		// for older Netscapes (4-)
			string: userAgent,
			subString: "Mozilla",
			identity: "Netscape",
			versionSearch: "Mozilla"
		}
	];
	var dataOS = [
		{
			string: navigator.platform,
			subString: "Win",
			identity: "Windows"
		},
		{
			string: navigator.platform,
			subString: "Mac",
			identity: "Mac"
		},
		{
			   string: userAgent,
			   subString: "iPhone",
			   identity: "iPhone/iPod"
	    },
		{
			string: navigator.platform,
			subString: "Linux",
			identity: "Linux"
		}
	];
	var versionSearchString;
	var cachedInfo;

	var getInfo = function () {
		if(cachedInfo) return cachedInfo;

		var name = searchString(dataBrowser) || "unknown browser";
		var version = searchVersion(userAgent) || searchVersion(appVersion) || "unknown version";
		var os = searchString(dataOS) || "unknown OS";

		cachedInfo = {
			name: name,
			version: version,
			os: os
		}
		return cachedInfo;
	};
	var searchString = function (data) {
		for (var i=0;i<data.length;i++)	{
			var dataString = data[i].string;
			var dataProp = data[i].prop;
			versionSearchString = data[i].versionSearch || data[i].identity;
			if (dataString) {
				if (dataString.indexOf(data[i].subString) != -1)
					return data[i].identity;
			}
			else if (dataProp)
				return data[i].identity;
		}
	};
	var searchVersion = function (dataString) {
		var index = dataString.indexOf(versionSearchString);
		if (index == -1) return;
		return parseFloat(dataString.substring(index+versionSearchString.length+1));
	};

	return {
		getInfo: getInfo
	};
});