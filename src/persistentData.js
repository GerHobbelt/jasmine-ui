jasmineui.define('persistentData', ['globals', 'urlParser'], function (globals, urlParser) {

    function serialize(data) {
        var MARKER;
        var helper = function () {
            window.jasmineui = window.jasmineui || {};
            var pd = window.jasmineui.persistent = MARKER || {};
            window.location.href = window.location.href.replace(/#.*/, '') + "#" + pd.originalHash;
            delete window.sessionStorage.jasmineui;
            var currentSpec = pd.specs && pd.specs[pd.specIndex];
            if (currentSpec) {
                var output = '[';
                for (var i = 0; i < pd.specs.length; i++) {
                    var spec = pd.specs[i];
                    var state = ' ';
                    if (spec.results) {
                        state = spec.results.failedCount > 0 ? 'F' : '.';
                    }
                    output += state;
                }
                output += ']';
                console.log("Jasmineui: " + output + ": " + currentSpec.specPath.join(" "));
                var scripts = currentSpec.loadScripts;
                if (scripts) {
                    for (var i = 0; i < scripts.length; i++) {
                        window.document.writeln('<script type="text/javascript" src="' + scripts[i] + '"></script>');
                    }
                }
            }
        };
        var string = "(" + helper + ")(window)";
        return string.replace("MARKER", JSON.stringify(data));
    }

    var refreshUrlAttribute = 'juir';

    function postDataToWindow(target) {
        target.postMessage({
            persistentData: JSON.stringify(get())
        }, '*');
    }

    function saveAndNavigateWithReloadTo(win, url) {
        var data = get();
        var parsedUrl = urlParser.parseUrl(url);
        var refreshCount = data.refreshCount = (data.refreshCount || 0) + 1;
        urlParser.setOrReplaceQueryAttr(parsedUrl, refreshUrlAttribute, refreshCount);
        data.originalHash = parsedUrl.hash || "";
        parsedUrl.hash = encodeURI(serialize(data));
        win.location.href = urlParser.serializeUrl(parsedUrl);
    }

    function get() {
        var win = globals.window;
        if (!win.jasmineui || !win.jasmineui.persistent) {
            // This variable is used by the eval!
            var window = win;
            eval(win.sessionStorage.jasmineui);
            eval(decodeURI(win.location.href.match(/\(function.*\)/)));
            win.jasmineui = win.jasmineui || {};
            win.jasmineui.persistent = win.jasmineui.persistent || {};
        }
        return win.jasmineui.persistent;
    }

    function saveToSession() {
        var win = globals.window;
        win.sessionStorage.jasmineui = serialize(get());
    }

    function enableSaveToSession() {
        var data = get();
        var win = globals.window;
        if (!win.jasmineui.persistentUnload) {
            win.jasmineui.persistentUnload = true;
            win.addEventListener('beforeunload', saveToSession, false);
        }
    }

    function disableSaveToSession() {
        var win = globals.window;
        win.jasmineui.persistentUnload = false;
        delete win.sessionStorage.jasmineui;
        win.removeEventListener('beforeunload', saveToSession, false);
    }


    function clean() {
        var win = globals.window;
        win.jasmineui.persistent = {};
    }

    var changeListeners = [];

    globals.window.addEventListener('message', function(e) {
        var win = globals.window;
        if (e.data.persistentData) {
            delete win.jasmineui.persistent;
            win.jasmineui.persistent = JSON.parse(e.data.persistentData);
            for (var i = 0; i < changeListeners.length; i++) {
                changeListeners[i]();
            }
        }
    }, false);

    function addChangeListener(listener) {
        changeListeners.push(listener);
    }

    get.clean = clean;

    get.saveAndNavigateWithReloadTo = saveAndNavigateWithReloadTo;
    get.enableSaveToSession = enableSaveToSession;
    get.disableSaveToSession = disableSaveToSession;
    get.addChangeListener = addChangeListener;
    get.postDataToWindow = postDataToWindow;

    return get;
});