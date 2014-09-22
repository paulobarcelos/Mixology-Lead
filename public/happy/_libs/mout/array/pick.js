define(['../random/randInt'], function (randInt) {

    /**
     * Remove a random item from the Array and return it
     * @version 0.1.0 (2012/04/24)
     */
    function pick(arr){
        if (! arr.length) return;
        var idx = randInt(0, arr.length - 1);
        return arr.splice(idx, 1)[0];
    }

    return pick;

});
