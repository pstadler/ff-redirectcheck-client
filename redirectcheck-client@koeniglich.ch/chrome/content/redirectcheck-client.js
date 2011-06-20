// https://developer.mozilla.org/en/XUL/PopupGuide/Extensions
var RedirectCheckClient = {
	_preferences: null,
	_service: { uri: null },
	_request: null,
	_currentTargetElem: null,
	
	init: function() {
		this._preferences = Components.classes["@mozilla.org/preferences-service;1"]
												.getService(Components.interfaces.nsIPrefService)
												.getBranch("extensions.redirectcheck-client.");
			
		this._service.uri = this.getPreference('service.uri');
		
		var contextMenu = document.getElementById("contentAreaContextMenu");
		if(contextMenu) {
			contextMenu.addEventListener("popupshowing", RedirectCheckClient.toggleMenuEntry, false);
		}
		
		var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
							.getService(Components.interfaces.nsIStyleSheetService);
		var ios = Components.classes["@mozilla.org/network/io-service;1"]
							.getService(Components.interfaces.nsIIOService);
		var uri = ios.newURI('chrome://redirectcheck-client/content/redirectcheck-client.css', null, null);
		sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
	},

	toggleMenuEntry: function() {
		document.getElementById("redirectcheck-menuitem").hidden = !(gContextMenu.onLink
			&& gContextMenu.linkURL.match(/^https?:\/\//i)
			&& RedirectCheckClient.normalizeUri(gContextMenu.linkURL)
				 !== RedirectCheckClient.normalizeUri(window._content.document.location.href)
		);
	},
	
	openService: function() {
		window.open('http://redirectcheck.koeniglich.ch/?ref=ff', 'redirectcheck-client-about');
	},
	
	getStatusCode: function() {
		RedirectCheckClient.request(gContextMenu.linkURL, gContextMenu.target);
	},	
	
	request: function(uri, targetElem) {
		this.showTooltip(targetElem, 'Checking...');
		this._currentTargetElem = targetElem;
		this._request = new XMLHttpRequest();
		this._request.open("GET", this._service.uri + '/' + encodeURIComponent(uri), true);
		this._request.setRequestHeader('User-Agent', navigator.userAgent + ' redirectcheck-client');
		this._request.onreadystatechange = this.handleResponse.bind(this);
		this._request.send(null);
	},

	handleResponse: function() {
		if(this._request.readyState === 4) {
			if(this._request.status === 200) {
				var response = this._request.responseText;
				if(response.length > 0) {
					if(response >= 100) {
						this.showTooltip(this._currentTargetElem, response);
					} else {
						this.showTooltip(this._currentTargetElem, 'N/A');
					}
				}
			} else {
				this.showTooltip(this._currentTargetElem, 'N/A');
			}
		}
	},
	
	showTooltip: function(targetElem, content) {
		var offset = this.getOffset(targetElem);
		var tip = window._content.document.getElementById('redirectcheck-tip-' + offset.top +  '-' + offset.left);
		if(!tip) {
			var arrow = window._content.document.createElement('div');
			arrow.className = 'redirectcheck-client-tip-arrow';
			var arrowBorder = window._content.document.createElement('div');
			arrowBorder.className = 'redirectcheck-client-tip-arrow-border';
			
			tip = window._content.document.createElement('div');
			tip.id = 'redirectcheck-tip-' + offset.top +  '-' + offset.left;
			tip.className = 'redirectcheck-client-tip';
			tip.appendChild(window._content.document.createTextNode(content));
			tip.appendChild(arrowBorder);
			tip.appendChild(arrow);
			
			window._content.document.getElementsByTagName("html")[0].appendChild(tip);
			// positioning
			var posX = (offset.left + tip.clientWidth > window._content.document.body.clientWidth)
				? window._content.document.body.clientWidth - tip.clientWidth
				: offset.left;
			
			var posY;
			if(offset.top - tip.clientHeight - 5 < 0) {
				posY = offset.top + tip.clientHeight + 5;
				tip.setAttribute('data-alignment', 'bottom');
			} else {
				posY = offset.top - tip.clientHeight - 5;
				tip.setAttribute('data-alignment', 'top');
			}
				
			tip.style.top = posY + 'px';
			tip.style.left = posX + 'px';

			tip.addEventListener('click', function(e) {
				window._content.document.body.removeChild(this); e.stopPropagation();
			}, true);
			
		} else {
			tip.firstChild.nodeValue = content;
		}
		tip.setAttribute('data-status', content);
	},
	
	getOffset: function(elem) {
		var top = 0, left = 0;
		while(elem) {
			left += elem.offsetLeft;
			top += elem.offsetTop;
			elem = elem.offsetParent;
		}
		return { top: top, left: left };
	},
	
	normalizeUri: function(uri) {
		return uri.toLowerCase().replace(/#.*$/, '');
	},
	
	getPreference: function(key) {
		switch(key) {
			case 'service.uri':
				return this._preferences.getCharPref(key);
  	
			default:
				/* Unknown key, do nothing */
				return;
		}
	},

	setPreference: function(key, value) {
		switch(key) {
			case 'service.uri':
				this._preferences.setCharPref(key, value);
				break;

			default:
				/* Unknown key, do nothing */
				break;
		}
	},
	
	log: function(msg) {
		Components.classes["@mozilla.org/consoleservice;1"]
		.getService(Components.interfaces.nsIConsoleService)
		.logStringMessage('[RedirectCheckClient] ' + msg);
	}
};

window.addEventListener('load', function() {
	RedirectCheckClient.init();
}, true);