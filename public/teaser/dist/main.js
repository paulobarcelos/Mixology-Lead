define("happy/app/BaseApp",[],function(){var e=function(){var e=this,t=function(){};e.container=document.body,e.setup=t,e.update=t,e.draw=t,e.onKeyUp=t,e.onKeyDown=t,e.onMouseOver=t,e.onMouseOut=t,e.onMouseDown=t,e.onMouseUp=t,e.onMouseMove=t,e.onClick=t,e.onDoubleClick=t,e.onResize=t,e.setFPS=t,e.enterFullscreen=t,e.exitFullscreen=t,e.toggleFullscreen=t,e.isFullscreen=t,e.enableDevMode=t,e.disableDevMode=t};return e}),define("happy/polyfill/FormData",[],function(){if(window.FormData)return window.FormData;var e=function(){var e=this,t,n,r,i=function(){t=!0,n="--------FormData"+Math.random(),r=[]},s=function(e,t){r.push([e,t])},o=function(){var e="";return r.forEach(function(t){e+="--"+n+"\r\n";if(t[1].name){var r=t[1];e+='Content-Disposition: form-data; name="'+t[0]+'"; filename="'+r.name+'"\r\n',e+="Content-Type: "+r.type+"\r\n\r\n",e+=r.getAsBinary()+"\r\n"}else e+='Content-Disposition: form-data; name="'+t[0]+'";\r\n\r\n',e+=t[1]+"\r\n"}),e+="--"+n+"--",e},u=function(){return t};Object.defineProperty(e,"append",{value:s}),Object.defineProperty(e,"toString",{value:o}),Object.defineProperty(e,"fake",{get:u}),i()};return e}),define("happy/utils/ajax",["happy/polyfill/FormData"],function(e){var t=function(e){if(!e)return;if(!e.url)return;e.method=e.method||"GET",e.headers=e.headers||{},e.context=e.context||window;var t;if(window.XMLHttpRequest)t=new XMLHttpRequest;else if(window.ActiveXObject)try{t=new ActiveXObject("Msxml2.XMLHTTP")}catch(n){try{t=new ActiveXObject("Microsoft.XMLHTTP")}catch(n){}}if(!t)return;t.onload=function(){t.status===200?e.onSuccess&&e.onSuccess.apply(e.context,[t]):e.onError&&e.onError.apply(e.context,[t])},t.onerror=function(){e.onError&&e.onError.apply(e.context,[t])},t.onabort=function(){e.onError&&e.onError.apply(e.context,[t])},t.ontimeout=function(){e.onError&&e.onError.apply(e.context,[t])},t.open(e.method,e.url);for(key in e.headers)t.setRequestHeader(key,e.headers[key]);t.send(e.data)};return t}),define("happy/utils/browser",[],function(){var e=window.navigator||{},t=e.userAgent||"",n=e.vendor||"",r=e.appVersion||"",i=[{string:t,subString:"Chrome",identity:"Chrome"},{string:t,subString:"CriOS",versionSearch:"CriOS/",identity:"Chrome"},{string:t,subString:"OmniWeb",versionSearch:"OmniWeb/",identity:"OmniWeb"},{string:n,subString:"Apple",identity:"Safari",versionSearch:"Version"},{prop:window.opera,identity:"Opera",versionSearch:"Version"},{string:n,subString:"iCab",identity:"iCab"},{string:n,subString:"KDE",identity:"Konqueror"},{string:t,subString:"Firefox",identity:"Firefox"},{string:n,subString:"Camino",identity:"Camino"},{string:t,subString:"Netscape",identity:"Netscape"},{string:t,subString:"MSIE",identity:"Explorer",versionSearch:"MSIE"},{string:t,subString:"Gecko",identity:"Mozilla",versionSearch:"rv"},{string:t,subString:"Mozilla",identity:"Netscape",versionSearch:"Mozilla"}],s=[{string:e.platform,subString:"Win",identity:"Windows"},{string:e.platform,subString:"Mac",identity:"Mac"},{string:t,subString:"iPhone",identity:"iPhone/iPod"},{string:e.platform,subString:"Linux",identity:"Linux"}],o,u,a=function(){if(u)return u;var e=f(i)||"unknown browser",n=l(t)||l(r)||"unknown version",o=f(s)||"unknown OS";return u={name:e,version:n,os:o},u},f=function(e){for(var t=0;t<e.length;t++){var n=e[t].string,r=e[t].prop;o=e[t].versionSearch||e[t].identity;if(n){if(n.indexOf(e[t].subString)!=-1)return e[t].identity}else if(r)return e[t].identity}},l=function(e){var t=e.indexOf(o);if(t==-1)return;return parseFloat(e.substring(t+o.length+1))};return{getInfo:a}}),define("happy/utils/dom",[],function(){var e=function(e){var t=e.offsetWidth,n=e.offsetHeight;return{x:t,y:n}},t=function(e,t){return e.className.match(new RegExp("(\\s|^)"+t+"(\\s|$)"))},n=function(e,t){this.hasClass(e,t)||(e.className+=" "+t)},r=function(e,n){if(t(e,n)){var r=new RegExp("(\\s|^)"+n+"(\\s|$)");e.className=e.className.replace(r," ")}},i=function(e){while(e.hasChildNodes())e.removeChild(e.lastChild)};return{size:e,hasClass:t,addClass:n,removeClass:r,empty:i}}),define("happy/_libs/mout/array/forEach",[],function(){function e(e,t,n){var r=-1,i=e.length>>>0;while(++r<i)r in e&&t.call(n,e[r],r,e)}return e}),define("happy/_libs/mout/array/indexOf",[],function(){function e(e,t,n){n=n||0;var r=e.length>>>0,i=n<0?r+n:n;while(i<r){if(i in e&&e[i]===t)return i;i+=1}return-1}return e}),define("happy/_libs/mout/array/filter",["./forEach"],function(e){function t(t,n,r){var i=[];return e(t,function(e,t,s){n.call(r,e,t,s)&&i.push(e)}),i}return t}),define("happy/_libs/mout/array/unique",["./indexOf","./filter"],function(e,t){function n(e){return t(e,r)}function r(t,n,r){return e(r,t,n+1)===-1}return n}),function(e){function t(e,t,n,r,i){this._listener=t,this._isOnce=n,this.context=r,this._signal=e,this._priority=i||0}function n(e,t){if(typeof e!="function")throw new Error("listener is a required param of {fn}() and should be a Function.".replace("{fn}",t))}function r(){this._bindings=[],this._prevParams=null;var e=this;this.dispatch=function(){r.prototype.dispatch.apply(e,arguments)}}t.prototype={active:!0,params:null,execute:function(e){var t,n;return this.active&&!!this._listener&&(n=this.params?this.params.concat(e):e,t=this._listener.apply(this.context,n),this._isOnce&&this.detach()),t},detach:function(){return this.isBound()?this._signal.remove(this._listener,this.context):null},isBound:function(){return!!this._signal&&!!this._listener},isOnce:function(){return this._isOnce},getListener:function(){return this._listener},getSignal:function(){return this._signal},_destroy:function(){delete this._signal,delete this._listener,delete this.context},toString:function(){return"[SignalBinding isOnce:"+this._isOnce+", isBound:"+this.isBound()+", active:"+this.active+"]"}},r.prototype={VERSION:"1.0.0",memorize:!1,_shouldPropagate:!0,active:!0,_registerListener:function(e,n,r,i){var s=this._indexOfListener(e,r),o;if(s!==-1){o=this._bindings[s];if(o.isOnce()!==n)throw new Error("You cannot add"+(n?"":"Once")+"() then add"+(n?"Once":"")+"() the same listener without removing the relationship first.")}else o=new t(this,e,n,r,i),this._addBinding(o);return this.memorize&&this._prevParams&&o.execute(this._prevParams),o},_addBinding:function(e){var t=this._bindings.length;do--t;while(this._bindings[t]&&e._priority<=this._bindings[t]._priority);this._bindings.splice(t+1,0,e)},_indexOfListener:function(e,t){var n=this._bindings.length,r;while(n--){r=this._bindings[n];if(r._listener===e&&r.context===t)return n}return-1},has:function(e,t){return this._indexOfListener(e,t)!==-1},add:function(e,t,r){return n(e,"add"),this._registerListener(e,!1,t,r)},addOnce:function(e,t,r){return n(e,"addOnce"),this._registerListener(e,!0,t,r)},remove:function(e,t){n(e,"remove");var r=this._indexOfListener(e,t);return r!==-1&&(this._bindings[r]._destroy(),this._bindings.splice(r,1)),e},removeAll:function(){var e=this._bindings.length;while(e--)this._bindings[e]._destroy();this._bindings.length=0},getNumListeners:function(){return this._bindings.length},halt:function(){this._shouldPropagate=!1},dispatch:function(e){if(!this.active)return;var t=Array.prototype.slice.call(arguments),n=this._bindings.length,r;this.memorize&&(this._prevParams=t);if(!n)return;r=this._bindings.slice(),this._shouldPropagate=!0;do n--;while(r[n]&&this._shouldPropagate&&r[n].execute(t)!==!1)},forget:function(){this._prevParams=null},dispose:function(){this.removeAll(),delete this._bindings,delete this._prevParams},toString:function(){return"[Signal active:"+this.active+" numListeners:"+this.getNumListeners()+"]"}};var i=r;i.Signal=r,typeof define=="function"&&define.amd?define("happy/_libs/signals",[],function(){return i}):typeof module!="undefined"&&module.exports?module.exports=i:e.signals=i}(this),define("GroupSelector",["happy/utils/dom","happy/_libs/signals"],function(e,t){var n=function(n){var r=this,i,s,o,u,a=function(){s=!1,u=new t,o=new t,i=document.createElement("div"),e.addClass(i,"tab");var n="ontouchstart"in document.documentElement;i.addEventListener(n?"touchstart":"click",m)},f=function(t){if(s)return;s=!0,t||o.dispatch(r),e.addClass(i,"selected")},l=function(t){if(!s)return;s=!1,t||u.dispatch(r),e.removeClass(i,"selected")},c=function(){return n},h=function(){return i},p=function(){return s},d=function(){return o},v=function(){return u},m=function(){document.activeElement.blur(),f()};Object.defineProperty(r,"select",{value:f}),Object.defineProperty(r,"deselect",{value:l}),Object.defineProperty(r,"id",{get:c}),Object.defineProperty(r,"node",{get:h}),Object.defineProperty(r,"selected",{get:p}),Object.defineProperty(r,"selectedSignal",{get:d}),Object.defineProperty(r,"deselectedSignal",{get:v}),a()};return n}),define("FlavorSelector",["happy/utils/dom","happy/_libs/signals"],function(e,t){var n=function(n){var r=this,i,s,o,u,a,f=function(){s=!0,o=!1,a=new t,u=new t,i=document.createElement("div"),e.addClass(i,"flavor"),i.style.backgroundColor=n.color;var r="ontouchstart"in document.documentElement;i.addEventListener(r?"touchstart":"click",b)},l=function(t){if(!s)return;if(o)return;o=!0,t||u.dispatch(r),e.addClass(i,"selected")},c=function(t){if(!s)return;if(!o)return;o=!1,t||a.dispatch(r),e.removeClass(i,"selected")},h=function(){return s},p=function(e){s=e},d=function(){return n},v=function(){return i},m=function(){return o},g=function(){return u},y=function(){return a},b=function(){document.activeElement.blur();if(!s)return;o?c():l()};Object.defineProperty(r,"select",{value:l}),Object.defineProperty(r,"deselect",{value:c}),Object.defineProperty(r,"active",{set:p,get:h}),Object.defineProperty(r,"flavor",{get:d}),Object.defineProperty(r,"node",{get:v}),Object.defineProperty(r,"selected",{get:m}),Object.defineProperty(r,"selectedSignal",{get:g}),Object.defineProperty(r,"deselectedSignal",{get:y}),f()};return n}),define("FlavorGroup",["happy/utils/dom","happy/_libs/signals","FlavorSelector"],function(e,t,n){var r=function(r){var i=this,s,o,u,a,f,l,c,h=function(){s=document.createElement("div"),e.addClass(s,"group"),u=[];var i,h=-1;for(var v=0;v<r.length;v++){v%7==0&&(h++,i=document.createElement("div"),e.addClass(i,"cluster"),s.appendChild(i));var m=new n(r[v]);m.selectedSignal.add(p),m.deselectedSignal.add(d),u.push(m),h==1||h==2?i.insertBefore(m.node,i.firstChild):i.appendChild(m.node)}a=!1,o=[],f=new t,l=new t,c=new t},p=function(e){var t=!1;for(var n=o.length-1;n>=0;n--)if(e.flavor._id==o[n]._id){t=!0;break}t||o.push(e.flavor),m()},d=function(e){for(var t=o.length-1;t>=0;t--)if(e.flavor._id==o[t]._id){o.splice(t,1);break}m()},v=function(){for(var e=u.length-1;e>=0;e--)u[e].deselect();o=[],a=!1},m=function(){if(o.length==2){if(!a){for(var e=u.length-1;e>=0;e--)u[e].selected||(u[e].active=!1);a=!0,l.dispatch(i)}}else if(a){for(var e=u.length-1;e>=0;e--)u[e].active=!0;a=!1,c.dispatch(i)}f.dispatch(i)},g=function(){return s},y=function(){return o},b=function(){return f},w=function(){return l},E=function(){return c};Object.defineProperty(i,"reset",{value:v}),Object.defineProperty(i,"node",{get:g}),Object.defineProperty(i,"selected",{get:y}),Object.defineProperty(i,"changedSignal",{get:b}),Object.defineProperty(i,"readySignal",{get:w}),Object.defineProperty(i,"unreadySignal",{get:E}),h()};return r}),define("CombinationSelector",["happy/utils/dom","happy/_libs/mout/array/forEach","happy/_libs/mout/array/unique","happy/_libs/signals","GroupSelector","FlavorGroup"],function(e,t,n,r,i,s){var o=function(o){var u=this,a,f,l,c,h,p,d,v,m,g,y,b,w,E,S,x,T,N=function(){a=document.createElement("div"),e.addClass(a,"combination-selector"),d=o.shift(),A(o),f=document.createElement("div"),e.addClass(f,"tabs"),a.appendChild(f),l=document.createElement("div"),e.addClass(l,"group-container"),a.appendChild(l),c=document.createElement("div"),e.addClass(c,"names"),h=document.createElement("div"),e.addClass(h,"simple"),c.appendChild(h),p=document.createElement("div"),e.addClass(p,"main"),p.innerHTML=d.name,c.appendChild(p),w=!1,b=[],E=new r,S=new r,x=new r,T=new r,g={},y={},m.forEach(function(e){y[e]=new s(v[e]),y[e].changedSignal.add(k),g[e]=new i(e),g[e].selectedSignal.add(C),f.appendChild(g[e].node)}),O(),g[m[0]].select()},C=function(t){for(id in v)id!=t.id&&g[id].deselect();e.empty(l),l.appendChild(y[t.id].node),l.appendChild(c),b=y[t.id].selected,x.dispatch(u),L()},k=function(e){b=e.selected,L()},L=function(){e.empty(h),t(b,function(e){var t=document.createElement("div");t.innerHTML=e.name,h.appendChild(t)}),b.length==2?w||(w=!0,E.dispatch(u)):w&&(w=!1,S.dispatch(u)),T.dispatch(u)},A=function(e){v={},m=[];for(var t=0;t<e.length;t++){var r=e[t];for(var i=0;i<r.groups.length;i++){var s=r.groups[i];v[s]||(v[s]=[]),v[s].push(r),m.push(s)}}return m=n(m),m.reverse(),v},O=function(){for(id in v)y[id].reset()},M=function(){return a},_=function(){return w},D=function(){return x},P=function(){return E},H=function(){return S},B=function(){var e=[];e.push(d._id);for(var t=0;t<b.length;t++)e.push(b[t]._id);return e};Object.defineProperty(u,"reset",{value:O}),Object.defineProperty(u,"node",{get:M}),Object.defineProperty(u,"ready",{get:_}),Object.defineProperty(u,"readySignal",{get:P}),Object.defineProperty(u,"unreadySignal",{get:H}),Object.defineProperty(u,"groupChangedSignal",{get:D}),Object.defineProperty(u,"selected",{get:B}),N()};return o}),define("RatingSelector",["happy/utils/dom","happy/_libs/mout/array/forEach"],function(e,t){var n=function(){var n=this,r,i,s,o,u,a=function(){r=document.createElement("div"),e.addClass(r,"rating"),i=document.createElement("div"),e.addClass(i,"key"),i.innerHTML="Rate",r.appendChild(i),s=document.createElement("div"),e.addClass(s,"value"),r.appendChild(s),o=[],t([1,2,3,4,5],function(e){var t={value:e,node:document.createElement("div")},n="ontouchstart"in document.documentElement;t.node.addEventListener(n?"touchstart":"click",function(){f(t)}),s.appendChild(t.node),o.push(t)}),l()},f=function(n){document.activeElement.blur(),u=n,t(o,function(t){t.value<=u.value?e.addClass(t.node,"selected"):e.removeClass(t.node,"selected")})},l=function(){f({value:0})},c=function(){return r},h=function(){return u.value};Object.defineProperty(n,"reset",{value:l}),Object.defineProperty(n,"node",{get:c}),Object.defineProperty(n,"value",{get:h}),a()};return n}),define("CommentSelector",["happy/utils/dom","happy/_libs/mout/array/forEach","happy/_libs/signals"],function(e,t,n){var r=function(){var t=this,r,i,s,o,u,a=function(){var t="ontouchstart"in document.documentElement;r=document.createElement("form"),r.action="#",r.method="GET",e.addClass(r,"comment"),r.addEventListener("submit",f),s=document.createElement("input"),s.type="text",s.placeholder="This is...",s.autocomplete="off",s.autocorrect="off",s.autocapitalize="off",s.spellcheck="false",e.addClass(s,"value"),r.appendChild(s),o=document.createElement("div"),o.innerHTML="Send",e.addClass(o,"send"),r.appendChild(o),o.addEventListener(t?"touchstart":"click",f),u=new n,l()},f=function(e){s.blur(),e.preventDefault(),u.dispatch(t)},l=function(){s.value=""},c=function(){return r},h=function(){return s.value},p=function(){return u};Object.defineProperty(t,"reset",{value:l}),Object.defineProperty(t,"node",{get:c}),Object.defineProperty(t,"value",{get:h}),Object.defineProperty(t,"sendSignal",{get:p}),a()};return r}),define("EndScreen",["happy/utils/dom","happy/_libs/mout/array/forEach"],function(e,t){var n=function(t){var n=this,r,t,i=function(){r=document.createElement("div"),e.addClass(r,"end-screen")},s=function(e){var n=[];n[0]=":)",n[1]=":s",n[2]=":\\",n[3]=":I",n[4]=": >",n[5]=";D",e=e||0,e=e>n.length-1?0:e,r.innerHTML=n[e],t.appendChild(r),setTimeout(function(){t.removeChild(r)},2e3)};Object.defineProperty(n,"go",{value:s}),i()};return n}),define("App",["happy/app/BaseApp","happy/utils/ajax","happy/utils/browser","happy/utils/dom","happy/_libs/mout/array/forEach","CombinationSelector","RatingSelector","CommentSelector","EndScreen"],function(e,t,n,r,i,s,o,u,a){var f=function(){var e=this,n,r,i,f,l,c,h=window.location.hostname.indexOf("localhost")>-1?"http://127.0.0.1:8000/":"http://mixology-api-lead.herokuapp.com/",p=function(){e.setFPS(0);var t=document.createElement("h1");t.innerHTML="Mx Lead",e.container.appendChild(t),d(),window.addEventListener("load",w),window.addEventListener("orientationchange",w),w()},d=function(){t({url:h+"api/flavors"+"?"+(new Date).getTime(),method:"GET",onSuccess:function(e){v(e.responseText)},onError:function(){console.log("Error getting flavors from server."),setTimeout(d,2e3)}})},v=function(e){r=JSON.parse(e),m()},m=function(){i=new s(r),i.groupChangedSignal.add(g),e.container.appendChild(i.node),f=new o,e.container.appendChild(f.node),c=new u,e.container.appendChild(c.node),c.sendSignal.add(y),l=new a(e.container)},g=function(e){e.reset(),f.reset(),c.reset()},y=function(e){i.selected.length<3?alert("You haven't to selected the ingredients."):f.value?e.value?b():alert("Please write your opinion."):alert("Please rate your combination.")},b=function(){i.reset(),f.reset(),c.reset(),w(),l.go(f.value)},w=function(){document.height<=window.outerHeight+10?setTimeout(function(){window.scrollTo(0,1)},50):setTimeout(function(){window.scrollTo(0,1)},0)};e.setup=p};return f.prototype=new e,f}),define("happy/utils/console",[],function(){return window.console||{log:function(){}}}),define("happy/_libs/mout/array/combine",["./indexOf"],function(e){function t(t,n){var r,i=n.length;for(r=0;r<i;r++)e(t,n[r])===-1&&t.push(n[r]);return t}return t}),define("happy/_libs/mout/string/replaceAccents",[],function(){function e(e){return e=e||"",e.search(/[\xC0-\xFF]/g)>-1&&(e=e.replace(/[\xC0-\xC5]/g,"A").replace(/[\xC6]/g,"AE").replace(/[\xC7]/g,"C").replace(/[\xC8-\xCB]/g,"E").replace(/[\xCC-\xCF]/g,"I").replace(/[\xD0]/g,"D").replace(/[\xD1]/g,"N").replace(/[\xD2-\xD6\xD8]/g,"O").replace(/[\xD9-\xDC]/g,"U").replace(/[\xDD]/g,"Y").replace(/[\xDE]/g,"P").replace(/[\xE0-\xE5]/g,"a").replace(/[\xE6]/g,"ae").replace(/[\xE7]/g,"c").replace(/[\xE8-\xEB]/g,"e").replace(/[\xEC-\xEF]/g,"i").replace(/[\xF1]/g,"n").replace(/[\xF2-\xF6\xF8]/g,"o").replace(/[\xF9-\xFC]/g,"u").replace(/[\xFE]/g,"p").replace(/[\xFD\xFF]/g,"y")),e}return e}),define("happy/_libs/mout/string/removeNonWord",[],function(){function e(e){return(e||"").replace(/[^0-9a-zA-Z\xC0-\xFF \-]/g,"")}return e}),define("happy/_libs/mout/string/upperCase",[],function(){function e(e){return(e||"").toUpperCase()}return e}),define("happy/_libs/mout/string/lowerCase",[],function(){function e(e){return(e||"").toLowerCase()}return e}),define("happy/_libs/mout/string/camelCase",["./replaceAccents","./removeNonWord","./upperCase","./lowerCase"],function(e,t,n,r){function i(i){return i=e(i),i=t(i).replace(/\-/g," ").replace(/\s[a-z]/g,n).replace(/\s+/g,"").replace(/^[A-Z]/g,r),i}return i}),define("happy/_libs/mout/string/pascalCase",["./camelCase","./upperCase"],function(e,t){function n(n){return e(n).replace(/^[a-z]/,t)}return n}),define("happy/utils/vendorPrefix",["../utils/console","../_libs/mout/array/forEach","../_libs/mout/array/combine","../_libs/mout/string/pascalCase"],function(e,t,n,r){var i=["WebKit","Moz","O","Ms"],s=[],o=[];t(i,function(e){s.push(r(e)),o.push(e.toLowerCase())});var u=n(s,o),a=function(t,n){if(!t)return;var i=r(t);n=n||window;var s=n[t];if(typeof s=="undefined")for(var o=0;o<u.length;o++){s=n[u[o]+i];if(typeof s!="undefined")break}return typeof s=="undefined"&&e.log(t+" is not implemented."),s};return{getValid:a}}),define("happy/_libs/mout/object/hasOwn",[],function(){function e(e,t){return Object.prototype.hasOwnProperty.call(e,t)}return e}),define("happy/_libs/mout/object/forOwn",["./hasOwn"],function(e){function r(){n=["toString","toLocaleString","valueOf","hasOwnProperty","isPrototypeOf","propertyIsEnumerable","constructor"],t=!0;for(var e in{toString:null})t=!1}function i(e,i,o){var u,a=0;t==null&&r();for(u in e)s(i,e,u,o);if(t)while(u=n[a++])s(i,e,u,o)}function s(t,n,r,i){e(n,r)&&t.call(i,n[r],r,n)}var t,n;return i}),define("happy/_libs/mout/lang/kindOf",[],function(){function r(r){return r===null?"Null":r===n?"Undefined":e.exec(t.call(r))[1]}var e=/^\[object (.*)\]$/,t=Object.prototype.toString,n;return r}),define("happy/_libs/mout/lang/clone",["../object/forOwn","./kindOf"],function(e,t){function n(e){var n;switch(t(e)){case"Object":n=r(e);break;case"Array":n=u(e);break;case"RegExp":n=s(e);break;case"Date":n=o(e);break;default:n=e}return n}function r(t){var n={};return e(t,i,n),n}function i(e,t){this[t]=n(e)}function s(e){var t="";return t+=e.multiline?"m":"",t+=e.global?"g":"",t+=e.ignoreCase?"i":"",new RegExp(e.source,t)}function o(e){return new Date(e.getTime())}function u(e){var t=[],r=-1,i=e.length,s;while(++r<i)t[r]=n(e[r]);return t}return n}),define("happy/_libs/mout/lang/isKind",["./kindOf"],function(e){function t(t,n){return e(t)===n}return t}),define("happy/_libs/mout/lang/isObject",["./isKind"],function(e){function t(t){return e(t,"Object")}return t}),define("happy/_libs/mout/object/merge",["./hasOwn","../lang/clone","../lang/isObject"],function(e,t,n){function r(){var i=1,s,o,u,a;a=t(arguments[0]);while(u=arguments[i++])for(s in u){if(!e(u,s))continue;o=u[s],n(o)&&n(a[s])?a[s]=r(a[s],o):a[s]=t(o)}return a}return r}),define("happy/_libs/stats",[],function(){var e=function(){var e=Date.now(),t=e,n=0,r=Infinity,i=0,s=0,o=Infinity,u=0,a=0,f=0,l=document.createElement("div");l.id="stats",l.addEventListener("mousedown",function(e){e.preventDefault(),y(++f%2)},!1),l.style.cssText="width:80px;opacity:0.9;cursor:pointer";var c=document.createElement("div");c.id="fps",c.style.cssText="padding:0 0 3px 3px;text-align:left;background-color:#002",l.appendChild(c);var h=document.createElement("div");h.id="fpsText",h.style.cssText="color:#0ff;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px",h.innerHTML="FPS",c.appendChild(h);var p=document.createElement("div");p.id="fpsGraph",p.style.cssText="position:relative;width:74px;height:30px;background-color:#0ff",c.appendChild(p);while(p.children.length<74){var d=document.createElement("span");d.style.cssText="width:1px;height:30px;float:left;background-color:#113",p.appendChild(d)}var v=document.createElement("div");v.id="ms",v.style.cssText="padding:0 0 3px 3px;text-align:left;background-color:#020;display:none",l.appendChild(v);var m=document.createElement("div");m.id="msText",m.style.cssText="color:#0f0;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px",m.innerHTML="MS",v.appendChild(m);var g=document.createElement("div");g.id="msGraph",g.style.cssText="position:relative;width:74px;height:30px;background-color:#0f0",v.appendChild(g);while(g.children.length<74){var d=document.createElement("span");d.style.cssText="width:1px;height:30px;float:left;background-color:#131",g.appendChild(d)}var y=function(e){f=e;switch(f){case 0:c.style.display="block",v.style.display="none";break;case 1:c.style.display="none",v.style.display="block"}},b=function(e,t){var n=e.appendChild(e.firstChild);n.style.height=t+"px"};return{REVISION:11,domElement:l,setMode:y,begin:function(){e=Date.now()},end:function(){var f=Date.now();return n=f-e,r=Math.min(r,n),i=Math.max(i,n),m.textContent=n+" MS ("+r+"-"+i+")",b(g,Math.min(30,30-n/200*30)),a++,f>t+1e3&&(s=Math.round(a*1e3/(f-t)),o=Math.min(o,s),u=Math.max(u,s),h.textContent=s+" FPS ("+o+"-"+u+")",b(p,Math.min(30,30-s/100*30)),t=f,a=0),f},update:function(){e=this.end()}}};return e}),define("happy/app/Runner",["../utils/dom","../utils/vendorPrefix","../_libs/mout/object/merge","../_libs/stats"],function(e,t,n,r){var i=function(n){function b(){c(b);var e=(new Date).getTime()*.001,t=e-o;o=e,l(t,o)}function w(e,t){u.update(),a.begin(),n.update.apply(n,[e,t]),a.end(),f.begin(),n.draw.apply(n,[e,t]),f.end()}function E(e,t){n.update.apply(n,[e,t]),n.draw.apply(n,[e,t])}var i=this,s=n.container,o,u,a,f,l,c,h=function(){t.getValid("cancelFullScreen",document).apply(document)},p=t.getValid("requestAnimationFrame"),d=t.getValid("MutationObserver");s.tabIndex="1",s.addEventListener("keyup",function(e){n.onKeyUp.apply(n,[e])},!1),s.addEventListener("keydown",function(e){n.onKeyDown.apply(n,[e])},!1),s.addEventListener("mouseover",function(e){n.onMouseOver.apply(n,[e])},!1),s.addEventListener("mouseout",function(e){n.onMouseOut.apply(n,[e])},!1),s.addEventListener("mousedown",function(e){n.onMouseDown.apply(n,[e])},!1),s.addEventListener("mouseup",function(e){n.onMouseUp.apply(n,[e])},!1),s.addEventListener("mousemove",function(e){n.onMouseMove.apply(n,[e])},!1),s.addEventListener("click",function(e){n.onClick.apply(n,[e])},!1),s.addEventListener("dblclick",function(e){n.onDoubleClick.apply(n,[e])},!1);var v=e.size(s),m=function(){var t=e.size(s);(t.x!=v.y||t.x!=v.y)&&n.onResize.apply(n,[t]),v=t};window.addEventListener("resize",m,!1),window.addEventListener("scroll",m,!1);if(d){var g=new d(m);g.observe(document.body,{subtree:!0,childList:!0,characterData:!0,attribute:!0})}var y=!1;n.enterFullscreen=function(){y=!0;var e=function(){t.getValid("requestFullScreen",s).apply(s,[Element.ALLOW_KEYBOARD_INPUT])};e(),s.style.position="fixed",s.style.top="0",s.style.left="0",s.style.width="100%",s.style.height="100%",s.style.minWidth="100%",s.style.minHeight="100%",s.style.maxWidth="100%",s.style.maxHeight="100%"},n.exitFullscreen=function(){y=!1,s.removeAttribute("style"),h()},n.toggleFullscreen=function(){y?n.exitFullscreen():n.enterFullscreen()},n.isFullscreen=function(){return y},u=new r,u.setMode(0),u.domElement.style.position="absolute",u.domElement.style.left="0px",u.domElement.style.top="0px",a=new r,a.setMode(1),a.domElement.style.position="absolute",a.domElement.style.left="80px",a.domElement.style.top="0px",f=new r,f.setMode(1),f.domElement.style.position="absolute",f.domElement.style.left="160px",f.domElement.style.top="0px",n.enableDevMode=function(){n.devMode=!0,s.appendChild(u.domElement),s.appendChild(a.domElement),s.appendChild(f.domElement),l=w},n.disableDevMode=function(){n.devMode=!1,u.domElement.parentNode&&u.domElement.parentNode.removeChild(u.domElement),a.domElement.parentNode&&a.domElement.parentNode.removeChild(a.domElement),f.domElement.parentNode&&f.domElement.parentNode.removeChild(f.domElement),l=E},n.setFPS=function(e){e<0&&(e=0);switch(e){case"auto":p?c=p:c=function(t){setTimeout(t,1e3/e)};break;case 0:c=function(e){};break;default:c=function(t){setTimeout(t,1e3/e)}}},n.disableDevMode.apply(n),n.setFPS("auto"),n.setup.apply(n),n.onResize.apply(n,[v]),o=(new Date).getTime()*.001,b()};return i}),require(["App","happy/app/Runner"],function(e,t){var n=new e,r=new t(n)}),define("main",function(){});