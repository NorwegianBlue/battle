function loadJSON(path, success, error) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function()
    {
        if (xhr.readyState === 4) { //XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                if (success)
                    success(JSON.parse(xhr.responseText));
            } else {
                if (error)
                    error(xhr);
            }
        }
    };
    xhr.open("GET", path, true);
    xhr.send();
}


function getUrlParams(search_string) { // pass location.search

    var parse = function(params, pairs) {
        var pair = pairs[0];
        var parts = pair.split('=');
        var key = decodeURIComponent(parts[0]);
        var value = decodeURIComponent(parts.slice(1).join('='));

        // Handle multiple parameters of the same name
        if (typeof params[key] === "undefined") {
            params[key] = value;
        } else {
            params[key] = [].concat(params[key], value);
        }

        return pairs.length == 1 ? params : parse(params, pairs.slice(1))
    }

    // Get rid of leading ?
    return search_string.length == 0 ? {} : parse({}, search_string.substr(1).split('&'));

    // To get the param you want - params['c'];
}


var extend = function() {
    var options, name, src, copy, copyIsArray, clone,
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false;

    // Handle a deep copy situation
    if ( typeof target === "boolean" ) {
        deep = target;

        // Skip the boolean and the target
        target = arguments[ i ] || {};
        i++;
    }

    // Handle case when target is a string or something (possible in deep copy)
    if ( typeof target !== "object" && (typeof target !== 'function') ) {
        target = {};
    }

    // Extend jQuery itself if only one argument is passed
    if ( i === length ) {
        target = this;
        i--;
    }

    for ( ; i < length; i++ ) {
        // Only deal with non-null/undefined values
        if ( (options = arguments[ i ]) != null ) {
            // Extend the base object
            for ( name in options ) {
                src = target[ name ];
                copy = options[ name ];

                // Prevent never-ending loop
                if ( target === copy ) {
                    continue;
                }

                // Recurse if we're merging plain objects or arrays
                if ( deep && copy && ( isPlainObject(copy) || (copyIsArray = Array.isArray(copy)) ) ) {
                    if ( copyIsArray ) {
                        copyIsArray = false;
                        clone = src && Array.isArray(src) ? src : [];

                    } else {
                        clone = src && isPlainObject(src) ? src : {};
                    }

                    // Never move original objects, clone them
                    target[ name ] = extend( deep, clone, copy );

                    // Don't bring in undefined values
                } else if ( copy !== undefined ) {
                    target[ name ] = copy;
                }
            }
        }
    }

    // Return the modified object
    return target;
};


var isWindow = function( obj ) {
    return obj != null && obj === obj.window;
};


var isPlainObject = function( obj ) {
    // Not plain objects:
    // - Any object or value whose internal [[Class]] property is not "[object Object]"
    // - DOM nodes
    // - window
    if ( jQuery.type( obj ) !== "object" || obj.nodeType || isWindow( obj ) ) {
        return false;
    }

    if ( obj.constructor &&
        !hasOwn.call( obj.constructor.prototype, "isPrototypeOf" ) ) {
        return false;
    }

    // If the function hasn't returned already, we're confident that
    // |obj| is a plain object, created by {} or constructed with new Object
    return true;
};


var isEmptyObject = function( obj ) {
    var name;
    for ( name in obj ) {
        return false;
    }
    return true;
};


function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
}

function UUID() {
    return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4());
}


module.exports = {
    loadJSON: loadJSON,
    getUrlParams: getUrlParams,
    extend: extend,
    isWindow: isWindow,
    isPlainObject: isPlainObject,
    isEmptyObject: isEmptyObject,
    UUID: UUID
};
